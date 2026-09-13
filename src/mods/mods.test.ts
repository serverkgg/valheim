import { describe, expect, test } from "bun:test";
import { type Bridge, BridgeUserError } from "@serverkgg/bridge";
import type { ThunderstoreVersion } from "@serverkgg/bridge/catalogs";
import { BEPINEX_CORE, DOORSTOP_MARKER, installPack } from "./bepinexPack";
import { mods } from "./mods";
import { CONFIG_DIRECTORY, enabledPath, MODS_SIDECAR, PATCHERS_DIRECTORY, parseSidecar } from "./modsSidecar";

const MOD_ID = "ValheimModding-Jotunn";

const PLUGIN_SIZE = 7168;

const versionOf = (namespace: string, name: string): ThunderstoreVersion => {
	return {
		namespace,
		name,
		version_number: "2.24.3",
		full_name: `${namespace}-${name}-2.24.3`,
		description: "",
		icon: null,
		dependencies: [],
		download_url: "",
		downloads: 0,
		date_created: null,
		website_url: null,
		is_active: true,
	};
};

interface HarnessOptions {
	extract: (destination: string, files: Map<string, string>) => void;
	failCopyInto?: string;
	failFindIn?: string;
}

const harness = (options: HarnessOptions) => {
	const files = new Map<string, string>([
		[
			DOORSTOP_MARKER,
			"so",
		],
		[
			BEPINEX_CORE,
			"dll",
		],
	]);
	const directories = new Set<string>();
	const listed: string[] = [];
	const commands: string[][] = [];

	const under = (path: string) => {
		return [
			...files.keys(),
		].filter((key) => key.startsWith(`${path}/`));
	};

	const failed = (stderr: string) => {
		return {
			code: 1,
			stdout: "",
			stderr,
		};
	};

	const copy = (from: string, to: string) => {
		const source = from.replace(/\/\.$/, "");
		const keys = under(source);

		for (const [index, key] of keys.entries()) {
			if (options.failCopyInto === to && index > 0) {
				return failed(`cp: error writing '${to}${key.slice(source.length)}': No space left on device`);
			}

			files.set(`${to}${key.slice(source.length)}`, files.get(key) ?? "");
		}

		return {
			code: 0,
			stdout: "",
			stderr: "",
		};
	};

	const find = (directory: string) => {
		if (options.failFindIn === directory) {
			return failed(`find: '${directory}': Permission denied`);
		}

		const names = new Set(
			under(directory).map((key) => {
				return key.slice(directory.length + 1).split("/")[0] ?? "";
			}),
		);

		return {
			code: 0,
			stdout: [
				...names,
			]
				.map((name) => `${name}\n`)
				.join(""),
			stderr: "",
		};
	};

	const context = {
		server: {
			running: false,
		},
		net: {
			async json(url: string) {
				const match = /\/package\/([^/]+)\/([^/]+)\/$/.exec(url);

				if (!match?.[1] || !match[2]) {
					throw new Error(`unexpected request ${url}`);
				}

				return {
					latest: versionOf(decodeURIComponent(match[1]), decodeURIComponent(match[2])),
				};
			},
		},
		files: {
			async exists(path: string) {
				return files.has(path) || directories.has(path) || under(path).length > 0;
			},
			async ensure(path: string) {
				directories.add(path);
			},
			async remove(path: string) {
				files.delete(path);
				directories.delete(path);

				for (const key of under(path)) {
					files.delete(key);
				}
			},
			async read(path: string) {
				return files.get(path) ?? "";
			},
			async write(path: string, contents: string) {
				files.set(path, contents);
			},
			async download(path: string) {
				files.set(path, "zip");
			},
			async extract(_archive: string, destination: string) {
				options.extract(destination, files);

				return [];
			},
			async list(glob: string) {
				listed.push(glob);

				if (glob.endsWith("/**")) {
					throw new Error("file listing exceeded its result limit");
				}

				const directory = glob.slice(0, -"/*".length);

				return under(directory)
					.filter((key) => !key.slice(directory.length + 1).includes("/"))
					.map((key) => {
						return {
							name: key.split("/").at(-1) ?? "",
							path: key,
							directory: false,
							sizeBytes: files.get(key)?.length ?? 0,
						};
					});
			},
			async size(path: string) {
				return under(path).length > 0 ? PLUGIN_SIZE : 0;
			},
		},
		async exec(command: string[]) {
			commands.push(command);

			const [program, first = "", second = "", third = ""] = command;

			if (program === "cp") {
				return copy(second, third);
			}

			if (program === "find") {
				return find(first);
			}

			throw new Error(`unexpected command ${command.join(" ")}`);
		},
		log: Object.assign(() => undefined, {
			warn: () => undefined,
			error: () => undefined,
		}),
		emit: () => undefined,
	} as unknown as Bridge.Context;

	return {
		context,
		files,
		listed,
		commands,
	};
};

const pathsUnder = (files: Map<string, string>, path: string) => {
	return [
		...files.keys(),
	].filter((key) => key.startsWith(`${path}/`));
};

const stagedPaths = (files: Map<string, string>) => {
	return [
		...files.keys(),
	].filter((key) => key.startsWith(".serverk-staging/"));
};

describe("installing a thunderstore mod", () => {
	test("records the plugin size without a file listing that can overflow after the copy", async () => {
		const { context, files, listed } = harness({
			extract(destination, entries) {
				entries.set(`${destination}/Jotunn.dll`, "plugin");
				entries.set(`${destination}/manifest.json`, "{}");
			},
		});

		await mods.install(context, MOD_ID);

		const sidecar = parseSidecar(files.get(MODS_SIDECAR) ?? "");

		expect(sidecar[MOD_ID]?.sizeBytes).toBe(PLUGIN_SIZE);
		expect(files.get(`${enabledPath(MOD_ID)}/Jotunn.dll`)).toBe("plugin");
		expect(files.has(`${enabledPath(MOD_ID)}/manifest.json`)).toBe(false);
		expect(listed.filter((glob) => glob.endsWith("/**"))).toEqual([]);
		expect(stagedPaths(files)).toEqual([]);
	});

	test("tracks the top-level patchers and configs a BepInEx-shaped archive brings, so removing the mod takes them too", async () => {
		const { context, files, listed, commands } = harness({
			extract(destination, entries) {
				entries.set(`${destination}/manifest.json`, "{}");
				entries.set(`${destination}/BepInEx/plugins/Jotunn.dll`, "plugin");
				entries.set(`${destination}/BepInEx/patchers/JotunnPatcher.dll`, "patcher");
				entries.set(`${destination}/BepInEx/patchers/JotunnLib/Mono.Cecil.dll`, "nested");
				entries.set(`${destination}/BepInEx/patchers/JotunnLib/MonoMod.dll`, "nested");
				entries.set(`${destination}/BepInEx/config/com.jotunn.jotunn.cfg`, "config");
			},
		});

		await mods.install(context, MOD_ID);

		const extras = parseSidecar(files.get(MODS_SIDECAR) ?? "")[MOD_ID]?.extras ?? [];

		expect(commands.filter(([program]) => program === "find").map((command) => command[1])).toEqual([
			".serverk-staging/mod/ValheimModding-Jotunn/BepInEx/patchers",
			".serverk-staging/mod/ValheimModding-Jotunn/BepInEx/config",
		]);
		expect(
			[
				...extras,
			].sort(),
		).toEqual([
			`${CONFIG_DIRECTORY}/com.jotunn.jotunn.cfg`,
			`${PATCHERS_DIRECTORY}/JotunnLib`,
			`${PATCHERS_DIRECTORY}/JotunnPatcher.dll`,
		]);
		expect(files.get(`${PATCHERS_DIRECTORY}/JotunnLib/MonoMod.dll`)).toBe("nested");
		expect(files.get(`${CONFIG_DIRECTORY}/com.jotunn.jotunn.cfg`)).toBe("config");
		expect(files.get(`${enabledPath(MOD_ID)}/Jotunn.dll`)).toBe("plugin");
		expect(files.has(`${enabledPath(MOD_ID)}/patchers/JotunnPatcher.dll`)).toBe(false);
		expect(listed.filter((glob) => glob.endsWith("/**"))).toEqual([]);
		expect(stagedPaths(files)).toEqual([]);

		await mods.remove(context, MOD_ID);

		expect(pathsUnder(files, PATCHERS_DIRECTORY)).toEqual([]);
		expect(pathsUnder(files, CONFIG_DIRECTORY)).toEqual([]);
		expect(pathsUnder(files, enabledPath(MOD_ID))).toEqual([]);
	});

	test("fails the install and cleans the staging when a patcher folder cannot be read", async () => {
		const { context, files } = harness({
			extract(destination, entries) {
				entries.set(`${destination}/BepInEx/plugins/Jotunn.dll`, "plugin");
				entries.set(`${destination}/BepInEx/patchers/JotunnPatcher.dll`, "patcher");
			},
			failFindIn: ".serverk-staging/mod/ValheimModding-Jotunn/BepInEx/patchers",
		});

		await expect(mods.install(context, MOD_ID)).rejects.toThrow("the mod folder could not be read");
		expect(stagedPaths(files)).toEqual([]);
		expect(files.has(MODS_SIDECAR)).toBe(false);
		expect(pathsUnder(files, enabledPath(MOD_ID))).toEqual([]);
	});

	test("cleans the staging and tells the owner when the archive cannot be unpacked", async () => {
		const { context, files, commands } = harness({
			extract(destination, entries) {
				entries.set(`${destination}/half.dll`, "partial");

				throw new Error("archive entry is larger than the extract limit");
			},
		});

		const failure = mods.install(context, MOD_ID);

		await expect(failure).rejects.toThrow(BridgeUserError);
		await expect(failure).rejects.toThrow("Jotunn");
		expect(stagedPaths(files)).toEqual([]);
		expect(files.has(MODS_SIDECAR)).toBe(false);
		expect(commands).toEqual([]);
	});

	test("removes a half-copied plugin folder when the copy fails partway", async () => {
		const { context, files } = harness({
			extract(destination, entries) {
				entries.set(`${destination}/Jotunn.dll`, "plugin");
				entries.set(`${destination}/Jotunn.xml`, "docs");
			},
			failCopyInto: enabledPath(MOD_ID),
		});

		await expect(mods.install(context, MOD_ID)).rejects.toThrow("the mod files could not be copied");
		expect(pathsUnder(files, enabledPath(MOD_ID))).toEqual([]);
		expect(stagedPaths(files)).toEqual([]);
		expect(files.has(MODS_SIDECAR)).toBe(false);
	});
});

describe("installing the bepinex pack", () => {
	test("cleans the staging and merges nothing into the server when the pack cannot be unpacked", async () => {
		const { context, files, commands } = harness({
			extract(destination, entries) {
				entries.set(`${destination}/BepInEx/core/partial.dll`, "partial");

				throw new Error("archive has a duplicate destination");
			},
		});

		await expect(installPack(context)).rejects.toThrow(BridgeUserError);
		expect(stagedPaths(files)).toEqual([]);
		expect(commands).toEqual([]);
		expect(files.has("BepInEx/core/partial.dll")).toBe(false);
	});
});
