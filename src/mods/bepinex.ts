import { type Bridge, BridgeKind, BridgeUserError } from "@serverkgg/bridge";
import { BEPINEX_FIELD, booleanOf, mergeSettings, readSettings } from "../shared";
import { installPack, packInstalled, readPackStamp, removePack } from "./bepinexPack";
import { readSidecar, writeSidecar } from "./modsSidecar";

export const bepinex: Bridge.Actions = {
	kind: BridgeKind.Actions,
	protectedActions: [
		"setup",
		"uninstall",
	],
	actions: {
		async setup(context) {
			const stamp = await installPack(context);
			const settings = await readSettings(context);

			if (!booleanOf(settings[BEPINEX_FIELD] ?? null, false)) {
				await mergeSettings(context, {
					[BEPINEX_FIELD]: true,
				});
			}

			context.log("bepinex ready", {
				version: stamp.version,
			});
		},

		async uninstall(context) {
			if (!(await packInstalled(context)) && (await readPackStamp(context)) === null) {
				throw new BridgeUserError({
					ar: "BepInEx مو مركّب أصلًا.",
					en: "BepInEx is not installed.",
				});
			}

			await removePack(context);
			await writeSidecar(context, {});
			await mergeSettings(context, {
				[BEPINEX_FIELD]: false,
			});

			context.log("bepinex and every mod were removed", {
				mods: Object.keys(await readSidecar(context)).length,
			});
		},
	},
};
