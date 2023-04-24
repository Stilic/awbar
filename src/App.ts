import {ObservableMap} from 'mobx';
import Instance from './stores/Instance';

export default class App {
  private static readonly instances: ObservableMap<string, Instance> = new ObservableMap<
    string,
    Instance
  >();
  private static currentInstance?: Instance;

  static addInstance(domain: string) {
    if (!this.instances.has(domain)) {
      const instance = new Instance(domain);
      this.instances.set(domain, instance);
      if (!this.currentInstance) this.currentInstance = instance;
    }
  }

  static getInstance(domain: string) {
    return this.instances.get(domain);
  }

  static removeInstance(domain: string) {
    const removed = this.instances.delete(domain);
    if (removed && (this.instances.size <= 0 || this.currentInstance?.domain == domain))
      this.currentInstance = undefined;
    return removed;
  }

  static getCurrentInstance() {
    return this.currentInstance;
  }
}

App.addInstance('spacebar.stilic.ml');
