<script lang="ts">
  import {createForm} from 'svelte-forms-lib';
  import App from '../../App';
  import {goto} from '$app/navigation';
  import {reaction} from 'mobx';
  import type {IAPILoginRequest, IAPILoginResponse} from '../../interfaces/api';

  const {form, handleChange, handleSubmit} = createForm({
    initialValues: {
      email: '',
      password: '',
    },
    onSubmit: values => {
      const instance = Array.from(App.instances.values())[0];
      instance.rest
        .post<IAPILoginRequest, IAPILoginResponse>('auth/login', {
          login: values.email,
          password: values.password,
          undelete: false,
        })
        .then(r => {
          if ('token' in r && 'settings' in r) {
            const connection = instance.addConnection(r.token);
            const ready = reaction(
              () => connection.ready,
              () => {
                if (connection.user) {
                  App.currentUser = connection.user;
                  goto('/channels/@me');
                  ready();
                }
              },
            );
          }
          //  else if ('ticket' in r)
          //   return resolve(r);
          else {
            console.error('error on login');
          }
        });
    },
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
    bind:value={$form.password} />

  <button type="submit">Submit</button>
</form>
