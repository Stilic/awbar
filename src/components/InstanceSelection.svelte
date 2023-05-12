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

<div class="flex flex-col justify-center gap-3 py-3">
  {#each [...App.instances.values()] as instance}
    {#await instance.getConfiguration() then config}
      <Button on:click={() => selectInstance(instance)}>
        <div class="flex min-h-[2.5rem] items-center gap-2 text-left">
          {#if config.image}
            <img class="inline w-10" src={config.image} alt={`${config.instanceName} Logo`} />
          {/if}
          <p><b>{config.instanceName}</b></p>
          <p class="ml-auto truncate text-right">{config.instanceDescription}</p>
        </div>
      </Button>
    {/await}
  {/each}
</div>
