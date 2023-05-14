<script lang="ts">
  import HCaptcha from 'svelte-hcaptcha';

  export let siteKey: string;
  export let successCallback: (token: string) => void;

  let captcha: HCaptcha;

  function callback(e: CustomEvent) {
    captcha.reset();
    if ('token' in e.detail) successCallback(e.detail.token);
  }
</script>

<div class="flex flex-col items-center gap-3 text-center">
  <div>
    <h1>Let's check if you aren't a robot!</h1>
    <h3><i>Beep boop. Boop beep? </i></h3>
  </div>
  <HCaptcha sitekey={siteKey} on:success={callback} bind:this={captcha} />
</div>
