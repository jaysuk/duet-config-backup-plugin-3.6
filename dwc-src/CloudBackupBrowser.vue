<template>
	<div>
		<v-progress-circular v-if="loading" indeterminate size="24" class="mb-2" />
		<div v-else-if="items.length === 0" class="text-caption text--secondary">
			{{ $t("plugins.duetConfigBackup.configBackup.cloud.noBackups") }}
		</div>
		<v-list v-else dense>
			<v-list-item v-for="item in items" :key="item.key">
				<v-list-item-content>
					<v-list-item-title>{{ item.label }}</v-list-item-title>
					<v-list-item-subtitle v-if="item.sublabel">{{ item.sublabel }}</v-list-item-subtitle>
				</v-list-item-content>
				<v-list-item-action class="d-flex flex-row align-center">
					<v-btn v-if="showDownload" small text icon :title="$t('plugins.duetConfigBackup.configBackup.cloud.downloadButton')" @click="$emit('download', item.key)">
						<v-icon small>mdi-download</v-icon>
					</v-btn>
					<v-btn small text icon :title="$t('plugins.duetConfigBackup.configBackup.cloud.restoreButton')" @click="$emit('restore', item.key)">
						<v-icon small>mdi-restore</v-icon>
					</v-btn>
					<v-btn v-if="item.viewUrl" small text icon :href="item.viewUrl" target="_blank" rel="noopener" :title="$t('plugins.duetConfigBackup.configBackup.cloud.viewButton')">
						<v-icon small>mdi-open-in-new</v-icon>
					</v-btn>
					<v-btn v-if="showDelete" small text icon color="error" :title="$t('plugins.duetConfigBackup.configBackup.cloud.deleteButton')" @click="$emit('delete', item.key)">
						<v-icon small>mdi-delete-outline</v-icon>
					</v-btn>
				</v-list-item-action>
			</v-list-item>
		</v-list>
	</div>
</template>

<script>
export default {
	name: "CloudBackupBrowser",
	props: {
		items: { type: Array, required: true },
		loading: { type: Boolean, required: true },
		// Not every destination supports these - GitHub history has no per-commit delete, and its
		// "download" is offered as the external "View on GitHub" link instead.
		showDownload: { type: Boolean, default: true },
		showDelete: { type: Boolean, default: true },
	},
};
</script>
