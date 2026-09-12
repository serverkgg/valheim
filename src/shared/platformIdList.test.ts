import { describe, expect, test } from "bun:test";
import { LIST_HEADERS, migratePlatformIds, parsePlatformIds, serializePlatformIds } from "./platformIdList";
import { ADMIN_LIST, BANNED_LIST, PERMITTED_LIST } from "./valheimApp";

const ALICE = "76561198000000001";

const BOB = "76561198000000002";

const ALICE_ID = `V_${ALICE}`;

const BOB_ID = `V_${BOB}`;

describe("reading a valheim id list", () => {
	test("skips the comment header valheim writes itself", () => {
		expect(parsePlatformIds(`// List admin players ID\n// One Platform User ID per line\n${ALICE_ID}\n`)).toEqual([
			{
				id: ALICE_ID,
				legacy: false,
			},
		]);
	});

	test("normalises a pre-1.0 bare steam number and says it was one", () => {
		expect(parsePlatformIds(`${ALICE}\n`)).toEqual([
			{
				id: ALICE_ID,
				legacy: true,
			},
		]);
	});

	test("takes the id off a line that carries a trailing note", () => {
		expect(parsePlatformIds(`${ALICE_ID} // Meslzy\n`)).toEqual([
			{
				id: ALICE_ID,
				legacy: false,
			},
		]);
	});

	test("drops a duplicate, including one written in both forms", () => {
		expect(parsePlatformIds(`${ALICE_ID}\n${ALICE}\n${BOB_ID}\n`).map((entry) => entry.id)).toEqual([
			ALICE_ID,
			BOB_ID,
		]);
	});

	test("keeps a console peer exactly as valheim writes it", () => {
		expect(parsePlatformIds("Xbox_2535400000000000\nplayfab/0a1b2c3d4e5f6789\n").map((entry) => entry.id)).toEqual([
			"Xbox_2535400000000000",
			"playfab/0a1b2c3d4e5f6789",
		]);
	});

	test("drops anything that is not an id", () => {
		expect(parsePlatformIds("meslzy\n123\n\n  \n")).toEqual([]);
	});
});

describe("writing a valheim id list", () => {
	test("keeps the comment header so the file still reads like valheim's own", () => {
		expect(
			serializePlatformIds(LIST_HEADERS[ADMIN_LIST] ?? "", [
				ALICE_ID,
			]),
		).toBe(`// List admin players ID\n// One Platform User ID per line\n${ALICE_ID}\n`);
	});

	test("round trips through the parser", () => {
		expect(
			parsePlatformIds(
				serializePlatformIds(LIST_HEADERS[BANNED_LIST] ?? "", [
					ALICE_ID,
					BOB_ID,
				]),
			).map((entry) => entry.id),
		).toEqual([
			ALICE_ID,
			BOB_ID,
		]);
	});

	test("carries one header for every list file the driver seeds", () => {
		for (const path of [
			ADMIN_LIST,
			BANNED_LIST,
			PERMITTED_LIST,
		]) {
			expect((LIST_HEADERS[path] ?? "").length).toBeGreaterThan(0);
		}
	});
});

describe("migrating a pre-1.0 list on boot", () => {
	test("rewrites a bare steam number as the platform id 1.0 honours", () => {
		const migrated = migratePlatformIds(`// List admin players ID\n${ALICE}\n`);

		expect(migrated.migrated).toBe(1);
		expect(migrated.contents).toBe(`// List admin players ID\n${ALICE_ID}\n`);
	});

	test("keeps every comment line exactly as the owner wrote it", () => {
		const migrated = migratePlatformIds(`# my own note\n// valheim's note\n${ALICE}\n`);

		expect(migrated.contents.split("\n").slice(0, 2)).toEqual([
			"# my own note",
			"// valheim's note",
		]);
	});

	test("keeps a trailing note beside the id it belongs to", () => {
		expect(migratePlatformIds(`${ALICE} // Meslzy\n`).contents).toBe(`${ALICE_ID} // Meslzy\n`);
	});

	test("changes nothing the second time, so a boot after a boot is free", () => {
		const once = migratePlatformIds(`${ALICE}\n${BOB}\n`);
		const twice = migratePlatformIds(once.contents);

		expect(once.migrated).toBe(2);
		expect(twice.migrated).toBe(0);
		expect(twice.contents).toBe(once.contents);
	});

	test("leaves a console id and an unreadable line alone", () => {
		const migrated = migratePlatformIds("Xbox_2535400000000000\nmeslzy\n");

		expect(migrated.migrated).toBe(0);
		expect(migrated.contents).toBe("Xbox_2535400000000000\nmeslzy\n");
	});
});
