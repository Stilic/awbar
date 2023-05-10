<script lang="ts">
  import {XMarkIcon} from '@krowten/svelte-heroicons';

  export let onClose: () => void;
</script>

<button class="relative right-1 top-2 float-right" on:click={onClose}
  ><XMarkIcon class="h-5 w-5" solid /></button>
