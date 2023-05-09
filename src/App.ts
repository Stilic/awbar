import {ObservableMap, action, computed, makeObservable, observable, reaction} from 'mobx';
import Instance from './stores/Instance';
import type User from './stores/objects/User';
import Storage from './utils/Storage';
import type {Snowflake} from '@spacebarchat/spacebar-api-types/v9';
import {browser} from '$app/environment';
import type GatewayConnection from './stores/objects/GatewayConnection';

type ConnectedUser = {
  username: string;
  discriminator: string;
  avatar?: string;
  token: string;
};

export default class App {
  @observable private static _initialized: boolean = false;

  static preferences: Storage<unknown> = new Storage('preferences');

  static readonly defaultInstance = 'spacebar.stilic.ml';
  @observable static readonly instances: ObservableMap<string, Instance> = new ObservableMap();
  @observable private static _currentInstance?: Instance;

  private static _connectedUsers: Storage<Record<Snowflake, ConnectedUser>> = new Storage('users');
  @observable private static _currentUser?: User;

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
  private static initCurrentUser(connection: GatewayConnection) {
    if (!this._currentUser) {
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

  @action
  static init() {
    if (!this._initialized) {
      this._connectedUsers.keys().then(domains => {
        App.preferences.get('currentUser').then(user => {
          let props: string[];
          if (user) {
            props = (user as string).split(' ');
            this.addInstance(props[0]);
            App.setCurrentInstance(this.instances.get(props[0]));
          }

          for (const domain of domains) {
            if (!this.instances.has(domain)) this.addInstance(domain);
            const instance = this.instances.get(domain)!;
            this._connectedUsers.get(domain)!.then(users => {
              for (const id in users) {
                const token = users[id].token;
                const connection = instance.addConnection(token);
                if (user) {
                  if (props[0] == domain && props[1] == id) App.initCurrentUser(connection);
                } else {
                  App.preferences.set('currentUser', `${instance.domain} ${id}`);
                  App.initCurrentUser(connection);
                }
              }
            });
          }
        });
      });

      this.addInstance(this.defaultInstance);
      this.addInstance('old.server.spacebar.chat');

      if (!App.currentInstance) App.setCurrentInstance(this.instances.get(this.defaultInstance));

      this._initialized = true;
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
      App.preferences.get('currentUser').then(currentUser => {
        if (!currentUser) App.preferences.set('currentUser', `${user.instance.domain} ${user.id}`);
      });
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
    if (!this.instances.has(domain)) {
      const instance = new Instance(domain);
      this.instances.set(domain, instance);
    }
  }
}

makeObservable(App);

reaction(
  () => App.currentUser,
  user => {
    if (user) {
      App.preferences.set('currentUser', `${user.instance.domain} ${user.id}`);
      App.setCurrentInstance(user.instance);
    } else App.preferences.remove('currentUser');
  },
);

if (browser) App.init();
