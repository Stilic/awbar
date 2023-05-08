<script lang="ts">
  import {createForm} from 'svelte-forms-lib';
  import App from '../../App';
  import {goto} from '$app/navigation';
  import {reaction} from 'mobx';
  import type {IAPILoginRequest, IAPILoginResponse} from '../../interfaces/api';
  import Button from '../../components/Button.svelte';
  import type Instance from '../../stores/Instance';

  let instance: Instance = Array.from(App.instances.values())[0];
  const {form, handleChange, handleSubmit} = createForm({
    initialValues: {
      email: '',
      password: '',
    },
    onSubmit: values => {
      instance.rest
        .post<IAPILoginRequest, IAPILoginResponse>('auth/login', {
          login: values.email,
          password: values.password,
          undelete: false,
        })
        .then(r => {
          if ('token' in r && 'settings' in r) {
            const connection = instance.addConnection(r.token);
            const readyReaction = reaction(
              () => connection.ready,
              value => {
                if (value) {
                  goto('/channels/@me');
                  readyReaction();
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
  <label for="instance">Connect to</label>
  <Button type="button">{instance ? instance.domain : '...'}</Button>

  <label for="email">Email</label>
  <input id="email" name="email" type="email" on:change={handleChange} bind:value={$form.email} />

  <label for="password">Password</label>
  <input
    id="password"
    name="password"
    type="password"
    on:change={handleChange}
    bind:value={$form.password} />

  <!-- <a>I forgot my password</a> -->

  <Button>Submit</Button>
</form>
