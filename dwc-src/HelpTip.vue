<template>
	<v-tooltip top>
		<template #activator="{ on, attrs }">
			<a v-if="href" :href="href" target="_blank" rel="noopener" v-bind="attrs" v-on="on">
				<v-icon small class="ms-1">mdi-help-circle-outline</v-icon>
			</a>
			<v-icon v-else small class="ms-1" v-bind="attrs" v-on="on">mdi-help-circle-outline</v-icon>
		</template>
		<span>{{ text }}</span>
	</v-tooltip>
</template>

<script>
// Vuetify-2 replacement for dwc-plugin-runtime's <HelpTip> (a Vue 3 component, not usable here) - a
// small info icon + tooltip, optionally click-through to a docs link.
export default {
	name: "HelpTip",
	props: {
		text: { type: String, required: true },
		href: { type: String, default: null },
	},
};
</script>
