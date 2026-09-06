import { type Bridge, BridgeDetailFormat, BridgeDetailTone, BridgeKind } from "@serverkgg/bridge";
import { BEPINEX_FIELD, booleanOf, readSettings } from "../shared";
import { PACK_ID, packInstalled, readPackStamp } from "./bepinexPack";
import { readSidecar } from "./modsSidecar";

export const loader: Bridge.Detail = {
	kind: BridgeKind.Detail,
	async read(context) {
		const installed = await packInstalled(context);
		const stamp = await readPackStamp(context);
		const enabled = booleanOf((await readSettings(context))[BEPINEX_FIELD] ?? null, false);
		const mods = Object.keys(await readSidecar(context)).length;

		return {
			id: PACK_ID,
			title: "BepInEx",
			subtitle: {
				ar: "محمّل المودات اللي تشتغل عليه كل مودات فالهايم",
				en: "The mod loader every Valheim mod runs on",
			},
			description: installed
				? {
						ar: "مركّب. أي مود تنزّله من الكتالوج تحت يشتغل عليه.",
						en: "Installed. Every mod you install from the catalog below runs on it.",
					}
				: {
						ar: "مو مركّب. اضغط «ركّب BepInEx» وننزّله لك من ثندرستور.",
						en: "Not installed. Press Install BepInEx and we pull it from Thunderstore for you.",
					},
			image: null,
			badges: [
				{
					label: installed
						? {
								ar: "مركّب",
								en: "Installed",
							}
						: {
								ar: "مو مركّب",
								en: "Not installed",
							},
					tone: installed ? BridgeDetailTone.Success : BridgeDetailTone.Neutral,
				},
				{
					label: enabled
						? {
								ar: "شغّال مع السيرفر",
								en: "Loaded on start",
							}
						: {
								ar: "مطفّي",
								en: "Off",
							},
					tone: enabled ? BridgeDetailTone.Success : BridgeDetailTone.Warning,
				},
			],
			stats: [
				{
					key: "version",
					label: {
						ar: "الإصدار",
						en: "Version",
					},
					value: stamp?.version ?? "—",
					format: BridgeDetailFormat.Text,
				},
				{
					key: "mods",
					label: {
						ar: "المودات المركّبة",
						en: "Installed mods",
					},
					value: mods,
					format: BridgeDetailFormat.Number,
				},
			],
			links: [
				{
					label: {
						ar: "صفحة الحزمة",
						en: "Package page",
					},
					url: "https://thunderstore.io/c/valheim/p/denikson/BepInExPack_Valheim/",
				},
			],
			stale: false,
			actions: [],
		};
	},
};
