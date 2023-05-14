<script lang="ts">
  import {createForm} from 'svelte-forms-lib';
  import App from '../../App';
  import {reaction} from 'mobx';
  import type {
    APIInstancePolicies,
    APILoginRequest,
    APILoginResponse,
    APILoginResponseError,
  } from '../../utils/interfaces/api';
  import Button from '../../components/ui/Button.svelte';
  import Container from '../../components/ui/Container.svelte';
  import Input from '../../components/ui/Input.svelte';
  import Modal from '../../components/ui/Modal.svelte';
  import type {AxiosError} from 'axios';
  import InstanceSelection from '../../components/InstanceSelection.svelte';
  import {onDestroy} from 'svelte';
  import type Instance from '../../stores/Instance';
  import {Routes} from '@spacebarchat/spacebar-api-types/v9';
  import Captcha from '../../components/Captcha.svelte';

  let modal: Modal;

  let configuration: APIInstancePolicies | undefined;
  function updateConfiguration(instance?: Instance) {
    if (instance) instance.getConfiguration().then(config => (configuration = config));
    else configuration = undefined;
  }
  const currentInstanceReaction = reaction(() => App.currentInstance, updateConfiguration);
  updateConfiguration(App.currentInstance);

  let captchaSiteKey: string | undefined;

  const {form, handleChange, handleSubmit} = createForm({
    initialValues: {
      login: '',
      password: '',
    },
    onSubmit: v => submit(v.login, v.password),
  });

  function submit(login: string, password: string, captcha_key?: string) {
    console.log(login, password);
    if (App.currentInstance)
      App.currentInstance.rest
        .post<APILoginRequest, APILoginResponse>(Routes.login(), {
          login: login,
          password: password,
          captcha_key: captcha_key,
          undelete: false,
        })
        .then(r => {
          // TODO: add support for mfa
          if ('token' in r && 'settings' in r) App.logIn(r.token);
          else console.error('error on login');
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

  onDestroy(() => {
    currentInstanceReaction();
  });
</script>

<Container>
  {#if captchaSiteKey}
    <Captcha siteKey={captchaSiteKey} successCallback={handleCaptchaSucess} />
  {:else}
    <h1>Welcome back to Awbar!</h1>
    <h3><i>It's great to see you again!</i></h3>

    <Modal bind:this={modal}
      ><div class="my-3">
        <p>Connect to</p>
        <Button on:click={() => modal.open(InstanceSelection)}>
          {#if configuration}
            {configuration.instanceName}
          {:else}
            ...
          {/if}
        </Button>
      </div></Modal>

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
