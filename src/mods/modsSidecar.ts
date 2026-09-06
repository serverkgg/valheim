import type { Bridge } from "@serverkgg/bridge";

export const MODS_SIDECAR = ".serverk-mods.json";

export const PLUGINS_DIRECTORY = "BepInEx/plugins";

export const DISABLED_DIRECTORY = "BepInEx/disabled";

export const PATCHERS_DIRECTORY = "BepInEx/patchers";

export const CONFIG_DIRECTORY = "BepInEx/config";

export interface ModEntry {
	id: string;
	fullName: string;
	namespace: string;
	name: string;
	version: string;
	title: string;
	icon: string | null;
	pageUrl: string | null;
	sizeBytes: number;
	extras: string[];
}

export type ModsSidecar = Record<string, ModEntry>;

export const modId = (namespace: string, name: string) => {
	return `${namespace}-${name}`;
};

export const splitModId = (id: string) => {
	const parts = id.split("-");
	const namespace = parts.at(0);
	const name = parts.at(1);

	if (parts.length !== 2 || !namespace || !name) {
		return null;
	}

	return {
		namespace,
		name,
	};
};

export const enabledPath = (id: string) => {
	return `${PLUGINS_DIRECTORY}/${id}`;
};

export const disabledPath = (id: string) => {
	return `${DISABLED_DIRECTORY}/${id}`;
};

export const parseSidecar = (contents: string): ModsSidecar => {
	try {
		const parsed: unknown = JSON.parse(contents);

		return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as ModsSidecar) : {};
	} catch {
		return {};
	}
};

export const serializeSidecar = (sidecar: ModsSidecar) => {
	return `${JSON.stringify(sidecar, null, 2)}\n`;
};

export const readSidecar = async (context: Bridge.Context): Promise<ModsSidecar> => {
	if (!(await context.files.exists(MODS_SIDECAR))) {
		return {};
	}

	return parseSidecar(await context.files.read(MODS_SIDECAR));
};

export const writeSidecar = async (context: Bridge.Context, sidecar: ModsSidecar) => {
	await context.files.write(MODS_SIDECAR, serializeSidecar(sidecar));
};
