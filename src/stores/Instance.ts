import {ObservableMap, action, makeObservable, observable, type IObservableArray} from 'mobx';
import REST from '../utils/REST';
import User from './objects/User';
import type {
  APIChannel,
  APIUser,
  GatewayGuild,
  Snowflake,
} from '@spacebarchat/spacebar-api-types/v9';
import Guild from './Guild';
import Channel from './Channel';
import GatewayConnection from './objects/GatewayConnection';
import MessageQueue from './MessageQueue';

export default class Instance {
  @observable readonly domain: string;

  readonly rest: REST;

  @observable readonly connections: IObservableArray<GatewayConnection>;

  @observable readonly users: ObservableMap<string, User>;
  @observable readonly guilds: ObservableMap<string, Guild>;
  @observable readonly privateChannels: ObservableMap<string, Channel>;

  @observable readonly queue: MessageQueue;

  constructor(domain: string) {
    this.domain = domain;
    this.rest = new REST(this);

    this.connections = observable.array();

    this.users = new ObservableMap<Snowflake, User>();
    this.guilds = new ObservableMap<Snowflake, Guild>();
    this.privateChannels = new ObservableMap<Snowflake, Channel>();

    this.queue = new MessageQueue();

    makeObservable(this);
  }

  @action
  addConnection(token: string) {
    const connection = new GatewayConnection(this, token);
    this.connections.push(connection);
    return connection;
  }

  @action
  addUser(data: APIUser) {
    if (!this.users.has(data.id)) this.users.set(data.id, new User(data, this));
  }

  @action
  addGuild(data: GatewayGuild) {
    if (!this.guilds.has(data.id)) this.guilds.set(data.id, new Guild(data, this));
  }

  @action
  addPrivateChannel(data: APIChannel) {
    if (!this.privateChannels.has(data.id))
      this.privateChannels.set(data.id, new Channel(data, this));
  }

  @action
  updateUser(data: APIUser) {
    this.users.get(data.id)?.update(data);
  }

  @action
  updateGuild(data: GatewayGuild) {
    this.guilds.get(data.id)?.update(data);
  }

  @action
  updatePrivateChannel(data: APIChannel) {
    this.privateChannels.get(data.id)?.update(data);
  }
}
