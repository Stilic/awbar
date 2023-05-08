import {ObservableMap, action, computed, makeObservable, observable, reaction} from 'mobx';
import Instance from './stores/Instance';
import type User from './stores/objects/User';
import Storage from './utils/Storage';
import type {Snowflake} from '@spacebarchat/spacebar-api-types/v9';
import {goto} from '$app/navigation';
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

  private static preferences: Storage<unknown> = new Storage('preferences');

  private static connectedUsers: Storage<Record<Snowflake, ConnectedUser>> = new Storage('users');
  @observable private static currentUser?: User;

  static readonly defaultInstance: string = 'spacebar.stilic.ml';
  @observable static readonly instances: ObservableMap<string, Instance> = new ObservableMap();

  @computed
  static get initialized(): boolean {
    return this._initialized;
  }

  @action
  private static initCurrentUser(connection: GatewayConnection) {
    if (!this.currentUser) {
      const userReaction = reaction(
        () => connection.user,
        user => {
          if (user) {
            this.currentUser = user;
            goto('/channels/@me');
            userReaction();
          }
        },
      );
    }
  }

  @action
  static init() {
    if (!this._initialized) {
      this.connectedUsers.keys().then(domains => {
        App.preferences.get('currentUser').then(user => {
          let props: string[];
          if (user) props = (user as string).split(' ');

          for (const domain of domains) {
            if (!this.instances.has(domain)) this.addInstance(domain);
            const instance = this.instances.get(domain)!;
            this.connectedUsers.get(domain)!.then(users => {
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

          if (domains.length <= 0) goto('/login');
        });
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
      App.preferences.get('currentUser').then(currentUser => {
        if (!currentUser) App.preferences.set('currentUser', `${user.instance.domain} ${user.id}`);
      });
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
