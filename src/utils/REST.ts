import axios, {AxiosHeaders} from 'axios';
/*
import { persisted } from 'svelte-local-storage-store';
import { get, type Writable } from 'svelte/store';
*/
import type Instance from '../objects/Instance';

// type TokenStore = Record<string, Record<string, string>>;

export default class REST {
  // private static tokenStore: Writable<TokenStore> = persisted<TokenStore>('tokens', {});

  readonly instance: Instance;

  constructor(instance: Instance) {
    this.instance = instance;

    /*
		const token?: string = get(REST.tokenStore)[this.user.instance.domain][
			this.user.tag
		];
		if (token) {
			this.token = token;
			console.log('loaded token for ' + this.user.instanceTag);
		}
		*/
  }

  /*
	setToken(token: string) {
		this.token = token;

		const tokens: TokenStore = get(REST.tokenStore);
		tokens[this.user.instance.domain][this.user.tag] = token;
		REST.tokenStore.set(tokens);
	}
	*/

  private makeAPIUrl(path: string) {
    return new URL(`/api/${path}`, `https://${this.instance.domain}`).href;
  }

  async get<T>(path: string, queryParams: Record<string, any> = {}, token?: string): Promise<T> {
    const headers = new AxiosHeaders();
    if (token) headers.setAuthorization(token);
    return new Promise((resolve, reject) => {
      return axios
        .get(this.makeAPIUrl(path), {
          params: queryParams,
          headers: headers,
        })
        .then(r => resolve(r.data))
        .catch(reject);
    });
  }

  async post<T, U>(
    path: string,
    data?: T,
    queryParams: Record<string, any> = {},
    token?: string,
  ): Promise<U> {
    const headers = new AxiosHeaders();
    if (token) headers.setAuthorization(token);
    return new Promise((resolve, reject) => {
      return axios
        .post(this.makeAPIUrl(path), data, {
          params: queryParams,
          headers: headers,
        })
        .then(r => resolve(r.data))
        .catch(reject);
    });
  }
}
