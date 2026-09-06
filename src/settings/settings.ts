import { type Bridge, BridgeKind } from "@serverkgg/bridge";
import { fieldValues, guardSettings, mergeSettings, readSettings, SETTING_FIELDS } from "../shared";

export const settings: Bridge.Settings = {
	kind: BridgeKind.Settings,

	async read(context) {
		return fieldValues(await readSettings(context));
	},

	async write(context, values) {
		const merged: Bridge.Values = {
			...(await readSettings(context)),
			...values,
		};

		guardSettings(merged);

		const changed: Bridge.Values = {};

		for (const field of SETTING_FIELDS) {
			if (values[field] !== undefined) {
				changed[field] = values[field];
			}
		}

		await mergeSettings(context, changed);
	},
};
