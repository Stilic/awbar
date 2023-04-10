import type { Instance } from "../objects/Instance";

export class REST {
	readonly instance:Instance;

	constructor(instance:Instance) {
		this.instance = instance;
	}
}