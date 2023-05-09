import axios, {AxiosHeaders} from 'axios';
/*
import { persisted } from 'svelte-local-storage-store';
import { get, type Writable } from 'svelte/store';
*/
import type Instance from '../stores/Instance';
import type {APIInstanceDomains} from '../interfaces/api';
import {Routes} from '@spacebarchat/spacebar-api-types/v9';

export default class REST {
  private static readonly _defaultHeaders: Record<string, string> = {
    mode: 'cors',
    accept: 'application/json',
    'Content-Type': 'application/json',
    'Upgrade-Insecure-Requests': '1',
    'Content-Security-Policy': 'upgrade-insecure-requests',
  };

  readonly instance: Instance;
  private readonly _domains: Promise<APIInstanceDomains>;

  constructor(instance: Instance) {
    this.instance = instance;
    this._domains = axios
      .get<APIInstanceDomains>(
        new URL(`/api${Routes.instanceDomains()}`, `http://${this.instance.domain}`).href,
        {
          headers: REST._defaultHeaders,
        },
      )
      .then(r => r.data);
  }

  async getGatewayUrl(): Promise<string> {
    return this._domains.then(domains => domains.gateway);
  }

  private async makeAPIUrl(path: string) {
    const url = new URL((await this._domains).apiEndpoint);
    url.pathname += `/${path}`;
    return url.href;
  }

  async get<T>(path: string, queryParams: Record<string, any> = {}, token?: string): Promise<T> {
    const headers = new AxiosHeaders(REST._defaultHeaders);
    if (token) headers.setAuthorization(token);
    return axios
      .get(await this.makeAPIUrl(path), {
        params: queryParams,
        headers: headers,
      })
      .then(r => r.data);
  }

  async post<T, U>(
    path: string,
    data?: T,
    queryParams: Record<string, any> = {},
    token?: string,
  ): Promise<U> {
    const headers = new AxiosHeaders(REST._defaultHeaders);
    if (token) headers.setAuthorization(token);
    return axios
      .post(await this.makeAPIUrl(path), data, {
        params: queryParams,
        headers: headers,
      })
      .then(r => r.data);
  }
}
