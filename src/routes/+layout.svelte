<script lang="ts">
  import {reaction} from 'mobx';
  import App from '../App';

  let user = App.currentUser;
  if (!user) {
    const readyReaction = reaction(
      () => App.currentUser,
      value => {
        user = value;
        readyReaction();
      },
    );
  }
</script>

{#if user}
  <slot />
{:else}
  <p>Loading...</p>
{/if}
