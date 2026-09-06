import { type Bridge, BridgeKind, BridgeUserError } from "@serverkgg/bridge";
import {
	discoverWorlds,
	extensionOf,
	formatByteSize,
	isUnder,
	isValidWorldName,
	mergeSettings,
	readSettings,
	relativeUploadPath,
	removeWorld,
	settingsOf,
	WORLD_FIELD,
	WORLD_META_EXTENSION,
	WORLD_NAME_MESSAGE,
	WORLD_STAGING,
	WORLDS_DIRECTORY,
	worldNameOf,
	worldPath,
} from "../shared";

const ACTIVE_MARK = "✓";

export const activeWorld = async (context: Bridge.Context) => {
	return settingsOf(await readSettings(context)).world;
};

const refuseActiveWorld = async (context: Bridge.Context, name: string) => {
	if ((await activeWorld(context)) !== name) {
		return;
	}

	throw new BridgeUserError({
		ar: "ما تقدر تحذف العالم الشغّال. فعّل عالم ثاني أول.",
		en: "You cannot delete the active world — activate another one first.",
	});
};

export const worlds: Bridge.Collection = {
	kind: BridgeKind.Collection,

	async list(context) {
		const active = await activeWorld(context);

		return (await discoverWorlds(context)).map((world) => {
			return {
				id: world.name,
				name: world.name,
				size: formatByteSize(world.sizeBytes),
				active: world.name === active ? ACTIVE_MARK : "",
				state: world.complete ? "" : `ينقصه .${WORLD_META_EXTENSION} / missing .${WORLD_META_EXTENSION}`,
			};
		});
	},

	async add(context, input) {
		const source = relativeUploadPath(input);

		if (source === null || !isUnder(source, WORLD_STAGING) || !(await context.files.exists(source))) {
			throw new BridgeUserError({
				ar: "ما لقينا الملف اللي رفعته.",
				en: "The uploaded file was not found.",
			});
		}

		const fileName = source.split("/").at(-1) ?? "";
		const extension = extensionOf(fileName);
		const name = worldNameOf(fileName);

		if (extension === null || name === null) {
			await context.files.remove(source);

			throw new BridgeUserError({
				ar: "ارفع ملفات العالم نفسها: ملف .db وملف .fwl بنفس الاسم.",
				en: "Upload the world files themselves: a .db and a .fwl with the same name.",
			});
		}

		if (!isValidWorldName(name)) {
			await context.files.remove(source);

			throw new BridgeUserError(WORLD_NAME_MESSAGE);
		}

		const target = worldPath(name, extension);

		await context.files.ensure(WORLDS_DIRECTORY);

		if (await context.files.exists(target)) {
			await context.files.remove(target);
		}

		await context.files.move(source, target);

		context.log("added a world file", {
			world: name,
			file: `${name}.${extension}`,
		});
	},

	actions: {
		async activate(context, row) {
			if (!(await context.files.exists(worldPath(row.id, WORLD_META_EXTENSION)))) {
				throw new BridgeUserError({
					ar: `ملف .${WORLD_META_EXTENSION} حق "${row.id}" ناقص، وبدونه فالهايم يبني عالم جديد بنفس الاسم. ارفعه أول.`,
					en: `"${row.id}" has no .${WORLD_META_EXTENSION} file, and without it Valheim generates a fresh world under that name. Upload it first.`,
				});
			}

			if ((await activeWorld(context)) === row.id) {
				throw new BridgeUserError({
					ar: "هذا العالم شغّال أصلًا.",
					en: "This world is already the active one.",
				});
			}

			await mergeSettings(context, {
				[WORLD_FIELD]: row.id,
			});

			context.log("switched the active world", {
				world: row.id,
			});
		},

		async delete(context, row) {
			await refuseActiveWorld(context, row.id);
			await removeWorld(context, row.id);

			context.log("deleted a world", {
				world: row.id,
			});
		},
	},
};
