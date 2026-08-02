<template>
	<v-dialog :value="modelValue" max-width="440" persistent @input="onCancel">
		<v-card>
			<v-card-title class="d-flex align-center">
				<v-icon class="me-2">mdi-lock-outline</v-icon>
				{{ mode === "set"
					? $t("plugins.duetConfigBackup.configBackup.encryption.setTitle")
					: $t("plugins.duetConfigBackup.configBackup.encryption.unlockTitle") }}
			</v-card-title>
			<v-card-text>
				<div class="text-body-2 text--secondary mb-3">
					{{ mode === "set"
						? $t("plugins.duetConfigBackup.configBackup.encryption.setHelp")
						: $t("plugins.duetConfigBackup.configBackup.encryption.unlockHelp") }}
				</div>
				<v-text-field v-model="passphrase" type="password" dense outlined hide-details autofocus
							  :label="$t('plugins.duetConfigBackup.configBackup.encryption.passphraseLabel')" class="mb-2"
							  @keyup.enter="trySubmit" />
				<v-text-field v-if="mode === 'set'" v-model="confirmPassphrase" type="password" dense outlined
							  hide-details :label="$t('plugins.duetConfigBackup.configBackup.encryption.confirmLabel')" class="mb-2"
							  @keyup.enter="trySubmit" />
				<v-alert v-if="localError" type="error" text dense class="mt-2">{{ localError }}</v-alert>
				<v-alert v-else-if="error" type="error" text dense class="mt-2">{{ error }}</v-alert>
			</v-card-text>
			<v-card-actions>
				<v-spacer />
				<v-btn text @click="onCancel">{{ $t("plugins.duetConfigBackup.configBackup.common.cancel") }}</v-btn>
				<v-btn color="primary" :loading="loading" :disabled="!passphrase" @click="trySubmit">
					{{ mode === "set"
						? $t("plugins.duetConfigBackup.configBackup.encryption.setButton")
						: $t("plugins.duetConfigBackup.configBackup.encryption.unlockButton") }}
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script>
export default {
	name: "PassphraseDialog",
	props: {
		modelValue: { type: Boolean, required: true },
		mode: { type: String, required: true }, // "set" | "unlock"
		loading: { type: Boolean, default: false },
		// Error from the caller (e.g. "wrong passphrase") - shown alongside/instead of local validation.
		error: { type: String, default: null },
	},
	data() {
		return { passphrase: "", confirmPassphrase: "", localError: null };
	},
	watch: {
		modelValue(open) {
			if (open) { this.passphrase = ""; this.confirmPassphrase = ""; this.localError = null; }
		},
	},
	methods: {
		trySubmit() {
			this.localError = null;
			if (!this.passphrase) { return; }
			if (this.mode === "set") {
				if (this.passphrase.length < 8) {
					this.localError = this.$t("plugins.duetConfigBackup.configBackup.encryption.tooShort");
					return;
				}
				if (this.passphrase !== this.confirmPassphrase) {
					this.localError = this.$t("plugins.duetConfigBackup.configBackup.encryption.mismatch");
					return;
				}
			}
			this.$emit("submit", this.passphrase);
		},
		onCancel() {
			this.$emit("update:modelValue", false);
		},
	},
};
</script>
