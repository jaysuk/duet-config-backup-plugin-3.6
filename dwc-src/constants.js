export const PLUGIN_MANIFEST_ID = "DuetConfigBackup"; // == plugin.json "id"
export const PLUGIN_ID = "duetConfigBackup"; // camelCase - i18n key prefix "plugins.duetConfigBackup.*"
export const ROUTE_PATH = "/Plugins/DuetConfigBackup";

/**
 * This plugin's own SD-card state file, protected from Mirror-mode deletion. There isn't one today -
 * see the identical note in the DWC 3.7 build's constants.ts.
 */
export const PROTECTED_SD_FILES = new Set();
