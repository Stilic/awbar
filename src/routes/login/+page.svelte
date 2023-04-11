<script lang="ts">
	import { Globals } from '../../Globals';
	import type { IAPILoginRequest, IAPILoginResponse } from '../../interfaces/api';
	import { createForm } from 'svelte-forms-lib';

	const { form, handleChange, handleSubmit } = createForm({
		initialValues: {
			email: '',
			password: ''
		},
		onSubmit: (values) => {
			Globals.instance.rest
				.post<IAPILoginRequest, IAPILoginResponse>('auth/login', {
					login: values.email,
					password: values.password,
					undelete: false
				})
				.then((r) => {
					// TODO: Implement MFA
					if ('token' in r && 'settings' in r) Globals.instance.rest.setToken(r.token);
					else console.error('error on login');
				});
		}
	});
</script>

<form on:submit={handleSubmit}>
	<label for="email">email</label>
	<input id="email" name="email" type="email" on:change={handleChange} bind:value={$form.email} />

	<label for="password">password</label>
	<input
		id="password"
		name="password"
		type="password"
		on:change={handleChange}
		bind:value={$form.password}
	/>

	<button type="submit">Submit</button>
</form>
