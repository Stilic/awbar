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

<h1>Select your instance</h1>

<div class="grid grid-cols-3 items-center gap-3 py-3">
  {#each [...App.instances.values()] as instance}
    {#await instance.getConfiguration() then config}
      <Button on:click={() => selectInstance(instance)}>
        {#if config.image}
          <img src={config.image} alt={`${config.instanceName} Logo`} />
        {/if}
        {config.instanceName}
      </Button>
      <p class="truncate">{instance.domain}</p>
      <p class="text-left">{config.instanceDescription}</p>
    {/await}
  {/each}
</div>
