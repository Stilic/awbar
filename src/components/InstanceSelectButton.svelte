<script lang="ts">
  import App from '../App';
  import Modal from './ui/Modal.svelte';
  import Button from './ui/Button.svelte';
  import InstanceSelectModal from './InstanceSelectModal.svelte';
  import type Instance from '../stores/Instance';

  let modal: Modal;

  export let currentInstance: Instance = App.instances.get(App.defaultInstance)!;

  function onClick() {
    modal.open(InstanceSelectModal, {
      onInstanceSelection: (instance: Instance) => (currentInstance = instance),
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
