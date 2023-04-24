<script lang="ts">
  import {createForm} from 'svelte-forms-lib';
  import type GatewayConnection from '../../stores/GatewayConnection';
  import App from '../../App';

  const {form, handleChange, handleSubmit} = createForm({
    initialValues: {
      email: '',
      password: '',
    },
    onSubmit: values => {
      App.getCurrentInstance()
        ?.createConnection({
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
