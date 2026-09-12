import { beforeEach, describe, expect, test } from "bun:test";
import { type Bridge, BridgeUserError } from "@serverkgg/bridge";
import { BANNED_LIST, roster, SETTINGS_FILE } from "../shared";
import { consoleHandler, findPlayer, parseConsoleLine, rosterLines } from "./consoleHandler";

const ALICE = "V_76561198000000001";

const BOB = "V_76561198000000002";

const harness = (seed: Record<string, string> = {}) => {
	const files = new Map(Object.entries(seed));

	const context = {
		codec: {
			json: {
				async read(path: string) {
					return JSON.parse(files.get(path) ?? "{}") as Bridge.Values;
				},
			},
		},
		emit: () => undefined,
		files: {
			async exists(path: string) {
				return files.has(path);
			},
			async list() {
				return [];
			},
			async read(path: string) {
				return files.get(path) ?? "";
			},
			async write(path: string, content: string) {
				files.set(path, content);
			},
		},
		log: Object.assign(() => undefined, {
			error: () => undefined,
			warn: () => undefined,
		}),
		server: {
			code: "abc123",
			running: true,
		},
	} as unknown as Bridge.Context;

	return {
		context,
		file(path: string) {
			return files.get(path) ?? "";
		},
	};
};

const settings = (values: Record<string, unknown>) => {
	return {
		[SETTINGS_FILE]: JSON.stringify(values),
	};
};

beforeEach(() => {
	roster.clear();
});

describe("splitting a console line", () => {
	test("lowercases the command and keeps the rest as one argument", () => {
		expect(parseConsoleLine("  Ban Abu Rakan ")).toEqual({
			args: [
				"Abu",
				"Rakan",
			],
			name: "ban",
			rest: "Abu Rakan",
		});
	});

	test("reads a command with no arguments at all", () => {
		expect(parseConsoleLine("status")).toEqual({
			args: [],
			name: "status",
			rest: "",
		});
	});
});

describe("rendering the roster for the console", () => {
	test("says plainly that nobody is on", () => {
		expect(rosterLines([])).toEqual([
			"no players online",
		]);
	});

	test("finds a player by character, by account and by id", () => {
		roster.read(`Got handshake from client "${ALICE}"`);
		roster.read("Got character ZDOID from Meslzy : 123:1");
		roster.identify(
			new Map([
				[
					ALICE,
					"meslzy",
				],
			]),
		);

		expect(findPlayer(roster.all(), "meslzy")?.id).toBe(ALICE);
		expect(findPlayer(roster.all(), "MESLZY")?.id).toBe(ALICE);
		expect(findPlayer(roster.all(), ALICE)?.id).toBe(ALICE);
		expect(findPlayer(roster.all(), "rakan")).toBeNull();
	});
});

describe("answering a console line valheim itself never reads", () => {
	test("answers a safe argument-free command with what the owner typed", async () => {
		const { context } = harness(
			settings({
				world: "Serverk",
			}),
		);
		const reply = await consoleHandler(context, "status");

		expect(reply?.sent).toBe("status");
		expect(reply?.line).toContain("world: Serverk");
		expect(reply?.line).toContain("crossplay: off");
	});

	test("lists the roster the log gave us", async () => {
		const { context } = harness(settings({}));

		roster.read(`Got handshake from client "${ALICE}"`);
		roster.read("Got character ZDOID from Meslzy : 123:1");

		expect((await consoleHandler(context, "players"))?.line).toContain(`Meslzy,,Steam,${ALICE}`);
	});

	test("names every command it answers, so help is real rather than a link", async () => {
		const { context } = harness(settings({}));
		const reply = await consoleHandler(context, "help");

		for (const name of [
			"status",
			"players",
			"worlds",
			"mods",
			"joincode",
			"ban",
			"unban",
		]) {
			expect(reply?.line).toContain(name);
		}
	});

	test("ignores an empty line instead of refusing it", async () => {
		const { context } = harness(settings({}));

		expect(await consoleHandler(context, "   ")).toBeNull();
	});

	test("refuses a command it cannot honour, because there is no stdin behind it", async () => {
		const { context } = harness(settings({}));

		expect(consoleHandler(context, "kick Meslzy")).rejects.toThrow(BridgeUserError);
	});

	test("refuses save honestly, because valheim has no save command at all", async () => {
		const { context } = harness(settings({}));

		expect(consoleHandler(context, "save")).rejects.toThrow(BridgeUserError);
	});

	test("refuses a join code while crossplay is off", async () => {
		const { context } = harness(
			settings({
				crossplay: false,
			}),
		);

		expect(consoleHandler(context, "joincode")).rejects.toThrow(BridgeUserError);
	});
});

describe("banning from the console", () => {
	test("resolves a player by the name the log gave them", async () => {
		const { context, file } = harness(settings({}));

		roster.read(`Got handshake from client "${ALICE}"`);
		roster.read("Got character ZDOID from Meslzy : 123:1");

		const reply = await consoleHandler(context, "ban Meslzy");

		expect(reply?.line).toContain(`banned: ${ALICE}`);
		expect(file(BANNED_LIST)).toContain(ALICE);
	});

	test("falls back to the id for somebody who is not on, prefixing a bare steam number", async () => {
		const { context, file } = harness(settings({}));

		await consoleHandler(context, "ban 76561198000000002");

		expect(file(BANNED_LIST)).toContain(BOB);
	});

	test("refuses a name nobody on the server answers to and no id can be read from", async () => {
		const { context } = harness(settings({}));

		expect(consoleHandler(context, "ban meslzy")).rejects.toThrow(BridgeUserError);
	});

	test("refuses a ban with no target", async () => {
		const { context } = harness(settings({}));

		expect(consoleHandler(context, "ban")).rejects.toThrow(BridgeUserError);
	});

	test("takes an id back off the list", async () => {
		const { context, file } = harness({
			...settings({}),
			[BANNED_LIST]: `// List banned players ID\n${ALICE}\n`,
		});

		const reply = await consoleHandler(context, `unban ${ALICE}`);

		expect(reply?.line).toContain(`unbanned: ${ALICE}`);
		expect(file(BANNED_LIST)).not.toContain(ALICE);
	});

	test("refuses to unban an id that was never banned", async () => {
		const { context } = harness(settings({}));

		expect(consoleHandler(context, `unban ${ALICE}`)).rejects.toThrow(BridgeUserError);
	});
});

describe("resolving moderation targets safely", () => {
	test("an exact ID wins over a character impersonating that ID", async () => {
		const { context, file } = harness(settings({}));
		roster.handshake(ALICE);
		roster.name(BOB);
		roster.handshake(BOB);
		roster.name("Rakan");
		await consoleHandler(context, `ban ${BOB}`);
		expect(file(BANNED_LIST)).toContain(BOB);
		expect(file(BANNED_LIST)).not.toContain(ALICE);
	});

	test("an offline ID cannot be shadowed by an online character", async () => {
		const { context, file } = harness(settings({}));
		roster.handshake(ALICE);
		roster.name(BOB);
		await consoleHandler(context, "ban 76561198000000002");
		expect(file(BANNED_LIST)).toContain(BOB);
		expect(file(BANNED_LIST)).not.toContain(ALICE);
	});

	test("duplicate character names refuse the ban without changing the file", async () => {
		const { context, file } = harness(settings({}));
		roster.handshake(ALICE);
		roster.name("Rakan");
		roster.handshake(BOB);
		roster.name("Rakan");
		await expect(consoleHandler(context, "ban Rakan")).rejects.toThrow(BridgeUserError);
		expect(file(BANNED_LIST)).toBe("");
	});

	test("platform IDs stay case sensitive", () => {
		roster.handshake(ALICE);
		expect(findPlayer(roster.all(), ALICE.toLowerCase())).toBeNull();
	});
});

test("inherited object properties are refused as unknown console commands", async () => {
	const { context } = harness(settings({}));
	for (const command of [
		"constructor",
		"__proto__",
		"toString",
	]) {
		await expect(consoleHandler(context, command)).rejects.toThrow(BridgeUserError);
	}
});
