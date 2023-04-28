import axios, {AxiosHeaders} from 'axios';
/*
import { persisted } from 'svelte-local-storage-store';
import { get, type Writable } from 'svelte/store';
*/
import type Instance from '../stores/Instance';

export default class REST {
  private static readonly defaultHeaders: Record<string, string> = {
    mode: 'cors',
    accept: 'application/json',
    'Content-Type': 'application/json',
  };

  readonly instance: Instance;

  constructor(instance: Instance) {
    this.instance = instance;
  }

  private makeAPIUrl(path: string) {
    return new URL(`/api/${path}`, `https://${this.instance.domain}`).href;
  }

  async get<T>(path: string, queryParams: Record<string, any> = {}, token?: string): Promise<T> {
    const headers = new AxiosHeaders(REST.defaultHeaders);
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
    const headers = new AxiosHeaders(REST.defaultHeaders);
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
