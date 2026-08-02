/**
 * Host wiring for the automatic backup nudges: turns dwc-config-backup-core's pure predicates into
 * actual DWC toasts, using only the Vuex store + DWC's `makeNotification` utility (both plain,
 * module-scope-importable singletons - confirmed by reading DWC 3.6's own `src/utils/logging.ts`,
 * which imports and calls them the same way at module scope, not from inside a component).
 *
 * Scope note vs the DWC 3.7 build: this port only wires the "overdue" and "new machine" nudges (both
 * driven purely by connection-state watching via the store). The 3.7 build's third trigger -
 * "config.g was just saved" - listens for DWC's global `fileUploaded` event, which on 3.6 is only
 * emitted on the root Vue instance (`this.$root.$emit`/`$on`, see src/utils/events.ts), not a
 * standalone importable bus like 3.7's `Events`. Reaching for the root instance from plugin module
 * scope (outside any component) is a much less certain proposition on this DWC version, so it's left
 * out here rather than risk a fragile dependency on exact plugin-load timing relative to app mount.
 * The "last backup: N days ago" caption inside the page itself covers the same need without any
 * event wiring.
 */
import i18n from "@/i18n";
import { LogType } from "@/utils/logging";
import { makeNotification } from "@/utils/notifications";

import {
	buildMachineIdentity, computeMachineKey, getAutoBackupNudgeSettings, getBackedUpMachineKeys,
	getLastBackupAt, isBackupOverdue, isUnseenMachine,
} from "dwc-config-backup-core";

import { ROUTE_PATH } from "./constants";

let unwatch = null;
let checkedThisSession = false;

export function installAutoBackupNudges(store) {
	unwatch = store.watch(
		(state) => state.machine.isConnected,
		(connected) => {
			if (!connected || checkedThisSession) { return; }
			checkedThisSession = true;
			const settings = getAutoBackupNudgeSettings();
			const identity = buildMachineIdentity(store.state.machine.model);
			const machineKey = computeMachineKey(identity);
			const knownKeys = new Set(getBackedUpMachineKeys());

			if (settings.newMachine && isUnseenMachine(machineKey, knownKeys)) {
				makeNotification(
					LogType.info,
					i18n.t("plugins.duetConfigBackup.configBackup.nudge.newMachineTitle"),
					i18n.t("plugins.duetConfigBackup.configBackup.nudge.newMachineBody"),
					null, ROUTE_PATH,
				);
				return; // one nudge per connect is enough - don't also fire "overdue" straight after
			}
			if (settings.overdue && isBackupOverdue(getLastBackupAt(), settings.overdueDays)) {
				makeNotification(
					LogType.info,
					i18n.t("plugins.duetConfigBackup.configBackup.nudge.overdueTitle"),
					i18n.t("plugins.duetConfigBackup.configBackup.nudge.overdueBody", { days: settings.overdueDays }),
					null, ROUTE_PATH,
				);
			}
		},
		{ immediate: true },
	);
}

export function uninstallAutoBackupNudges() {
	if (unwatch) { unwatch(); unwatch = null; }
	checkedThisSession = false;
}
