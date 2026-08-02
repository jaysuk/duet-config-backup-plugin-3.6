<template>
	<div>
		<div class="d-flex flex-wrap align-center mb-3" style="gap: 8px;">
			<v-text-field v-model="search" dense outlined hide-details clearable
						  prepend-inner-icon="mdi-magnify" :placeholder="$t('plugins.duetConfigBackup.configBackup.restore.treeSearch')"
						  style="max-width: 260px;" />
			<v-btn small text @click="selectAll">{{ $t("plugins.duetConfigBackup.configBackup.restore.treeSelectAll") }}</v-btn>
			<v-btn small text @click="selectNone">{{ $t("plugins.duetConfigBackup.configBackup.restore.treeSelectNone") }}</v-btn>
			<v-btn small text @click="selectSystemOnly">{{ $t("plugins.duetConfigBackup.configBackup.restore.treeSelectSystemOnly") }}</v-btn>
		</div>

		<div v-for="group in visibleGroups" :key="group.kind" class="mb-4">
			<div class="d-flex align-center mb-1" style="gap: 8px;">
				<v-icon size="20" color="amber darken-2">mdi-folder</v-icon>
				<span class="text-body-2 font-weight-bold">{{ group.label }}</span>
				<span class="text-caption text--secondary">({{ group.items.length }})</span>
			</div>

			<v-data-table :headers="headers" :items="group.items" item-key="path"
						   :value="kindSelectedRows(group.kind)" @input="onKindSelect(group.kind, $event)"
						   show-select hide-default-footer items-per-page="-1" dense must-sort
						   sort-by="name" sort-desc="false">
				<template #item.name="{ item }">
					<div class="d-flex align-center">
						<v-icon small class="me-2">{{ item.binary ? "mdi-file-image" : "mdi-file" }}</v-icon>
						<span v-if="item.dir" class="text--secondary">{{ item.dir }}/</span>
						<span>{{ item.baseName }}</span>
						<v-chip v-if="item.redacted" x-small class="ms-2" color="warning">
							{{ $t("plugins.duetConfigBackup.configBackup.redaction.redactedChip") }}
						</v-chip>
					</div>
				</template>
				<template #item.size="{ item }">
					{{ formatSize(item.size) }}
				</template>
			</v-data-table>
		</div>
	</div>
</template>

<script>
// Vuetify 2's v-data-table selection API differs from 3/4's: `v-model`/(`value`+`input`) here is an
// array of the actual row objects (matched by `item-key`), not an array of key strings, so
// kindSelectedRows/onKindSelect work with Row objects rather than bare path strings. Headers use
// {text, value} instead of {title, key}, and sort-by/sort-desc are separate flat props instead of a
// single sort-by array of {key, order} objects.
import { DIR_FOLDER } from "dwc-config-backup-core";

const KIND_LABELS = { system: "0:/sys/", macros: "0:/macros/", filaments: "0:/filaments/" };

function relativePath(f) {
	const prefix = `files/${DIR_FOLDER[f.kind]}/`;
	return f.path.startsWith(prefix) ? f.path.slice(prefix.length) : f.path;
}

function toRow(f) {
	const rel = relativePath(f);
	const slash = rel.lastIndexOf("/");
	return {
		path: f.path, size: f.size, binary: f.binary, redacted: f.redacted,
		dir: slash === -1 ? "" : rel.slice(0, slash),
		baseName: slash === -1 ? rel : rel.slice(slash + 1),
	};
}

export default {
	name: "BackupFileTree",
	props: {
		files: { type: Array, required: true },
		modelValue: { type: Set, required: true },
	},
	data() {
		return { search: "" };
	},
	computed: {
		headers() {
			return [
				{ text: this.$t("plugins.duetConfigBackup.configBackup.restore.treeColumnName"), value: "name" },
				{ text: this.$t("plugins.duetConfigBackup.configBackup.restore.treeColumnSize"), value: "size", align: "end" },
			];
		},
		groups() {
			const byKind = new Map();
			for (const f of this.files) {
				if (!byKind.has(f.kind)) { byKind.set(f.kind, []); }
				byKind.get(f.kind).push(toRow(f));
			}
			return Array.from(byKind.entries()).map(([kind, items]) => ({ kind, label: KIND_LABELS[kind], items }));
		},
		visibleGroups() {
			const term = this.search.trim().toLowerCase();
			if (!term) { return this.groups; }
			return this.groups
				.map((g) => ({ ...g, items: g.items.filter((r) => `${r.dir}/${r.baseName}`.toLowerCase().includes(term)) }))
				.filter((g) => g.items.length > 0);
		},
	},
	methods: {
		kindRows(kind) {
			return this.groups.find((g) => g.kind === kind)?.items ?? [];
		},
		kindSelectedRows(kind) {
			return this.kindRows(kind).filter((r) => this.modelValue.has(r.path));
		},
		onKindSelect(kind, rows) {
			const next = new Set(this.modelValue);
			for (const r of this.kindRows(kind)) { next.delete(r.path); }
			for (const r of rows) { next.add(r.path); }
			this.$emit("update:modelValue", next);
		},
		selectAll() { this.$emit("update:modelValue", new Set(this.files.map((f) => f.path))); },
		selectNone() { this.$emit("update:modelValue", new Set()); },
		selectSystemOnly() { this.$emit("update:modelValue", new Set(this.files.filter((f) => f.kind === "system").map((f) => f.path))); },
		formatSize(bytes) {
			if (bytes < 1024) { return `${bytes} B`; }
			if (bytes < 1024 * 1024) { return `${(bytes / 1024).toFixed(1)} KB`; }
			return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
		},
	},
};
</script>
