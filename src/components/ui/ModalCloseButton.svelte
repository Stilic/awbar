<script lang="ts">
  import {XMarkIcon} from '@krowten/svelte-heroicons';

  export let onClose: () => void;
</script>

<button type="button" class="mr-0.5 mt-1 self-end" on:click={onClose}
  ><XMarkIcon class="h-5 w-5" solid /></button>
