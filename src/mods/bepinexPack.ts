import { type Bridge, BridgeUserError } from "@serverkgg/bridge";
import { thunderstoreCatalog, thunderstoreDownloadUrl } from "@serverkgg/bridge/catalogs";
import { execDetail } from "@serverkgg/bridge/utils";
import { STAGING_ROOT } from "../shared";

export const THUNDERSTORE_COMMUNITY = "valheim";

export const PACK_NAMESPACE = "denikson";

export const PACK_NAME = "BepInExPack_Valheim";

export const PACK_ID = `${PACK_NAMESPACE}-${PACK_NAME}`;

export const PACK_ROOT = `${PACK_NAME}/`;

export const PACK_STAMP = ".serverk-bepinex.json";

export const DOORSTOP_LIBS = "doorstop_libs";

export const DOORSTOP_MARKER = `${DOORSTOP_LIBS}/libdoorstop_x64.so`;

export const BEPINEX_CORE = "BepInEx/core/BepInEx.Preloader.dll";

export const PACK_PATHS = [
	"BepInEx",
	DOORSTOP_LIBS,
	"doorstop_config.ini",
	".doorstop_version",
	"winhttp.dll",
	"start_game_bepinex.sh",
	"start_server_bepinex.sh",
	"changelog.txt",
];

const PACK_STAGING = `${STAGING_ROOT}/bepinex`;

const PACK_ARCHIVE = `${STAGING_ROOT}/bepinex.zip`;

export interface PackStamp {
	version: string;
}

export const catalogOf = (context: Bridge.Context) => {
	return thunderstoreCatalog(context, {
		community: THUNDERSTORE_COMMUNITY,
	});
};

export const readPackStamp = async (context: Bridge.Context): Promise<PackStamp | null> => {
	if (!(await context.files.exists(PACK_STAMP))) {
		return null;
	}

	try {
		const parsed: unknown = JSON.parse(await context.files.read(PACK_STAMP));

		if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
			return null;
		}

		const stamp = parsed as Partial<PackStamp>;

		return typeof stamp.version === "string"
			? {
					version: stamp.version,
				}
			: null;
	} catch {
		return null;
	}
};

export const packInstalled = async (context: Bridge.Context) => {
	return (await context.files.exists(DOORSTOP_MARKER)) && (await context.files.exists(BEPINEX_CORE));
};

export const requirePack = async (context: Bridge.Context) => {
	if (await packInstalled(context)) {
		return;
	}

	throw new BridgeUserError({
		ar: "ركّب BepInEx أول من تبويب المودات، بعدها تقدر تنزّل مودات.",
		en: "Install BepInEx from the mods tab first, then you can install mods.",
	});
};

export const installPack = async (context: Bridge.Context): Promise<PackStamp> => {
	const catalog = catalogOf(context);
	const pack = await catalog.resolve(PACK_NAMESPACE, PACK_NAME);
	const version = pack.latest;

	context.log("installing the bepinex pack", {
		version: version.version_number,
	});

	await context.files.remove(PACK_STAGING);
	await context.files.ensure(PACK_STAGING);

	await context.files.download(PACK_ARCHIVE, thunderstoreDownloadUrl(version.full_name));

	await context.files.extract(PACK_ARCHIVE, PACK_STAGING, {
		select: PACK_ROOT,
		tree: true,
	});

	const merged = await context.exec([
		"cp",
		"-a",
		`${PACK_STAGING}/.`,
		".",
	]);

	if (merged.code !== 0) {
		throw new Error(`the bepinex pack could not be unpacked — ${execDetail(merged)}`);
	}

	await context.files.remove(PACK_STAGING);
	await context.files.remove(PACK_ARCHIVE);

	if (!(await packInstalled(context))) {
		throw new Error("the bepinex pack unpacked without a doorstop library");
	}

	const stamp: PackStamp = {
		version: version.version_number,
	};

	await context.files.write(PACK_STAMP, `${JSON.stringify(stamp, null, 2)}\n`);

	context.log("bepinex is installed", {
		version: stamp.version,
	});

	return stamp;
};

export const removePack = async (context: Bridge.Context) => {
	for (const path of [
		...PACK_PATHS,
		PACK_STAMP,
	]) {
		if (await context.files.exists(path)) {
			await context.files.remove(path);
		}
	}

	context.log("bepinex removed");
};
