<script lang="ts">
  import {createForm} from 'svelte-forms-lib';
  import App from '../../App';
  import {reaction} from 'mobx';
  import type {
    APIInstancePolicies,
    APILoginResponse,
    APILoginResponseError,
    APIRegisterRequest,
  } from '../../utils/interfaces/api';
  import Button from '../../components/ui/Button.svelte';
  import Container from '../../components/ui/Container.svelte';
  import Input from '../../components/ui/Input.svelte';
  import Modal from '../../components/ui/Modal.svelte';
  import type {AxiosError} from 'axios';
  import InstanceSelection from '../../components/InstanceSelection.svelte';
  import {onDestroy} from 'svelte';
  import {Routes} from '@spacebarchat/spacebar-api-types/v9';
  import Captcha from '../../components/Captcha.svelte';

  let modal: Modal;

  let configuration: Promise<APIInstancePolicies>;
  if (App.currentInstance) configuration = App.currentInstance.getConfiguration();
  const currentInstanceReaction = reaction(
    () => App.currentInstance,
    instance => {
      if (instance) configuration = instance.getConfiguration();
    },
  );

  let captchaSiteKey: string | undefined;

  const {form, handleChange, handleSubmit} = createForm({
    initialValues: {
      email: '',
      username: '',
      password: '',
      date_of_birth: '',
    },
    onSubmit: v => submit(v.email, v.username, v.password, v.date_of_birth),
  });

  function submit(
    email: string,
    username: string,
    password: string,
    date_of_birth: string,
    captcha_key?: string,
  ) {
    if (App.currentInstance)
      App.currentInstance.rest
        .post<APIRegisterRequest, APILoginResponse>(Routes.register(), {
          email: email,
          username: username,
          password: password,
          date_of_birth: date_of_birth,
          captcha_key: captcha_key,
          consent: true,
        })
        .then(r => {
          // TODO: add support for mfa
          if ('token' in r && 'settings' in r) App.logIn(r.token);
          else console.error('error on register');
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
    submit($form.email, $form.username, $form.password, $form.date_of_birth, token);
  }

  onDestroy(() => {
    currentInstanceReaction();
  });
</script>

<Container>
  {#if captchaSiteKey}
    <Captcha siteKey={captchaSiteKey} successCallback={handleCaptchaSucess} />
  {:else}
    <h1>Create an account</h1>

    <Modal bind:this={modal}
      ><div class="my-3">
        <p>Create the account on</p>
        <Button on:click={() => modal.open(InstanceSelection)}>
          {#await configuration}
            ...
          {:then conf}
            {conf.instanceName}
          {/await}
        </Button>
      </div></Modal>

    <form class="flex flex-col space-y-2" on:submit={handleSubmit}>
      <label for="email">Email</label>
      <Input
        id="email"
        name="email"
        type="email"
        on:change={handleChange}
        bind:value={$form.email} />

      <label for="email">Username</label>
      <Input
        id="username"
        name="username"
        type="text"
        on:change={handleChange}
        bind:value={$form.username} />

      <label for="password">Password</label>
      <Input
        id="password"
        name="password"
        type="password"
        on:change={handleChange}
        bind:value={$form.password} />

      <label for="date_of_birth">Date of birth</label>
      <Input
        id="date_of_birth"
        name="date_of_birth"
        type="date"
        on:change={handleChange}
        bind:value={$form.date_of_birth} />

      <div class="!mt-3 flex flex-col gap-2">
        <Button type="submit">Sign up</Button>
        <p>
          Already have an account? <a href="/login">Log in</a>
        </p>
      </div>
    </form>
  {/if}
</Container>
