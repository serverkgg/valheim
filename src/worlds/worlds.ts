import { type Bridge, BridgeKind, BridgeUserError } from "@serverkgg/bridge";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import {
	discoverWorlds,
	extensionOf,
	formatByteSize,
	isUnder,
	isValidWorldName,
	mergeSettings,
	missingHalf,
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

const ACTIVE_WORLD_DELETE: Bridge.Text = {
	ar: "لا يمكن حذف الماب الشغّالة. فعّل ماب أخرى أولًا.",
	en: "You can't delete the active world. Activate another one first.",
};

const ACTIVE_WORLD_ACTIVATE: Bridge.Text = {
	ar: "هذه الماب هي الشغّالة أصلًا.",
	en: "This world is already the active one.",
};

const missingMeta = (name: string): Bridge.Text => {
	return {
		ar: `ملف .${WORLD_META_EXTENSION} الخاص بـ «${name}» ناقص، ومن دونه يُنشئ فالهايم ماب جديدة بالاسم نفسه. ارفعه أولًا.`,
		en: `"${name}" has no .${WORLD_META_EXTENSION} file, and without it Valheim generates a fresh world under that name. Upload it first.`,
	};
};

const hasMeta = async (context: Bridge.Context, name: string) => {
	return await context.files.exists(worldPath(name, WORLD_META_EXTENSION));
};

const refuseActiveWorld = async (context: Bridge.Context, name: string) => {
	if ((await activeWorld(context)) !== name) {
		return;
	}

	throw new BridgeUserError(ACTIVE_WORLD_DELETE);
};

const requireStopped = (context: Bridge.Context) => {
	if (!context.server.running) {
		return;
	}

	throw new BridgeUserError({
		ar: "أوقف سيرفرك قبل رفع الماب، ثم جرب مرة ثانية.",
		en: "Stop your server before uploading a world, then try again.",
	});
};

export const worlds: Bridge.Collection = {
	kind: BridgeKind.Collection,
	protectedActions: [
		"delete",
	],

	async list(context) {
		const active = await activeWorld(context);

		return (await discoverWorlds(context)).map((world) => {
			const missing = missingHalf(world);

			return {
				id: world.name,
				name: world.name,
				size: formatByteSize(world.sizeBytes),
				active: world.name === active ? ACTIVE_MARK : "",
				state:
					missing === null
						? ""
						: {
								ar: `ينقصه ملف .${missing}`,
								en: `missing its .${missing}`,
							},
			};
		});
	},

	async add(context, input) {
		requireStopped(context);

		const source = relativeUploadPath(input);

		if (source === null || !isUnder(source, WORLD_STAGING) || !(await context.files.exists(source))) {
			throw new BridgeUserError({
				ar: "تعذّر العثور على الملف الذي رفعته.",
				en: "We couldn't find the file you uploaded.",
			});
		}

		const fileName = source.split("/").at(-1) ?? "";
		const extension = extensionOf(fileName);
		const name = worldNameOf(fileName);

		if (extension === null || name === null) {
			await context.files.remove(source);

			throw new BridgeUserError({
				ar: "ارفع ملفات الماب نفسها: ملف .db وملف .fwl بالاسم نفسه.",
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
			throw new BridgeUserError({
				ar: "يوجد ملف ماب بالاسم نفسه. غيّر اسم الملفين .db و .fwl إلى اسم جديد واحد، ثم ارفعهما مرة ثانية.",
				en: "A world file already has this name. Give both the .db and .fwl files the same new name, then upload them again.",
			});
		}

		await context.files.move(source, target);

		const file = `${name}.${extension}`;

		context.log("added a world file", {
			world: name,
			file,
		});

		context.activity.report({
			name: BridgeEventName.WorldImported,
			text: {
				ar: `تم رفع ملف الماب ${file}`,
				en: `Uploaded the world file ${file}`,
			},
			subject: name,
			details: {
				world: name,
				file,
			},
		});
	},

	actions: {
		async activate(context, row) {
			if (!(await hasMeta(context, row.id))) {
				throw new BridgeUserError(missingMeta(row.id));
			}

			const previous = await activeWorld(context);

			if (previous === row.id) {
				throw new BridgeUserError(ACTIVE_WORLD_ACTIVATE);
			}

			await mergeSettings(context, {
				[WORLD_FIELD]: row.id,
			});

			context.log("switched the active world", {
				world: row.id,
				previous,
			});

			context.activity.report({
				name: BridgeEventName.WorldActivated,
				text: {
					ar: `تم تفعيل ماب ${row.id} بدلًا من ${previous}، ويُطبَّق التغيير في التشغيل القادم`,
					en: `Activated world ${row.id} in place of ${previous}, takes effect on the next start`,
				},
				subject: row.id,
				details: {
					world: row.id,
					previous,
				},
			});
		},

		async delete(context, row) {
			await refuseActiveWorld(context, row.id);
			await removeWorld(context, row.id);

			context.log("deleted a world", {
				world: row.id,
			});

			context.activity.report({
				name: BridgeEventName.WorldDeleted,
				text: {
					ar: `تم حذف ماب ${row.id}`,
					en: `Deleted world ${row.id}`,
				},
				subject: row.id,
				details: {
					world: row.id,
				},
			});
		},
	},

	async unavailable(context, row): Promise<Bridge.Unavailable> {
		if (row.active === ACTIVE_MARK) {
			return {
				delete: ACTIVE_WORLD_DELETE,
				activate: ACTIVE_WORLD_ACTIVATE,
			};
		}

		return (await hasMeta(context, row.id))
			? {}
			: {
					activate: missingMeta(row.id),
				};
	},
};
