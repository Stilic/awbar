<script lang="ts">
  import Modal from 'svelte-simple-modal';
  import ModalContent from './ModalContent.svelte';
  import type {SvelteComponent} from 'svelte';
  import ModalCloseButton from './ModalCloseButton.svelte';

  let content: ModalContent;

  export function open(component: typeof SvelteComponent, props?: Record<string, any>) {
    content.context.open(component, props || {});
  }

  export function close() {
    content.context.close();
  }
</script>

<Modal
  unstyled={true}
  classBg="fixed top-0 left-0 w-screen h-screen flex flex-col justify-center bg-black/[.35]"
  classWindowWrap="relative max-h-full"
  classWindow="relative flex flex-col sm:w-2/5 sm:h-min sm:rounded sm:my-2 w-screen h-screen mx-auto shadow-md bg-neutral-700"
  classContent="relative p-3 pt-0 overflow-auto"
  closeButton={ModalCloseButton}><ModalContent bind:this={content}><slot /></ModalContent></Modal>
