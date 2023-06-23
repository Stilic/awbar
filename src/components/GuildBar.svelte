<script lang="ts">
  import App from "../App";

</script>
{#each [...App.currentUser.instance.guilds.values()] as guild}
	{guild.name}
{/each}