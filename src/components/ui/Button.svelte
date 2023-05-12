<script lang="ts">
  export let type: 'button' | 'reset' | 'submit' = 'button';
</script>

<button
  class="rounded bg-amber-600 p-2 hover:bg-amber-700"
  {type}
  {...$$restProps}
  on:click
  on:dblclick>
  <slot />
</button>
