import axios from 'axios';
import type { Instance } from '../objects/Instance';

export class REST {
	public readonly instance: Instance;
	private token: string | undefined;

	constructor(instance: Instance) {
		this.instance = instance;
	}

	public setToken(token: string) {
		this.token = token;
	}

	private makeAPIUrl(path: string) {
		return new URL(`/api/${path}`, this.instance.domain).href;
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
