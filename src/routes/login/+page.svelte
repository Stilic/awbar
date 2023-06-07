<script lang="ts">
  import {createForm} from 'svelte-forms-lib';
  import App from '../../App';
  import type {
    APILoginRequest,
    APILoginResponse,
    APILoginResponseError,
  } from '../../utils/interfaces/api';
  import Button from '../../components/ui/Button.svelte';
  import Container from '../../components/ui/Container.svelte';
  import Input from '../../components/ui/Input.svelte';
  import type {AxiosError} from 'axios';
  import {Routes} from '@spacebarchat/spacebar-api-types/v9';
  import Captcha from '../../components/Captcha.svelte';
  import InstanceSelectButton from '../../components/InstanceSelectButton.svelte';
  import type Instance from '../../stores/Instance';
  import {reaction} from 'mobx';
  import {goto} from '$app/navigation';

  let currentInstance: Instance;

  let captchaSiteKey: string | undefined;

  const {form, handleChange, handleSubmit} = createForm({
    initialValues: {
      login: '',
      password: '',
    },
    onSubmit: v => submit(v.login, v.password),
  });

  function submit(login: string, password: string, captcha_key?: string) {
    if (currentInstance)
      currentInstance.rest
        .post<APILoginRequest, APILoginResponse>(Routes.login(), {
          login: login,
          password: password,
          captcha_key: captcha_key,
          undelete: false,
        })
        .then(r => {
          // TODO: add support for mfa
          if ('token' in r && 'settings' in r) {
            const connection = currentInstance.addConnection(r.token);
            const readyReaction = reaction(
              () => connection.ready,
              value => {
                if (value) {
                  App.setCurrentUser(connection.user);
                  goto('/channels/@me');
                  readyReaction();
                }
              },
            );
          } else console.error('error on login');
        })
        .catch((r: AxiosError<APILoginResponseError>) => {
          // TODO: add support for other captcha services
          if (r.response && 'captcha_key' in r.response.data) {
            // captcha required
            if (r.response.data.captcha_key[0] !== 'captcha-required')
              console.error('captcha error');
            else if (r.response.data.captcha_service !== 'hcaptcha')
              // recaptcha or something else
              console.error('unsupported captcha service');
            // hcaptcha
            else captchaSiteKey = r.response.data.captcha_sitekey;
          }
        });
  }

  function handleCaptchaSucess(token: string) {
    captchaSiteKey = undefined;
    submit($form.login, $form.password, token);
  }
</script>

<Container>
  {#if captchaSiteKey}
    <Captcha siteKey={captchaSiteKey} successCallback={handleCaptchaSucess} />
  {:else}
    <h1>Welcome back to Awbar!</h1>
    <h3><i>It's great to see you again!</i></h3>

    <div class="my-3">
      <p>Connect to</p>
      <InstanceSelectButton bind:currentInstance />
    </div>

    <form class="flex flex-col space-y-2" on:submit={handleSubmit}>
      <label for="login">Email</label>
      <Input
        id="login"
        name="login"
        type="email"
        on:change={handleChange}
        bind:value={$form.login} />

      <label for="password">Password</label>
      <Input
        id="password"
        name="password"
        type="password"
        on:change={handleChange}
        bind:value={$form.password} />

      <a href="https://youareanidiot.cc">Forgot your password?</a>

      <div class="!mt-3 flex flex-col gap-2">
        <Button type="submit">Login</Button>
        <p>
          Don't have an account? <a href="/register">Sign up</a>
        </p>
      </div>
    </form>
  {/if}
</Container>
