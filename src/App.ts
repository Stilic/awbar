import {ObservableMap, action, computed, makeObservable, observable} from 'mobx';
import Instance from './stores/Instance';
import type User from './stores/objects/User';
import Storage from './utils/Storage';
import {Routes, type APIUser} from '@spacebarchat/spacebar-api-types/v9';
import {goto} from '$app/navigation';

type ConnectedUser = {
  username: string;
  discriminator: string;
  avatar?: string;
  token: string;
};

export default class App {
  @observable private static _initialized: boolean = false;

  private static users: Storage<Record<string, ConnectedUser>>;
  @observable static currentUser?: User;

  static readonly defaultInstance: string = 'spacebar.stilic.ml';
  @observable static readonly instances: ObservableMap<string, Instance> = new ObservableMap<
    string,
    Instance
  >();

  @computed
  static get initialized(): boolean {
    return this._initialized;
  }

  @action
  static init(callback?: (user?: User) => void) {
    if (!this._initialized) {
      this.users = new Storage('users', storage => {
        const domains = storage.keys();
        for (const domain of domains) {
          if (!this.instances.has(domain)) this.addInstance(domain);
          const instance = this.instances.get(domain)!;
          const users = storage.get(domain)!;
          for (const id in users) {
            const token = users[id].token;
            // TODO: store current user
            if (!this.currentUser)
              instance.rest.get<APIUser>(Routes.user(id), undefined, token).then(user => {
                instance.addUser(user);
                this.currentUser = instance.users.get(id);
                goto('/channels/@me');
              });
            instance.addConnection(token);
          }
        }

        this.addInstance(this.defaultInstance);

        this._initialized = true;
        if (domains.length <= 0) goto('/login');
      });
    }

    if (callback) callback(this.currentUser);
  }

  @action
  static saveUser(user: User, token: string) {
    const users = this.users.get(user.instance.domain) || {};
    users[user.id] = {
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      token: token,
    };
    this.users.set(user.instance.domain, users);
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
