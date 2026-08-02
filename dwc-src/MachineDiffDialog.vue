<template>
	<v-dialog :value="modelValue" max-width="600" @input="$emit('update:modelValue', $event)">
		<v-card>
			<v-card-title class="d-flex align-center">
				<v-icon class="me-2" :color="diff.sameMachine ? 'info' : 'warning'">
					{{ diff.sameMachine ? "mdi-check-decagram-outline" : "mdi-swap-horizontal" }}
				</v-icon>
				{{ $t("plugins.duetConfigBackup.configBackup.restore.diffHeading") }}
			</v-card-title>
			<v-card-text>
				<v-alert :type="diff.sameMachine ? 'info' : 'warning'" text dense class="mb-3">
					{{ diff.sameMachine
						? $t("plugins.duetConfigBackup.configBackup.restore.diffSameMachine")
						: $t("plugins.duetConfigBackup.configBackup.restore.diffDifferentMachine", { hostname: backupHostname }) }}
				</v-alert>

				<v-simple-table dense>
					<template #default>
						<thead>
							<tr>
								<th></th>
								<th>{{ $t("plugins.duetConfigBackup.configBackup.restore.diffColumnBackup") }}</th>
								<th>{{ $t("plugins.duetConfigBackup.configBackup.restore.diffColumnLive") }}</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="(row, i) in diff.rows" :key="i">
								<td class="text-caption">
									<v-icon size="14" class="me-1" :color="severityColor(row.severity)">{{ severityIcon(row.severity) }}</v-icon>
									{{ row.label }}
								</td>
								<td class="text-caption">{{ row.backupValue }}</td>
								<td class="text-caption">{{ row.liveValue }}</td>
							</tr>
						</tbody>
					</template>
				</v-simple-table>

				<template v-if="diff.missingDriverRefs.length > 0">
					<div class="text-title-small mt-4 mb-1">
						{{ $t("plugins.duetConfigBackup.configBackup.restore.diffDriverRefsHeading") }}
					</div>
					<v-alert v-for="(ref, i) in diff.missingDriverRefs" :key="i" type="warning" text dense class="mb-1">
						{{ ref }}
					</v-alert>
				</template>
			</v-card-text>
			<v-divider />
			<v-card-actions>
				<v-spacer />
				<v-btn text color="primary" @click="$emit('update:modelValue', false)">
					{{ $t("plugins.duetConfigBackup.configBackup.restore.diffClose") }}
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script>
export default {
	name: "MachineDiffDialog",
	props: {
		modelValue: { type: Boolean, required: true },
		diff: { type: Object, required: true },
		backupHostname: { type: String, required: true },
	},
	methods: {
		severityColor(s) {
			return s === "danger" ? "error" : s === "warning" ? "warning" : "info";
		},
		severityIcon(s) {
			return s === "danger" ? "mdi-alert-circle" : s === "warning" ? "mdi-alert" : "mdi-information-outline";
		},
	},
};
</script>
