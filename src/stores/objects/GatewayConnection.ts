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
  private readonly _token: string;
  private _socket?: WebSocket;
  private _dispatchHandlers: Map<GatewayDispatchEvents, (data: any) => void>;
  private _connectionStartTime?: number;
  private _heartbeatInterval: number = 0;
  private _heartbeater?: number;
  private _initialHeartbeatTimeout?: number;
  private _sequence: number = 0;
  private _heartbeatAck: boolean = true;
  private _sessionId?: string;
  private _resumeUrl?: string;
  @observable private _ready: boolean = false;
  @observable private _user?: User;

  readonly instance: Instance;

  @computed
  get open(): boolean {
    if (this._socket) return this._socket.readyState == WebSocket.OPEN;
    else return false;
  }

  @computed
  get ready(): boolean {
    return this._ready;
  }

  @computed
  get user(): User | undefined {
    return this._user;
  }

  constructor(instance: Instance, token: string) {
    this.instance = instance;
    this._token = token;

    this._dispatchHandlers = new Map();

    makeObservable(this);
  }

  async connect(resume?: boolean) {
    this.disconnect();

    const socketUrl = new URL(
      resume && this._resumeUrl ? this._resumeUrl : await this.instance.rest.getGatewayUrl(),
    );
    socketUrl.searchParams.append('v', '9');
    socketUrl.searchParams.append('encoding', 'json');
    console.debug(`${this.getLogBase('Connect')} ${socketUrl.href}`);
    this._connectionStartTime = Date.now();
    this._socket = new WebSocket(socketUrl);

    this._socket.onopen = this.onSocketOpen;
    this._socket.onmessage = this.onSocketMessage;
    this._socket.onerror = this.onSocketError;
    this._socket.onclose = this.onSocketClose;

    this._dispatchHandlers.set(GatewayDispatchEvents.Ready, this.onReady);
    this._dispatchHandlers.set(GatewayDispatchEvents.Resumed, this.onResume);
    this._dispatchHandlers.set(GatewayDispatchEvents.GuildCreate, this.onGuildCreate);
    this._dispatchHandlers.set(GatewayDispatchEvents.GuildUpdate, this.onGuildUpdate);
    this._dispatchHandlers.set(GatewayDispatchEvents.GuildDelete, this.onGuildDelete);
    this._dispatchHandlers.set(
      GatewayDispatchEvents.GuildMemberListUpdate,
      this.onGuildMemberListUpdate,
    );

    this._dispatchHandlers.set(GatewayDispatchEvents.ChannelCreate, this.onChannelCreate);
    this._dispatchHandlers.set(GatewayDispatchEvents.ChannelDelete, this.onChannelDelete);

    this._dispatchHandlers.set(GatewayDispatchEvents.MessageCreate, this.onMessageCreate);
    this._dispatchHandlers.set(GatewayDispatchEvents.MessageUpdate, this.onMessageUpdate);
    this._dispatchHandlers.set(GatewayDispatchEvents.MessageDelete, this.onMessageDelete);

    // this.dispatchHandlers.set(GatewayDispatchEvents.PresenceUpdate, this.onPresenceUpdate);

    if (resume)
      this.sendJson({
        op: GatewayOpcodes.Resume,
        d: {
          token: this._token,
          session_id: this._sessionId!,
          seq: this._sequence,
        },
      });
  }

  disconnect(code?: number, reason?: string) {
    if (this._socket) {
      console.debug(`${this.getLogBase('Disconnect')} ${this._socket?.url}`);
      this._socket?.close(code, reason);
      this.cleanup();
    }
  }

  private onSocketOpen = () => {
    console.debug(
      `${this.getLogBase('Connected')} ${this._socket?.url} (took ${
        Date.now() - this._connectionStartTime!
      }ms)`,
    );

    const info = UAParser();
    const payload: GatewayIdentify = {
      op: GatewayOpcodes.Identify,
      d: {
        token: this._token,
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
    console.log('socket close');
    this.cleanup();

    if (e.code === 4004) {
      App.removeUser(this.instance, this._token);
      this.instance.connections.remove(this);
      return;
    }

    this.connect(true);
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
        this.connect(payload.d);
        break;
      case GatewayOpcodes.Hello:
        this.handleHello(payload.d);
        break;
      case GatewayOpcodes.HeartbeatAck:
        this._heartbeatAck = true;
        break;
      default:
        console.debug(`${this.getLogBase()} Received unknown opcode`);
        break;
    }
  };

  private startHeartbeater = () => {
    if (this._heartbeater) {
      clearInterval(this._heartbeater);
      this._heartbeater = undefined;
    }

    const heartbeaterFn = () => {
      if (this._heartbeatAck) {
        this._heartbeatAck = false;
        this.sendHeartbeat();
      } else this.handleHeartbeatTimeout();
    };

    this._initialHeartbeatTimeout = setTimeout(() => {
      this._initialHeartbeatTimeout = undefined;
      this._heartbeater = setInterval(heartbeaterFn, this._heartbeatInterval);
      heartbeaterFn();
    }, Math.floor(Math.random() * this._heartbeatInterval));
  };

  private stopHeartbeater = () => {
    if (this._heartbeater) {
      clearInterval(this._heartbeater);
      this._heartbeater = undefined;
    }

    if (this._initialHeartbeatTimeout) {
      clearTimeout(this._initialHeartbeatTimeout);
      this._initialHeartbeatTimeout = undefined;
    }
  };

  private handleDispatch = (data: GatewayDispatchPayload) => {
    console.debug(`${this.getLogBase()} -> ${data.t}`, data.d);
    this._sequence = data.s;
    const handler = this._dispatchHandlers.get(data.t);
    if (handler) handler(data.d);
  };

  private sendJson(payload: GatewaySendPayload) {
    if (this._socket) {
      if (this._socket.readyState !== WebSocket.OPEN) return;
      console.debug(`${this.getLogBase()} <- ${payload.op}`, payload);
      this._socket.send(JSON.stringify(payload));
    }
  }

  private handleHello = (data: GatewayHelloData) => {
    console.info(
      `${this.getLogBase('Hello')} heartbeat interval: ${data.heartbeat_interval} (took ${
        Date.now() - this._connectionStartTime!
      }ms)`,
    );
    this._heartbeatInterval = data.heartbeat_interval;
    this.startHeartbeater();
  };

  private handleHeartbeatTimeout = () => {
    console.log('timeout');
    this._socket?.close(4009);
    this.connect(true);
  };

  // dispatch handlers
  @action
  private onReady = (data: GatewayReadyDispatchData) => {
    console.info(`${this.getLogBase('Ready')} took ${Date.now() - this._connectionStartTime!}ms`);

    this._sessionId = data.session_id;
    this._resumeUrl = data.resume_gateway_url;

    this.instance.addUser(data.user);

    const user = this.instance.users.get(data.user.id)!;
    App.saveUser(user, this._token);
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

  private onResume = () => {
    console.info(`${this.getLogBase()} resumed`);
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
      d: this._sequence,
    });
  };

  @action
  private cleanup = () => {
    this.stopHeartbeater();
    this._socket = undefined;
    this._ready = false;
    this._heartbeatAck = true;
  };

  private getLogBase(event?: string): string {
    let base = `[${this.instance.domain} (Gateway ${this.instance.connections.indexOf(this)})]`;
    if (event) base += ` [${event}]`;
    return base;
  }
}
