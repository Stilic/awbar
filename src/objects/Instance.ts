import type { APIUser } from 'discord-api-types/v9';

export class Instance {
	public readonly domain: string;
	public readonly account: APIUser | undefined;

	constructor(domain: string) {
		this.domain = domain;
	}
}
