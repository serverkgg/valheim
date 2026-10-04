import { beforeEach, describe, expect, it } from "bun:test";
import type { Bridge } from "@serverkgg/bridge";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { ADMIN_LIST, BANNED_LIST, PERMITTED_LIST, roster, SETTINGS_FILE } from "../shared";
import { admins, bans, permitted } from "./lists";
import { players } from "./players";

const ALICE = "V_76561198000000001";

const PASSWORD = "hunter2-secret";

const harness = (seed: Record<string, string> = {}) => {
	const files = new Map(
		Object.entries({
			[SETTINGS_FILE]: JSON.stringify({
				password: PASSWORD,
			}),
			...seed,
		}),
	);
	const reported: Bridge.Activity[] = [];
	const emitted: string[] = [];

	const context = {
		activity: {
			report(entry: Bridge.Activity) {
				reported.push(entry);
			},
		},
		emit(event: string) {
			emitted.push(event);
		},
		files: {
			async exists(path: string) {
				return files.has(path);
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
	} as unknown as Bridge.Context;

	return {
		context,
		reported,
		emitted,
		file(path: string) {
			return files.get(path) ?? "";
		},
	};
};

const addTo = async (collection: Bridge.Collection, context: Bridge.Context, input: string) => {
	if (!collection.add) {
		throw new Error("the list takes no additions");
	}

	await collection.add(context, input);
};

const rowAction = async (collection: Bridge.Collection, action: string, context: Bridge.Context, row: Bridge.Row) => {
	const run = collection.actions?.[action];

	if (!run) {
		throw new Error(`the collection has no ${action} action`);
	}

	await run(context, row, {});
};

beforeEach(() => {
	roster.clear();
});

describe("reporting platform id list changes", () => {
	it("names the player a new admin is and keeps the list and the id as details", async () => {
		const { context, reported, file } = harness();

		roster.handshake(ALICE);
		roster.name("Meslzy");

		await addTo(admins, context, ALICE);

		expect(file(ADMIN_LIST)).toContain(ALICE);
		expect(reported).toEqual([
			{
				name: BridgeEventName.AccessGranted,
				text: {
					ar: "تمت إضافة Meslzy إلى قائمة الأدمن",
					en: "Added Meslzy to the admin list",
				},
				subject: "Meslzy",
				details: {
					list: "admins",
					platformId: ALICE,
				},
			},
		]);
		expect(JSON.stringify(reported)).not.toContain(PASSWORD);
	});

	it("falls back to the account the row carries when the player is not on", async () => {
		const { context, reported } = harness({
			[PERMITTED_LIST]: `// List permitted players ID\n${ALICE}\n`,
		});

		await rowAction(permitted, "remove", context, {
			id: ALICE,
			account: "meslzy",
		});

		expect(reported.map((entry) => entry.name)).toEqual([
			BridgeEventName.AccessRevoked,
		]);
		expect(reported[0]?.subject).toBe("meslzy");
		expect(reported[0]?.text.en).toBe("Removed meslzy from the allow list");
		expect(reported[0]?.details).toEqual({
			list: "permitted",
			platformId: ALICE,
		});
		expect(JSON.stringify(reported)).not.toContain(PASSWORD);
	});

	it("reports a ban list addition as a ban without raising a second PlayerBanned event", async () => {
		const { context, reported, emitted } = harness();

		await addTo(bans, context, ALICE);

		expect(emitted).toEqual([]);
		expect(reported.map((entry) => entry.name)).toEqual([
			BridgeEventName.PlayerBanned,
		]);
		expect(reported[0]?.subject).toBe(ALICE);
		expect(reported[0]?.details).toEqual({
			list: "bans",
			platformId: ALICE,
		});
	});

	it("reports a ban list removal as an unban", async () => {
		const { context, reported, file } = harness({
			[BANNED_LIST]: `// List banned players ID\n${ALICE}\n`,
		});

		await rowAction(bans, "remove", context, {
			id: ALICE,
			account: "",
		});

		expect(file(BANNED_LIST)).not.toContain(ALICE);
		expect(reported.map((entry) => entry.name)).toEqual([
			BridgeEventName.PlayerUnbanned,
		]);
		expect(reported[0]?.text.en).toBe(`Unbanned ${ALICE}`);
	});

	it("reports nothing when the list refuses the change", async () => {
		const { context, reported } = harness({
			[ADMIN_LIST]: `// List admin players ID\n${ALICE}\n`,
		});

		await expect(addTo(admins, context, ALICE)).rejects.toThrow();
		expect(reported).toEqual([]);
	});
});

describe("banning a player from the players table", () => {
	it("keeps the PlayerBanned emit and reports the ban with the character name", async () => {
		const { context, reported, emitted } = harness();

		roster.handshake(ALICE);
		roster.name("Meslzy");

		await rowAction(players, "ban", context, {
			id: ALICE,
			name: "Meslzy",
			account: "",
		});

		expect(emitted).toEqual([
			BridgeEventName.PlayerBanned,
		]);
		expect(reported.map((entry) => entry.name)).toEqual([
			BridgeEventName.PlayerBanned,
		]);
		expect(reported[0]?.subject).toBe("Meslzy");
		expect(reported[0]?.text).toEqual({
			ar: "تم حظر Meslzy",
			en: "Banned Meslzy",
		});
		expect(JSON.stringify(reported)).not.toContain(PASSWORD);
	});
});
