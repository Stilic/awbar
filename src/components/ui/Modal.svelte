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
  closeOnOuterClick={false}
  unstyled={true}
  classBg="fixed top-0 left-0 w-screen h-screen flex flex-col justify-center bg-black/[.35]"
  classWindowWrap="relative max-h-full"
  classWindow="relative sm:w-2/5 max-h-full my-2 mx-auto text-orange-200 rounded shadow-md bg-slate-800"
  classContent="relative p-3 pl-8 overflow-auto"
  closeButton={ModalCloseButton}><ModalContent bind:this={content}><slot /></ModalContent></Modal>
