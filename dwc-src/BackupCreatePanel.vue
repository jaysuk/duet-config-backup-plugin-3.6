<template>
	<v-card flat>
		<v-card-text>
			<div class="text-caption text--secondary mb-3">{{ lastBackupText }}</div>

			<div class="text-title-small mb-2">{{ $t("plugins.duetConfigBackup.configBackup.create.scopeHeading") }}</div>
			<div class="d-flex flex-wrap mb-3" style="gap: 12px;">
				<v-checkbox v-model="scope.system" :label="$t('plugins.duetConfigBackup.configBackup.create.scopeSystem')" dense hide-details />
				<v-checkbox v-model="scope.macros" :label="$t('plugins.duetConfigBackup.configBackup.create.scopeMacros')" dense hide-details />
				<v-checkbox v-model="scope.filaments" :label="$t('plugins.duetConfigBackup.configBackup.create.scopeFilaments')" dense hide-details />
				<v-checkbox v-model="scope.objectModel" :label="$t('plugins.duetConfigBackup.configBackup.create.scopeObjectModel')" dense hide-details />
				<v-checkbox v-model="scope.diagnostics" :label="$t('plugins.duetConfigBackup.configBackup.create.scopeDiagnostics')" dense hide-details />
			</div>
			<div class="text-caption text--secondary mb-3">{{ $t("plugins.duetConfigBackup.configBackup.create.objectModelHelp") }}</div>

			<v-divider class="mb-3" />

			<div class="d-flex align-center mb-1" style="gap: 8px;">
				<v-switch v-model="redact" dense hide-details color="warning" />
				<span class="text-body-2">{{ $t("plugins.duetConfigBackup.configBackup.create.redactSwitch") }}</span>
				<HelpTip :text="redact
					? $t('plugins.duetConfigBackup.configBackup.create.redactHelpOn')
					: $t('plugins.duetConfigBackup.configBackup.create.redactHelpOff')" />
			</div>
			<v-alert :type="redact ? 'info' : 'warning'" text dense class="mb-3">
				{{ redact
					? $t("plugins.duetConfigBackup.configBackup.create.redactHelpOn")
					: $t("plugins.duetConfigBackup.configBackup.create.redactHelpOff") }}
			</v-alert>

			<div class="d-flex align-center mb-1" style="gap: 8px;">
				<v-switch v-model="encrypt" dense hide-details color="warning" />
				<span class="text-body-2">{{ $t("plugins.duetConfigBackup.configBackup.create.encryptSwitch") }}</span>
				<HelpTip :text="$t('plugins.duetConfigBackup.configBackup.create.encryptHelp')" />
			</div>
			<v-alert type="info" text dense class="mb-3">
				{{ $t("plugins.duetConfigBackup.configBackup.create.encryptHelp") }}
			</v-alert>

			<v-divider class="mb-3" />

			<div class="text-title-small mb-2">{{ $t("plugins.duetConfigBackup.configBackup.create.destinationHeading") }}</div>
			<v-radio-group v-model="destination" dense hide-details class="mb-1">
				<v-radio v-for="opt in destinationOptions" :key="opt.id" :value="opt.id">
					<template #label>
						<span class="d-flex align-center" style="gap: 8px;">
							{{ opt.label }}
							<v-chip v-if="opt.id !== 'local'" x-small :color="opt.configured ? 'success' : undefined">
								{{ opt.configured
									? $t("plugins.duetConfigBackup.configBackup.cloud.configuredNote")
									: $t("plugins.duetConfigBackup.configBackup.cloud.notConfiguredYet") }}
							</v-chip>
						</span>
					</template>
				</v-radio>
			</v-radio-group>

			<v-alert v-if="!destinationConfigured" type="warning" text dense class="mb-3">
				{{ $t("plugins.duetConfigBackup.configBackup.create.notConfigured", { destination: destinationLabel }) }}
			</v-alert>

			<v-btn color="primary" :loading="busy" :disabled="!scopeValid || !destinationConfigured" @click="onCreate">
				{{ $t("plugins.duetConfigBackup.configBackup.create.createButton") }}
			</v-btn>
			<div v-if="!scopeValid" class="text-caption error--text mt-1">{{ $t("plugins.duetConfigBackup.configBackup.create.noScopeSelected") }}</div>

			<v-progress-linear v-if="busy" :value="progressPct" class="mt-3" />
			<div v-if="busy" class="text-caption text--secondary mt-1">{{ stageLabel }}</div>

			<v-alert v-if="error" type="error" text dense class="mt-3">{{ error }}</v-alert>

			<template v-if="result">
				<v-divider class="my-3" />
				<div class="text-title-small mb-2">{{ $t("plugins.duetConfigBackup.configBackup.create.resultHeading") }}</div>
				<div class="text-body-2 mb-1">
					{{ $t("plugins.duetConfigBackup.configBackup.create.resultFiles", { count: result.manifest.counts.files }) }}
					· {{ formatSize(result.manifest.counts.bytes) }}
					<span v-if="result.manifest.counts.skipped > 0">
						· {{ $t("plugins.duetConfigBackup.configBackup.create.resultSkipped", { count: result.manifest.counts.skipped }) }}
					</span>
				</div>
				<RedactionSummary :entries="result.redactions.entries" :redacted="result.manifest.redacted" allow-exclude @exclude="onExclude" />
			</template>

			<v-divider class="my-3" />
			<v-expansion-panels>
				<v-expansion-panel>
					<v-expansion-panel-header class="text-body-2">
						{{ $t("plugins.duetConfigBackup.configBackup.create.exclusionsHeading", { count: exclusions.length }) }}
					</v-expansion-panel-header>
					<v-expansion-panel-content>
						<div class="text-caption text--secondary mb-2">{{ $t("plugins.duetConfigBackup.configBackup.create.exclusionsHelp") }}</div>
						<div v-if="exclusions.length === 0" class="text-caption text--secondary">
							{{ $t("plugins.duetConfigBackup.configBackup.create.exclusionsEmpty") }}
						</div>
						<template v-else>
							<v-chip v-for="name in exclusions" :key="name" small class="mr-2 mb-2" close
									:aria-label="$t('plugins.duetConfigBackup.configBackup.create.exclusionsRemove', { name })"
									@click:close="onRemoveExclusion(name)">
								{{ name }}
							</v-chip>
						</template>
					</v-expansion-panel-content>
				</v-expansion-panel>
			</v-expansion-panels>
		</v-card-text>

		<v-dialog v-model="unredactedDialog.open" max-width="520">
			<v-card>
				<v-card-title>{{ $t("plugins.duetConfigBackup.configBackup.create.unredactedWarningTitle") }}</v-card-title>
				<v-card-text>
					<div class="mb-2">
						{{ $t("plugins.duetConfigBackup.configBackup.create.unredactedWarningBody", { count: unredactedDialog.count, destination }) }}
					</div>
					<RedactionSummary :entries="unredactedDialog.entries" :redacted="false" />
				</v-card-text>
				<v-card-actions>
					<v-spacer />
					<v-btn text color="primary" @click="unredactedDialog.resolve && unredactedDialog.resolve('redact')">
						{{ $t("plugins.duetConfigBackup.configBackup.create.unredactedWarningRedactInstead") }}
					</v-btn>
					<v-btn text color="error" @click="unredactedDialog.resolve && unredactedDialog.resolve('send')">
						{{ $t("plugins.duetConfigBackup.configBackup.create.unredactedWarningSendAnyway") }}
					</v-btn>
					<v-btn text @click="unredactedDialog.resolve && unredactedDialog.resolve('cancel')">
						{{ $t("plugins.duetConfigBackup.configBackup.common.cancel") }}
					</v-btn>
				</v-card-actions>
			</v-card>
		</v-dialog>

		<v-dialog v-model="publicRepoDialog.open" max-width="520">
			<v-card>
				<v-card-title class="error--text">{{ $t("plugins.duetConfigBackup.configBackup.create.publicRepoBlockedTitle") }}</v-card-title>
				<v-card-text>
					<p class="mb-3">{{ $t("plugins.duetConfigBackup.configBackup.create.publicRepoBlockedBody") }}</p>
					<v-text-field v-model="publicRepoDialog.typed" :label="$t('plugins.duetConfigBackup.configBackup.create.publicRepoBlockedConfirmLabel')"
								  dense outlined hide-details />
				</v-card-text>
				<v-card-actions>
					<v-spacer />
					<v-btn text @click="publicRepoDialog.resolve && publicRepoDialog.resolve(false)">{{ $t("plugins.duetConfigBackup.configBackup.common.cancel") }}</v-btn>
					<v-btn text color="error" :disabled="publicRepoDialog.typed !== 'CONFIRM'" @click="publicRepoDialog.resolve && publicRepoDialog.resolve(true)">
						{{ $t("plugins.duetConfigBackup.configBackup.create.publicRepoBlockedConfirmWord") }}
					</v-btn>
				</v-card-actions>
			</v-card>
		</v-dialog>

		<v-dialog v-model="passwordDialog.open" max-width="480" persistent>
			<v-card>
				<v-card-title>{{ $t("plugins.duetConfigBackup.configBackup.create.encryptPasswordTitle") }}</v-card-title>
				<v-card-text>
					<p class="text-body-2 mb-3">{{ $t("plugins.duetConfigBackup.configBackup.create.encryptPasswordBody") }}</p>
					<v-text-field v-model="passwordDialog.password" type="password"
								  :label="$t('plugins.duetConfigBackup.configBackup.create.encryptPasswordLabel')"
								  dense outlined hide-details class="mb-3" autofocus />
					<v-text-field v-model="passwordDialog.confirm" type="password"
								  :label="$t('plugins.duetConfigBackup.configBackup.create.encryptPasswordConfirmLabel')"
								  dense outlined hide-details class="mb-2"
								  @keyup.enter="confirmPasswordDialog" />
					<div v-if="passwordDialog.password && passwordDialog.confirm && passwordDialog.password !== passwordDialog.confirm"
						 class="text-caption error--text mb-2">
						{{ $t("plugins.duetConfigBackup.configBackup.create.encryptPasswordMismatch") }}
					</div>
					<v-checkbox v-model="passwordDialog.remember" dense hide-details
								:label="$t('plugins.duetConfigBackup.configBackup.create.encryptPasswordRemember')" />
				</v-card-text>
				<v-card-actions>
					<v-spacer />
					<v-btn text @click="cancelPasswordDialog">{{ $t("plugins.duetConfigBackup.configBackup.common.cancel") }}</v-btn>
					<v-btn text color="primary" :disabled="!passwordDialogValid" @click="confirmPasswordDialog">
						{{ $t("plugins.duetConfigBackup.configBackup.create.encryptPasswordConfirmButton") }}
					</v-btn>
				</v-card-actions>
			</v-card>
		</v-dialog>

		<v-snackbar v-model="toast.open" :timeout="4000">{{ toast.text }}</v-snackbar>
	</v-card>
</template>

<script>
import {
	addBackedUpMachineKey, addRedactionExclusion, buildArchive, buildLiveDirectories, buildMachineIdentity,
	collectAll, defaultMachineFolder, DEFAULT_MAX_FILE_BYTES, getDropboxSettings, getDuetCloudApiUrl,
	getDuetCloudFifoLimit, getDuetCloudSession, getEncryptPreference, getGithubSettings, getGoogleDriveClientId,
	getLastBackupAt, getRedactionExclusions, getRedactPreference, getWebDavSettings, hasAcknowledgedUnredacted,
	readArchive, removeRedactionExclusion, setAcknowledgedUnredacted, setEncryptPreference, setLastBackupAt,
	setRedactPreference,
} from "dwc-config-backup-core";
import { downloadArchive, backupFilename } from "dwc-config-backup-core/destinations/localZip";
import { isRepoPrivate, pushBackup } from "dwc-config-backup-core/destinations/github";
import { isOriginSupported, signIn, uploadBackup as driveUploadBackup } from "dwc-config-backup-core/destinations/googleDrive";
import { preflightSize, pruneToLimit, uploadBackup as duetUploadBackup } from "dwc-config-backup-core/destinations/duetCloud";
import { uploadBackup as dropboxUploadBackup } from "dwc-config-backup-core/destinations/dropbox";
import { uploadBackup as webdavUploadBackup } from "dwc-config-backup-core/destinations/webdav";

import { defaultMachineIO } from "./machineIO";
import { PLUGIN_MANIFEST_ID } from "./constants";
import HelpTip from "./HelpTip.vue";
import RedactionSummary from "./RedactionSummary.vue";

const DESTINATION_IDS = ["local", "duet", "github", "drive", "dropbox", "webdav"];
const DESTINATION_LABEL_KEYS = {
	local: "plugins.duetConfigBackup.configBackup.create.destinationLocal",
	duet: "plugins.duetConfigBackup.configBackup.create.destinationDuet",
	github: "plugins.duetConfigBackup.configBackup.create.destinationGithub",
	drive: "plugins.duetConfigBackup.configBackup.create.destinationDrive",
	dropbox: "plugins.duetConfigBackup.configBackup.create.destinationDropbox",
	webdav: "plugins.duetConfigBackup.configBackup.create.destinationWebdav",
};
const STAGE_KEYS = {
	listing: "plugins.duetConfigBackup.configBackup.create.stageListing",
	reading: "plugins.duetConfigBackup.configBackup.create.stageReading",
	"object-model": "plugins.duetConfigBackup.configBackup.create.stageObjectModel",
	diagnostics: "plugins.duetConfigBackup.configBackup.create.stageDiagnostics",
	packaging: "plugins.duetConfigBackup.configBackup.create.stagePackaging",
};

export default {
	name: "BackupCreatePanel",
	components: { HelpTip, RedactionSummary },
	props: {
		active: { type: Boolean, default: false },
	},
	data() {
		return {
			scope: { system: true, macros: true, filaments: true, objectModel: true, diagnostics: true },
			destination: "local",
			redact: getRedactPreference("local"),
			encrypt: getEncryptPreference("local"),
			// Backup encryption password (ENCRYPTED-BACKUPS-PLAN.md §5.2) - typed fresh per backup by
			// default, deliberately NOT the credential-store's persistent session-unlock model (a
			// backup is a historical artifact: one taken today must still open in 6 months even if the
			// "current" password has since changed). `rememberedPassword` is the one narrow exception:
			// in-memory only, never localStorage, cleared on reload - a convenience for taking several
			// backups in one sitting.
			rememberedPassword: null,
			passwordDialog: { open: false, password: "", confirm: "", remember: false, resolve: null },
			refreshTick: 0,
			busy: false,
			stage: null,
			stageDone: 0,
			stageTotal: 1,
			error: null,
			result: null,
			unredactedDialog: { open: false, count: 0, entries: [], resolve: null },
			publicRepoDialog: { open: false, typed: "", resolve: null },
			// Redaction exclusions (dwc-config-backup-core's REDACTION-EXCLUSIONS-PLAN.md §6.2) - no
			// in-place re-scan (plan option (b), recommended): `collected` is a local inside
			// onCreate() and is gone by the time this list is on screen, and a redacted `result` has
			// no recoverable originals to re-scan anyway. Exclude -> persist -> toast; the change
			// applies on the NEXT backup.
			exclusions: getRedactionExclusions(),
			toast: { open: false, text: "" },
		};
	},
	computed: {
		scopeValid() {
			return Object.values(this.scope).some(Boolean);
		},
		destinationLabel() {
			return this.$t(DESTINATION_LABEL_KEYS[this.destination]);
		},
		// Configuration is saved on a different tab (Vuetify's v-tabs-items keeps every tab's component
		// mounted rather than remounting on switch), so a plain computed here would go stale the moment
		// the user configures a destination and comes back. `active` (passed by ConfigBackupPage, true
		// while this is the visible tab) bumps `refreshTick` (via the watcher below) to force these to
		// re-read localStorage on every return visit.
		destinationOptions() {
			void this.refreshTick;
			return DESTINATION_IDS.map((id) => ({ id, label: this.$t(DESTINATION_LABEL_KEYS[id]), configured: this.isDestinationConfigured(id) }));
		},
		destinationConfigured() {
			void this.refreshTick;
			return this.isDestinationConfigured(this.destination);
		},
		lastBackupText() {
			void this.refreshTick;
			const iso = getLastBackupAt();
			if (!iso) { return this.$t("plugins.duetConfigBackup.configBackup.create.lastBackupNever"); }
			const days = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
			return days <= 0
				? this.$t("plugins.duetConfigBackup.configBackup.create.lastBackupToday")
				: this.$t("plugins.duetConfigBackup.configBackup.create.lastBackupDaysAgo", { count: days });
		},
		progressPct() {
			return this.stageTotal > 0 ? (this.stageDone / this.stageTotal) * 100 : 0;
		},
		stageLabel() {
			return this.stage ? this.$t(STAGE_KEYS[this.stage]) : "";
		},
		passwordDialogValid() {
			return this.passwordDialog.password.length > 0 && this.passwordDialog.password === this.passwordDialog.confirm;
		},
	},
	watch: {
		destination(d) { this.redact = getRedactPreference(d); this.encrypt = getEncryptPreference(d); },
		redact(v) { setRedactPreference(this.destination, v); },
		encrypt(v) { setEncryptPreference(this.destination, v); },
		active(active) { if (active) { this.refreshTick++; } },
	},
	methods: {
		/** The INSTALLED plugin version (authoritative), same source as the diagnostics report elsewhere
		 * in this plugin - falls back to "unknown" outside a real DWC. */
		installedVersion() {
			const plugins = this.$store.state.machine.model && this.$store.state.machine.model.plugins;
			const record = plugins && (plugins.get ? plugins.get(PLUGIN_MANIFEST_ID) : plugins[PLUGIN_MANIFEST_ID]);
			return (record && record.version) || "unknown";
		},
		runningDwcVersion() {
			try { return (window.DWC && window.DWC.version) || "unknown"; } catch { return "unknown"; }
		},
		isDestinationConfigured(id) {
			switch (id) {
				case "local": return true;
				// getDuetCloudApiUrl() always has a value now (falls back to the shared default) -
				// signing in (a session) is what actually reflects the user having done anything here.
				case "duet": return getDuetCloudSession() != null;
				case "github": return getGithubSettings() != null;
				case "drive": return isOriginSupported() && getGoogleDriveClientId() != null;
				case "dropbox": return getDropboxSettings() != null;
				case "webdav": return getWebDavSettings() != null;
				default: return false;
			}
		},
		askUnredacted(entries) {
			return new Promise((resolve) => {
				this.unredactedDialog.count = entries.length;
				this.unredactedDialog.entries = entries;
				this.unredactedDialog.open = true;
				this.unredactedDialog.resolve = (choice) => { this.unredactedDialog.open = false; this.unredactedDialog.resolve = null; resolve(choice); };
			});
		},
		askPublicRepoConfirm() {
			return new Promise((resolve) => {
				this.publicRepoDialog.typed = "";
				this.publicRepoDialog.open = true;
				this.publicRepoDialog.resolve = (ok) => { this.publicRepoDialog.open = false; this.publicRepoDialog.resolve = null; resolve(ok); };
			});
		},
		formatSize(bytes) {
			if (bytes < 1024) { return `${bytes} B`; }
			if (bytes < 1024 * 1024) { return `${(bytes / 1024).toFixed(1)} KB`; }
			return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
		},
		askEncryptPassword() {
			return new Promise((resolve) => {
				this.passwordDialog.password = "";
				this.passwordDialog.confirm = "";
				this.passwordDialog.remember = false;
				this.passwordDialog.open = true;
				this.passwordDialog.resolve = (password) => { this.passwordDialog.open = false; this.passwordDialog.resolve = null; resolve(password); };
			});
		},
		confirmPasswordDialog() {
			if (!this.passwordDialogValid) { return; }
			if (this.passwordDialog.remember) { this.rememberedPassword = this.passwordDialog.password; }
			if (this.passwordDialog.resolve) { this.passwordDialog.resolve(this.passwordDialog.password); }
		},
		cancelPasswordDialog() {
			if (this.passwordDialog.resolve) { this.passwordDialog.resolve(null); }
		},
		onExclude(name) {
			addRedactionExclusion(name);
			this.exclusions = getRedactionExclusions();
			this.toast.text = this.$t("plugins.duetConfigBackup.configBackup.redaction.excludeToast", { name });
			this.toast.open = true;
		},
		onRemoveExclusion(name) {
			removeRedactionExclusion(name);
			this.exclusions = getRedactionExclusions();
		},
		async onCreate() {
			this.error = null;
			this.result = null;
			this.busy = true;
			try {
				// Ask for the encryption password FIRST, before the (potentially slow)
				// collection/build work - better to interrupt the user upfront than after they've
				// waited through the whole process.
				let encryptPassword;
				if (this.encrypt) {
					encryptPassword = this.rememberedPassword || (await this.askEncryptPassword());
					if (encryptPassword == null) { this.busy = false; return; } // cancelled
				}

				const io = defaultMachineIO(this.$store);
				const model = this.$store.state.machine.model;
				const identity = buildMachineIdentity(model);
				const directories = buildLiveDirectories(model);

				const collected = await collectAll(io, {
					scope: this.scope, maxFileBytes: DEFAULT_MAX_FILE_BYTES, directories, model, boards: identity.boards,
					onProgress: (s, done, total) => { this.stage = s; this.stageDone = done; this.stageTotal = Math.max(total, 1); },
				});

				const pluginVersion = this.installedVersion();
				const dwcVersion = this.runningDwcVersion();

				// Same source for both calls below (REDACTION-EXCLUSIONS-PLAN.md §6.2 step 3, in
				// dwc-config-backup-core) - the dry-run preview and the real archive must agree on
				// what's excluded, or the preview could promise a redaction the real backup then skips.
				const excludedNames = new Set(getRedactionExclusions());

				let useRedact = this.redact;
				// An encrypted backup already satisfies "nothing leaves in the clear"
				// (ENCRYPTED-BACKUPS-PLAN.md §3) - skip the unredacted-content warning entirely when
				// encryption is on, same as it's already skipped for "redact" being on.
				if (!useRedact && !this.encrypt && this.destination !== "local" && !hasAcknowledgedUnredacted(this.destination)) {
					// Dry-run scan so the warning can name exactly what's in the backup, regardless of
					// the switch. Never encrypted - this blob is thrown away, only its redaction list
					// is used.
					const dryRun = await buildArchive(collected, { redact: false, scope: this.scope, machine: identity, directories, pluginVersion, dwcVersion, excludedNames });
					if (dryRun.redactions.entries.length > 0) {
						const choice = await this.askUnredacted(dryRun.redactions.entries);
						if (choice === "cancel") { this.busy = false; return; }
						if (choice === "redact") { useRedact = true; }
						if (choice === "send") { setAcknowledgedUnredacted(this.destination); }
					}
				}

				const built = await buildArchive(collected, {
					redact: useRedact, scope: this.scope, machine: identity, directories, pluginVersion, dwcVersion, excludedNames,
					encrypt: encryptPassword ? { password: encryptPassword } : undefined,
				});
				this.result = built;

				if (this.destination === "local") {
					downloadArchive(built.blob, identity.hostname);
				} else if (this.destination === "duet") {
					await this.sendToDuetCloud(built, identity);
				} else if (this.destination === "github") {
					await this.sendToGithub(built, identity, useRedact, built.encrypted);
				} else if (this.destination === "drive") {
					await this.sendToDrive(built, identity);
				} else if (this.destination === "dropbox") {
					await this.sendToDropbox(built, identity);
				} else if (this.destination === "webdav") {
					await this.sendToWebdav(built, identity);
				}
				setLastBackupAt(new Date().toISOString());
				addBackedUpMachineKey(built.manifest.machine.machineKey);
			} catch (e) {
				this.error = e instanceof Error ? e.message : String(e);
			} finally {
				this.busy = false;
				this.stage = null;
			}
		},
		async sendToDuetCloud(built, identity) {
			const apiUrl = getDuetCloudApiUrl();
			const preflight = preflightSize(built.blob);
			if (!preflight.ok) {
				throw new Error(`This backup is ${(preflight.size / (1024 * 1024)).toFixed(2)} MB, over the 2 MB limit for the cloud service. Try dropping the object model dump or M122 diagnostics, or download it locally instead.`);
			}
			const machineKey = built.manifest.machine.machineKey;
			await duetUploadBackup(apiUrl, built.blob, { machine: built.manifest.machine.firmware.electronics, hostname: identity.hostname, guid: machineKey });
			await pruneToLimit(apiUrl, machineKey, getDuetCloudFifoLimit());
		},
		async sendToGithub(built, identity, isRedacted, isEncrypted) {
			const settings = getGithubSettings();
			if (!settings) { throw new Error(this.$t("plugins.duetConfigBackup.configBackup.create.notConfigured", { destination: this.destinationLabel })); }
			if (!isRedacted && !isEncrypted) {
				const priv = await isRepoPrivate(settings.token, settings.repo);
				if (priv === false) {
					const ok = await this.askPublicRepoConfirm();
					if (!ok) { return; }
				}
			}
			// ENCRYPTED-BACKUPS-PLAN.md §3/§5.7: the expanded per-file push exists so config.g diffs
			// across backups in GitHub's own UI - reading it back requires `built.blob` to be the plain
			// archive. When encrypted, `built.blob` is the password-protected outer zip (not readable
			// without the password, and not meant to be), so GitHub gets treated like every other
			// destination: only the zip.
			const files = isEncrypted ? [] : built.manifest.files.map((f) => ({
				path: f.path.replace(/^files\//, ""),
				content: "", // filled from archive text below
				binary: f.binary,
			}));
			// Pull the actual text back out of the freshly-built zip via a re-read - buildArchive doesn't
			// keep a Map of contents by design (it streams straight into JSZip), so re-parse the blob once.
			if (!isEncrypted) {
				const parsed = await readArchive(built.blob);
				for (const f of files) {
					const full = `files/${f.path}`;
					f.content = parsed.textFiles.get(full) || "";
				}
			}
			// GitHub keys backups by a human-readable folder path, not the hardware GUID Duet Cloud
			// uses - so two machines that happen to share a hostname would collide in the same folder
			// without a disambiguator. An explicit "Machine name" override is used verbatim (the user
			// picked it on purpose); otherwise default to hostname + a short hash of the real machine key.
			const machineFolder = settings.machineName || defaultMachineFolder(identity.hostname, built.manifest.machine.machineKey);
			await pushBackup({
				token: settings.token, repo: settings.repo, branch: settings.branch || "main",
				machineFolder, files,
				// Stable filename (not timestamped): each push OVERWRITES this one blob rather than
				// accumulating a new zip per backup. Git still keeps every past version reachable via
				// commit history.
				zip: { path: "backup.zip", blob: built.blob },
				message: `Config backup ${settings.machineName || identity.hostname} ${built.manifest.createdAt}`,
			});
		},
		async sendToDrive(built, identity) {
			const clientId = getGoogleDriveClientId();
			if (!isOriginSupported() || !clientId) {
				throw new Error(this.$t("plugins.duetConfigBackup.configBackup.create.notConfigured", { destination: this.destinationLabel }));
			}
			const token = await signIn(clientId);
			// Drive folders are found-or-created by this exact name, same hostname-only collision risk
			// as Dropbox/WebDAV - see the comment on GitHub's machineFolder above.
			const machineFolder = defaultMachineFolder(identity.hostname, built.manifest.machine.machineKey);
			await driveUploadBackup(token, machineFolder, backupFilename(identity.hostname), built.blob);
		},
		async sendToDropbox(built, identity) {
			const settings = getDropboxSettings();
			if (!settings) { throw new Error(this.$t("plugins.duetConfigBackup.configBackup.create.notConfigured", { destination: this.destinationLabel })); }
			// Dropbox has no manual-override field (unlike GitHub), so it always gets the disambiguated
			// default - see the comment on GitHub's machineFolder above.
			const machineFolder = defaultMachineFolder(identity.hostname, built.manifest.machine.machineKey);
			await dropboxUploadBackup(settings.token, machineFolder, backupFilename(identity.hostname), built.blob);
		},
		async sendToWebdav(built, identity) {
			const settings = getWebDavSettings();
			if (!settings) { throw new Error(this.$t("plugins.duetConfigBackup.configBackup.create.notConfigured", { destination: this.destinationLabel })); }
			const machineFolder = defaultMachineFolder(identity.hostname, built.manifest.machine.machineKey);
			await webdavUploadBackup(settings.url, settings.username, settings.password, machineFolder, backupFilename(identity.hostname), built.blob);
		},
	},
};
</script>
