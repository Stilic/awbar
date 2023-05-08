<script lang="ts">
  import {createForm} from 'svelte-forms-lib';
  import App from '../../App';
  import {goto} from '$app/navigation';
  import {reaction} from 'mobx';
  import type {
    IAPILoginRequest,
    IAPILoginResponse,
    IAPILoginResponseError,
  } from '../../interfaces/api';
  import Button from '../../components/Button.svelte';
  import Container from '../../components/Container.svelte';
  import Input from '../../components/Input.svelte';
  import HCaptcha from 'svelte-hcaptcha';
  import type Instance from '../../stores/Instance';
  import type {AxiosError} from 'axios';

  let instance: Instance = Array.from(App.instances.values())[0];
  let captchaSiteKey: string | undefined;
  let captcha: HCaptcha;

  const {form, handleChange, handleSubmit} = createForm({
    initialValues: {
      email: '',
      password: '',
    },
    onSubmit: v => submit(v.email, v.password),
  });

  function submit(email: string, password: string, captcha_key?: string) {
    instance.rest
      .post<IAPILoginRequest, IAPILoginResponse>('auth/login', {
        login: email,
        password: password,
        captcha_key: captcha_key,
        undelete: false,
      })
      .then(r => {
        // TODO: add support for mfa
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
        } else {
          console.error('error on login');
        }
      })
      .catch((r: AxiosError<IAPILoginResponseError>) => {
        // TODO: add support for other captcha services
        if (r.response) {
          if ('captcha_key' in r.response.data) {
            // captcha required
            if (r.response.data.captcha_key[0] !== 'captcha-required') {
              console.error('captcha error');
            } else if (r.response.data.captcha_service !== 'hcaptcha') {
              // recaptcha or something else
              console.error('unsupported captcha service');
            } else {
              // hcaptcha
              captchaSiteKey = r.response.data.captcha_sitekey;
            }
          }
        }
      });
  }

  function handleCaptchaSucess(e: CustomEvent) {
    captcha.reset();
    captchaSiteKey = undefined;
    submit($form.email, $form.password, e.detail.token);
  }
</script>

<Container>
  {#if captchaSiteKey}
    <h1>Let's check if you aren't a robot!</h1>
    <br />
    <div class="flex flex-col items-center">
      <HCaptcha sitekey={captchaSiteKey} on:success={handleCaptchaSucess} bind:this={captcha} />
    </div>
  {:else}
    <h1>Welcome back to Awbar!</h1>
    <h3>It's great to see you again!</h3>

    <form class="mt-6 flex flex-col space-y-3" on:submit={handleSubmit}>
      <label for="instance">Connect to</label>
      <Button type="button">{instance ? instance.domain : '...'}</Button>

      <label for="email">Email</label>
      <Input
        id="email"
        name="email"
        type="email"
        on:change={handleChange}
        bind:value={$form.email} />

      <label for="password">Password</label>
      <Input
        id="password"
        name="password"
        type="password"
        on:change={handleChange}
        bind:value={$form.password} />

      <a>Forgot your password?</a>

      <Button type="submit">Submit</Button>
    </form>
  {/if}
</Container>
