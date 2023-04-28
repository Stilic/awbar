import {ObservableMap} from 'mobx';
import Instance from './stores/Instance';
import type User from './stores/objects/User';

export default class App {
  static readonly instances: ObservableMap<string, Instance> = new ObservableMap<
    string,
    Instance
  >();

  static currentUser?: User;

  static addInstance(domain: string) {
    if (!this.instances.has(domain)) {
      const instance = new Instance(domain);
      this.instances.set(domain, instance);
    }
  }
}

App.addInstance('spacebar.stilic.ml');
