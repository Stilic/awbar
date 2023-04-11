import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';

export const load = (({ route }) => {
	if (route.id !== '/login') throw redirect(307, '/login');
}) satisfies LayoutLoad;
