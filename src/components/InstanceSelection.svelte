<script lang="ts">
  import {getContext} from 'svelte';
  import App from '../App';
  import type Instance from '../stores/Instance';
  import Button from './ui/Button.svelte';
  import type {Context} from 'svelte-simple-modal';
  import {runInAction} from 'mobx';

  const {close} = getContext('simple-modal') as Context;

  function selectInstance(instance: Instance) {
    runInAction(() => {
      App.setCurrentInstance(instance);
      App.setCurrentUser(undefined);
    });
    close();
  }
</script>

{#each [...App.instances.values()] as instance}
  {#await instance.getConfiguration() then config}
    <div class="grid grid-flow-col items-center gap-2 py-3">
      <Button on:click={() => selectInstance(instance)}>
        {#if config.image}
          <img src={config.image} alt={`${config.instanceName} Logo`} />
        {/if}
        {config.instanceName}
      </Button>
      <p>{instance.domain}</p>
      <p>{config.instanceDescription}</p>
    </div>
  {/await}
{/each}
