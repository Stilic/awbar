<script lang="ts">
  import {reaction} from 'mobx';
  import App from '../App';
  import '../app.css';
  import {goto} from '$app/navigation';

  let ready: boolean = App.currentUser != undefined;
  if (!ready) {
    const readyReaction = reaction(
      () => App.currentUser,
      value => {
        ready = value != undefined;
        readyReaction();
      },
    );
    App.preferences.get('currentUser').then(value => {
      if (!value) goto('/login').then(() => (ready = true));
      else goto('/channels/@me');
    });
  }
</script>

{#if ready}
  <slot />
{:else}
  <div class="flex h-screen flex-col items-center justify-center">
    <h1>Awbar</h1>
    <p>Loading...</p>
  </div>
{/if}
