<template>
	<div>
		<div class="d-flex align-center" style="gap: 8px;">
			<v-icon size="18" :color="redacted ? 'warning' : 'info'">{{ redacted ? "mdi-eye-off" : "mdi-eye" }}</v-icon>
			<span class="text-body-2">
				{{ redacted
					? $t("plugins.duetConfigBackup.configBackup.redaction.summaryRedacted", { count: entries.length, files: fileCount })
					: $t("plugins.duetConfigBackup.configBackup.redaction.summaryPresent", { count: entries.length, files: fileCount }) }}
			</span>
			<v-btn v-if="entries.length > 0" text dense small @click="expanded = !expanded">
				{{ expanded
					? $t("plugins.duetConfigBackup.configBackup.redaction.collapse")
					: $t("plugins.duetConfigBackup.configBackup.redaction.expand") }}
			</v-btn>
		</div>

		<v-simple-table v-if="expanded && entries.length > 0" dense class="mt-2">
			<template #default>
				<thead>
					<tr>
						<th>{{ $t("plugins.duetConfigBackup.configBackup.redaction.columnFile") }}</th>
						<th>{{ $t("plugins.duetConfigBackup.configBackup.redaction.columnLabel") }}</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="(entry, i) in entries" :key="i">
						<td class="text-caption">{{ entry.path }}<span v-if="entry.line"> :{{ entry.line }}</span></td>
						<td class="text-caption">{{ entry.label }}</td>
					</tr>
				</tbody>
			</template>
		</v-simple-table>
	</div>
</template>

<script>
export default {
	name: "RedactionSummary",
	props: {
		entries: { type: Array, required: true },
		redacted: { type: Boolean, required: true },
	},
	data() {
		return { expanded: false };
	},
	computed: {
		fileCount() {
			return new Set(this.entries.map((e) => e.path)).size;
		},
	},
};
</script>
