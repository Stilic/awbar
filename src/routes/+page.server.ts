import { Globals } from '../Globals';
import type { Actions } from './$types';
import axios from 'axios';

export const actions = {
	default: async ({ request }) => {
		const rep = { success: false };
		const data = await request.formData();
		await axios
			.post(Globals.instanceURL + '/auth/login', {
				login: data.get('email'),
				password: data.get('password'),
				undelete: false
			})
			.then((r) => {
				if (r.data.token) {
					rep.success = true;
					Globals.token.set(r.data.token);
				}
			})
			.catch((reason) => {
				console.log(reason);
			});
		return rep;
	}
} satisfies Actions;
