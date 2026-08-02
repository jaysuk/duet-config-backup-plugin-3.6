"use strict";

import { registerRoute } from "@/routes";
import i18n from "@/i18n";
import store from "@/store";
import { configureHost } from "dwc-config-backup-core";

import ConfigBackupPage from "./ConfigBackupPage.vue";
import { PLUGIN_ID, PROTECTED_SD_FILES } from "./constants";
import { installAutoBackupNudges } from "./autoBackupNudges";
import en from "./en.json";

i18n.mergeLocaleMessage("en", { plugins: { [PLUGIN_ID]: en } });

// A distinct namespace from Flexible Layouts' "flexibleLayouts.configBackup" - this is a standalone
// plugin and may be installed alongside FL (on a different DWC major version, since FL itself only
// targets 3.7), so the two must not silently share saved destination credentials. Anyone who
// genuinely wants to move credentials between the two can already do so via the SD-card sync /
// export-import file, which round-trips regardless of namespace.
configureHost({
	storageNamespace: "duetConfigBackup",
	protectedFiles: PROTECTED_SD_FILES,
});

registerRoute(ConfigBackupPage, {
	Plugins: {
		DuetConfigBackup: {
			icon: "mdi-archive-arrow-down",
			caption: "plugins.duetConfigBackup.configBackup.title",
			path: "/Plugins/DuetConfigBackup",
		},
	},
});

installAutoBackupNudges(store);
