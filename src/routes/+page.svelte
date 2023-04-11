<script type="ts">
	import { Globals } from '../Globals';

	async function getData() {
		console.log(await Globals.instance.rest.get('ping'));
	}
	getData();
</script>

<p>Test Page</p>
