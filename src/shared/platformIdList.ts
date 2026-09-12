import type { Bridge } from "@serverkgg/bridge";
import { ADMIN_LIST, BANNED_LIST, PERMITTED_LIST } from "./valheimApp";
import { isBareSteam64, parsePlatformId, STEAM_PLATFORM_PREFIX } from "./valheimPlatformId";

export const LIST_HEADERS: Record<string, string> = {
	[ADMIN_LIST]: "List admin players ID\nOne Platform User ID per line",
	[BANNED_LIST]: "List banned players ID\nOne Platform User ID per line",
	[PERMITTED_LIST]: "List permitted players ID\nOne Platform User ID per line\nAn empty list lets everybody in",
};

const COMMENT = /^\s*(?:\/\/|#)/;

const SPACING = /\s+/;

export interface ValheimListEntry {
	id: string;
	legacy: boolean;
}

export const parsePlatformIds = (contents: string): ValheimListEntry[] => {
	const entries: ValheimListEntry[] = [];

	for (const raw of contents.split(/\r?\n/)) {
		const line = raw.trim();

		if (line.length === 0 || COMMENT.test(line)) {
			continue;
		}

		const parsed = parsePlatformId(line.split(SPACING).at(0) ?? "");

		if (parsed === null || entries.some((entry) => entry.id === parsed.id)) {
			continue;
		}

		entries.push({
			id: parsed.id,
			legacy: parsed.legacy,
		});
	}

	return entries;
};

export const serializePlatformIds = (header: string, ids: string[]) => {
	return `${[
		...header.split("\n").map((line) => `// ${line}`),
		...ids,
	].join("\n")}\n`;
};

export const migratePlatformIds = (contents: string) => {
	let migrated = 0;

	const lines = contents.split(/\r?\n/).map((raw) => {
		const line = raw.trim();

		if (line.length === 0 || COMMENT.test(line)) {
			return raw;
		}

		const token = line.split(SPACING).at(0) ?? "";

		if (!isBareSteam64(token)) {
			return raw;
		}

		migrated += 1;

		return raw.replace(token, `${STEAM_PLATFORM_PREFIX}${token}`);
	});

	return {
		contents: lines.join("\n"),
		migrated,
	};
};

export const readPlatformIds = async (context: Bridge.Context, path: string) => {
	if (!(await context.files.exists(path))) {
		return [];
	}

	return parsePlatformIds(await context.files.read(path));
};

export const writePlatformIds = async (context: Bridge.Context, path: string, header: string, ids: string[]) => {
	await context.files.write(path, serializePlatformIds(header, ids));
};
