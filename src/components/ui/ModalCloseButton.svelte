<script lang="ts">
  import {UilMultiply} from 'svelte-unicons';

  export let onClose: () => void;
</script>

<button class="relative right-1 top-2 float-right" on:click={onClose}><UilMultiply /></button>
