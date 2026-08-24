<template>
	<v-card flat>
		<v-card-text>
			<!-- Step 1: source -->
			<template v-if="step === 'source'">
				<div class="text-title-small mb-2">{{ $t("plugins.duetConfigBackup.configBackup.restore.sourceHeading") }}</div>

				<v-radio-group v-model="sourceMode" dense hide-details class="mb-3">
					<v-radio value="local" :label="$t('plugins.duetConfigBackup.configBackup.restore.sourceLocalOption')" />
					<v-radio v-for="opt in cloudSourceOptions" :key="opt.id" :value="opt.id">
						<template #label>
							<span class="d-flex align-center" style="gap: 8px;">
								{{ opt.label }}
								<v-chip x-small :color="opt.configured ? 'success' : undefined">
									{{ opt.configured
										? $t("plugins.duetConfigBackup.configBackup.cloud.configuredNote")
										: $t("plugins.duetConfigBackup.configBackup.cloud.notConfiguredYet") }}
								</v-chip>
							</span>
						</template>
					</v-radio>
				</v-radio-group>

				<template v-if="sourceMode === 'local'">
					<div class="d-flex flex-column align-start pa-4" style="gap: 8px; border: 1px dashed rgba(128,128,128,0.5); border-radius: 8px;"
						 @dragover.prevent @drop.prevent="onDrop">
						<v-btn text @click="pickFile">
							<v-icon class="me-1">mdi-file-upload-outline</v-icon>
							{{ $t("plugins.duetConfigBackup.configBackup.restore.sourceLocal") }}
						</v-btn>
						<span class="text-caption text--secondary">{{ $t("plugins.duetConfigBackup.configBackup.restore.sourceDrop") }}</span>
					</div>
					<input ref="fileInput" type="file" accept=".zip" class="d-none" @change="onFileInput" />
				</template>

				<template v-else-if="!cloudSourceConfigured">
					<v-alert type="warning" text dense>
						{{ $t("plugins.duetConfigBackup.configBackup.create.notConfigured", { destination: cloudSourceLabel }) }}
					</v-alert>
				</template>

				<template v-else-if="sourceMode === 'duet'">
					<v-alert type="info" text dense class="mb-3">{{ $t("plugins.duetConfigBackup.configBackup.cloud.otherMachinesNote") }}</v-alert>
					<MachineList :machines="duetMachineItems" :loading="duetLoadingMachines" :selected="duetSelectedGuid"
								 :this-machine-key="thisMachineKey" @select="selectDuetMachine" />
					<template v-if="duetSelectedGuid">
						<v-divider class="my-3" />
						<CloudBackupBrowser :items="duetItems" :loading="duetLoadingBackups"
											 @download="onDuetDownload" @restore="onDuetRestore" @delete="onDuetDelete" />
					</template>
					<v-alert v-if="duetError" type="error" text dense class="mt-3">{{ duetError }}</v-alert>
				</template>

				<template v-else-if="sourceMode === 'github'">
					<v-alert type="info" text dense class="mb-3">{{ $t("plugins.duetConfigBackup.configBackup.cloud.otherMachinesNote") }}</v-alert>
					<MachineList :machines="githubMachineItems" :loading="githubLoadingMachines" :selected="githubSelectedMachine"
								 :this-machine-key="githubThisMachineKey" @select="selectGithubMachine" />
					<template v-if="githubSelectedMachine">
						<v-divider class="my-3" />
						<div class="text-title-small mb-2">{{ $t("plugins.duetConfigBackup.configBackup.github.historyHeading") }}</div>
						<CloudBackupBrowser :items="githubHistoryItems" :loading="githubLoadingHistory" :show-delete="false"
											 @download="onGithubDownload" @restore="onGithubRestore" />
					</template>
				</template>

				<template v-else-if="sourceMode === 'dropbox'">
					<MachineList :machines="dropboxMachineItems" :loading="dropboxLoadingMachines" :selected="dropboxSelectedMachine"
								 :this-machine-key="thisHostname" @select="selectDropboxMachine" />
					<template v-if="dropboxSelectedMachine">
						<v-divider class="my-3" />
						<CloudBackupBrowser :items="dropboxItems" :loading="dropboxLoadingBackups"
											 @download="onDropboxDownload" @restore="onDropboxRestore" @delete="onDropboxDelete" />
					</template>
				</template>

				<template v-else-if="sourceMode === 'webdav'">
					<MachineList :machines="webdavMachineItems" :loading="webdavLoadingMachines" :selected="webdavSelectedMachine"
								 :this-machine-key="thisHostname" @select="selectWebdavMachine" />
					<template v-if="webdavSelectedMachine">
						<v-divider class="my-3" />
						<CloudBackupBrowser :items="webdavItems" :loading="webdavLoadingBackups"
											 @download="onWebdavDownload" @restore="onWebdavRestore" @delete="onWebdavDelete" />
					</template>
				</template>

				<v-alert v-if="loadError" type="error" text dense class="mt-3">{{ loadError }}</v-alert>
			</template>

			<!-- Step 2: file tree -->
			<template v-else-if="step === 'tree' && archive">
				<div class="text-title-small mb-2">{{ $t("plugins.duetConfigBackup.configBackup.restore.treeHeading") }}</div>
				<BackupFileTree :files="archive.manifest.files" :model-value="selection" @update:model-value="selection = $event" />
				<div class="d-flex mt-3" style="gap: 8px;">
					<v-btn text @click="step = 'source'">{{ $t("plugins.duetConfigBackup.shell.back") }}</v-btn>
					<v-btn color="primary" :disabled="selection.size === 0" :loading="preparing" @click="proceedFromTree">
						{{ $t("plugins.duetConfigBackup.configBackup.restore.restoreSelected", { count: selection.size }) }}
					</v-btn>
				</div>
			</template>

			<!-- Step 3: repair (only when redactions are present) -->
			<template v-else-if="step === 'repair' && archive">
				<RedactionRepairStep :sites="repairSites" :live-file-texts="liveFileTexts" :model-value="repairDecisions"
									  @update:model-value="repairDecisions = $event" />
				<div class="d-flex mt-3" style="gap: 8px;">
					<v-btn text @click="step = 'tree'">{{ $t("plugins.duetConfigBackup.shell.back") }}</v-btn>
					<v-btn color="primary" :disabled="repairDecisions.size < repairSites.length" @click="proceedFromRepair">
						{{ $t("plugins.duetConfigBackup.shell.done") }}
					</v-btn>
				</div>
			</template>

			<!-- Step 4: review + apply -->
			<template v-else-if="step === 'review' && archive && plan">
				<div class="text-title-small mb-2">{{ $t("plugins.duetConfigBackup.configBackup.restore.reviewHeading") }}</div>

				<div class="text-body-2 mb-2">{{ $t("plugins.duetConfigBackup.configBackup.restore.excludedNote") }}</div>

				<v-alert v-if="!diff || !diff.sameMachine" type="warning" text dense class="mb-3">
					<div class="d-flex align-center" style="gap: 8px;">
						<span>{{ $t("plugins.duetConfigBackup.configBackup.restore.restoreFromOtherMachine") }}</span>
						<v-spacer />
						<v-btn small text @click="diffOpen = true">{{ $t("plugins.duetConfigBackup.configBackup.restore.diffHeading") }}</v-btn>
					</div>
				</v-alert>

				<div class="text-title-small mb-1">{{ $t("plugins.duetConfigBackup.configBackup.restore.modeHeading") }}</div>
				<v-radio-group v-model="mode" dense hide-details class="mb-3">
					<v-radio value="merge">
						<template #label>
							<div>
								<div>{{ $t("plugins.duetConfigBackup.configBackup.restore.modeMerge") }}</div>
								<div class="text-caption text--secondary">{{ $t("plugins.duetConfigBackup.configBackup.restore.modeMergeHelp") }}</div>
							</div>
						</template>
					</v-radio>
					<v-radio value="mirror" :disabled="!diff || !diff.sameMachine">
						<template #label>
							<div>
								<div>{{ $t("plugins.duetConfigBackup.configBackup.restore.modeMirror") }}</div>
								<div class="text-caption text--secondary">{{ $t("plugins.duetConfigBackup.configBackup.restore.modeMirrorHelp") }}</div>
							</div>
						</template>
					</v-radio>
				</v-radio-group>
				<v-alert v-if="!diff || !diff.sameMachine" type="info" text dense class="mb-3">
					{{ $t("plugins.duetConfigBackup.configBackup.restore.modeMirrorDisabledDifferentMachine") }}
				</v-alert>

				<v-alert v-if="mode === 'mirror'" type="warning" text dense class="mb-3">
					<div class="d-flex align-center flex-wrap" style="gap: 8px;">
						<span>{{ $t("plugins.duetConfigBackup.configBackup.restore.suggestBackupFirst") }}</span>
						<v-spacer />
						<v-btn small text :loading="quickBackupBusy" :disabled="quickBackupDone" @click="onQuickBackup">
							<v-icon v-if="quickBackupDone" size="16" class="me-1">mdi-check</v-icon>
							{{ quickBackupDone
								? $t("plugins.duetConfigBackup.configBackup.restore.suggestBackupFirstDone")
								: $t("plugins.duetConfigBackup.configBackup.restore.suggestBackupFirstButton") }}
						</v-btn>
					</div>
					<v-alert v-if="quickBackupError" type="error" text dense class="mt-2">{{ quickBackupError }}</v-alert>
				</v-alert>

				<v-simple-table dense class="mb-3">
					<template #default>
						<thead>
							<tr>
								<th>{{ $t("plugins.duetConfigBackup.configBackup.restore.planColumnFile") }}</th>
								<th>{{ $t("plugins.duetConfigBackup.configBackup.restore.planColumnStatus") }}</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="entry in plan.entries" :key="entry.archivePath">
								<td class="text-caption">{{ entry.targetPath || entry.archivePath }}</td>
								<td class="text-caption">
									<v-chip x-small :color="statusColor(entry.status)">{{ statusLabel(entry.status) }}</v-chip>
								</td>
							</tr>
						</tbody>
					</template>
				</v-simple-table>

				<template v-if="mode === 'mirror' && plan.deletions.length > 0">
					<v-alert type="error" text dense class="mb-2">
						<div class="font-weight-medium mb-1">{{ $t("plugins.duetConfigBackup.configBackup.restore.deletionsHeading") }}</div>
						<ul class="text-caption">
							<li v-for="d in plan.deletions" :key="d.targetPath">{{ d.targetPath }}</li>
						</ul>
					</v-alert>
					<v-checkbox v-model="deletionsConfirmed" dense hide-details
								:label="$t('plugins.duetConfigBackup.configBackup.restore.deletionsConfirm', { count: plan.deletions.length })" />
					<v-text-field v-if="plan.deletions.length > 20" v-model="deletionsTyped" dense outlined
								  :label="$t('plugins.duetConfigBackup.configBackup.restore.deletionsTypeConfirm')" class="mt-2" />
				</template>
				<v-checkbox v-else v-model="overwriteConfirmed" dense hide-details
							:label="$t('plugins.duetConfigBackup.configBackup.restore.overwriteConfirm')" />

				<div class="d-flex mt-3" style="gap: 8px;">
					<v-btn text :disabled="applying" @click="step = repairSites.length > 0 ? 'repair' : 'tree'">
						{{ $t("plugins.duetConfigBackup.shell.back") }}
					</v-btn>
					<v-btn color="error" :disabled="!canApply" :loading="applying" @click="onApply">
						{{ $t("plugins.duetConfigBackup.configBackup.restore.applyButton") }}
					</v-btn>
				</div>

				<template v-if="applying">
					<v-progress-linear :value="applyProgressPct" height="8" rounded class="mt-3" />
					<div class="text-caption text--secondary mt-1">
						{{ $t("plugins.duetConfigBackup.configBackup.restore.applyProgress", { done: applyProgressDone, total: applyProgressTotal }) }}
					</div>
				</template>

				<v-alert v-if="applyError" type="error" text dense class="mt-3">{{ applyError }}</v-alert>

				<template v-if="applyResult">
					<v-divider class="my-3" />
					<div class="text-title-small mb-1">{{ $t("plugins.duetConfigBackup.configBackup.restore.resultHeading") }}</div>
					<div class="text-body-2">
						{{ $t("plugins.duetConfigBackup.configBackup.restore.resultWritten", { count: writtenCount }) }}
						<span v-if="deletedCount > 0"> · {{ $t("plugins.duetConfigBackup.configBackup.restore.resultDeleted", { count: deletedCount }) }}</span>
						<span v-if="failedCount > 0"> · {{ $t("plugins.duetConfigBackup.configBackup.restore.resultFailed", { count: failedCount }) }}</span>
					</div>
					<v-alert v-for="r in failedResults" :key="r.targetPath" type="error" text dense class="mt-2">
						{{ r.targetPath }}: {{ r.error }}
					</v-alert>
					<v-alert v-if="commentedOutFiles.length > 0" type="warning" text dense class="mt-2">
						<div class="font-weight-medium mb-1">
							{{ $t("plugins.duetConfigBackup.configBackup.restore.resultCommentedOut", { count: commentedOutFiles.length }) }}
						</div>
						<ul class="text-caption">
							<li v-for="p in commentedOutFiles" :key="p">{{ p }}</li>
						</ul>
					</v-alert>
				</template>

				<MachineDiffDialog v-if="diff" v-model="diffOpen" :diff="diff" :backup-hostname="archive.manifest.machine.hostname" />
			</template>
		</v-card-text>

		<ConfirmDialog ref="confirmDialog" />

		<v-dialog v-model="decryptDialog.open" max-width="480" persistent>
			<v-card>
				<v-card-title>{{ $t("plugins.duetConfigBackup.configBackup.restore.decryptPasswordTitle") }}</v-card-title>
				<v-card-text>
					<v-text-field v-model="decryptDialog.password" type="password"
								  :label="$t('plugins.duetConfigBackup.configBackup.restore.decryptPasswordLabel')"
								  dense outlined hide-details autofocus
								  @keyup.enter="submitDecryptPassword" />
					<div v-if="decryptDialog.error" class="text-caption error--text mt-2">
						{{ $t("plugins.duetConfigBackup.configBackup.restore.decryptPasswordWrong") }}
					</div>
				</v-card-text>
				<v-card-actions>
					<v-spacer />
					<v-btn text @click="cancelDecryptPassword">{{ $t("plugins.duetConfigBackup.configBackup.common.cancel") }}</v-btn>
					<v-btn text color="primary" :loading="decryptDialog.busy" :disabled="!decryptDialog.password" @click="submitDecryptPassword">
						{{ $t("plugins.duetConfigBackup.configBackup.restore.decryptPasswordButton") }}
					</v-btn>
				</v-card-actions>
			</v-card>
		</v-dialog>
	</v-card>
</template>

<script>
import {
	addBackedUpMachineKey, applyRepairsToFile, applyRestorePlan, buildArchive, buildLiveDirectories,
	buildMachineIdentity, buildRestorePlan, collectAll, compareMachines, computeMachineKey,
	computeMirrorDeletions, BACKUP_DIR_KINDS, DEFAULT_MAX_FILE_BYTES, DIR_FOLDER, findRedactions,
	getDropboxSettings, getDuetCloudApiUrl, getDuetCloudSession, getGithubSettings, getRedactPreference,
	getWebDavSettings, readArchive, setLastBackupAt, walkDirectory,
} from "dwc-config-backup-core";
import { decryptArchiveBlob, DecryptError, isEncryptedArchiveBlob } from "dwc-config-backup-core";
import { downloadArchive } from "dwc-config-backup-core/destinations/localZip";
import {
	deleteBackup as duetDelete, downloadBackup as duetDownload, listBackups as duetListBackups, listMachines as duetListMachines,
} from "dwc-config-backup-core/destinations/duetCloud";
import {
	downloadBackupAtCommit, listBackupHistory as githubListHistory, listMachineFolders as githubListMachines,
} from "dwc-config-backup-core/destinations/github";
import {
	deleteBackup as dropboxDelete, downloadBackup as dropboxDownload, listBackups as dropboxListBackups, listMachineFolders as dropboxListMachines,
} from "dwc-config-backup-core/destinations/dropbox";
import {
	deleteBackup as webdavDelete, downloadBackup as webdavDownload, listBackups as webdavListBackups, listMachineFolders as webdavListMachines,
} from "dwc-config-backup-core/destinations/webdav";

import { defaultMachineIO } from "./machineIO";
import { PLUGIN_MANIFEST_ID } from "./constants";
import BackupFileTree from "./BackupFileTree.vue";
import RedactionRepairStep from "./RedactionRepairStep.vue";
import MachineDiffDialog from "./MachineDiffDialog.vue";
import MachineList from "./MachineList.vue";
import CloudBackupBrowser from "./CloudBackupBrowser.vue";
import ConfirmDialog from "./ConfirmDialog.vue";

const CLOUD_SOURCE_IDS = ["duet", "github", "dropbox", "webdav"];
const CLOUD_SOURCE_LABEL_KEYS = {
	duet: "plugins.duetConfigBackup.configBackup.cloud.duetHeading",
	github: "plugins.duetConfigBackup.configBackup.github.heading",
	dropbox: "plugins.duetConfigBackup.configBackup.cloud.dropboxHeading",
	webdav: "plugins.duetConfigBackup.configBackup.cloud.webdavHeading",
};

function downloadBlob(filename, content, mimeType) {
	const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default {
	name: "RestorePanel",
	components: { BackupFileTree, RedactionRepairStep, MachineDiffDialog, MachineList, CloudBackupBrowser, ConfirmDialog },
	props: {
		active: { type: Boolean, default: false },
	},
	data() {
		const model = this.$store.state.machine.model;
		const identity = buildMachineIdentity(model);
		return {
			identity,
			thisMachineKey: computeMachineKey(identity),
			thisHostname: identity.hostname,

			step: "source",
			archive: null,
			loadError: null,

			// Encrypted backups (ENCRYPTED-BACKUPS-PLAN.md §6 Phase 2) - single insertion point: every
			// restore source (local file, every cloud destination's "restore" action) already funnels
			// through loadFile() below, so this is the only place a password prompt is needed.
			decryptDialog: { open: false, password: "", error: false, busy: false, resolve: null },
			pendingEncryptedBlob: null,

			refreshTick: 0,
			sourceMode: "local",

			duetMachines: [], duetLoadingMachines: false, duetSelectedGuid: null, duetBackups: [],
			duetLoadingBackups: false, duetError: null,

			githubMachines: [], githubLoadingMachines: false, githubSelectedMachine: null,
			githubHistory: [], githubLoadingHistory: false,

			dropboxMachines: [], dropboxLoadingMachines: false, dropboxSelectedMachine: null,
			dropboxBackups: [], dropboxLoadingBackups: false,

			webdavMachines: [], webdavLoadingMachines: false, webdavSelectedMachine: null,
			webdavBackups: [], webdavLoadingBackups: false,

			selection: new Set(),
			repairSites: [],
			repairDecisions: new Map(),
			liveFileTexts: new Map(),

			preparing: false,
			mode: "merge",
			plan: null,
			diff: null,
			diffOpen: false,
			deletionsConfirmed: false,
			deletionsTyped: "",
			overwriteConfirmed: false,

			quickBackupBusy: false,
			quickBackupDone: false,
			quickBackupError: null,

			applying: false,
			applyError: null,
			applyResult: null,
			applyProgressDone: 0,
			applyProgressTotal: 1,
			commentedOutFiles: [],
		};
	},
	computed: {
		cloudSourceOptions() {
			void this.refreshTick;
			return CLOUD_SOURCE_IDS.map((id) => ({ id, label: this.$t(CLOUD_SOURCE_LABEL_KEYS[id]), configured: this.isCloudSourceConfigured(id) }));
		},
		cloudSourceConfigured() {
			void this.refreshTick;
			return this.sourceMode !== "local" && this.isCloudSourceConfigured(this.sourceMode);
		},
		cloudSourceLabel() {
			return this.sourceMode === "local" ? "" : this.$t(CLOUD_SOURCE_LABEL_KEYS[this.sourceMode]);
		},
		duetItems() { return this.duetBackups.map((b) => ({ key: String(b.id), label: this.formatDate(b.timestamp) })); },
		duetMachineItems() {
			return this.duetMachines.map((m) => ({
				key: m.boardGuid, label: m.machineHostname, sublabel: `${m.backupCount} backups · latest ${this.formatDate(m.latestBackupDate)}`,
			}));
		},
		githubThisMachineKey() { return (getGithubSettings() && getGithubSettings().machineName) || this.thisHostname; },
		githubMachineItems() { return this.githubMachines.map((name) => ({ key: name, label: name })); },
		githubHistoryItems() {
			const settings = getGithubSettings();
			const repo = settings && settings.repo;
			return this.githubHistory.map((r) => ({
				key: r.sha, label: this.formatDate(r.date), sublabel: r.message.split("\n")[0],
				viewUrl: repo ? `https://github.com/${repo}/commit/${r.sha}` : undefined,
			}));
		},
		dropboxItems() { return this.dropboxBackups.map((b) => ({ key: b.path, label: b.name, sublabel: this.formatDate(b.serverModified) })); },
		dropboxMachineItems() { return this.dropboxMachines.map((name) => ({ key: name, label: name })); },
		webdavItems() { return this.webdavBackups.map((b) => ({ key: b.path, label: b.name, sublabel: b.lastModified || undefined })); },
		webdavMachineItems() { return this.webdavMachines.map((name) => ({ key: name, label: name })); },
		canApply() {
			if (!this.plan) { return false; }
			if (this.mode === "mirror" && this.plan.deletions.length > 0) {
				if (!this.deletionsConfirmed) { return false; }
				if (this.plan.deletions.length > 20 && this.deletionsTyped !== "DELETE") { return false; }
				return true;
			}
			return this.overwriteConfirmed;
		},
		applyProgressPct() { return this.applyProgressTotal > 0 ? (this.applyProgressDone / this.applyProgressTotal) * 100 : 0; },
		writtenCount() { return this.applyResult ? this.applyResult.results.filter((r) => r.status === "written").length : 0; },
		deletedCount() { return this.applyResult ? this.applyResult.results.filter((r) => r.status === "deleted").length : 0; },
		failedResults() { return this.applyResult ? this.applyResult.results.filter((r) => r.status === "failed") : []; },
		failedCount() { return this.failedResults.length; },
	},
	watch: {
		active(active) { if (active) { this.refreshTick++; } },
		// Lazily fetch the machine list the first time each cloud source is selected.
		sourceMode(mode) {
			if (mode === "duet" && this.isCloudSourceConfigured("duet") && this.duetMachines.length === 0) { void this.refreshDuetMachines(); }
			if (mode === "github" && this.isCloudSourceConfigured("github") && this.githubMachines.length === 0) { void this.refreshGithubMachines(); }
			if (mode === "dropbox" && this.isCloudSourceConfigured("dropbox") && this.dropboxMachines.length === 0) { void this.refreshDropboxMachines(); }
			if (mode === "webdav" && this.isCloudSourceConfigured("webdav") && this.webdavMachines.length === 0) { void this.refreshWebdavMachines(); }
		},
	},
	methods: {
		formatDate(iso) {
			try { return new Date(iso).toLocaleString(); } catch { return iso; }
		},
		confirmDelete() {
			return this.$refs.confirmDialog.show(
				this.$t("plugins.duetConfigBackup.configBackup.cloud.deleteConfirmTitle"),
				this.$t("plugins.duetConfigBackup.configBackup.cloud.deleteConfirmBody"),
				"mdi-delete-outline",
			);
		},
		isCloudSourceConfigured(id) {
			switch (id) {
				// getDuetCloudApiUrl() always has a value (hardcoded, not user-configurable) - signing in
				// (a session) is what actually reflects the user having done anything here.
				case "duet": return getDuetCloudSession() != null;
				case "github": return getGithubSettings() != null;
				case "dropbox": return getDropboxSettings() != null;
				case "webdav": return getWebDavSettings() != null;
				default: return false;
			}
		},
		async refreshDuetMachines() {
			this.duetLoadingMachines = true;
			this.duetError = null;
			try {
				this.duetMachines = await duetListMachines(getDuetCloudApiUrl());
			} catch (e) {
				this.duetError = e instanceof Error ? e.message : String(e);
			} finally {
				this.duetLoadingMachines = false;
			}
		},
		async selectDuetMachine(guid) {
			this.duetSelectedGuid = guid;
			this.duetLoadingBackups = true;
			this.duetError = null;
			try {
				this.duetBackups = await duetListBackups(getDuetCloudApiUrl(), guid);
			} catch (e) {
				this.duetError = e instanceof Error ? e.message : String(e);
			} finally {
				this.duetLoadingBackups = false;
			}
		},
		async onDuetDownload(id) {
			const blob = await duetDownload(getDuetCloudApiUrl(), Number(id));
			downloadBlob(`backup-${id}.zip`, blob, "application/zip");
		},
		async onDuetRestore(id) {
			await this.loadFile(new File([await duetDownload(getDuetCloudApiUrl(), Number(id))], "backup.zip"));
		},
		async onDuetDelete(id) {
			if (!this.duetSelectedGuid) { return; }
			if (!(await this.confirmDelete())) { return; }
			await duetDelete(getDuetCloudApiUrl(), Number(id), this.duetSelectedGuid);
			await this.selectDuetMachine(this.duetSelectedGuid);
		},
		async refreshGithubMachines() {
			const saved = getGithubSettings();
			if (!saved) { return; }
			this.githubLoadingMachines = true;
			try {
				this.githubMachines = await githubListMachines(saved.token, saved.repo, saved.branch);
			} finally {
				this.githubLoadingMachines = false;
			}
		},
		async selectGithubMachine(name) {
			const saved = getGithubSettings();
			if (!saved) { return; }
			this.githubSelectedMachine = name;
			this.githubLoadingHistory = true;
			try {
				this.githubHistory = await githubListHistory(saved.token, saved.repo, saved.branch, name);
			} finally {
				this.githubLoadingHistory = false;
			}
		},
		async onGithubDownload(sha) {
			const saved = getGithubSettings();
			if (!saved || !this.githubSelectedMachine) { return; }
			const blob = await downloadBackupAtCommit(saved.token, saved.repo, this.githubSelectedMachine, sha);
			downloadBlob(`backup-${this.githubSelectedMachine}-${sha.slice(0, 7)}.zip`, blob, "application/zip");
		},
		async onGithubRestore(sha) {
			const saved = getGithubSettings();
			if (!saved || !this.githubSelectedMachine) { return; }
			await this.loadFile(new File([await downloadBackupAtCommit(saved.token, saved.repo, this.githubSelectedMachine, sha)], "backup.zip"));
		},
		async refreshDropboxMachines() {
			const saved = getDropboxSettings();
			if (!saved) { return; }
			this.dropboxLoadingMachines = true;
			try {
				this.dropboxMachines = await dropboxListMachines(saved.token);
			} finally {
				this.dropboxLoadingMachines = false;
			}
		},
		async selectDropboxMachine(hostname) {
			const saved = getDropboxSettings();
			if (!saved) { return; }
			this.dropboxSelectedMachine = hostname;
			this.dropboxLoadingBackups = true;
			try {
				this.dropboxBackups = await dropboxListBackups(saved.token, hostname);
			} finally {
				this.dropboxLoadingBackups = false;
			}
		},
		async onDropboxDownload(path) {
			const saved = getDropboxSettings();
			if (!saved) { return; }
			const blob = await dropboxDownload(saved.token, path);
			downloadBlob(path.split("/").pop() || "backup.zip", blob, "application/zip");
		},
		async onDropboxRestore(path) {
			const saved = getDropboxSettings();
			if (!saved) { return; }
			await this.loadFile(new File([await dropboxDownload(saved.token, path)], "backup.zip"));
		},
		async onDropboxDelete(path) {
			const saved = getDropboxSettings();
			if (!saved || !this.dropboxSelectedMachine) { return; }
			if (!(await this.confirmDelete())) { return; }
			await dropboxDelete(saved.token, path);
			await this.selectDropboxMachine(this.dropboxSelectedMachine);
		},
		async refreshWebdavMachines() {
			const saved = getWebDavSettings();
			if (!saved) { return; }
			this.webdavLoadingMachines = true;
			try {
				this.webdavMachines = await webdavListMachines(saved.url, saved.username, saved.password);
			} finally {
				this.webdavLoadingMachines = false;
			}
		},
		async selectWebdavMachine(hostname) {
			const saved = getWebDavSettings();
			if (!saved) { return; }
			this.webdavSelectedMachine = hostname;
			this.webdavLoadingBackups = true;
			try {
				this.webdavBackups = await webdavListBackups(saved.url, saved.username, saved.password, hostname);
			} finally {
				this.webdavLoadingBackups = false;
			}
		},
		async onWebdavDownload(path) {
			const saved = getWebDavSettings();
			if (!saved) { return; }
			const blob = await webdavDownload(saved.url, saved.username, saved.password, path);
			downloadBlob(path.split("/").pop() || "backup.zip", blob, "application/zip");
		},
		async onWebdavRestore(path) {
			const saved = getWebDavSettings();
			if (!saved) { return; }
			await this.loadFile(new File([await webdavDownload(saved.url, saved.username, saved.password, path)], "backup.zip"));
		},
		async onWebdavDelete(path) {
			const saved = getWebDavSettings();
			if (!saved || !this.webdavSelectedMachine) { return; }
			if (!(await this.confirmDelete())) { return; }
			await webdavDelete(saved.url, saved.username, saved.password, path);
			await this.selectWebdavMachine(this.webdavSelectedMachine);
		},
		pickFile() { this.$refs.fileInput.click(); },
		askDecryptPassword(blob) {
			return new Promise((resolve) => {
				this.pendingEncryptedBlob = blob;
				this.decryptDialog.password = "";
				this.decryptDialog.error = false;
				this.decryptDialog.busy = false;
				this.decryptDialog.open = true;
				this.decryptDialog.resolve = (result) => { this.decryptDialog.open = false; this.decryptDialog.resolve = null; resolve(result); };
			});
		},
		async submitDecryptPassword() {
			if (!this.decryptDialog.password || this.decryptDialog.busy || !this.pendingEncryptedBlob) { return; }
			this.decryptDialog.busy = true;
			this.decryptDialog.error = false;
			try {
				const blob = await decryptArchiveBlob(this.pendingEncryptedBlob, this.decryptDialog.password);
				if (this.decryptDialog.resolve) { this.decryptDialog.resolve(blob); }
			} catch (e) {
				// decryptArchiveBlob's own contract: always DecryptError on failure, wrong password or
				// otherwise - stay open, let the user retry, rather than bailing out to the generic
				// "invalid archive" error.
				if (e instanceof DecryptError) {
					this.decryptDialog.error = true;
					this.decryptDialog.password = "";
				} else if (this.decryptDialog.resolve) {
					this.decryptDialog.resolve(null);
				}
			} finally {
				this.decryptDialog.busy = false;
			}
		},
		cancelDecryptPassword() {
			if (this.decryptDialog.resolve) { this.decryptDialog.resolve(null); }
		},
		async loadFile(file) {
			this.loadError = null;
			try {
				let source = file;
				if (await isEncryptedArchiveBlob(file)) {
					const decrypted = await this.askDecryptPassword(file);
					if (!decrypted) { return; } // cancelled - no error, the user just backed out
					source = decrypted;
				}
				const parsed = await readArchive(source);
				// readArchive tolerantly reconstructs a manifest by walking files/** even when
				// manifest.json is missing, so an empty file list is the actual signal that this wasn't
				// a recognisable backup.
				if (parsed.manifest.files.length === 0) {
					throw new Error("invalid");
				}
				this.archive = parsed;
				this.selection = new Set(parsed.manifest.files.map((f) => f.path));
				this.quickBackupDone = false;
				this.quickBackupError = null;
				this.step = "tree";
			} catch {
				this.loadError = this.$t("plugins.duetConfigBackup.configBackup.restore.invalidArchive");
			}
		},
		onFileInput(ev) {
			const file = ev.target.files && ev.target.files[0];
			if (file) { void this.loadFile(file); }
		},
		onDrop(ev) {
			const file = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
			if (file) { void this.loadFile(file); }
		},
		installedVersion() {
			const plugins = this.$store.state.machine.model && this.$store.state.machine.model.plugins;
			const record = plugins && (plugins.get ? plugins.get(PLUGIN_MANIFEST_ID) : plugins[PLUGIN_MANIFEST_ID]);
			return (record && record.version) || "unknown";
		},
		runningDwcVersion() {
			try { return (window.DWC && window.DWC.version) || "unknown"; } catch { return "unknown"; }
		},
		async onQuickBackup() {
			this.quickBackupBusy = true;
			this.quickBackupError = null;
			try {
				const io = defaultMachineIO(this.$store);
				const model = this.$store.state.machine.model;
				const directories = buildLiveDirectories(model);
				const scope = { system: true, macros: true, filaments: true, objectModel: true, diagnostics: true };
				const collected = await collectAll(io, { scope, maxFileBytes: DEFAULT_MAX_FILE_BYTES, directories, model, boards: this.identity.boards });
				// Deliberately never encrypted (ENCRYPTED-BACKUPS-PLAN.md §5.8), regardless of the
				// "local" destination's remembered encrypt preference: this is a one-click safety net
				// taken mid-restore, and a password dialog here would interrupt a restore already in
				// progress for an unrelated action. It's always a local download anyway, so "leaves the
				// machine unencrypted" doesn't apply.
				const built = await buildArchive(collected, {
					redact: getRedactPreference("local"), scope, machine: this.identity, directories,
					pluginVersion: this.installedVersion(), dwcVersion: this.runningDwcVersion(),
				});
				downloadArchive(built.blob, this.identity.hostname);
				setLastBackupAt(new Date().toISOString());
				addBackedUpMachineKey(built.manifest.machine.machineKey);
				this.quickBackupDone = true;
			} catch (e) {
				this.quickBackupError = e instanceof Error ? e.message : String(e);
			} finally {
				this.quickBackupBusy = false;
			}
		},
		async proceedFromTree() {
			if (!this.archive) { return; }
			this.preparing = true;
			try {
				const sites = findRedactions(this.archive, this.selection);
				this.repairSites = sites;
				if (sites.length > 0) {
					const io = defaultMachineIO(this.$store);
					const uniquePaths = Array.from(new Set(sites.map((s) => s.entry.path)));
					const texts = new Map();
					for (const path of uniquePaths) {
						const targetPath = this.mapArchivePathToLive(path);
						if (!targetPath) { continue; }
						try { texts.set(path, await io.downloadText(targetPath)); } catch { /* no live file - none is a valid outcome */ }
					}
					this.liveFileTexts = texts;
					this.step = "repair";
				} else {
					await this.buildReview();
					this.step = "review";
				}
			} finally {
				this.preparing = false;
			}
		},
		mapArchivePathToLive(archivePath) {
			if (!this.archive) { return null; }
			const file = this.archive.manifest.files.find((f) => f.path === archivePath);
			if (!file) { return null; }
			const model = this.$store.state.machine.model;
			const dirs = buildLiveDirectories(model);
			const prefix = `files/${DIR_FOLDER[file.kind]}/`;
			const rel = archivePath.startsWith(prefix) ? archivePath.slice(prefix.length) : archivePath;
			const root = dirs[file.kind];
			return root.endsWith("/") ? `${root}${rel}` : `${root}/${rel}`;
		},
		async proceedFromRepair() {
			await this.buildReview();
			this.step = "review";
		},
		async buildReview() {
			if (!this.archive) { return; }
			const io = defaultMachineIO(this.$store);
			const model = this.$store.state.machine.model;
			const liveDirectories = buildLiveDirectories(model);
			const liveIdentity = buildMachineIdentity(model);

			const coveredKinds = BACKUP_DIR_KINDS.filter((k) => this.archive.manifest.files.some((f) => f.kind === k));
			const liveFiles = [];
			for (const kind of coveredKinds) {
				const walk = await walkDirectory(io, liveDirectories[kind], kind, { maxFileBytes: Number.MAX_SAFE_INTEGER });
				for (const f of walk.files) { liveFiles.push({ targetPath: f.source, kind, size: f.size }); }
			}
			const liveExistingPaths = new Set(liveFiles.map((f) => f.targetPath));

			const builtPlan = buildRestorePlan(this.archive, this.selection, liveDirectories, this.mode, liveExistingPaths);
			if (this.mode === "mirror") {
				const { deletions } = computeMirrorDeletions(liveFiles, this.archive, this.selection, liveDirectories);
				builtPlan.deletions = deletions;
			}
			this.plan = builtPlan;

			const configEntry = this.archive.manifest.files.find((f) => f.kind === "system" && f.path.endsWith("/config.g"));
			const configText = configEntry ? this.archive.textFiles.get(configEntry.path) : undefined;
			this.diff = compareMachines(this.archive.manifest, liveIdentity, configText);
		},
		async onApply() {
			if (!this.archive || !this.plan) { return; }
			this.applying = true;
			this.applyError = null;
			this.applyProgressDone = 0;
			this.applyProgressTotal = this.plan.entries.filter((e) => e.status !== "invalid").length + this.plan.deletions.length || 1;
			try {
				const contentOverrides = new Map();
				if (this.repairSites.length > 0) {
					const byPath = new Map();
					for (const s of this.repairSites) {
						if (!byPath.has(s.entry.path)) { byPath.set(s.entry.path, []); }
						byPath.get(s.entry.path).push(s);
					}
					for (const [path, sites] of byPath) {
						const original = this.archive.textFiles.get(path);
						if (original == null) { continue; }
						contentOverrides.set(path, applyRepairsToFile(path, original, sites, this.repairDecisions));
					}
				}
				const io = defaultMachineIO(this.$store);
				const status = this.$store.state.machine.model && this.$store.state.machine.model.state && this.$store.state.machine.model.state.status;
				const result = await applyRestorePlan(io, {
					archive: this.archive, plan: this.plan, contentOverrides, machineStatus: status,
					onProgress: (done, total) => { this.applyProgressDone = done; this.applyProgressTotal = total; },
				});
				this.applyResult = result;

				const commentedOutArchivePaths = new Set();
				for (const s of this.repairSites) {
					const decision = this.repairDecisions.get(s.entry.id);
					if (decision && decision.type === "comment-out") { commentedOutArchivePaths.add(s.entry.path); }
				}
				const archiveToTarget = new Map(this.plan.entries.map((e) => [e.archivePath, e.targetPath]));
				const writtenTargets = new Set(result.results.filter((r) => r.status === "written").map((r) => r.targetPath));
				this.commentedOutFiles = Array.from(commentedOutArchivePaths)
					.map((p) => archiveToTarget.get(p))
					.filter((p) => p != null && writtenTargets.has(p));

				if (result.touchedConfigG) {
					const ok = await this.$refs.confirmDialog.show(
						this.$t("plugins.duetConfigBackup.configBackup.restore.promptM999Title"),
						this.$t("plugins.duetConfigBackup.configBackup.restore.promptM999Body"),
						"mdi-restart",
					);
					if (ok) { await io.sendCode("M999"); }
				}
			} catch (e) {
				this.applyError = e instanceof Error ? e.message : String(e);
			} finally {
				this.applying = false;
			}
		},
		statusColor(status) {
			return status === "invalid" ? "error" : status === "overwrite" ? "warning" : "info";
		},
		statusLabel(status) {
			switch (status) {
				case "new": return this.$t("plugins.duetConfigBackup.configBackup.restore.planStatusNew");
				case "overwrite": return this.$t("plugins.duetConfigBackup.configBackup.restore.planStatusOverwrite");
				case "invalid": return this.$t("plugins.duetConfigBackup.configBackup.restore.planStatusInvalid");
				default: return status;
			}
		},
	},
};
</script>
