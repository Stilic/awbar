<script lang="ts">
  import {createForm} from 'svelte-forms-lib';
  import Globals from '../../Globals';
  import type GatewayConnection from '../../stores/GatewayConnection';

  const {form, handleChange, handleSubmit} = createForm({
    initialValues: {
      email: '',
      password: '',
    },
    onSubmit: values => {
      Globals.instance
        .createConnection({
          login: values.email,
          password: values.password,
          undelete: false,
        })
        .then((connection: GatewayConnection) => {
          console.log(connection);
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
