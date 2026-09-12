import { describe, expect, test } from "bun:test";
import { type Bridge, BridgeUserError } from "@serverkgg/bridge";
import { SETTINGS_FILE, WORLD_STAGING, worldPath } from "../shared";
import { worlds } from "./worlds";

const harness = (running: boolean, active: string, seed: Record<string, string> = {}, failMove = false) => {
	const files = new Map(
		Object.entries({
			[SETTINGS_FILE]: JSON.stringify({
				world: active,
			}),
			...seed,
		}),
	);
	const context = {
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

	test("cannot delete the running world after selecting its replacement", async () => {
		const data = worldPath("Old", "db");
		const meta = worldPath("Old", "fwl");
		const { context, files } = harness(true, "Old", {
			[data]: "old buildings",
			[meta]: "old seed",
			[worldPath("Next", "fwl")]: "next seed",
		});
		await worldAction(context, "activate", "Next");
		await expect(worldAction(context, "delete", "Old")).rejects.toThrow(BridgeUserError);
		expect(files.get(data)).toBe("old buildings");
		expect(files.get(meta)).toBe("old seed");
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
