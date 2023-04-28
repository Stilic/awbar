import type {LayoutLoad} from './$types';
import App from '../App';
import {browser} from '$app/environment';
import {goto} from '$app/navigation';

export const load = (({route}) => {
  if (browser && !App.currentUser && route.id !== '/login') throw goto('/login');
}) satisfies LayoutLoad;
