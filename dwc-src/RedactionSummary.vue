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
						<th v-if="allowExclude"></th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="(entry, i) in entries" :key="i">
						<td class="text-caption">{{ entry.path }}<span v-if="entry.line"> :{{ entry.line }}</span></td>
						<td class="text-caption">{{ entry.label }}</td>
						<td v-if="allowExclude" class="text-right">
							<v-btn v-if="entry.excludableName" text dense small @click="askExclude(entry.excludableName)">
								{{ $t("plugins.duetConfigBackup.configBackup.redaction.excludeAction") }}
							</v-btn>
						</td>
					</tr>
				</tbody>
			</template>
		</v-simple-table>

		<v-dialog v-model="confirm.open" max-width="480">
			<v-card>
				<v-card-title :class="{ 'error--text': confirm.strong }">
					{{ $t("plugins.duetConfigBackup.configBackup.redaction.excludeConfirmTitle", { name: confirm.name }) }}
				</v-card-title>
				<v-card-text>
					<p class="mb-2">{{ $t("plugins.duetConfigBackup.configBackup.redaction.excludeConfirmBody", { name: confirm.name }) }}</p>
					<v-alert v-if="confirm.strong" type="warning" text dense class="mb-2">
						{{ $t("plugins.duetConfigBackup.configBackup.redaction.excludeConfirmStrongWarning", { name: confirm.name }) }}
					</v-alert>
					<v-checkbox v-if="confirm.strong" v-model="confirm.acknowledged" dense hide-details
								:label="$t('plugins.duetConfigBackup.configBackup.redaction.excludeConfirmStrongCheckbox')" />
				</v-card-text>
				<v-card-actions>
					<v-spacer />
					<v-btn text @click="confirm.open = false">{{ $t("plugins.duetConfigBackup.configBackup.common.cancel") }}</v-btn>
					<v-btn text :color="confirm.strong ? 'error' : 'primary'" :disabled="confirm.strong && !confirm.acknowledged" @click="confirmExclude">
						{{ $t("plugins.duetConfigBackup.configBackup.redaction.excludeConfirmButton") }}
					</v-btn>
				</v-card-actions>
			</v-card>
		</v-dialog>
	</div>
</template>

<script>
// dwc-config-backup-core's REDACTION-EXCLUSIONS-PLAN.md §5.4 - names that strongly look like real
// credentials get an escalated, harder-to-misclick confirm rather than a hard block (a genuine
// non-secret field named e.g. "token" still needs an out).
const STRONG_CREDENTIAL_WORDS = ["password", "passwd", "pwd", "secret", "token", "psk", "apikey", "api_key", "api-key"];
function isStrongCredentialWord(name) {
	const lower = name.toLowerCase();
	return STRONG_CREDENTIAL_WORDS.some((w) => lower.includes(w));
}

export default {
	name: "RedactionSummary",
	props: {
		entries: { type: Array, required: true },
		redacted: { type: Boolean, required: true },
		// Show the per-row "Exclude" action. Off by default: the pre-send unredacted-warning dialog
		// reuses this component while blocking on a user choice the caller is awaiting, and letting
		// an exclude here mutate the very list that dialog is describing would desync it mid-decision.
		// Only the post-backup summary (BackupCreatePanel) turns this on.
		allowExclude: { type: Boolean, default: false },
	},
	data() {
		return {
			expanded: false,
			confirm: { open: false, name: "", strong: false, acknowledged: false },
		};
	},
	computed: {
		fileCount() {
			return new Set(this.entries.map((e) => e.path)).size;
		},
	},
	methods: {
		askExclude(name) {
			this.confirm.name = name;
			this.confirm.strong = isStrongCredentialWord(name);
			this.confirm.acknowledged = false;
			this.confirm.open = true;
		},
		confirmExclude() {
			this.confirm.open = false;
			this.$emit("exclude", this.confirm.name);
		},
	},
};
</script>
