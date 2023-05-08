<script lang="ts">
  import {getContext} from 'svelte';
  import type {Context} from 'svelte-simple-modal';

  export const context = getContext('simple-modal') as Context;
</script>

<slot />
