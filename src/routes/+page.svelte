<script lang="ts">
	import { Globals } from '../Globals';

	const data: any = Globals.instance.rest.get('ping');
</script>

{#await data then d}
	<p>{Globals.instance.domain}</p>
	<p>Instance name: {d.instance.name}</p>
	<p>Instance name: {d.instance.description}</p>
{/await}
