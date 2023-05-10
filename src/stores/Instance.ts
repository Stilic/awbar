import {ObservableMap, action, makeObservable, observable, type IObservableArray} from 'mobx';
import REST from '../utils/REST';
import User from './objects/User';
import {
  Routes,
  type APIChannel,
  type APIUser,
  type GatewayGuild,
} from '@spacebarchat/spacebar-api-types/v9';
import Guild from './Guild';
import Channel from './Channel';
import GatewayConnection from './objects/GatewayConnection';
import MessageQueue from './MessageQueue';
import type {APIInstancePolicies} from '../interfaces/api';

export default class Instance {
  @observable readonly domain: string;

  readonly rest: REST;
  @observable readonly connections: IObservableArray<GatewayConnection>;

  private readonly _configuration: Promise<APIInstancePolicies>;

  @observable readonly users: ObservableMap<string, User>;
  @observable readonly guilds: ObservableMap<string, Guild>;
  @observable readonly privateChannels: ObservableMap<string, Channel>;

  @observable readonly queue: MessageQueue;

  constructor(domain: string) {
    this.domain = domain;

    this.rest = new REST(this);
    this.connections = observable.array();

    this._configuration = this.rest.get<APIInstancePolicies>(Routes.instance());

    this.users = new ObservableMap();
    this.guilds = new ObservableMap();
    this.privateChannels = new ObservableMap();

    this.queue = new MessageQueue();

    makeObservable(this);
  }

  async getConfiguration(): Promise<APIInstancePolicies> {
    return this._configuration;
  }

  @action
  addConnection(token: string) {
    const connection = new GatewayConnection(this, token);
    this.connections.push(connection);
    connection.connect();
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
