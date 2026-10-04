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

const NOT_INSTALLED: Bridge.Text = {
	ar: "BepInEx غير مثبّت أصلًا.",
	en: "BepInEx isn't installed.",
};

const installedAtAll = async (context: Bridge.Context) => {
	return (await packInstalled(context)) || (await readPackStamp(context)) !== null;
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
			if (!(await installedAtAll(context))) {
				throw new BridgeUserError(NOT_INSTALLED);
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
								ar: `تمت إزالة BepInEx وكل المودات التي عليه (${count})`,
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

	async unavailable(context): Promise<Bridge.Unavailable> {
		return (await installedAtAll(context))
			? {}
			: {
					uninstall: NOT_INSTALLED,
				};
	},
};
