import {ObservableMap, action, observable} from 'mobx';
import type {IAPILoginRequest, IAPILoginResponse} from '../interfaces/api';
import REST from '../utils/REST';
import User from './User';
import type {APIUser} from '@puyodead1/fosscord-api-types/v9';
import type Guild from './Guild';

export default class Instance {
  public readonly domain: string;
  public readonly rest: REST;

  @observable public readonly users: ObservableMap<string, User>;
  @observable public readonly guilds: ObservableMap<string, Guild>;

  constructor(domain: string) {
    this.domain = domain;
    this.rest = new REST(this);

    this.users = new ObservableMap<string, User>();
    this.guilds = new ObservableMap<string, Guild>();
  }

  @action
  public addUser(user: APIUser) {
    this.users.set(user.id, new User(user, this));
  }

  public getFullUserTag(user: User): string {
    return `${user.tag}@${this.domain}`;
  }

  public getToken(credentials: IAPILoginRequest): Promise<string> {
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
