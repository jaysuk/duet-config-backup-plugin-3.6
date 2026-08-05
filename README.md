# Duet Config Backup (DWC 3.6)

Whole-machine configuration backup & restore for DuetWebControl 3.6, as a standalone plugin. This is
the Vue 2 / Vuetify 2 build for RepRapFirmware installs still on DWC 3.6; see
[`duet-config-backup-plugin`](https://github.com/jaysuk/duet-config-backup-plugin) for the DWC 3.7
(Vue 3) build, and [`dwc-config-backup-core`](https://github.com/jaysuk/dwc-config-backup-core) for
the shared implementation both are built on.

See [docs.md](docs.md) for the full feature reference (what's backed up, redaction rules, restore
modes, destinations, credential storage).

## Install

Settings → General → Plugins → Install plugin, then find it under **Plugins → Duet Config Backup**
(`/Plugins/DuetConfigBackup`).

## Building

DWC 3.6 external plugins are built *from inside a DWC 3.6 checkout*, using DWC's own build tooling -
this repo has no build config of its own:

```bat
:: build.bat - edit DWC_DIR to your checkout first
build.bat
```

`dwc-config-backup-core` must be installed into that DWC checkout's own `node_modules` first (DWC's
`build-plugin` script does not install a plugin's own dependencies):

```bash
npm install --save-dev dwc-config-backup-core
```

It's [published on npm](https://www.npmjs.com/package/dwc-config-backup-core), so this needs no git
access - a `file:` link to a local checkout of that repo also works while developing locally.

## Known reduced scope vs the DWC 3.7 build

- **No "config.g was saved" auto-backup nudge.** DWC 3.7 listens for a global `fileUploaded` event
  that's freely importable from any module. On 3.6, the equivalent event is only emitted on the root
  Vue instance (`this.$root.$emit`/`$on`), which isn't safely reachable from plugin module scope
  outside a mounted component. The "overdue" and "new machine" nudges (pure Vuex-store watching, no
  event bus needed) are still wired. The "Last backup: N days ago" caption on the Create tab covers
  the same need without any event wiring.
- Some Vuetify 2 UI is a close-but-not-pixel-identical port of the Vuetify 3/4 original (e.g. `tonal`
  chip/alert variants map to Vuetify 2's `text` style, custom `card-actions` theme accents map to
  `primary`) - functionally equivalent, not a visual clone.

## License

GPL-3.0-or-later, inherited from Flexible Layouts, which this plugin's UI was originally extracted from.
