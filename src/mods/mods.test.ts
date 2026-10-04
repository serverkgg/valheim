import { describe, expect, it } from "bun:test";
import { type Bridge, BridgeDownloadError, BridgeUserError } from "@serverkgg/bridge";
import type { ThunderstoreVersion } from "@serverkgg/bridge/catalogs";
import { BRIDGE_ACTIVITY_LIMIT, BridgeEventName } from "@serverkgg/bridge/protocol";
import { SETTINGS_FILE } from "../shared";
import { bepinex } from "./bepinex";
import { BEPINEX_CORE, DOORSTOP_MARKER, installPack } from "./bepinexPack";
import { mods } from "./mods";
import { CONFIG_DIRECTORY, enabledPath, MODS_SIDECAR, PATCHERS_DIRECTORY, parseSidecar } from "./modsSidecar";

const MOD_ID = "ValheimModding-Jotunn";

const PLUGIN_SIZE = 7168;

const PASSWORD = "hunter2-secret";

const versionOf = (namespace: string, name: string, dependencies: string[] = []): ThunderstoreVersion => {
	return {
		namespace,
		name,
		version_number: "2.24.3",
		full_name: `${namespace}-${name}-2.24.3`,
		description: "",
		icon: null,
		dependencies,
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
	failDownload?: Error;
	failRead?: string;
	dependencies?: Record<string, string[]>;
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
		[
			SETTINGS_FILE,
			JSON.stringify({
				password: PASSWORD,
			}),
		],
	]);
	const directories = new Set<string>();
	const reported: Bridge.Activity[] = [];
	const emitted: string[] = [];
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
		activity: {
			report(entry: Bridge.Activity) {
				reported.push(entry);
			},
		},
		codec: {
			json: {
				async read(path: string) {
					return JSON.parse(files.get(path) ?? "{}");
				},
				async merge(path: string, values: Bridge.Values) {
					files.set(
						path,
						JSON.stringify({
							...JSON.parse(files.get(path) ?? "{}"),
							...values,
						}),
					);
				},
			},
		},
		net: {
			async json(url: string) {
				const match = /\/package\/([^/]+)\/([^/]+)\/(?:([^/]+)\/)?$/.exec(url);

				if (!match?.[1] || !match[2]) {
					throw new Error(`unexpected request ${url}`);
				}

				const namespace = decodeURIComponent(match[1]);
				const name = decodeURIComponent(match[2]);
				const version = versionOf(namespace, name, options.dependencies?.[`${namespace}-${name}`] ?? []);

				return match[3]
					? version
					: {
							latest: version,
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
				if (options.failRead === path) {
					throw new Error(`EIO: i/o error, read '${path}'`);
				}

				return files.get(path) ?? "";
			},
			async move(from: string, to: string) {
				for (const key of under(from)) {
					files.set(`${to}${key.slice(from.length)}`, files.get(key) ?? "");
					files.delete(key);
				}

				directories.delete(from);
				directories.add(to);
			},
			async write(path: string, contents: string) {
				files.set(path, contents);
			},
			async download(path: string) {
				if (options.failDownload) {
					throw options.failDownload;
				}

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
		emit(event: string) {
			emitted.push(event);
		},
	} as unknown as Bridge.Context;

	return {
		context,
		files,
		listed,
		commands,
		reported,
		emitted,
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
	it("records the plugin size without a file listing that can overflow after the copy", async () => {
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

	it("tracks the top-level patchers and configs a BepInEx-shaped archive brings, so removing the mod takes them too", async () => {
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

	it("fails the install and cleans the staging when a patcher folder cannot be read", async () => {
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

	it("cleans the staging and tells the owner when the archive cannot be unpacked", async () => {
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

	it("removes a half-copied plugin folder when the copy fails partway", async () => {
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
	it("cleans the staging and merges nothing into the server when the pack cannot be unpacked", async () => {
		const { context, files, commands } = harness({
			extract(destination, entries) {
				entries.set(`${destination}/BepInEx/core/partial.dll`, "partial");

				throw new Error("archive has a duplicate destination");
			},
		});

		const error = await installPack(context).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(BridgeUserError);
		expect(error instanceof Error && error.cause instanceof Error ? error.cause.message : "").toBe(
			"archive has a duplicate destination",
		);
		expect(stagedPaths(files)).toEqual([]);
		expect(commands).toEqual([]);
		expect(files.has("BepInEx/core/partial.dll")).toBe(false);
	});
});

const pluginOnly = (destination: string, entries: Map<string, string>) => {
	entries.set(`${destination}/plugin.dll`, "plugin");
};

const dependenciesOf = (count: number) => {
	return Array.from(
		{
			length: count,
		},
		(_, index) => `Deps-Lib${index}-1.0.0`,
	);
};

describe("reporting catalog installs to the activity feed", () => {
	it("reports ModInstalled with the title and version and never emits ModLoaded", async () => {
		const { context, reported, emitted } = harness({
			extract: pluginOnly,
		});

		await mods.install(context, MOD_ID);

		expect(emitted).toEqual([]);
		expect(reported).toEqual([
			{
				name: BridgeEventName.ModInstalled,
				text: {
					ar: "تم تثبيت مود Jotunn (2.24.3)",
					en: "Installed mod Jotunn (2.24.3)",
				},
				subject: "Jotunn",
				details: {
					mod: "ValheimModding-Jotunn-2.24.3",
					version: "2.24.3",
					dependency: false,
				},
			},
		]);
		expect(JSON.stringify(reported)).not.toContain(PASSWORD);
	});

	it("reports every dependency it installed, naming the mod that needs it", async () => {
		const { context, reported } = harness({
			extract: pluginOnly,
			dependencies: {
				[MOD_ID]: dependenciesOf(2),
			},
		});

		await mods.install(context, MOD_ID);

		expect(reported.map((entry) => entry.subject)).toEqual([
			"Lib0",
			"Lib1",
			"Jotunn",
		]);
		expect(reported.map((entry) => entry.details?.dependency)).toEqual([
			true,
			true,
			false,
		]);
		expect(reported[0]?.text.en).toBe("Installed mod Lib0 (2.24.3), which Jotunn needs");
	});

	it("summarises the dependencies in one entry when the install goes past the answer limit", async () => {
		const { context, reported } = harness({
			extract: pluginOnly,
			dependencies: {
				[MOD_ID]: dependenciesOf(BRIDGE_ACTIVITY_LIMIT + 1),
			},
		});

		await mods.install(context, MOD_ID);

		expect(reported).toEqual([
			{
				name: BridgeEventName.ModInstalled,
				text: {
					ar: `تم تثبيت ${BRIDGE_ACTIVITY_LIMIT + 1} مودات يحتاجها Jotunn`,
					en: `Installed ${BRIDGE_ACTIVITY_LIMIT + 1} mods that Jotunn needs`,
				},
				subject: "Jotunn",
				details: {
					mod: "ValheimModding-Jotunn-2.24.3",
					dependency: true,
					count: BRIDGE_ACTIVITY_LIMIT + 1,
				},
			},
			{
				name: BridgeEventName.ModInstalled,
				text: {
					ar: "تم تثبيت مود Jotunn (2.24.3)",
					en: "Installed mod Jotunn (2.24.3)",
				},
				subject: "Jotunn",
				details: {
					mod: "ValheimModding-Jotunn-2.24.3",
					version: "2.24.3",
					dependency: false,
				},
			},
		]);
	});

	it("reports removing, turning off and turning on a mod by its title", async () => {
		const { context, reported } = harness({
			extract: pluginOnly,
		});

		await mods.install(context, MOD_ID);
		reported.splice(0);

		const toggle = mods.toggle;

		if (!toggle) {
			throw new Error("the catalog cannot toggle a mod");
		}

		await toggle(context, MOD_ID, false);
		await toggle(context, MOD_ID, false);
		await toggle(context, MOD_ID, true);
		await mods.remove(context, MOD_ID);

		expect(reported.map((entry) => entry.name)).toEqual([
			BridgeEventName.ModDisabled,
			BridgeEventName.ModEnabled,
			BridgeEventName.ModRemoved,
		]);
		expect(reported.map((entry) => entry.subject)).toEqual([
			"Jotunn",
			"Jotunn",
			"Jotunn",
		]);
		expect(JSON.stringify(reported)).not.toContain(PASSWORD);
	});

	it("says why a mod download failed and keeps the raw error as the cause", async () => {
		const failure = new BridgeDownloadError(404, "thunderstore.io answered 404");
		const { context, reported } = harness({
			extract: pluginOnly,
			failDownload: failure,
		});

		const error = await mods.install(context, MOD_ID).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(BridgeUserError);
		expect(error instanceof BridgeUserError ? error.text.en : "").toBe(
			"Jotunn is no longer available from its source.",
		);
		expect(error instanceof Error ? error.cause : null).toBe(failure);
		expect(reported).toEqual([]);
	});
});

describe("reporting the bepinex loader to the activity feed", () => {
	const bepinexAction = async (context: Bridge.Context, action: string) => {
		const run = bepinex.actions[action];

		if (!run) {
			throw new Error(`bepinex has no ${action} action`);
		}

		await run(context, {});
	};

	it("reports ModLoaderInstalled with the pack version", async () => {
		const { context, reported } = harness({
			extract: pluginOnly,
		});

		await bepinexAction(context, "setup");

		expect(reported).toEqual([
			{
				name: BridgeEventName.ModLoaderInstalled,
				text: {
					ar: "تم تثبيت BepInEx (2.24.3)",
					en: "Installed BepInEx (2.24.3)",
				},
				subject: "BepInEx",
				details: {
					version: "2.24.3",
				},
			},
		]);
		expect(JSON.stringify(reported)).not.toContain(PASSWORD);
	});

	it("reports ModLoaderRemoved with how many mods went with it", async () => {
		const { context, reported } = harness({
			extract: pluginOnly,
			dependencies: {
				[MOD_ID]: dependenciesOf(1),
			},
		});

		await bepinexAction(context, "setup");
		await mods.install(context, MOD_ID);
		reported.splice(0);

		await bepinexAction(context, "uninstall");

		expect(reported.map((entry) => entry.name)).toEqual([
			BridgeEventName.ModLoaderRemoved,
		]);
		expect(reported[0]?.subject).toBe("BepInEx");
		expect(reported[0]?.details).toEqual({
			version: "2.24.3",
			count: 2,
		});
		expect(reported[0]?.text.en).toBe("Removed BepInEx and every mod on it (2)");
		expect(JSON.stringify(reported)).not.toContain(PASSWORD);
	});

	it("still removes the loader when the facts for the activity entry cannot be read", async () => {
		const { context, reported, files } = harness({
			extract: pluginOnly,
			failRead: MODS_SIDECAR,
		});

		files.set(MODS_SIDECAR, "{}");

		await bepinexAction(context, "uninstall");

		expect(files.has(BEPINEX_CORE)).toBe(false);
		expect(reported.map((entry) => entry.text.en)).toEqual([
			"Removed BepInEx",
		]);
		expect(reported[0]?.details).toEqual({
			version: null,
			count: null,
		});
	});

	it("says why the pack download failed and keeps the raw error as the cause", async () => {
		const failure = new BridgeDownloadError(null, "thunderstore.io could not be reached");
		const { context, reported } = harness({
			extract: pluginOnly,
			failDownload: failure,
		});

		const error = await installPack(context).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(BridgeUserError);
		expect(error instanceof BridgeUserError ? error.text.en : "").toBe(
			"We couldn't reach the source to download BepInEx. Try again.",
		);
		expect(error instanceof Error ? error.cause : null).toBe(failure);
		expect(reported).toEqual([]);
	});
});

describe("offering to remove bepinex", () => {
	it("offers the removal while the loader is on the server", async () => {
		const { context } = harness({
			extract: pluginOnly,
		});

		expect(await bepinex.unavailable?.(context)).toEqual({});
	});

	it("says bepinex is not installed in the words the refusal uses", async () => {
		const { context, files } = harness({
			extract: pluginOnly,
		});

		files.delete(DOORSTOP_MARKER);
		files.delete(BEPINEX_CORE);

		const unavailable = await bepinex.unavailable?.(context);

		expect(unavailable?.uninstall?.en).toBe("BepInEx isn't installed.");
		await expect(bepinex.actions.uninstall?.(context, {}) ?? Promise.resolve()).rejects.toThrow(
			"BepInEx isn't installed.",
		);
	});
});
