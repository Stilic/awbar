import {browser} from '$app/environment';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

export default class Storage<T> {
  private static readonly encoder: TextEncoder = new TextEncoder();
  private static readonly decoder: TextDecoder = new TextDecoder();

  private static encryptKey?: CryptoKey;

  readonly id: string;
  private storage: Record<string, T>;

  constructor(id: string, onReady?: (storage: Storage<T>) => void) {
    this.id = id;
    this.storage = {};

    if (browser) {
      const load = () => {
        const savedStorage = localStorage.getItem(this.id);
        if (savedStorage) {
          const binary = atob(savedStorage);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          crypto.subtle
            .decrypt(
              {name: 'AES-CBC', iv: bytes.slice(0, 16)},
              Storage.encryptKey!,
              bytes.slice(16),
            )
            .then(buffer => {
              this.storage = JSON.parse(Storage.decoder.decode(buffer));
              if (onReady) onReady(this);
            });
        }
      };

      if (!Storage.encryptKey)
        FingerprintJS.load({monitoring: false}).then(agent =>
          agent.get().then(result => {
            crypto.subtle
              .importKey('raw', Storage.encoder.encode(result.visitorId), 'PBKDF2', false, [
                'deriveBits',
              ])
              .then(key => {
                const keyParams = {name: 'AES-CBC', length: 256};
                crypto.subtle
                  .deriveBits(
                    {name: 'PBKDF2', salt: new Uint8Array(16), iterations: 100000, hash: 'SHA-256'},
                    key,
                    keyParams.length,
                  )
                  .then(key => {
                    crypto.subtle
                      .importKey('raw', key, keyParams, false, ['encrypt', 'decrypt'])
                      .then(key => {
                        Storage.encryptKey = key;
                        load();
                      });
                  });
              });
          }),
        );
      else load();
    }
  }

  set(key: string, value: T) {
    this.storage[key] = value;

    if (browser) {
      const iv = crypto.getRandomValues(new Uint8Array(16));
      crypto.subtle
        .encrypt(
          {name: 'AES-CBC', iv},
          Storage.encryptKey!,
          Storage.encoder.encode(JSON.stringify(this.storage)),
        )
        .then(buffer => {
          const bytes = new Uint8Array(buffer);
          const value = new Uint8Array(iv.length + bytes.length);
          value.set(iv);
          value.set(bytes, iv.length);
          localStorage.setItem(this.id, btoa(String.fromCharCode(...value)));
        });
    }
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
