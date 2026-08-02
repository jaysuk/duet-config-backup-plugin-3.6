<template>
	<div>
		<v-alert type="warning" text dense class="mb-3">
			<div class="font-weight-medium">{{ $t("plugins.duetConfigBackup.configBackup.restore.repairHeading") }}</div>
			<div class="text-caption mt-1">{{ $t("plugins.duetConfigBackup.configBackup.restore.repairIntro") }}</div>
		</v-alert>

		<div class="d-flex align-center mb-3" style="gap: 8px;">
			<span class="text-caption text--secondary">
				{{ $t("plugins.duetConfigBackup.configBackup.restore.repairProgress", { done: resolvedCount, total: rows.length }) }}
			</span>
			<v-spacer />
			<v-btn small text @click="bulkKeepLive">{{ $t("plugins.duetConfigBackup.configBackup.restore.repairBulkKeepLive") }}</v-btn>
			<v-btn small text @click="bulkCommentOut">{{ $t("plugins.duetConfigBackup.configBackup.restore.repairBulkComment") }}</v-btn>
		</div>

		<v-card v-for="row in rows" :key="row.entry.id" outlined class="mb-2">
			<v-card-text class="py-2">
				<div class="d-flex align-center mb-1" style="gap: 8px;">
					<v-icon size="16" :color="hasDecision(row.entry.id) ? 'success' : 'warning'">
						{{ hasDecision(row.entry.id) ? "mdi-check-circle-outline" : "mdi-help-circle-outline" }}
					</v-icon>
					<span class="text-body-2 font-weight-medium">{{ row.entry.label }}</span>
					<span class="text-caption text--secondary">{{ row.entry.path }}</span>
				</div>

				<v-btn-toggle :value="actionType(row.entry.id)" dense mandatory @change="setActionType(row, $event)">
					<v-btn v-if="row.suggestion.status === 'found'" value="keep-live" small>
						{{ $t("plugins.duetConfigBackup.configBackup.restore.repairActionKeepLive") }}
					</v-btn>
					<v-btn value="enter-value" small>{{ $t("plugins.duetConfigBackup.configBackup.restore.repairActionEnter") }}</v-btn>
					<v-btn v-if="row.entry.kind === 'gcode-command'" value="comment-out" small>
						{{ $t("plugins.duetConfigBackup.configBackup.restore.repairActionComment") }}
					</v-btn>
					<v-btn v-if="row.entry.kind === 'json-value'" value="omit-key" small>
						{{ $t("plugins.duetConfigBackup.configBackup.restore.repairActionOmit") }}
					</v-btn>
				</v-btn-toggle>

				<div v-if="actionType(row.entry.id) === 'keep-live'" class="mt-2">
					<template v-if="row.suggestion.status === 'found'">
						<div class="text-caption text--secondary">
							{{ Object.entries(row.suggestion.values).map(([k, v]) => `${k}: ${v}`).join(", ") }}
						</div>
					</template>
					<template v-else-if="row.suggestion.status === 'ambiguous'">
						<div class="text-caption mb-1">{{ $t("plugins.duetConfigBackup.configBackup.restore.repairAmbiguous") }}</div>
						<v-radio-group :value="ambiguousChoice[row.entry.id] || 0" dense hide-details
									   @change="chooseAmbiguous(row, $event)">
							<v-radio v-for="(cand, i) in row.suggestion.candidates" :key="i"
									 :label="Object.entries(cand).map(([k, v]) => `${k}: ${v}`).join(', ')" :value="i" />
						</v-radio-group>
					</template>
				</div>

				<div v-else-if="actionType(row.entry.id) === 'enter-value'" class="mt-2">
					<v-text-field v-for="param in paramList(row.entry)" :key="param"
								  :value="(enteredValues[row.entry.id] || {})[param] || ''"
								  :label="paramList(row.entry).length > 1 ? param : undefined"
								  :type="row.entry.restoreHint === 'credential' && !revealed[row.entry.id] ? 'password' : 'text'"
								  dense outlined hide-details="auto"
								  :error-messages="entryError(row.entry, param) || undefined"
								  class="mb-2"
								  @input="setEnteredValue(row, param, $event)">
						<template v-if="row.entry.restoreHint === 'credential'" #append>
							<v-icon size="16" style="cursor: pointer;" @click="toggleReveal(row.entry.id)">
								{{ revealed[row.entry.id] ? "mdi-eye-off" : "mdi-eye" }}
							</v-icon>
						</template>
					</v-text-field>
				</div>
			</v-card-text>
		</v-card>
	</div>
</template>

<script>
// Local component state that needs per-key mutation (enteredValues/ambiguousChoice/revealed) is kept
// as plain reactive objects rather than Map/Set: Vue 2's reactivity only tracks object-key
// assignment (via Vue.set/this.$set), not Map.set()/Set.add() calls, unlike Vue 3's reactive() which
// deep-proxies both. The `modelValue`/`decisions` Map itself is fine to keep as a real Map, since it's
// only ever replaced wholesale (never mutated in place) via emit, same as the original.
import { suggestFromLive, validateEnteredValue } from "dwc-config-backup-core";

export default {
	name: "RedactionRepairStep",
	props: {
		sites: { type: Array, required: true },
		// archivePath -> the LIVE machine's current text at that path (fetched by the caller).
		liveFileTexts: { type: Map, required: true },
		modelValue: { type: Map, required: true },
	},
	data() {
		return { enteredValues: {}, ambiguousChoice: {}, revealed: {} };
	},
	computed: {
		decisions() { return this.modelValue; },
		rows() {
			return this.sites
				.filter((s) => s.entry.kind !== "m122-line")
				.map((s) => ({ entry: s.entry, suggestion: suggestFromLive(s.entry, this.liveFileTexts.get(s.entry.path) || "") }));
		},
		resolvedCount() { return this.rows.filter((r) => this.decisions.has(r.entry.id)).length; },
		totalCount() { return this.rows.length; },
	},
	methods: {
		paramList(entry) {
			if (entry.kind === "gcode-command") { return entry.params || []; }
			return ["value"];
		},
		replace(next) { this.$emit("update:modelValue", next); },
		hasDecision(id) { return this.decisions.has(id); },
		actionType(id) {
			const d = this.decisions.get(id);
			return d ? d.type : null;
		},
		setActionType(row, type) {
			if (!type) { return; }
			const next = new Map(this.decisions);
			if (type === "comment-out") {
				next.set(row.entry.id, { type: "comment-out" });
			} else if (type === "omit-key") {
				next.set(row.entry.id, { type: "omit-key" });
			} else if (type === "keep-live") {
				if (row.suggestion.status === "found") {
					next.set(row.entry.id, { type: "keep-live", values: row.suggestion.values });
				} else if (row.suggestion.status === "ambiguous") {
					const idx = this.ambiguousChoice[row.entry.id] || 0;
					next.set(row.entry.id, { type: "keep-live", values: row.suggestion.candidates[idx] });
				} else {
					next.delete(row.entry.id); // no suggestion - nothing to apply yet
				}
			} else {
				// enter-value: only commit once every param passes validation (see setEnteredValue)
				next.delete(row.entry.id);
			}
			this.replace(next);
		},
		chooseAmbiguous(row, idx) {
			if (idx == null) { return; }
			this.$set(this.ambiguousChoice, row.entry.id, idx);
			if (row.suggestion.status === "ambiguous") {
				const next = new Map(this.decisions);
				next.set(row.entry.id, { type: "keep-live", values: row.suggestion.candidates[idx] });
				this.replace(next);
			}
		},
		entryError(entry, param) {
			const value = (this.enteredValues[entry.id] || {})[param];
			if (value == null || value === "") { return null; } // don't show an error before the user has typed anything
			return validateEnteredValue(entry, param, value);
		},
		setEnteredValue(row, param, value) {
			const current = { ...(this.enteredValues[row.entry.id] || {}), [param]: value };
			this.$set(this.enteredValues, row.entry.id, current);

			const params = this.paramList(row.entry);
			const allValid = params.every((p) => {
				const v = current[p];
				return v != null && v !== "" && validateEnteredValue(row.entry, p, v) === null;
			});
			const next = new Map(this.decisions);
			if (allValid) {
				next.set(row.entry.id, { type: "enter-value", values: { ...current } });
			} else {
				next.delete(row.entry.id);
			}
			this.replace(next);
		},
		toggleReveal(id) {
			this.$set(this.revealed, id, !this.revealed[id]);
		},
		bulkKeepLive() {
			const next = new Map(this.decisions);
			for (const row of this.rows) {
				if (row.suggestion.status === "found") { next.set(row.entry.id, { type: "keep-live", values: row.suggestion.values }); }
			}
			this.replace(next);
		},
		bulkCommentOut() {
			const next = new Map(this.decisions);
			for (const row of this.rows) {
				if (row.entry.kind === "gcode-command" && !next.has(row.entry.id)) { next.set(row.entry.id, { type: "comment-out" }); }
			}
			this.replace(next);
		},
	},
};
</script>
