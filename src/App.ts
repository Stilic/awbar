import {ObservableMap, action, computed, makeObservable, observable, reaction} from 'mobx';
import Instance from './stores/Instance';
import type User from './stores/objects/User';
import Storage from './utils/Storage';
import type {Snowflake} from '@spacebarchat/spacebar-api-types/v9';
import {browser} from '$app/environment';
import {goto} from '$app/navigation';

type ConnectedUser = {
  username: string;
  discriminator: string;
  avatar?: string;
  token: string;
};

export default class App {
  @observable private static _initialized: boolean = false;

  @observable private static _currentInstance?: Instance;
  @observable private static _currentUser?: User;

  private static _connectedUsers: Storage<Record<Snowflake, ConnectedUser>> = new Storage('users');

  static readonly defaultInstance = 'spacebar.stilic.ml';

  static preferences: Storage<unknown> = new Storage('preferences');

  @observable static readonly instances: ObservableMap<string, Instance> = new ObservableMap();

  @computed
  static get initialized(): boolean {
    return this._initialized;
  }

  @computed
  static get currentInstance(): Instance | undefined {
    return this._currentInstance;
  }

  @computed
  static get currentUser(): User | undefined {
    return this._currentUser;
  }

  @action
  static setCurrentInstance(instance?: Instance) {
    this._currentInstance = instance;
  }

  @action
  static setCurrentUser(user?: User) {
    this._currentUser = user;
  }

  @action
  static init() {
    if (!this._initialized) {
      this._connectedUsers.keys().then(domains => {
        App.preferences.get('currentUser').then(user => {
          for (const domain of domains) {
            this.addInstance(domain);
            const instance = this.instances.get(domain)!;
            this._connectedUsers.get(domain)!.then(users => {
              for (const id in users) {
                const token = users[id].token;
                const connection = instance.addConnection(token);
                if (
                  !this._currentUser &&
                  (!user ||
                    ('domain' in user &&
                      'userId' in user &&
                      user.domain == domain &&
                      user.userId == id))
                ) {
                  const userReaction = reaction(
                    () => connection.user,
                    user => {
                      if (user) {
                        this.setCurrentUser(user);
                        userReaction();
                      }
                    },
                  );
                }
              }
            });
          }
        });
      });

      // TODO: maybe add suggestions on instance selection?
      this.addInstance(this.defaultInstance);
      this.addInstance('old.server.spacebar.chat');

      if (!App.currentInstance) App.setCurrentInstance(this.instances.get(this.defaultInstance));

      this._initialized = true;
    }
  }

  static logIn(token: string) {
    if (this.currentInstance) {
      const connection = this.currentInstance.addConnection(token);
      const readyReaction = reaction(
        () => connection.ready,
        value => {
          if (value) {
            App.setCurrentUser(connection.user);
            goto('/channels/@me');
            readyReaction();
          }
        },
      );
    }
  }

  static saveUser(user: User, token: string) {
    this._connectedUsers.get(user.instance.domain).then(users => {
      if (!users) users = {};
      users[user.id] = {
        username: user.username,
        discriminator: user.discriminator,
        avatar: user.avatar,
        token: token,
      };
      this._connectedUsers.set(user.instance.domain, users);
    });
  }

  static removeUser(instance: Instance, token: string) {
    this._connectedUsers.get(instance.domain).then(users => {
      if (!users) return;
      for (const id in users) {
        const user = users[id];
        if (user && user.token == token) {
          delete users[id];
          break;
        }
      }
      this._connectedUsers.set(instance.domain, users);
    });
  }

  @action
  static addInstance(domain: string) {
    if (!this.instances.has(domain)) this.instances.set(domain, new Instance(domain));
  }
}

makeObservable(App);

reaction(
  () => App.currentUser,
  user => {
    if (user) {
      App.preferences.set('currentUser', {
        domain: user.instance.domain,
        userId: user.id,
      });
      App.setCurrentInstance(user.instance);
    } else App.preferences.remove('currentUser');
  },
);

if (browser) App.init();
