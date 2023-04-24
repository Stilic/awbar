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
  type GatewayReceivePayload,
  type GatewaySendPayload,
} from '@spacebarchat/spacebar-api-types/v9';
import type Instance from './Instance';
import UAParser from 'ua-parser-js';
import User from './objects/User';
import {runInAction} from 'mobx';

// based off https://github.com/spacebarchat/client/blob/742255bbbe955705098b83b87b6067ad7de3b827/src/stores/GatewayConnectionStore.ts
export default class GatewayConnection {
  private readonly token: string;
  private socket?: WebSocket;
  private dispatchHandlers: Map<GatewayDispatchEvents, (data: any) => void> = new Map();
  private heartbeatInterval?: number;
  private heartbeater?: number;
  private initialHeartbeatTimeout?: number;
  private sequence: number = 0;
  private heartbeatAck: boolean = true;
  private sessionId?: string;
  private ready: boolean = false;

  readonly instance: Instance;
  private user?: User;

  get isOpen() {
    if (this.socket) return this.socket.readyState == WebSocket.OPEN;
    else return false;
  }

  isReady() {
    return this.ready;
  }

  constructor(instance: Instance, token: string) {
    this.instance = instance;
    this.token = token;
    this.connect();
  }

  connect() {
    const socketUrl = new URL(`wss://${this.instance.domain}`);
    socketUrl.searchParams.append('v', '9');
    socketUrl.searchParams.append('encoding', 'json');
    this.socket = new WebSocket(socketUrl.href);

    this.socket!.onopen = this.onSocketOpen;
    this.socket!.onmessage = this.onSocketMessage;
    // TODO: implement logs and error handler
    this.socket!.onerror = console.error;
    this.socket!.onclose = this.onSocketClose;

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

  disconnect() {
    this.cleanup();
    this.instance.connections.remove(this);
  }

  private onSocketOpen = () => {
    const info = UAParser();
    const payload: GatewayIdentify = {
      op: GatewayOpcodes.Identify,
      d: {
        token: this.token,
        properties: {
          os: info.os.name ?? '',
          browser: info.browser.name ?? '',
          device: info.device.type ?? '',
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

  private onSocketMessage = (e: MessageEvent<string>) => {
    const data = JSON.parse(e.data);
    switch (data.op) {
      case GatewayOpcodes.Dispatch:
        this.handleDispatch(data);
        break;
      case GatewayOpcodes.Heartbeat:
        this.sendHeartbeat();
        break;
      case GatewayOpcodes.Reconnect:
        this.cleanup();
        break;
      case GatewayOpcodes.InvalidSession:
        this.handleInvalidSession(data.d);
        break;
      case GatewayOpcodes.Hello:
        this.handleHello(data.d);
        break;
      case GatewayOpcodes.HeartbeatAck:
        this.heartbeatAck = true;
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
    this.sequence = data.s;
    const handler = this.dispatchHandlers.get(data.t);
    if (handler) handler(data.d);
  };

  private sendJson(payload: GatewaySendPayload) {
    if (this.socket) {
      if (this.socket.readyState !== WebSocket.OPEN) return;
      this.socket.send(JSON.stringify(payload));
    }
  }

  private handleInvalidSession = (resumable: boolean) => {
    this.cleanup();
    // TODO: handle resumable
  };

  private handleHello = (data: GatewayHelloData) => {
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
  private onReady = (data: GatewayReadyDispatchData) => {
    this.sessionId = data.session_id;

    this.user = new User(data.user, this.instance);

    // TODO: store guilds
    for (const guild of data.guilds) this.instance.addGuild(guild);
    // TODO: store users
    if (data.users) for (const user of data.users) this.instance.addUser(user);
    // TODO: store relationships
    // TODO: store readstates
    for (const channel of data.private_channels) this.instance.addPrivateChannel(channel);

    this.ready = true;
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

  private cleanup = () => {
    this.stopHeartbeater();
    this.socket?.close();
    this.socket = undefined;
    this.ready = false;
  };

  private reset = () => {
    this.sessionId = undefined;
    this.sequence = 0;
  };
}
