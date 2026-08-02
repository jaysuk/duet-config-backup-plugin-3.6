<template>
	<div>
		<div class="text-title-small mb-2">{{ $t("plugins.duetConfigBackup.configBackup.cloud.machinesHeading") }}</div>
		<v-progress-circular v-if="loading" indeterminate size="24" class="mb-2" />
		<div v-else-if="machines.length === 0" class="text-caption text--secondary mb-2">
			{{ $t("plugins.duetConfigBackup.configBackup.cloud.selectMachinePrompt") }}
		</div>
		<v-list v-else dense>
			<v-list-item v-for="item in machines" :key="item.key" :input-value="selected === item.key" @click="$emit('select', item.key)">
				<v-list-item-content>
					<v-list-item-title>
						{{ item.label }}
						<v-chip v-if="item.key === thisMachineKey" x-small color="primary" text class="ms-1">
							{{ $t("plugins.duetConfigBackup.configBackup.cloud.thisMachine") }}
						</v-chip>
					</v-list-item-title>
					<v-list-item-subtitle v-if="item.sublabel">{{ item.sublabel }}</v-list-item-subtitle>
				</v-list-item-content>
			</v-list-item>
		</v-list>
	</div>
</template>

<script>
// Vue 2 / Vuetify 2 port of Flexible Layouts' MachineList.vue. Vuetify 2's v-list-item requires an
// explicit <v-list-item-content> wrapper around title/subtitle (Vuetify 3/4 doesn't); "active" ->
// "input-value" is the v-list-item selection prop name in this version.
export default {
	name: "MachineList",
	props: {
		machines: { type: Array, required: true },
		loading: { type: Boolean, required: true },
		selected: { type: String, default: null },
		thisMachineKey: { type: String, required: true },
	},
};
</script>
