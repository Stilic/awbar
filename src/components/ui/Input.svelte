<script lang="ts">
  export let type: string | undefined;
</script>

{#if type == 'textarea'}
  <textarea {...$$restProps} on:change />
{:else}
  <input {type} {...$$restProps} on:change />
{/if}

<style lang="postcss">
  input,
  textarea {
    @apply rounded bg-neutral-800 p-1.5;
  }
</style>
