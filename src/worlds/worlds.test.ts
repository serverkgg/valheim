import { describe, expect, test } from "bun:test";
import { type Bridge, BridgeUserError } from "@serverkgg/bridge";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { WORLD_NAME_ARGUMENT, worldActions } from "../actions";
import { SETTINGS_FILE, WORLD_STAGING, WORLDS_DIRECTORY, worldPath } from "../shared";
import { worlds } from "./worlds";

const PASSWORD = "hunter2-secret";

const harness = (running: boolean, active: string, seed: Record<string, string> = {}, failMove = false) => {
	const files = new Map(
		Object.entries({
			[SETTINGS_FILE]: JSON.stringify({
				world: active,
				password: PASSWORD,
			}),
			...seed,
		}),
	);
	const reported: Bridge.Activity[] = [];
	const context = {
		activity: {
			report(entry: Bridge.Activity) {
				reported.push(entry);
			},
		},
		server: {
			running,
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
		files: {
			async exists(path: string) {
				return files.has(path);
			},
			async list() {
				return [
					...files.keys(),
				]
					.filter((path) => path.startsWith(`${WORLDS_DIRECTORY}/`))
					.map((path) => ({
						path,
						name: path.slice(WORLDS_DIRECTORY.length + 1),
						sizeBytes: 1,
					}));
			},
			async ensure() {},
			async remove(path: string) {
				files.delete(path);
			},
			async move(source: string, target: string) {
				if (failMove) {
					throw new Error("move failed");
				}
				if (files.has(target)) {
					throw new Error("target exists");
				}
				const value = files.get(source);
				if (value === undefined) {
					throw new Error("source missing");
				}
				files.set(target, value);
				files.delete(source);
			},
		},
		log: () => undefined,
	} as unknown as Bridge.Context;
	return {
		context,
		files,
		reported,
	};
};

const addWorld = async (context: Bridge.Context, input: string) => {
	if (!worlds.add) {
		throw new Error("world upload missing");
	}
	await worlds.add(context, input);
};

const worldAction = async (context: Bridge.Context, action: string, id: string) => {
	const run = worlds.actions?.[action];
	if (!run) {
		throw new Error("world action missing");
	}
	await run(
		context,
		{
			id,
		},
		{},
	);
};

describe("world files stay safe during panel changes", () => {
	test("refuses running uploads without removing the uploaded or existing file", async () => {
		const source = `${WORLD_STAGING}/Serverk.db`;
		const target = worldPath("Serverk", "db");
		const { context, files } = harness(true, "Serverk", {
			[source]: "upload",
			[target]: "saved world",
		});
		await expect(addWorld(context, source)).rejects.toThrow(BridgeUserError);
		expect(files.get(source)).toBe("upload");
		expect(files.get(target)).toBe("saved world");
	});

	test("refuses collisions while stopped and preserves both files", async () => {
		for (const extension of [
			"db",
			"fwl",
		]) {
			const source = `${WORLD_STAGING}/Serverk.${extension}`;
			const target = worldPath("Serverk", extension);
			const { context, files } = harness(false, "Other", {
				[source]: "upload",
				[target]: "saved world",
			});
			await expect(addWorld(context, source)).rejects.toThrow(BridgeUserError);
			expect(files.get(source)).toBe("upload");
			expect(files.get(target)).toBe("saved world");
		}
	});

	test("uploads both halves of a distinct world while stopped", async () => {
		const data = `${WORLD_STAGING}/Imported.db`;
		const meta = `${WORLD_STAGING}/Imported.fwl`;
		const { context, files } = harness(false, "Serverk", {
			[data]: "buildings",
			[meta]: "seed",
		});
		await addWorld(context, data);
		await addWorld(context, meta);
		expect(files.get(worldPath("Imported", "db"))).toBe("buildings");
		expect(files.get(worldPath("Imported", "fwl"))).toBe("seed");
		expect(files.has(data)).toBe(false);
		expect(files.has(meta)).toBe(false);
	});

	test("keeps staged data when moving a new world fails", async () => {
		const source = `${WORLD_STAGING}/Imported.db`;
		const { context, files } = harness(
			false,
			"Serverk",
			{
				[source]: "buildings",
			},
			true,
		);
		await expect(addWorld(context, source)).rejects.toThrow("move failed");
		expect(files.get(source)).toBe("buildings");
		expect(files.has(worldPath("Imported", "db"))).toBe(false);
	});

	test("still protects the selected world while stopped", async () => {
		const data = worldPath("Serverk", "db");
		const { context, files } = harness(false, "Serverk", {
			[data]: "buildings",
		});
		await expect(worldAction(context, "delete", "Serverk")).rejects.toThrow(BridgeUserError);
		expect(files.get(data)).toBe("buildings");
	});

	test("deletes an unselected world and old save halves while stopped", async () => {
		const paths = [
			"db",
			"fwl",
			"db.old",
			"fwl.old",
		].map((extension) => worldPath("Old", extension));
		const active = worldPath("Serverk", "db");
		const { context, files } = harness(false, "Serverk", {
			...Object.fromEntries(
				paths.map((path) => [
					path,
					"old",
				]),
			),
			[active]: "current",
		});
		await worldAction(context, "delete", "Old");
		for (const path of paths) {
			expect(files.has(path)).toBe(false);
		}
		expect(files.get(active)).toBe("current");
	});
});

describe("reporting world changes to the activity feed", () => {
	test("names the uploaded world file", async () => {
		const source = `${WORLD_STAGING}/Imported.db`;
		const { context, reported } = harness(false, "Serverk", {
			[source]: "buildings",
		});

		await addWorld(context, source);

		expect(reported).toEqual([
			{
				name: BridgeEventName.WorldImported,
				text: {
					ar: "تم رفع ملف العالم Imported.db",
					en: "Uploaded the world file Imported.db",
				},
				subject: "Imported",
				details: {
					world: "Imported",
					file: "Imported.db",
				},
			},
		]);
	});

	test("names the world it activated and the one it replaced", async () => {
		const { context, reported } = harness(false, "Serverk", {
			[worldPath("Next", "fwl")]: "seed",
		});

		await worldAction(context, "activate", "Next");

		expect(reported.map((entry) => entry.name)).toEqual([
			BridgeEventName.WorldActivated,
		]);
		expect(reported[0]?.subject).toBe("Next");
		expect(reported[0]?.details).toEqual({
			world: "Next",
			previous: "Serverk",
		});
		expect(JSON.stringify(reported)).not.toContain(PASSWORD);
	});

	test("names the deleted world", async () => {
		const { context, reported } = harness(false, "Serverk", {
			[worldPath("Old", "db")]: "old",
		});

		await worldAction(context, "delete", "Old");

		expect(reported.map((entry) => entry.name)).toEqual([
			BridgeEventName.WorldDeleted,
		]);
		expect(reported[0]?.subject).toBe("Old");
	});

	test("says a created world is generated at the next start", async () => {
		const { context, reported } = harness(false, "Serverk");
		const create = worldActions.actions.create;

		if (!create) {
			throw new Error("world create missing");
		}

		await create(context, {
			[WORLD_NAME_ARGUMENT]: "Fresh",
		});

		expect(reported.map((entry) => entry.name)).toEqual([
			BridgeEventName.WorldCreated,
		]);
		expect(reported[0]?.subject).toBe("Fresh");
		expect(reported[0]?.text.en).toContain("next start");
		expect(reported[0]?.details).toEqual({
			world: "Fresh",
			previous: "Serverk",
		});
		expect(JSON.stringify(reported)).not.toContain(PASSWORD);
	});

	test("reports nothing when a change is refused", async () => {
		const { context, reported } = harness(false, "Old", {
			[worldPath("Old", "db")]: "old",
		});

		await expect(worldAction(context, "delete", "Old")).rejects.toThrow(BridgeUserError);
		expect(reported).toEqual([]);
	});
});

describe("which world actions apply", () => {
	const listedRow = async (context: Bridge.Context, id: string) => {
		const row = (await worlds.list(context)).find((entry) => entry.id === id);

		if (!row) {
			throw new Error(`the list built no row for ${id}`);
		}

		return row;
	};

	test("the active world cannot be deleted or activated, and says why in the words the refusal uses", async () => {
		const { context, files } = harness(false, "Serverk", {
			[worldPath("Serverk", "db")]: "buildings",
			[worldPath("Serverk", "fwl")]: "seed",
		});
		const unavailable = await worlds.unavailable?.(context, await listedRow(context, "Serverk"));

		expect(Object.keys(unavailable ?? {}).sort()).toEqual([
			"activate",
			"delete",
		]);
		await expect(worldAction(context, "delete", "Serverk")).rejects.toThrow(unavailable?.delete?.en);
		await expect(worldAction(context, "activate", "Serverk")).rejects.toThrow(unavailable?.activate?.en);
		expect(files.get(worldPath("Serverk", "db"))).toBe("buildings");
	});

	test("a world missing its .fwl cannot be activated, and says which file to upload", async () => {
		const { context } = harness(false, "Serverk", {
			[worldPath("Half", "db")]: "buildings",
		});
		const unavailable = await worlds.unavailable?.(context, await listedRow(context, "Half"));

		expect(Object.keys(unavailable ?? {})).toEqual([
			"activate",
		]);
		await expect(worldAction(context, "activate", "Half")).rejects.toThrow(unavailable?.activate?.en);
	});

	test("a complete world that is not active, and a row that carries only its id, keep every action", async () => {
		const { context } = harness(false, "Serverk", {
			[worldPath("Old", "db")]: "buildings",
			[worldPath("Old", "fwl")]: "seed",
		});

		expect(await worlds.unavailable?.(context, await listedRow(context, "Old"))).toEqual({});
		expect(
			await worlds.unavailable?.(context, {
				id: "Old",
			}),
		).toEqual({});
	});
});
