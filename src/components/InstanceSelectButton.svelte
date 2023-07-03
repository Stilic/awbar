<script lang="ts" context="module">
  let _instance: Instance = App.instances.get(App.defaultInstance)!;
</script>

<script lang="ts">
  import App from '../App';
  import Modal from './ui/Modal.svelte';
  import Button from './ui/Button.svelte';
  import InstanceSelectModal from './InstanceSelectModal.svelte';
  import type Instance from '../stores/Instance';

  let modal: Modal;

  export let currentInstance: Instance = _instance;

  function onClick() {
    modal.open(InstanceSelectModal, {
      onInstanceSelection: (instance: Instance) => (currentInstance = _instance = instance),
    });
  }
</script>

<Modal bind:this={modal}>
  <Button on:click={onClick}>
    {#await currentInstance.getConfiguration()}
      ...
    {:then conf}
      {conf.instanceName}
    {/await}
  </Button>
</Modal>
