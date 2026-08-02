<template>
	<v-card flat>
		<v-card-text>
			<div class="text-caption text--secondary mb-3">{{ $t("plugins.duetConfigBackup.configBackup.cloud.configIntro") }}</div>

			<!-- Credential storage & encryption -->
			<v-card outlined class="mb-4">
				<v-card-text>
					<div class="d-flex align-center mb-2" style="gap: 8px;">
						<v-icon size="18">mdi-shield-key-outline</v-icon>
						<span class="text-body-2 font-weight-medium">{{ $t("plugins.duetConfigBackup.configBackup.encryption.heading") }}</span>
					</div>

					<v-alert v-if="!encryptionAvailable" type="warning" text dense class="mb-2">
						{{ $t("plugins.duetConfigBackup.configBackup.encryption.unavailable") }}
					</v-alert>

					<template v-else-if="!encryptionEnabled">
						<div class="text-caption text--secondary mb-2">{{ $t("plugins.duetConfigBackup.configBackup.encryption.introOff") }}</div>
						<v-btn small text @click="setDialogOpen = true">
							<v-icon small class="me-1">mdi-lock-plus-outline</v-icon>
							{{ $t("plugins.duetConfigBackup.configBackup.encryption.enableButton") }}
						</v-btn>
					</template>

					<template v-else>
						<div class="d-flex align-center mb-2" style="gap: 8px;">
							<v-chip x-small :color="sessionUnlocked ? 'success' : 'warning'">
								{{ sessionUnlocked
									? $t("plugins.duetConfigBackup.configBackup.encryption.unlockedNote")
									: $t("plugins.duetConfigBackup.configBackup.encryption.lockedNote") }}
							</v-chip>
						</div>
						<div class="d-flex flex-wrap mb-2" style="gap: 8px;">
							<v-btn v-if="!sessionUnlocked" small text @click="unlockDialogOpen = true">
								<v-icon small class="me-1">mdi-lock-open-outline</v-icon>
								{{ $t("plugins.duetConfigBackup.configBackup.encryption.unlockButton") }}
							</v-btn>
							<v-btn v-else small text @click="onLockNow">
								<v-icon small class="me-1">mdi-lock-outline</v-icon>
								{{ $t("plugins.duetConfigBackup.configBackup.encryption.lockButton") }}
							</v-btn>
							<v-btn v-if="sessionUnlocked" small text color="error" @click="onDisableEncryption">
								{{ $t("plugins.duetConfigBackup.configBackup.encryption.disableButton") }}
							</v-btn>
						</div>
					</template>

					<v-divider class="my-3" />

					<div class="text-caption text--secondary mb-2">{{ $t("plugins.duetConfigBackup.configBackup.encryption.sdIntro") }}</div>
					<div class="d-flex flex-wrap" style="gap: 8px;">
						<v-btn small text :disabled="!encryptionEnabled" :loading="sdSaving" @click="onSaveToSd">
							<v-icon small class="me-1">mdi-content-save-outline</v-icon>
							{{ $t("plugins.duetConfigBackup.configBackup.encryption.saveToSdButton") }}
						</v-btn>
						<v-btn small text :loading="sdLoading" @click="onLoadFromSd">
							<v-icon small class="me-1">mdi-tray-arrow-down</v-icon>
							{{ $t("plugins.duetConfigBackup.configBackup.encryption.loadFromSdButton") }}
						</v-btn>
					</div>
					<v-alert v-if="sdStatus" :type="sdStatus.ok ? 'success' : 'error'" text dense class="mt-2">
						{{ sdStatus.message }}
					</v-alert>

					<v-divider class="my-3" />

					<div class="text-caption text--secondary mb-2">{{ $t("plugins.duetConfigBackup.configBackup.encryption.fileIntro") }}</div>
					<div class="d-flex flex-wrap" style="gap: 8px;">
						<v-btn small text :disabled="!encryptionEnabled" @click="onExportFile">
							<v-icon small class="me-1">mdi-file-download-outline</v-icon>
							{{ $t("plugins.duetConfigBackup.configBackup.encryption.exportFileButton") }}
						</v-btn>
						<v-btn small text @click="pickImportFile">
							<v-icon small class="me-1">mdi-file-upload-outline</v-icon>
							{{ $t("plugins.duetConfigBackup.configBackup.encryption.importFileButton") }}
						</v-btn>
					</div>
					<input ref="importFileInput" type="file" accept=".json" class="d-none" @change="onImportFileSelected" />
					<v-alert v-if="fileStatus" :type="fileStatus.ok ? 'success' : 'error'" text dense class="mt-2">
						{{ fileStatus.message }}
					</v-alert>
				</v-card-text>
			</v-card>

			<!-- Automatic backup reminders -->
			<v-card outlined class="mb-4">
				<v-card-text>
					<div class="d-flex align-center mb-2" style="gap: 8px;">
						<v-icon size="18">mdi-bell-outline</v-icon>
						<span class="text-body-2 font-weight-medium">{{ $t("plugins.duetConfigBackup.configBackup.nudge.settingsHeading") }}</span>
					</div>
					<div class="text-caption text--secondary mb-2">{{ $t("plugins.duetConfigBackup.configBackup.nudge.settingsIntro") }}</div>
					<v-checkbox v-model="nudgeConfigSaved" dense hide-details
								:label="$t('plugins.duetConfigBackup.configBackup.nudge.triggerConfigSaved')" @change="saveNudgeSettings" />
					<v-checkbox v-model="nudgeNewMachine" dense hide-details
								:label="$t('plugins.duetConfigBackup.configBackup.nudge.triggerNewMachine')" @change="saveNudgeSettings" />
					<v-checkbox v-model="nudgeOverdue" dense hide-details
								:label="$t('plugins.duetConfigBackup.configBackup.nudge.triggerOverdue')" @change="saveNudgeSettings" />
					<v-text-field v-if="nudgeOverdue" v-model.number="nudgeOverdueDays" type="number" min="1" max="90" dense
								  outlined hide-details :label="$t('plugins.duetConfigBackup.configBackup.nudge.triggerOverdueDays')"
								  style="max-width: 260px; margin-left: 32px;" class="mt-2" @change="saveNudgeSettings" />
				</v-card-text>
			</v-card>

			<v-alert v-if="encryptionEnabled && !sessionUnlocked" type="info" text dense class="mb-4">
				{{ $t("plugins.duetConfigBackup.configBackup.encryption.destinationsLockedNote") }}
			</v-alert>

			<!-- Destination panels are hidden (not just disabled) while locked - saved credentials are
				 encrypted, so their fields would just be blank, and any edits would silently not
				 persist (setJson() no-ops while locked - see credentials.ts) rather than fail loudly. -->
			<v-expansion-panels v-if="!encryptionEnabled || sessionUnlocked">
				<!-- Duet backup service -->
				<v-expansion-panel>
					<v-expansion-panel-header>
						<div>
							<v-icon size="18" class="me-2">mdi-cloud-outline</v-icon>
							{{ $t("plugins.duetConfigBackup.configBackup.cloud.duetHeading") }}
							<v-chip x-small class="ms-2" :color="duetSession ? 'success' : undefined">
								{{ duetSession ? $t("plugins.duetConfigBackup.configBackup.cloud.configuredNote") : $t("plugins.duetConfigBackup.configBackup.cloud.notConfiguredYet") }}
							</v-chip>
						</div>
					</v-expansion-panel-header>
					<v-expansion-panel-content>
						<template v-if="!duetSession">
							<v-text-field v-model="duetEmail" :label="$t('plugins.duetConfigBackup.configBackup.cloud.email')"
										  dense outlined hide-details class="mb-2" />
							<v-text-field v-model="duetPassword" :label="$t('plugins.duetConfigBackup.configBackup.cloud.password')" type="password"
										  dense outlined hide-details class="mb-2" />
							<div class="text-caption text--secondary mb-2">{{ $t("plugins.duetConfigBackup.configBackup.cloud.loginHelp") }}</div>
							<v-btn color="primary" :loading="duetLoggingIn" @click="onDuetLogin">
								{{ $t("plugins.duetConfigBackup.configBackup.cloud.loginButton") }}
							</v-btn>
						</template>
						<template v-else>
							<div class="d-flex align-center mb-3" style="gap: 8px;">
								<span class="text-body-2">{{ $t("plugins.duetConfigBackup.configBackup.cloud.signedInAs", { username: duetSession.username }) }}</span>
								<v-spacer />
								<v-btn small text @click="onDuetLogout">{{ $t("plugins.duetConfigBackup.configBackup.cloud.logoutButton") }}</v-btn>
							</div>
							<v-text-field v-model.number="duetFifoLimit" type="number" min="1" max="20" dense outlined hide-details
										  :label="$t('plugins.duetConfigBackup.configBackup.cloud.fifoLimitLabel')" style="max-width: 260px;" class="mb-3"
										  @change="setDuetCloudFifoLimit(duetFifoLimit)" />
							<div class="text-caption text--secondary">{{ $t("plugins.duetConfigBackup.configBackup.cloud.browseInRestoreTab") }}</div>
						</template>
						<v-alert v-if="duetError" type="error" text dense class="mt-3">{{ duetError }}</v-alert>
					</v-expansion-panel-content>
				</v-expansion-panel>

				<!-- GitHub -->
				<v-expansion-panel>
					<v-expansion-panel-header>
						<div>
							<v-icon size="18" class="me-2">mdi-github</v-icon>
							{{ $t("plugins.duetConfigBackup.configBackup.github.heading") }}
							<v-chip x-small class="ms-2" :color="githubConfigured ? 'success' : undefined">
								{{ githubConfigured ? $t("plugins.duetConfigBackup.configBackup.cloud.configuredNote") : $t("plugins.duetConfigBackup.configBackup.cloud.notConfiguredYet") }}
							</v-chip>
						</div>
					</v-expansion-panel-header>
					<v-expansion-panel-content>
						<v-text-field v-model="githubRepo" :label="$t('plugins.duetConfigBackup.configBackup.github.repoLabel')"
									  dense outlined hide-details class="mb-2" />
						<v-text-field v-model="githubBranch" :label="$t('plugins.duetConfigBackup.configBackup.github.branchLabel')"
									  dense outlined hide-details class="mb-2" />
						<v-text-field v-model="githubToken" :label="$t('plugins.duetConfigBackup.configBackup.github.tokenLabel')" type="password"
									  dense outlined hide-details class="mb-2" />
						<div class="text-caption text--secondary mb-2">{{ $t("plugins.duetConfigBackup.configBackup.github.tokenHelp") }}</div>
						<v-text-field v-model="githubMachineName" :label="$t('plugins.duetConfigBackup.configBackup.github.machineNameLabel')"
									  :placeholder="thisHostname" dense outlined hide-details class="mb-2" />
						<div class="text-caption text--secondary mb-2">{{ $t("plugins.duetConfigBackup.configBackup.github.machineNameHelp") }}</div>
						<v-btn color="primary" :loading="githubVerifying" @click="onSaveGithub">{{ $t("plugins.duetConfigBackup.configBackup.cloud.saveButton") }}</v-btn>
						<v-alert v-if="githubStatus" :type="githubStatus.ok ? 'success' : 'error'" text dense class="mt-3">
							{{ githubStatus.message }}
						</v-alert>
						<div class="text-caption text--secondary mt-3">{{ $t("plugins.duetConfigBackup.configBackup.github.restoreNote") }}</div>
					</v-expansion-panel-content>
				</v-expansion-panel>

				<!-- Google Drive -->
				<v-expansion-panel>
					<v-expansion-panel-header>
						<div>
							<v-icon size="18" class="me-2">mdi-google-drive</v-icon>
							{{ $t("plugins.duetConfigBackup.configBackup.drive.heading") }}
							<v-chip x-small class="ms-2" :color="driveConfigured ? 'success' : undefined">
								{{ driveConfigured ? $t("plugins.duetConfigBackup.configBackup.cloud.configuredNote") : $t("plugins.duetConfigBackup.configBackup.cloud.notConfiguredYet") }}
							</v-chip>
						</div>
					</v-expansion-panel-header>
					<v-expansion-panel-content>
						<v-alert v-if="!driveOriginOk" type="warning" text dense class="mb-3">
							{{ $t("plugins.duetConfigBackup.configBackup.drive.unavailableBody") }}
						</v-alert>
						<template v-else>
							<v-text-field v-model="driveClientId" :label="$t('plugins.duetConfigBackup.configBackup.drive.clientIdLabel')"
										  dense outlined hide-details class="mb-2" />
							<div class="text-caption text--secondary mb-2">{{ $t("plugins.duetConfigBackup.configBackup.drive.clientIdHelp") }}</div>
							<v-btn color="primary" @click="onSaveDrive">{{ $t("plugins.duetConfigBackup.configBackup.cloud.saveButton") }}</v-btn>
							<v-alert v-if="driveSaved" type="success" text dense class="mt-3">
								{{ $t("plugins.duetConfigBackup.configBackup.cloud.saved") }}
							</v-alert>
						</template>
					</v-expansion-panel-content>
				</v-expansion-panel>

				<!-- Dropbox -->
				<v-expansion-panel>
					<v-expansion-panel-header>
						<div>
							<v-icon size="18" class="me-2">mdi-dropbox</v-icon>
							{{ $t("plugins.duetConfigBackup.configBackup.cloud.dropboxHeading") }}
							<v-chip x-small class="ms-2" :color="dropboxConfigured ? 'success' : undefined">
								{{ dropboxConfigured ? $t("plugins.duetConfigBackup.configBackup.cloud.configuredNote") : $t("plugins.duetConfigBackup.configBackup.cloud.notConfiguredYet") }}
							</v-chip>
						</div>
					</v-expansion-panel-header>
					<v-expansion-panel-content>
						<v-text-field v-model="dropboxToken" :label="$t('plugins.duetConfigBackup.configBackup.dropbox.tokenLabel')" type="password"
									  dense outlined hide-details class="mb-2" />
						<div class="text-caption text--secondary mb-2">{{ $t("plugins.duetConfigBackup.configBackup.dropbox.tokenHelp") }}</div>
						<v-btn color="primary" :loading="dropboxVerifying" @click="onSaveDropbox">{{ $t("plugins.duetConfigBackup.configBackup.cloud.saveButton") }}</v-btn>
						<v-alert v-if="dropboxStatus" :type="dropboxStatus.ok ? 'success' : 'error'" text dense class="mt-3">
							{{ dropboxStatus.message }}
						</v-alert>
						<div v-if="dropboxConfigured" class="text-caption text--secondary mt-3">
							{{ $t("plugins.duetConfigBackup.configBackup.cloud.browseInRestoreTab") }}
						</div>
					</v-expansion-panel-content>
				</v-expansion-panel>

				<!-- WebDAV -->
				<v-expansion-panel>
					<v-expansion-panel-header>
						<div>
							<v-icon size="18" class="me-2">mdi-nas</v-icon>
							{{ $t("plugins.duetConfigBackup.configBackup.cloud.webdavHeading") }}
							<v-chip x-small class="ms-2" :color="webdavConfigured ? 'success' : undefined">
								{{ webdavConfigured ? $t("plugins.duetConfigBackup.configBackup.cloud.configuredNote") : $t("plugins.duetConfigBackup.configBackup.cloud.notConfiguredYet") }}
							</v-chip>
						</div>
					</v-expansion-panel-header>
					<v-expansion-panel-content>
						<v-text-field v-model="webdavUrl" :label="$t('plugins.duetConfigBackup.configBackup.webdav.urlLabel')"
									  dense outlined hide-details class="mb-2" />
						<div class="text-caption text--secondary mb-2">{{ $t("plugins.duetConfigBackup.configBackup.webdav.urlHelp") }}</div>
						<v-text-field v-model="webdavUsername" :label="$t('plugins.duetConfigBackup.configBackup.webdav.usernameLabel')"
									  dense outlined hide-details class="mb-2" />
						<v-text-field v-model="webdavPassword" :label="$t('plugins.duetConfigBackup.configBackup.webdav.passwordLabel')" type="password"
									  dense outlined hide-details class="mb-2" />
						<v-alert type="info" text dense class="mb-2">
							{{ $t("plugins.duetConfigBackup.configBackup.webdav.corsNote") }}
						</v-alert>
						<v-btn color="primary" :loading="webdavVerifying" @click="onSaveWebdav">{{ $t("plugins.duetConfigBackup.configBackup.cloud.saveButton") }}</v-btn>
						<v-alert v-if="webdavStatus" :type="webdavStatus.ok ? 'success' : 'error'" text dense class="mt-3">
							{{ webdavStatus.message }}
						</v-alert>
						<div v-if="webdavConfigured" class="text-caption text--secondary mt-3">
							{{ $t("plugins.duetConfigBackup.configBackup.cloud.browseInRestoreTab") }}
						</div>
					</v-expansion-panel-content>
				</v-expansion-panel>
			</v-expansion-panels>
		</v-card-text>

		<PassphraseDialog v-model="setDialogOpen" mode="set" :loading="setBusy" :error="setError" @submit="onSetPassphrase" />
		<PassphraseDialog v-model="unlockDialogOpen" mode="unlock" :loading="unlockBusy" :error="unlockError" @submit="onUnlockSubmit" />
		<ConfirmDialog ref="confirmDialog" />
	</v-card>
</template>

<script>
import {
	disableEncryption, enableEncryption, exportEncryptedBundle, getAutoBackupNudgeSettings, getDropboxSettings,
	getDuetCloudApiUrl, getDuetCloudFifoLimit, getDuetCloudSession, getGithubSettings, getGoogleDriveClientId,
	getWebDavSettings, importEncryptedBundle, isEncryptionAvailable, isEncryptionEnabled, isSessionUnlocked,
	lockSession, setAutoBackupNudgeSettings, setDropboxSettings, setDuetCloudFifoLimit,
	setGithubSettings, setGoogleDriveClientId, setWebDavSettings, unlockSession,
	loadCredentialsFromSd, parseCredentialBundle, writeCredentialsToSd, buildMachineIdentity,
} from "dwc-config-backup-core";
import { login as duetLoginCall, logout as duetLogoutCall } from "dwc-config-backup-core/destinations/duetCloud";
import { isRepoPrivate } from "dwc-config-backup-core/destinations/github";
import { isOriginSupported } from "dwc-config-backup-core/destinations/googleDrive";
import { verifyToken as dropboxVerify } from "dwc-config-backup-core/destinations/dropbox";
import { verifyConnection as webdavVerify } from "dwc-config-backup-core/destinations/webdav";

import { defaultMachineIO } from "./machineIO";
import PassphraseDialog from "./PassphraseDialog.vue";
import ConfirmDialog from "./ConfirmDialog.vue";

export default {
	name: "CloudPanel",
	components: { PassphraseDialog, ConfirmDialog },
	data() {
		const nudgeSaved = getAutoBackupNudgeSettings();
		const githubSaved = getGithubSettings();
		const dropboxSaved = getDropboxSettings();
		const webdavSaved = getWebDavSettings();
		return {
			// Credential encryption + SD-card cross-device storage. Encryption is opt-in (default off)
			// and, when on, gates every destination panel below: getters return null until the session is
			// unlocked, so there's nothing to accidentally show/leak. crypto.subtle (what this needs)
			// requires a secure context in every real browser - unavailable on most plain-HTTP Duets, same
			// restriction as Google Drive elsewhere - `encryptionAvailable` surfaces that honestly instead
			// of offering a toggle that would just fail.
			encryptionAvailable: isEncryptionAvailable(),
			// refreshTick forces the two computed props below to re-read module state after an async
			// operation completes, since they wrap credentials.ts's own module-level state, not
			// component-local reactive data.
			refreshTick: 0,
			setDialogOpen: false, setBusy: false, setError: null,
			unlockDialogOpen: false, unlockBusy: false, unlockError: null,
			sdSaving: false, sdLoading: false, sdStatus: null,
			fileStatus: null,

			nudgeConfigSaved: nudgeSaved.configSaved,
			nudgeNewMachine: nudgeSaved.newMachine,
			nudgeOverdue: nudgeSaved.overdue,
			nudgeOverdueDays: nudgeSaved.overdueDays,

			thisHostname: buildMachineIdentity(this.$store.state.machine.model).hostname,
			duetEmail: "", duetPassword: "", duetLoggingIn: false, duetError: null,
			duetSession: getDuetCloudSession(), duetFifoLimit: getDuetCloudFifoLimit(),

			githubRepo: (githubSaved && githubSaved.repo) || "",
			githubBranch: (githubSaved && githubSaved.branch) || "main",
			githubToken: (githubSaved && githubSaved.token) || "",
			githubMachineName: (githubSaved && githubSaved.machineName) || "",
			githubVerifying: false, githubStatus: null,

			driveClientId: getGoogleDriveClientId() || "",
			driveOriginOk: isOriginSupported(),
			driveSaved: false,

			dropboxToken: (dropboxSaved && dropboxSaved.token) || "",
			dropboxVerifying: false, dropboxStatus: null,

			webdavUrl: (webdavSaved && webdavSaved.url) || "",
			webdavUsername: (webdavSaved && webdavSaved.username) || "",
			webdavPassword: (webdavSaved && webdavSaved.password) || "",
			webdavVerifying: false, webdavStatus: null,
		};
	},
	computed: {
		encryptionEnabled() { void this.refreshTick; return isEncryptionEnabled(); },
		sessionUnlocked() { void this.refreshTick; return isSessionUnlocked(); },
		githubConfigured() { return getGithubSettings() != null; },
		driveConfigured() { return getGoogleDriveClientId() != null; },
		dropboxConfigured() { return getDropboxSettings() != null; },
		webdavConfigured() { return getWebDavSettings() != null; },
	},
	watch: {
		// Every field above is seeded ONCE from storage in data() - that's fine normally, but while
		// encryption is on and locked, the getters all returned null, so every field started blank. The
		// panels themselves are v-if-hidden while locked and reappear on unlock; Vue doesn't re-run
		// data()'s initialiser just because the DOM subtree remounts - without this, unlocking would leave
		// every field looking empty even though the credentials are now genuinely available. Re-read
		// everything from storage the moment the session actually unlocks (mirrors what data() did on
		// first mount).
		sessionUnlocked(unlocked) {
			if (!unlocked) { return; }
			const github = getGithubSettings();
			if (github) {
				this.githubRepo = github.repo;
				this.githubBranch = github.branch;
				this.githubToken = github.token;
				this.githubMachineName = github.machineName || "";
			}
			const drive = getGoogleDriveClientId();
			if (drive != null) { this.driveClientId = drive; }
			const dropbox = getDropboxSettings();
			if (dropbox) { this.dropboxToken = dropbox.token; }
			const webdav = getWebDavSettings();
			if (webdav) {
				this.webdavUrl = webdav.url;
				this.webdavUsername = webdav.username;
				this.webdavPassword = webdav.password;
			}
		},
	},
	methods: {
		async onSetPassphrase(passphrase) {
			this.setBusy = true;
			this.setError = null;
			try {
				await enableEncryption(passphrase);
				this.setDialogOpen = false;
				this.refreshTick++;
			} catch (e) {
				this.setError = e instanceof Error ? e.message : String(e);
			} finally {
				this.setBusy = false;
			}
		},
		async onUnlockSubmit(passphrase) {
			this.unlockBusy = true;
			this.unlockError = null;
			try {
				const ok = await unlockSession(passphrase);
				if (ok) {
					this.unlockDialogOpen = false;
					this.refreshTick++;
				} else {
					this.unlockError = this.$t("plugins.duetConfigBackup.configBackup.encryption.wrongPassphrase");
				}
			} finally {
				this.unlockBusy = false;
			}
		},
		onLockNow() {
			lockSession();
			this.refreshTick++;
		},
		async onDisableEncryption() {
			const ok = await this.$refs.confirmDialog.show(
				this.$t("plugins.duetConfigBackup.configBackup.encryption.disableConfirmTitle"),
				this.$t("plugins.duetConfigBackup.configBackup.encryption.disableConfirmBody"),
				"mdi-lock-open-alert-outline",
			);
			if (!ok) { return; }
			await disableEncryption();
			this.refreshTick++;
		},
		async onSaveToSd() {
			this.sdStatus = null;
			if (!this.$store.state.machine.isConnected) {
				this.sdStatus = { ok: false, message: this.$t("plugins.duetConfigBackup.configBackup.encryption.offline") };
				return;
			}
			this.sdSaving = true;
			try {
				const result = await writeCredentialsToSd(defaultMachineIO(this.$store));
				this.sdStatus = result === "written"
					? { ok: true, message: this.$t("plugins.duetConfigBackup.configBackup.encryption.savedToSd") }
					: { ok: false, message: this.$t(`plugins.duetConfigBackup.configBackup.encryption.sd.${result}`) };
			} finally {
				this.sdSaving = false;
			}
		},
		async onLoadFromSd() {
			this.sdStatus = null;
			if (!this.$store.state.machine.isConnected) {
				this.sdStatus = { ok: false, message: this.$t("plugins.duetConfigBackup.configBackup.encryption.offline") };
				return;
			}
			this.sdLoading = true;
			try {
				const loaded = await loadCredentialsFromSd(defaultMachineIO(this.$store));
				if (loaded) {
					this.refreshTick++;
					this.sdStatus = { ok: true, message: this.$t("plugins.duetConfigBackup.configBackup.encryption.loadedFromSd") };
					this.unlockDialogOpen = true; // still locked - prompt straight away so it's actually usable
				} else {
					this.sdStatus = { ok: false, message: this.$t("plugins.duetConfigBackup.configBackup.encryption.nothingOnSd") };
				}
			} finally {
				this.sdLoading = false;
			}
		},
		onExportFile() {
			this.fileStatus = null;
			const bundle = exportEncryptedBundle();
			if (!bundle) {
				this.fileStatus = { ok: false, message: this.$t("plugins.duetConfigBackup.configBackup.encryption.exportNotEncrypted") };
				return;
			}
			const blob = new Blob([JSON.stringify(bundle)], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "duet-config-backup-credentials.json";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			setTimeout(() => URL.revokeObjectURL(url), 1000);
			this.fileStatus = { ok: true, message: this.$t("plugins.duetConfigBackup.configBackup.encryption.exportedFile") };
		},
		pickImportFile() {
			this.$refs.importFileInput.click();
		},
		async onImportFileSelected(ev) {
			this.fileStatus = null;
			const file = ev.target.files && ev.target.files[0];
			ev.target.value = ""; // allow re-selecting the same file next time
			if (!file) { return; }
			const bundle = parseCredentialBundle(await file.text());
			if (!bundle) {
				this.fileStatus = { ok: false, message: this.$t("plugins.duetConfigBackup.configBackup.encryption.importFileInvalid") };
				return;
			}
			importEncryptedBundle(bundle);
			this.refreshTick++;
			this.fileStatus = { ok: true, message: this.$t("plugins.duetConfigBackup.configBackup.encryption.importedFile") };
			this.unlockDialogOpen = true; // still locked - prompt straight away so it's actually usable
		},
		saveNudgeSettings() {
			setAutoBackupNudgeSettings({
				configSaved: this.nudgeConfigSaved, newMachine: this.nudgeNewMachine,
				overdue: this.nudgeOverdue, overdueDays: this.nudgeOverdueDays || 1,
			});
		},
		// The service URL is hardcoded (getDuetCloudApiUrl()) and deliberately never shown or editable
		// here, unlike every other destination's settings.
		async onDuetLogin() {
			this.duetError = null;
			this.duetLoggingIn = true;
			try {
				this.duetSession = await duetLoginCall(getDuetCloudApiUrl(), this.duetEmail, this.duetPassword);
			} catch (e) {
				this.duetError = e instanceof Error ? e.message : String(e);
			} finally {
				this.duetLoggingIn = false;
			}
		},
		onDuetLogout() {
			duetLogoutCall();
			this.duetSession = null;
		},
		async onSaveGithub() {
			this.githubVerifying = true;
			this.githubStatus = null;
			try {
				const priv = await isRepoPrivate(this.githubToken, this.githubRepo);
				setGithubSettings({
					token: this.githubToken, repo: this.githubRepo, branch: this.githubBranch || "main",
					machineName: this.githubMachineName.trim() || undefined,
				});
				this.githubStatus = priv == null
					? { ok: false, message: this.$t("plugins.duetConfigBackup.configBackup.github.repoNotFound") }
					: { ok: true, message: this.$t("plugins.duetConfigBackup.configBackup.cloud.saved") };
			} finally {
				this.githubVerifying = false;
			}
		},
		onSaveDrive() {
			setGoogleDriveClientId(this.driveClientId);
			this.driveSaved = true;
		},
		async onSaveDropbox() {
			this.dropboxVerifying = true;
			this.dropboxStatus = null;
			try {
				const who = await dropboxVerify(this.dropboxToken);
				setDropboxSettings({ token: this.dropboxToken });
				this.dropboxStatus = { ok: true, message: this.$t("plugins.duetConfigBackup.configBackup.cloud.verified", { who }) };
			} catch (e) {
				this.dropboxStatus = { ok: false, message: this.$t("plugins.duetConfigBackup.configBackup.cloud.verifyFailed", { error: e instanceof Error ? e.message : String(e) }) };
			} finally {
				this.dropboxVerifying = false;
			}
		},
		async onSaveWebdav() {
			this.webdavVerifying = true;
			this.webdavStatus = null;
			try {
				await webdavVerify(this.webdavUrl, this.webdavUsername, this.webdavPassword);
				setWebDavSettings({ url: this.webdavUrl, username: this.webdavUsername, password: this.webdavPassword });
				this.webdavStatus = { ok: true, message: this.$t("plugins.duetConfigBackup.configBackup.cloud.saved") };
			} catch (e) {
				this.webdavStatus = { ok: false, message: this.$t("plugins.duetConfigBackup.configBackup.cloud.verifyFailed", { error: e instanceof Error ? e.message : String(e) }) };
			} finally {
				this.webdavVerifying = false;
			}
		},
	},
};
</script>
