import Instance from './stores/Instance';

export default class Globals {
  static readonly instance: Instance = new Instance('spacebar.stilic.ml');
}
