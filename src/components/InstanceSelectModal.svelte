<script lang="ts">
  import type Instance from '../stores/Instance';
  import {getContext} from 'svelte';
  import App from '../App';
  import Button from './ui/Button.svelte';
  import type {Context} from 'svelte-simple-modal';

  const {close} = getContext('simple-modal') as Context;

  export let onInstanceSelection: (instance: Instance) => void;
</script>

<h1 class="mb-3">Select your instance</h1>

<div class="flex flex-col justify-center gap-3 py-3">
  {#each [...App.instances.values()] as instance}
    {#await instance.getConfiguration() then config}
      <Button
        on:click={() => {
          if (onInstanceSelection) onInstanceSelection(instance);
          close();
        }}>
        <div class="flex flex-col items-center gap-2 md:flex-row">
          {#if config.image}
            <img class="inline w-12" src={config.image} alt={`${config.instanceName} Logo`} />
          {/if}
          <div class="grow sm:text-left">
            <p><b>{config.instanceName}</b></p>
            <p>{config.instanceDescription}</p>
          </div>
          <p class="truncate sm:ml-2">
            <i>{instance.domain}</i>
          </p>
        </div>
      </Button>
    {/await}
  {/each}
</div>
