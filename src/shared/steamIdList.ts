import { type Bridge, BridgeUserError } from "@serverkgg/bridge";

export const STEAM_ID_PATTERN = "^7656\\d{13}$";

export const STEAM_ID = new RegExp(STEAM_ID_PATTERN);

const COMMENT = /^\s*(?:\/\/|#)/;

export const parseSteamIds = (contents: string): string[] => {
	const ids: string[] = [];

	for (const raw of contents.split(/\r?\n/)) {
		const line = raw.trim();

		if (line.length === 0 || COMMENT.test(line)) {
			continue;
		}

		const id = line.split(/\s+/).at(0) ?? "";

		if (STEAM_ID.test(id) && !ids.includes(id)) {
			ids.push(id);
		}
	}

	return ids;
};

export const serializeSteamIds = (header: string, ids: string[]) => {
	return `${[
		...header.split("\n").map((line) => `// ${line}`),
		...ids,
	].join("\n")}\n`;
};

export const readSteamIds = async (context: Bridge.Context, path: string) => {
	if (!(await context.files.exists(path))) {
		return [];
	}

	return parseSteamIds(await context.files.read(path));
};

export const writeSteamIds = async (context: Bridge.Context, path: string, header: string, ids: string[]) => {
	await context.files.write(path, serializeSteamIds(header, ids));
};

export const requireSteamId = (input: string) => {
	const id = input.trim();

	if (!STEAM_ID.test(id)) {
		throw new BridgeUserError({
			ar: "هذا مو رقم Steam. رقم Steam من 17 رقم ويبدأ بـ 7656، تلقاه في صفحة اللاعب على steamid.io أو من رابط بروفايله.",
			en: "That is not a Steam ID. A Steam ID is 17 digits starting with 7656 — steamid.io resolves one from a profile link.",
		});
	}

	return id;
};
