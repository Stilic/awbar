import { writable, type Writable } from 'svelte/store';

export class Globals {
	public static readonly instanceURL: string = 'https://spacebar.stilic.ml/api';
	public static readonly token: Writable<string> = writable();
}
