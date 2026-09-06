import type { Bridge } from "@serverkgg/bridge";
import { execDetail } from "@serverkgg/bridge/utils";

export const STEAM_APP_ID = "896660";

export const STEAM_CLIENT_APP_ID = "892970";

export const SERVER_BINARY = "valheim_server.x86_64";

export const GAME_ROOTS = [
	SERVER_BINARY,
	"valheim_server_Data",
	"linux64",
];

export const SAVE_DIRECTORY = "save";

export const WORLDS_DIRECTORY = `${SAVE_DIRECTORY}/worlds_local`;

export const ADMIN_LIST = `${SAVE_DIRECTORY}/adminlist.txt`;

export const BANNED_LIST = `${SAVE_DIRECTORY}/bannedlist.txt`;

export const PERMITTED_LIST = `${SAVE_DIRECTORY}/permittedlist.txt`;

export const SETTINGS_FILE = ".serverk-settings.json";

export const STAGING_ROOT = ".serverk-staging";

export const WORLD_STAGING = `${STAGING_ROOT}/world-upload`;

export const MAX_PLAYERS = 10;

export const SERVER_READY = /Game server connected/;

export const BRANCH_VARIABLE = "VALHEIM_BRANCH";

export const PUBLIC_BRANCH = "public";

export const STEAM_APP_INFO = `https://api.steamcmd.net/v1/info/${STEAM_APP_ID}`;

export const isGameInstalled = async (context: Bridge.Context) => {
	for (const path of GAME_ROOTS) {
		if (!(await context.files.exists(path))) {
			return false;
		}
	}

	return true;
};

export const installRoot = async (context: Bridge.Context) => {
	const result = await context.exec([
		"pwd",
	]);

	if (result.code !== 0) {
		throw new Error(`the server directory could not be resolved — ${execDetail(result)}`);
	}

	return result.stdout.trim();
};

export const relativeUploadPath = (input: string) => {
	const trimmed = input.trim();

	if (trimmed.length === 0 || trimmed.startsWith("/")) {
		return null;
	}

	const segments = trimmed.split("/").filter((segment) => segment.length > 0 && segment !== ".");

	if (segments.length === 0 || segments.includes("..")) {
		return null;
	}

	return segments.join("/");
};

export const isUnder = (path: string, directory: string) => {
	return path.startsWith(`${directory}/`) && path.length > directory.length + 1;
};

export const formatByteSize = (bytes: number) => {
	const units = [
		"B",
		"KB",
		"MB",
		"GB",
	];

	let value = bytes;
	let unit = 0;

	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit += 1;
	}

	return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
};
