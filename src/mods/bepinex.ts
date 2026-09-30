import { type Bridge, BridgeKind, BridgeUserError } from "@serverkgg/bridge";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { BEPINEX_FIELD, booleanOf, mergeSettings, readSettings } from "../shared";
import { installPack, PACK_SUBJECT, packInstalled, readPackStamp, removePack } from "./bepinexPack";
import { readSidecar, writeSidecar } from "./modsSidecar";

interface RemovalFacts {
	version: string | null;
	count: number | null;
}

const removalFactsOf = async (context: Bridge.Context): Promise<RemovalFacts> => {
	try {
		return {
			version: (await readPackStamp(context))?.version ?? null,
			count: Object.keys(await readSidecar(context)).length,
		};
	} catch (error) {
		context.log.warn("the bepinex version and mod count could not be read for the activity entry", {
			error: error instanceof Error ? error.message : String(error),
		});

		return {
			version: null,
			count: null,
		};
	}
};

export const bepinex: Bridge.Actions = {
	kind: BridgeKind.Actions,
	protectedActions: [
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

			context.activity.report({
				name: BridgeEventName.ModLoaderInstalled,
				text: {
					ar: `تم تثبيت BepInEx (${stamp.version})`,
					en: `Installed BepInEx (${stamp.version})`,
				},
				subject: PACK_SUBJECT,
				details: {
					version: stamp.version,
				},
			});
		},

		async uninstall(context) {
			if (!(await packInstalled(context)) && (await readPackStamp(context)) === null) {
				throw new BridgeUserError({
					ar: "BepInEx مو مركّب أصلًا.",
					en: "BepInEx is not installed.",
				});
			}

			const { version, count } = await removalFactsOf(context);

			await removePack(context);
			await writeSidecar(context, {});
			await mergeSettings(context, {
				[BEPINEX_FIELD]: false,
			});

			context.log("bepinex and every mod were removed", {
				mods: count,
			});

			context.activity.report({
				name: BridgeEventName.ModLoaderRemoved,
				text:
					count === null || count === 0
						? {
								ar: "تمت إزالة BepInEx",
								en: "Removed BepInEx",
							}
						: {
								ar: `تمت إزالة BepInEx وكل المودات اللي عليه (${count})`,
								en: `Removed BepInEx and every mod on it (${count})`,
							},
				subject: PACK_SUBJECT,
				details: {
					version,
					count,
				},
			});
		},
	},
};
