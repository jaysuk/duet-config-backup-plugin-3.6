/**
 * The DWC-backed `MachineIO` implementation for this plugin, binding dwc-config-backup-core's
 * abstract machine interface to DWC 3.6's Vuex machine module (namespaced "machine", the currently
 * selected/connected machine - same namespace bd_pressure_dwc_plugin's proven 3.6 build dispatches
 * `machine/sendCode` against).
 *
 * Every call passes `showProgress`/`showSuccess`/`showError: false` so DWC's own upload/download
 * notifications stay silent - backup and restore drive hundreds of these and report their own
 * aggregated progress via the panels themselves.
 */
export function defaultMachineIO(store) {
	return {
		async getFileList(directory) {
			return store.dispatch("machine/getFileList", directory);
		},
		async downloadText(filename) {
			const result = await store.dispatch("machine/download", {
				filename, type: "text", showProgress: false, showSuccess: false, showError: false,
			});
			return result.content;
		},
		async downloadBlob(filename) {
			const result = await store.dispatch("machine/download", {
				filename, type: "blob", showProgress: false, showSuccess: false, showError: false,
			});
			return result.content;
		},
		async upload(filename, content) {
			await store.dispatch("machine/upload", {
				filename, content, showProgress: false, showSuccess: false, showError: false,
			});
		},
		async deleteFile(filename, recursive) {
			await store.dispatch("machine/delete", { filename, recursive });
		},
		async sendCode(code) {
			return store.dispatch("machine/sendCode", { code, fromInput: false, log: false });
		},
	};
}
