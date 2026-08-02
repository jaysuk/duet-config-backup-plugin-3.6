<template>
	<v-dialog v-model="open" max-width="480" persistent>
		<v-card>
			<v-card-title class="d-flex align-center">
				<v-icon class="me-2">{{ icon }}</v-icon>
				{{ title }}
			</v-card-title>
			<v-card-text>
				<div v-if="html" v-html="prompt" />
				<div v-else>{{ prompt }}</div>
			</v-card-text>
			<v-card-actions>
				<v-spacer />
				<v-btn text @click="resolveWith(false)">{{ $t("generic.cancel") }}</v-btn>
				<v-btn color="primary" @click="resolveWith(true)">{{ $t("generic.ok") }}</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script>
/**
 * Vuetify-2, ref-based replacement for DWC 3.7's `showConfirmDialog` composable, which doesn't exist
 * on 3.6. Embed once (`<ConfirmDialog ref="confirmDialog" />`) and call
 * `this.$refs.confirmDialog.show(title, prompt, icon, html)` - returns a Promise<boolean>, same
 * contract as the 3.7 helper, so the calling code in each panel needed no logic changes beyond that.
 */
export default {
	name: "ConfirmDialog",
	data() {
		return {
			open: false,
			title: "",
			prompt: "",
			icon: "mdi-help-circle-outline",
			html: false,
			resolver: null,
		};
	},
	methods: {
		show(title, prompt, icon, html) {
			this.title = title;
			this.prompt = prompt;
			this.icon = icon || "mdi-help-circle-outline";
			this.html = !!html;
			this.open = true;
			return new Promise((resolve) => { this.resolver = resolve; });
		},
		resolveWith(value) {
			this.open = false;
			if (this.resolver) { this.resolver(value); this.resolver = null; }
		},
	},
};
</script>
