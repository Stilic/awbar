import {ObservableMap, action, computed, makeObservable, observable} from 'mobx';
import type {IAPILoginRequest, IAPILoginResponse} from '../interfaces/api';
import REST from '../utils/REST';
import User from './User';
import type {APIChannel, APIUser, GatewayGuild, Snowflake} from '@puyodead1/fosscord-api-types/v9';
import Guild from './Guild';
import Channel from './Channel';

export default class Instance {
  readonly domain: string;
  readonly rest: REST;

  @observable readonly users: ObservableMap<string, User>;
  @observable readonly guilds: ObservableMap<string, Guild>;
  @observable readonly privateChannels: ObservableMap<string, Channel>;

  constructor(domain: string) {
    this.domain = domain;
    this.rest = new REST(this);

    this.users = new ObservableMap<Snowflake, User>();
    this.guilds = new ObservableMap<Snowflake, Guild>();
    this.privateChannels = new ObservableMap<Snowflake, Channel>();

    makeObservable(this);
  }

  @action
  addUser(data: APIUser) {
    if (!this.users.has(data.id)) this.users.set(data.id, new User(data, this));
  }

  @action
  updateUser(data: APIUser) {
    this.users.get(data.id)?.update(data);
  }

  @action
  addGuild(data: GatewayGuild) {
    if (!this.guilds.has(data.id)) this.guilds.set(data.id, new Guild(data, this));
  }

  @action
  updateGuild(data: GatewayGuild) {
    this.guilds.get(data.id)?.update(data);
  }

  @action
  addPrivateChannel(data: APIChannel) {
    if (!this.privateChannels.has(data.id))
      this.privateChannels.set(data.id, new Channel(data, this));
  }

  @action
  updatePrivateChannel(data: APIChannel) {
    this.privateChannels.get(data.id)?.update(data);
  }

  getToken(credentials: IAPILoginRequest): Promise<string> {
    return new Promise((resolve, reject) => {
      return this.rest
        .post<IAPILoginRequest, IAPILoginResponse>('auth/login', credentials)
        .then(r => {
          if ('token' in r && 'settings' in r) return resolve(r.token);
          else {
            console.error('error on login');
            reject();
          }
        })
        .catch(reject);
    });
  }
}
