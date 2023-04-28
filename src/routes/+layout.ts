import {redirect} from '@sveltejs/kit';
import type {LayoutLoad} from './$types';

const loginRoute = '/login';

export const load = (({route}) => {
  if (route.id !== loginRoute) throw redirect(307, loginRoute);
}) satisfies LayoutLoad;
