import {browser} from '$app/environment';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

export default class Storage<T> {
  private static readonly _encoder: TextEncoder = new TextEncoder();
  private static readonly _decoder: TextDecoder = new TextDecoder();

  private static _keyPromise: Promise<CryptoKey>;
  private readonly _initPromise: Promise<Record<string, T>>;

  readonly id: string;

  constructor(id: string) {
    this.id = id;

    if (!Storage._keyPromise) {
      const keyParams = {name: 'AES-CBC', length: 256};
      Storage._keyPromise = new Promise(resolve => {
        if (browser)
          FingerprintJS.load({monitoring: false})
            .then(agent => agent.get())
            .then(result =>
              crypto.subtle.importKey(
                'raw',
                Storage._encoder.encode(result.visitorId),
                'PBKDF2',
                false,
                ['deriveBits'],
              ),
            )
            .then(key =>
              crypto.subtle.deriveBits(
                {name: 'PBKDF2', salt: new Uint8Array(16), iterations: 100000, hash: 'SHA-256'},
                key,
                keyParams.length,
              ),
            )
            .then(key =>
              resolve(
                crypto.subtle.importKey('raw', key, keyParams, false, ['encrypt', 'decrypt']),
              ),
            );
      });
    }

    this._initPromise = new Promise(resolve => {
      Storage._keyPromise.then(key => {
        const savedStorage = localStorage.getItem(this.id);
        if (savedStorage) {
          const binary = atob(savedStorage);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          crypto.subtle
            .decrypt({name: 'AES-CBC', iv: bytes.slice(0, 16)}, key, bytes.slice(16))
            .then(buffer => resolve(JSON.parse(Storage._decoder.decode(buffer))));
        } else resolve({});
      });
    });
  }

  private async save(storage: Record<string, T>) {
    if (browser)
      Storage._keyPromise.then(key => {
        const iv = crypto.getRandomValues(new Uint8Array(16));
        crypto.subtle
          .encrypt({name: 'AES-CBC', iv}, key, Storage._encoder.encode(JSON.stringify(storage)))
          .then(buffer => {
            const bytes = new Uint8Array(buffer);
            const value = new Uint8Array(iv.length + bytes.length);
            value.set(iv);
            value.set(bytes, iv.length);
            localStorage.setItem(this.id, btoa(String.fromCharCode(...value)));
          });
      });
  }

  async set(key: string, value: T) {
    const storage = await this._initPromise;
    storage[key] = value;
    this.save(storage);
  }

  async get(key: string) {
    const value = (await this._initPromise)[key];
    if (value) return value;
    else return undefined;
  }

  async remove(key: string) {
    const storage = await this._initPromise;
    if (storage[key]) {
      delete storage[key];
      this.save(storage);
      return true;
    } else return false;
  }

  async keys() {
    return Object.keys(await this._initPromise);
  }
}
