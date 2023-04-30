import type {LayoutLoad} from './$types';
import App from '../App';
import {browser} from '$app/environment';

export const load = (() => {
  if (browser && !App.initialized) App.init();
}) satisfies LayoutLoad;
