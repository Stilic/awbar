import type { APIUser } from '@puyodead1/fosscord-api-types/v9';

export class Instance {
	readonly domain: string;
	private token: string | undefined;

	account: APIUser | undefined;

	constructor(domain: string) {
		this.domain = domain;
	}

	setToken(token: string) {
		this.token = token;
	}

	setAccount(account: APIUser) {
		this.account = account;
	}
}
