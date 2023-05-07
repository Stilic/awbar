import {ObservableMap, action, computed, makeObservable, observable, runInAction} from 'mobx';
import Instance from './stores/Instance';
import type User from './stores/objects/User';
import Storage from './utils/Storage';
import {Routes, type APIUser, type Snowflake} from '@spacebarchat/spacebar-api-types/v9';
import {goto} from '$app/navigation';
import {browser} from '$app/environment';

type ConnectedUser = {
  username: string;
  discriminator: string;
  avatar?: string;
  token: string;
};

export default class App {
  @observable private static _initialized: boolean = false;

  private static connectedUsers: Storage<Record<Snowflake, ConnectedUser>>;
  @observable private static _currentUser?: User;

  static readonly defaultInstance: string = 'spacebar.stilic.ml';
  @observable static readonly instances: ObservableMap<string, Instance> = new ObservableMap<
    string,
    Instance
  >();

  @computed
  static get initialized(): boolean {
    return this._initialized;
  }

  @computed
  static get currentUser(): User | undefined {
    return this._currentUser;
  }

  @action
  static init() {
    if (!this._initialized) {
      this.connectedUsers = new Storage('users');
      this.connectedUsers.keys().then(domains => {
        for (const domain of domains) {
          if (!this.instances.has(domain)) this.addInstance(domain);
          const instance = this.instances.get(domain)!;
          this.connectedUsers.get(domain)!.then(users => {
            for (const id in users) {
              const token = users[id].token;
              // TODO: store current user
              if (!this._currentUser)
                instance.rest.get<APIUser>(Routes.user(id), undefined, token).then(user => {
                  instance.addUser(user);
                  runInAction(() => (this._currentUser = instance.users.get(id)));
                  goto('/channels/@me');
                });
              instance.addConnection(token);
            }
          });
        }

        if (domains.length <= 0) goto('/login');
      });

      this.addInstance(this.defaultInstance);

      this._initialized = true;
    }
  }

  @action
  static saveUser(user: User, token: string) {
    this.connectedUsers.get(user.instance.domain).then(users => {
      if (!users) users = {};
      users[user.id] = {
        username: user.username,
        discriminator: user.discriminator,
        avatar: user.avatar,
        token: token,
      };
      this.connectedUsers.set(user.instance.domain, users);
    });
  }

  @action
  static addInstance(domain: string) {
    if (!this.instances.has(domain)) {
      const instance = new Instance(domain);
      this.instances.set(domain, instance);
    }
  }
}

makeObservable(App);

if (browser) App.init();
