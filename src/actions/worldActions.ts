import { type Bridge, BridgeKind, BridgeUserError } from "@serverkgg/bridge";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import {
	isValidWorldName,
	mergeSettings,
	readSettings,
	settingsOf,
	WORLD_FIELD,
	WORLD_LENGTH,
	WORLD_NAME_MESSAGE,
	worldPaths,
} from "../shared";

export const WORLD_NAME_ARGUMENT = "name";

export const worldActions: Bridge.Actions = {
	kind: BridgeKind.Actions,
	actions: {
		async create(context, args) {
			const raw = args[WORLD_NAME_ARGUMENT];
			const name = (typeof raw === "string" ? raw : "").trim().slice(0, WORLD_LENGTH);

			if (!isValidWorldName(name)) {
				throw new BridgeUserError(WORLD_NAME_MESSAGE);
			}

			for (const path of worldPaths(name)) {
				if (await context.files.exists(path)) {
					throw new BridgeUserError({
						ar: `عندك عالم اسمه "${name}" أصلًا. فعّله من الجدول أو اختر اسم ثاني.`,
						en: `A world named "${name}" already exists. Activate it from the table, or pick another name.`,
					});
				}
			}

			const previous = settingsOf(await readSettings(context)).world;

			if (previous === name) {
				throw new BridgeUserError({
					ar: `"${name}" هو العالم الشغّال أصلًا.`,
					en: `"${name}" is already the active world.`,
				});
			}

			await mergeSettings(context, {
				[WORLD_FIELD]: name,
			});

			context.log("queued a new world", {
				world: name,
			});

			context.activity.report({
				name: BridgeEventName.WorldCreated,
				text: {
					ar: `تم إنشاء عالم جديد ${name}، ويتولّد مع التشغيل الجاي، وعالم ${previous} يبقى محفوظ`,
					en: `Created world ${name}, it generates on the next start, and ${previous} stays saved`,
				},
				subject: name,
				details: {
					world: name,
					previous,
				},
			});
		},
	},
};
