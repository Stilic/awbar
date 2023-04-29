import {ObservableMap} from 'mobx';
import Instance from './stores/Instance';
import type User from './stores/objects/User';
import Storage from './utils/Storage';

type ConnectedUser = {
  username: string;
  discriminator: string;
  avatar?: string;
  token: string;
};

export default class App {
  private static users: Storage<Record<string, ConnectedUser>> = new Storage('users');

  static currentUser?: User;

  static readonly instances: ObservableMap<string, Instance> = new ObservableMap<
    string,
    Instance
  >();

  static loadUsers() {
    for (const domain of this.users.keys()) {
      if (!this.instances.has(domain)) this.addInstance(domain);
      const instance = this.instances.get(domain)!;
      const users = this.users.get(domain)!;
      for (const id in users) instance.addConnection(users[id].token);
    }
  }

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

  static addInstance(domain: string) {
    if (!this.instances.has(domain)) {
      const instance = new Instance(domain);
      this.instances.set(domain, instance);
    }
  }
}

App.loadUsers();
App.addInstance('spacebar.stilic.ml');
