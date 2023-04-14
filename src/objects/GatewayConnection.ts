import {
  ChannelType,
  GatewayChannelCreateDispatchData,
  GatewayChannelDeleteDispatchData,
  GatewayCloseCodes,
  GatewayDispatchEvents,
  GatewayDispatchPayload,
  GatewayGuild,
  GatewayGuildCreateDispatchData,
  GatewayGuildDeleteDispatchData,
  GatewayGuildMemberListUpdateDispatchData,
  GatewayGuildModifyDispatchData,
  GatewayHeartbeat,
  GatewayHelloData,
  GatewayIdentify,
  GatewayLazyRequest,
  GatewayLazyRequestData,
  GatewayMessageCreateDispatchData,
  GatewayMessageDeleteDispatchData,
  GatewayMessageUpdateDispatchData,
  GatewayOpcodes,
  GatewayPresenceUpdateDispatchData,
  GatewayReadyDispatchData,
  GatewayReceivePayload,
  GatewaySendPayload,
  PresenceUpdateStatus,
  Snowflake,
} from '@puyodead1/fosscord-api-types/v9';
import type Instance from './Instance';
import UAParser from 'ua-parser-js';
import User from './User';

// based off https://github.com/spacebarchat/client/blob/742255bbbe955705098b83b87b6067ad7de3b827/src/stores/GatewayConnectionStore.ts
export default class GatewayConnection {
  readonly instance: Instance;

  private readonly token: string;
  private socket?: WebSocket;
  private url?: string;
  private dispatchHandlers: Map<GatewayDispatchEvents, (data: unknown) => void> = new Map();

  private sequence: number = 0;
  private sessionId?: string;

  private user?: User;

  get isOpen() {
    if (this.socket) return this.socket.readyState == WebSocket.OPEN;
    else return false;
  }

  constructor(instance: Instance, token: string) {
    this.instance = instance;
    this.token = token;
  }

  connect() {
    const socketUrl = new URL(`ws://${this.instance.domain}`);
    socketUrl.searchParams.append('v', '9');
    socketUrl.searchParams.append('encoding', 'json');
    this.url = socketUrl.href;
    this.socket = new WebSocket(this.url);

    this.socket.onopen = this.onSocketOpen;
    this.socket.onmessage = this.onSocketMessage;
    // TODO: implement logs and error handler
    this.socket.onerror = console.error;
    this.socket.onclose = this.onSocketClose;

    this.dispatchHandlers.set(GatewayDispatchEvents.Ready, this.onReady);
    this.dispatchHandlers.set(GatewayDispatchEvents.Resumed, this.onResumed);
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

    this.dispatchHandlers.set(GatewayDispatchEvents.PresenceUpdate, this.onPresenceUpdate);
  }

  private onSocketOpen() {
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
  }

  private onSocketClose(e: CloseEvent) {
    this.cleanup();

    if (e.code === 4004) {
      // this.domain.logout();
      this.reset();
    }
  }

  private onSocketMessage(e: MessageEvent<GatewayReceivePayload>) {
    switch (e.data.op) {
      case GatewayOpcodes.Dispatch:
        this.handleDispatch(e.data);
        break;
      case GatewayOpcodes.Heartbeat:
        this.sendHeartbeat();
        break;
      case GatewayOpcodes.Reconnect:
        this.handleReconnect();
        break;
      case GatewayOpcodes.InvalidSession:
        this.handleInvalidSession(e.data.d);
        break;
      case GatewayOpcodes.Hello:
        this.handleHello(e.data.d);
        break;
      case GatewayOpcodes.HeartbeatAck:
        this.handleHeartbeatAck();
        break;
    }
  }

  private handleDispatch(data: GatewayDispatchPayload) {
    this.sequence = data.s;
    const handler = this.dispatchHandlers.get(data.t);
    if (handler) handler(data.d);
  }

  private sendJson(payload: GatewaySendPayload) {
    if (this.socket) {
      if (this.socket.readyState !== WebSocket.OPEN) return;
      this.socket.send(JSON.stringify(payload));
    }
  }

  // dispatch handlers
  private onReady(data: GatewayReadyDispatchData) {
    this.sessionId = data.session_id;

    this.user = new User(data.user, this.instance);

    // TODO: store guilds
    // for (const guild of data.guilds) this.instance.guilds.addAll(data.guilds);
    // TODO: store users
    if (data.users) {
      for (const user of data.users) this.instance.addUser(user);
    }
    // TODO: store relationships
    // TODO: store readstates
    // this.domain.privateChannels.addAll(data.private_channels);
  }

  private cleanup() {
    // this.stopHeartbeater();
    this.socket = undefined;
  }

  private reset() {
    this.sessionId = undefined;
    this.sequence = 0;
  }
}
