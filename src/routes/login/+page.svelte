<script lang="ts">
  import {createForm} from 'svelte-forms-lib';
  import App from '../../App';
  import {goto} from '$app/navigation';
  import {reaction} from 'mobx';
  import type {
    APIInstanceConfiguration,
    APILoginRequest,
    APILoginResponse,
    APILoginResponseError,
  } from '../../interfaces/api';
  import Button from '../../components/ui/Button.svelte';
  import Container from '../../components/ui/Container.svelte';
  import Input from '../../components/ui/Input.svelte';
  import Modal from '../../components/ui/Modal.svelte';
  import HCaptcha from 'svelte-hcaptcha';
  import type {AxiosError} from 'axios';
  import InstanceSelection from '../../components/InstanceSelection.svelte';
  import {onDestroy} from 'svelte';
  import type Instance from '../../stores/Instance';

  let modal: Modal;

  let configuration: APIInstanceConfiguration | undefined;
  function updateConfiguration(instance?: Instance) {
    if (instance) instance.getConfiguration().then(config => (configuration = config));
    else configuration = undefined;
  }
  const currentInstanceReaction = reaction(() => App.currentInstance, updateConfiguration);
  updateConfiguration(App.currentInstance);

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
    if (App.currentInstance)
      App.currentInstance.rest
        .post<APILoginRequest, APILoginResponse>('auth/login', {
          login: email,
          password: password,
          captcha_key: captcha_key,
          undelete: false,
        })
        .then(r => {
          // TODO: add support for mfa
          if ('token' in r && 'settings' in r) {
            const connection = App.currentInstance!.addConnection(r.token);
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
        .catch((r: AxiosError<APILoginResponseError>) => {
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

  function openInstanceSelection() {
    modal.open(InstanceSelection);
  }

  onDestroy(() => {
    currentInstanceReaction();
  });
</script>

<Container>
  {#if captchaSiteKey}
    <h1>Let's check if you aren't a robot!</h1>
    <br />
    <div class="flex items-center">
      <HCaptcha sitekey={captchaSiteKey} on:success={handleCaptchaSucess} bind:this={captcha} />
    </div>
  {:else}
    <h1>Welcome back to Awbar!</h1>
    <h3>It's great to see you again!</h3>

    <Modal bind:this={modal}
      ><div class="my-2">
        <p>Connect to</p>
        <Button on:click={openInstanceSelection}>
          {#if configuration}
            {#if configuration.image}
              <img src={configuration.image} alt={`${configuration.instanceName} Logo`} />
            {/if}
            {configuration.instanceName}
          {:else}
            ...
          {/if}
        </Button>
      </div></Modal>

    <form class="mt-3 flex flex-col space-y-2" on:submit={handleSubmit}>
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
