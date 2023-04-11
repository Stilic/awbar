import axios from 'axios';
import type { Instance } from '../objects/Instance';
import { persisted } from 'svelte-local-storage-store';
import { get, type Writable } from 'svelte/store';

export class REST {
	private static tokenStore: Writable<Record<string, string>> = persisted<Record<string, string>>(
		'instancesTokens',
		{}
	);

	public readonly instance: Instance;
	private token: string | undefined;

	constructor(instance: Instance) {
		this.instance = instance;

		const tokens: Record<string, string> = get(REST.tokenStore);
		if (tokens[instance.domain]) {
			this.token = tokens[instance.domain];
			console.log('loaded token for ' + this.instance.domain);
		}
	}

	public setToken(token: string) {
		this.token = token;

		const tokens: Record<string, string> = get(REST.tokenStore);
		tokens[this.instance.domain] = token;
		REST.tokenStore.set(tokens);
	}

	private makeAPIUrl(path: string) {
		return new URL(`/api/${path}`, `https://${this.instance.domain}`).href;
	}

	public async get<T>(path: string, queryParams: Record<string, any> = {}): Promise<T> {
		return new Promise((resolve, reject) => {
			return axios
				.get(this.makeAPIUrl(path), {
					params: queryParams,
					headers: { Authorization: this.token }
				})
				.then((res) => resolve(res.data))
				.catch(reject);
		});
	}

	public async post<T, U>(
		path: string,
		data?: T,
		queryParams: Record<string, any> = {}
	): Promise<U> {
		return new Promise((resolve, reject) => {
			return axios
				.post(this.makeAPIUrl(path), data, {
					params: queryParams,
					headers: { Authorization: this.token }
				})
				.then((res) => resolve(res.data))
				.catch(reject);
		});
	}
}
