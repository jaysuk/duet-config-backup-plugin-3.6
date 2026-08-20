<template>
	<v-container fluid class="py-4">
		<div class="d-flex align-center mb-4">
			<v-icon size="28" class="me-3">mdi-archive-arrow-down</v-icon>
			<div class="text-title-medium">{{ $t("plugins.duetConfigBackup.configBackup.title") }}</div>
			<v-spacer />
			<v-btn icon text :title="$t('plugins.duetConfigBackup.help.title')" @click="openHelpAt('')">
				<v-icon>mdi-help-circle-outline</v-icon>
			</v-btn>
		</div>

		<v-tabs v-model="tab" class="mb-3">
			<v-tab>{{ $t("plugins.duetConfigBackup.configBackup.tabs.create") }}</v-tab>
			<v-tab>{{ $t("plugins.duetConfigBackup.configBackup.tabs.restore") }}</v-tab>
			<v-tab>{{ $t("plugins.duetConfigBackup.configBackup.tabs.cloud") }}</v-tab>
		</v-tabs>

		<v-tabs-items v-model="tab">
			<v-tab-item><BackupCreatePanel :active="tab === 0" /></v-tab-item>
			<v-tab-item><RestorePanel :active="tab === 1" /></v-tab-item>
			<v-tab-item><CloudPanel @help="openHelpAt" /></v-tab-item>
		</v-tabs-items>

		<ConfigBackupHelpDialog v-model="helpOpen" :section="helpSection" />
	</v-container>
</template>

<script>
// Vuetify 2's tab-content pairing is v-tabs-items/v-tab-item (index-based v-model), not
// v-window/v-window-item keyed by a string value as in Vuetify 3/4.
import BackupCreatePanel from "./BackupCreatePanel.vue";
import RestorePanel from "./RestorePanel.vue";
import CloudPanel from "./CloudPanel.vue";
import ConfigBackupHelpDialog from "./ConfigBackupHelpDialog.vue";

export default {
	name: "ConfigBackupPage",
	components: { BackupCreatePanel, RestorePanel, CloudPanel, ConfigBackupHelpDialog },
	data() {
		// helpSection: which destination to scroll to when opened from that destination's own
		// "Setup instructions" link, rather than the generic "?" in the header.
		return { tab: 0, helpOpen: false, helpSection: "" };
	},
	methods: {
		openHelpAt(section) {
			this.helpSection = section;
			this.helpOpen = true;
		},
	},
};
</script>
