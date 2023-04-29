import ls from 'localstorage-slim';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import AES from 'crypto-js/aes';
import UTF8 from 'crypto-js/enc-utf8';
import {browser} from '$app/environment';

if (browser) {
  ls.config.encrypt = true;
  ls.config.decrypt = true;
  ls.config.secret = (await (await FingerprintJS.load({monitoring: false})).get()).visitorId;
  ls.config.encrypter = (data, secret) => {
    return AES.encrypt(JSON.stringify(data), secret as string).toString();
  };
  ls.config.decrypter = (encryptedString, secret) => {
    return JSON.parse(AES.decrypt(encryptedString as string, secret as string).toString(UTF8));
  };
}

export default class Storage<T> {
  private readonly id: string;
  private readonly storage: Record<string, T>;

  constructor(id: string) {
    this.id = id;
    this.storage = ls.get(id) || {};
  }

  private save() {
    ls.set(this.id, this.storage);
  }

  set(key: string, value: T) {
    this.storage[key] = value;
    this.save();
  }

  get(key: string) {
    const value = this.storage[key];
    if (value) return value;
    else return undefined;
  }

  remove(key: string) {
    if (this.storage[key]) {
      delete this.storage[key];
      return true;
    } else return false;
  }

  keys() {
    return Object.keys(this.storage);
  }
}
