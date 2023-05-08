import {
  ChannelType,
  GatewayOpcodes,
  PresenceUpdateStatus,
  GatewayDispatchEvents,
  type APIMessage,
  type GatewayChannelCreateDispatchData,
  type GatewayChannelDeleteDispatchData,
  type GatewayDispatchPayload,
  type GatewayGuild,
  type GatewayGuildCreateDispatchData,
  type GatewayGuildDeleteDispatchData,
  type GatewayGuildMemberListUpdateDispatchData,
  type GatewayGuildModifyDispatchData,
  type GatewayHelloData,
  type GatewayIdentify,
  type GatewayMessageCreateDispatchData,
  type GatewayMessageDeleteDispatchData,
  type GatewayMessageUpdateDispatchData,
  type GatewayReadyDispatchData,
  type GatewaySendPayload,
  type GatewayReceivePayload,
} from '@spacebarchat/spacebar-api-types/v9';
import type Instance from '../Instance';
import UAParser from 'ua-parser-js';
import type User from './User';
import {action, computed, makeObservable, observable, runInAction} from 'mobx';
import App from '../../App';

export default class GatewayConnection {
  private readonly token: string;
  private socket?: WebSocket;
  private dispatchHandlers: Map<GatewayDispatchEvents, (data: any) => void>;
  private connectionStartTime?: number;
  private heartbeatInterval?: number;
  private heartbeater?: number;
  private initialHeartbeatTimeout?: number;
  private sequence = 0;
  private heartbeatAck = true;
  // private sessionId?: string;
  @observable private _ready = false;
  @observable private _user?: User;

  readonly instance: Instance;

  @computed
  get open() {
    if (this.socket) return this.socket.readyState == WebSocket.OPEN;
    else return false;
  }

  @computed
  get ready() {
    return this._ready;
  }

  @computed
  get user() {
    return this._user;
  }

  constructor(instance: Instance, token: string) {
    this.instance = instance;
    this.token = token;

    this.dispatchHandlers = new Map();

    makeObservable(this);
  }

  async connect() {
    const socketUrl = new URL((await this.instance.rest.domainsPromise).gateway);
    socketUrl.searchParams.append('v', '9');
    socketUrl.searchParams.append('encoding', 'json');
    console.debug(`${this.getLogBase('Connect')} ${socketUrl.href}`);
    this.connectionStartTime = Date.now();
    this.socket = new WebSocket(socketUrl);

    this.socket.onopen = this.onSocketOpen;
    this.socket.onmessage = this.onSocketMessage;
    this.socket.onerror = this.onSocketError;
    this.socket.onclose = this.onSocketClose;

    this.dispatchHandlers.set(GatewayDispatchEvents.Ready, this.onReady);
    // this.dispatchHandlers.set(GatewayDispatchEvents.Resumed, this.onResumed);
    this.dispatchHandlers.set(GatewayDispatchEvents.GuildCreate, this.onGuildCreate);
    this.dispatchHandlers.set(GatewayDispatchEvents.GuildUpdate, this.onGuildUpdate);
    this.dispatchHandlers.set(GatewayDispatchEvents.GuildDelete, this.onGuildDelete);
    this.dispatchHandlers.set(
      GatewayDispatchEvents.GuildMemberListUpdate,
      this.onGuildMemberListUpdate,
    );

    this.dispatchHandlers.set(GatewayDispatchEvents.ChannelCreate, this.onChannelCreate);
    this.dispatchHandlers.set(GatewayDispatchEvents.ChannelDelete, this.onChannelDelete);

    this.dispatchHandlers.set(GatewayDispatchEvents.MessageCreate, this.onMessageCreate);
    this.dispatchHandlers.set(GatewayDispatchEvents.MessageUpdate, this.onMessageUpdate);
    this.dispatchHandlers.set(GatewayDispatchEvents.MessageDelete, this.onMessageDelete);

    // this.dispatchHandlers.set(GatewayDispatchEvents.PresenceUpdate, this.onPresenceUpdate);
  }

  async disconnect(code?: number, reason?: string) {
    console.debug(`${this.getLogBase('Disconnect')} ${this.socket?.url}`);
    this.socket?.close(code, reason);
    this.cleanup();
    this.instance.connections.remove(this);
  }

  private onSocketOpen = () => {
    console.debug(
      `${this.getLogBase('Connected')} ${this.socket?.url} (took ${
        Date.now() - this.connectionStartTime!
      }ms)`,
    );

    const info = UAParser();
    const payload: GatewayIdentify = {
      op: GatewayOpcodes.Identify,
      d: {
        token: this.token,
        properties: {
          os: info.os.name ?? '',
          browser: info.browser.name ?? 'Spacebar Web',
          device: info.device.type ?? '',
          client_build_number: 0,
          release_channel: 'dev',
          browser_user_agent: info.ua,
        },
        compress: false,
        presence: {
          status: PresenceUpdateStatus.Online,
          since: Date.now(),
          activities: [],
          afk: false,
        },
      },
    };
    this.sendJson(payload);
  };

  private onSocketClose = (e: CloseEvent) => {
    this.cleanup();

    if (e.code === 4004) {
      // this.domain.logout();
      this.reset();
    }
  };

  private onSocketError = (e: Event) => {
    console.error(`${this.getLogBase()} Socket Error`, e);
  };

  private onSocketMessage = (e: MessageEvent<string>) => {
    const payload = JSON.parse(e.data) as GatewayReceivePayload;
    if (payload.op !== GatewayOpcodes.Dispatch)
      console.debug(`${this.getLogBase()} -> ${payload.op}`, payload);
    switch (payload.op) {
      case GatewayOpcodes.Dispatch:
        this.handleDispatch(payload);
        break;
      case GatewayOpcodes.Heartbeat:
        this.sendHeartbeat();
        break;
      case GatewayOpcodes.Reconnect:
        this.cleanup();
        break;
      case GatewayOpcodes.InvalidSession:
        this.handleInvalidSession(payload.d);
        break;
      case GatewayOpcodes.Hello:
        this.handleHello(payload.d);
        break;
      case GatewayOpcodes.HeartbeatAck:
        this.heartbeatAck = true;
        break;
      default:
        console.debug(`${this.getLogBase()} Received unknown opcode`);
        break;
    }
  };

  private startHeartbeater = () => {
    if (this.heartbeater) {
      clearInterval(this.heartbeater);
      this.heartbeater = undefined;
    }

    const heartbeaterFn = () => {
      if (this.heartbeatAck) {
        this.heartbeatAck = false;
        this.sendHeartbeat();
      } else {
        this.handleHeartbeatTimeout();
      }
    };

    this.initialHeartbeatTimeout = setTimeout(() => {
      this.initialHeartbeatTimeout = undefined;
      this.heartbeater = setInterval(heartbeaterFn, this.heartbeatInterval!);
      heartbeaterFn();
    }, Math.floor(Math.random() * this.heartbeatInterval!));
  };

  private stopHeartbeater = () => {
    if (this.heartbeater) {
      clearInterval(this.heartbeater);
      this.heartbeater = undefined;
    }

    if (this.initialHeartbeatTimeout) {
      clearTimeout(this.initialHeartbeatTimeout);
      this.initialHeartbeatTimeout = undefined;
    }
  };

  private handleDispatch = (data: GatewayDispatchPayload) => {
    console.debug(`${this.getLogBase()} -> ${data.t}`, data.d);
    this.sequence = data.s;
    const handler = this.dispatchHandlers.get(data.t);
    if (handler) handler(data.d);
  };

  private sendJson(payload: GatewaySendPayload) {
    if (this.socket) {
      if (this.socket.readyState !== WebSocket.OPEN) return;
      console.debug(`${this.getLogBase()} <- ${payload.op}`, payload);
      this.socket.send(JSON.stringify(payload));
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleInvalidSession = (resumable: boolean) => {
    this.cleanup();
    // TODO: handle resumable
  };

  private handleHello = (data: GatewayHelloData) => {
    console.info(
      `${this.getLogBase('Hello')} heartbeat interval: ${data.heartbeat_interval} (took ${
        Date.now() - this.connectionStartTime!
      }ms)`,
    );
    this.heartbeatInterval = data.heartbeat_interval;
    this.startHeartbeater();
  };

  private handleHeartbeatTimeout = () => {
    this.socket?.close(4009);

    // TODO: reconnect
    this.cleanup();
    this.reset();
  };

  // dispatch handlers
  @action
  private onReady = (data: GatewayReadyDispatchData) => {
    console.info(`${this.getLogBase('Ready')} took ${Date.now() - this.connectionStartTime!}ms`);

    // this.sessionId = data.session_id;

    this.instance.addUser(data.user);

    const user = this.instance.users.get(data.user.id)!;
    App.saveUser(user, this.token);
    this._user = user;

    // TODO: store guilds
    for (const guild of data.guilds) this.instance.addGuild(guild);
    // TODO: store users
    if (data.users) for (const user of data.users) this.instance.addUser(user);
    // TODO: store relationships
    // TODO: store readstates
    for (const channel of data.private_channels) this.instance.addPrivateChannel(channel);

    console.info(
      `${this.getLogBase('Ready')} added ${data.guilds.length} guild(s), ${
        (data.users?.length || 0) + 1
      } user(s), ${data.private_channels.length} private channel(s)`,
    );

    this._ready = true;
  };

  private onGuildCreate = (data: GatewayGuildCreateDispatchData) => {
    runInAction(() => {
      this.instance.addGuild({
        ...data,
        ...data.properties,
      } as unknown as GatewayGuild);
    });
  };

  private onGuildUpdate = (data: GatewayGuildModifyDispatchData) => {
    this.instance.guilds.get(data.id)?.update(data);
  };

  private onGuildDelete = (data: GatewayGuildDeleteDispatchData) => {
    runInAction(() => {
      this.instance.guilds.delete(data.id);
    });
  };

  private onGuildMemberListUpdate = (data: GatewayGuildMemberListUpdateDispatchData) => {
    const {guild_id} = data;
    const guild = this.instance.guilds.get(guild_id);

    if (!guild) return;

    guild.memberList.update(data);
  };

  private onChannelCreate = (data: GatewayChannelCreateDispatchData) => {
    if (data.type === ChannelType.DM || data.type === ChannelType.GroupDM) {
      this.instance.addPrivateChannel(data);
      return;
    }

    const guild = this.instance.guilds.get(data.guild_id!);
    if (!guild) {
      console.warn(`[ChannelCreate] Guild ${data.guild_id} not found for channel ${data.id}`);
      return;
    }
    guild.addChannel(data);
  };

  private onChannelDelete = (data: GatewayChannelDeleteDispatchData) => {
    if (data.type === ChannelType.DM || data.type === ChannelType.GroupDM) {
      this.instance.privateChannels.delete(data.id);
      return;
    }

    const guild = this.instance.guilds.get(data.guild_id!);
    if (!guild) {
      console.warn(`[ChannelDelete] Guild ${data.guild_id} not found for channel ${data.id}`);
      return;
    }
    guild.channels.delete(data.id);
  };

  private onMessageCreate = (data: GatewayMessageCreateDispatchData) => {
    const guild = this.instance.guilds.get(data.guild_id!);
    if (!guild) {
      console.warn(`[MessageCreate] Guild ${data.guild_id} not found for channel ${data.id}`);
      return;
    }
    const channel = guild.channels.get(data.channel_id);
    if (!channel) {
      console.warn(`[MessageCreate] Channel ${data.channel_id} not found for message ${data.id}`);
      return;
    }

    channel.remove(data.id);
    this.instance.queue.handleIncomingMessage(data);
  };

  private onMessageUpdate = (data: GatewayMessageUpdateDispatchData) => {
    const guild = this.instance.guilds.get(data.guild_id!);
    if (!guild) {
      console.warn(`[MessageUpdate] Guild ${data.guild_id} not found for channel ${data.id}`);
      return;
    }
    const channel = guild.channels.get(data.channel_id);
    if (!channel) {
      console.warn(`[MessageUpdate] Channel ${data.channel_id} not found for message ${data.id}`);
      return;
    }

    channel.updateMessage(data as APIMessage);
  };

  private onMessageDelete = (data: GatewayMessageDeleteDispatchData) => {
    const guild = this.instance.guilds.get(data.guild_id!);
    if (!guild) {
      console.warn(`[MessageDelete] Guild ${data.guild_id} not found for channel ${data.id}`);
      return;
    }
    const channel = guild.channels.get(data.channel_id);
    if (!channel) {
      console.warn(`[MessageDelete] Channel ${data.channel_id} not found for message ${data.id}`);
      return;
    }

    channel.remove(data.id);
  };

  // private onPresenceUpdate(data: GatewayPresenceUpdateDispatchData) {
  //   this.instance.addPresence(data);
  // }

  private sendHeartbeat = () => {
    this.sendJson({
      op: GatewayOpcodes.Heartbeat,
      d: this.sequence,
    });
  };

  @action
  private cleanup = () => {
    this.stopHeartbeater();
    this.socket = undefined;
    this._ready = false;
  };

  private reset = () => {
    // this.sessionId = undefined;
    this.sequence = 0;
  };

  private getLogBase(event?: string): string {
    let base = `[${this.instance.domain} (Gateway ${this.instance.connections.indexOf(this)})]`;
    if (event) base += ` [${event}]`;
    return base;
  }
}
