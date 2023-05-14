<script lang="ts">
  export let type:
    | 'button'
    | 'checkbox'
    | 'color'
    | 'date'
    | 'email'
    | 'file'
    | 'hidden'
    | 'image'
    | 'month'
    | 'number'
    | 'password'
    | 'radio'
    | 'range'
    | 'reset'
    | 'search'
    | 'submit'
    | 'tel'
    | 'text'
    | 'textarea'
    | 'time'
    | 'url'
    | 'week'
    | undefined;
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
