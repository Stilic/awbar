import { REST } from '../utils/REST';

export class Instance {
	public readonly domain: string;
	public readonly rest: REST;

	constructor(domain: string) {
		this.domain = domain;
		this.rest = new REST(this);
	}
}
