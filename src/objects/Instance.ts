// import type { APIUser } from 'discord-api-types/v9';
import { REST } from '../utils/REST';

export class Instance {
	public readonly domain: string;

	// public readonly account: APIUser | undefined;
	public readonly rest: REST;

	constructor(domain: string) {
		this.domain = domain;
		this.rest = new REST(this);
	}
}
