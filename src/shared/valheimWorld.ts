import type { Bridge } from "@serverkgg/bridge";
import { WORLDS_DIRECTORY } from "./valheimApp";

export const WORLD_DB_EXTENSION = "db";

export const WORLD_META_EXTENSION = "fwl";

export const WORLD_EXTENSIONS = [
	WORLD_DB_EXTENSION,
	WORLD_META_EXTENSION,
];

export interface ValheimWorld {
	name: string;
	sizeBytes: number;
	complete: boolean;
}

export const worldPath = (name: string, extension: string) => {
	return `${WORLDS_DIRECTORY}/${name}.${extension}`;
};

export const worldPaths = (name: string) => {
	return WORLD_EXTENSIONS.map((extension) => worldPath(name, extension));
};

export const worldNameOf = (fileName: string) => {
	for (const extension of WORLD_EXTENSIONS) {
		const suffix = `.${extension}`;

		if (fileName.toLowerCase().endsWith(suffix)) {
			return fileName.slice(0, -suffix.length);
		}
	}

	return null;
};

export const extensionOf = (fileName: string) => {
	const parts = fileName.toLowerCase().split(".");
	const extension = parts.length > 1 ? (parts.at(-1) ?? "") : "";

	return WORLD_EXTENSIONS.includes(extension) ? extension : null;
};

export const discoverWorlds = async (context: Bridge.Context): Promise<ValheimWorld[]> => {
	const entries = await context.files.list(`${WORLDS_DIRECTORY}/*`);
	const found = new Map<string, ValheimWorld>();

	for (const entry of entries) {
		const name = worldNameOf(entry.name);
		const extension = extensionOf(entry.name);

		if (name === null || extension === null) {
			continue;
		}

		const world = found.get(name) ?? {
			name,
			sizeBytes: 0,
			complete: false,
		};

		world.sizeBytes += entry.sizeBytes;

		if (extension === WORLD_META_EXTENSION) {
			world.complete = true;
		}

		found.set(name, world);
	}

	return [
		...found.values(),
	].sort((left, right) => left.name.localeCompare(right.name));
};

export const worldSizeOf = async (context: Bridge.Context, name: string) => {
	let total = 0;

	for (const path of worldPaths(name)) {
		if (await context.files.exists(path)) {
			total += await context.files.size(path);
		}
	}

	return total;
};

export const removeWorld = async (context: Bridge.Context, name: string) => {
	for (const extension of [
		...WORLD_EXTENSIONS,
		`${WORLD_DB_EXTENSION}.old`,
		`${WORLD_META_EXTENSION}.old`,
	]) {
		const path = worldPath(name, extension);

		if (await context.files.exists(path)) {
			await context.files.remove(path);
		}
	}
};
