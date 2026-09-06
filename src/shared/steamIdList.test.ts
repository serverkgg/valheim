import { describe, expect, test } from "bun:test";
import { BridgeUserError } from "@serverkgg/bridge";
import { parseSteamIds, requireSteamId, serializeSteamIds } from "./steamIdList";

const ALICE = "76561198000000001";

const BOB = "76561198000000002";

describe("reading a valheim id list", () => {
	test("skips the comment header valheim writes itself", () => {
		expect(parseSteamIds(`// List admin players ID\n// One Steam ID per line\n${ALICE}\n`)).toEqual([
			ALICE,
		]);
	});

	test("takes the id off a line that carries a trailing note", () => {
		expect(parseSteamIds(`${ALICE} // Meslzy\n`)).toEqual([
			ALICE,
		]);
	});

	test("drops a duplicate", () => {
		expect(parseSteamIds(`${ALICE}\n${ALICE}\n${BOB}\n`)).toEqual([
			ALICE,
			BOB,
		]);
	});

	test("drops anything that is not a steam id", () => {
		expect(parseSteamIds("meslzy\n123\n\n  \n")).toEqual([]);
	});
});

describe("writing a valheim id list", () => {
	test("keeps the comment header so the file still reads like valheim's own", () => {
		expect(
			serializeSteamIds("List admin players ID\nOne Steam ID per line", [
				ALICE,
			]),
		).toBe(`// List admin players ID\n// One Steam ID per line\n${ALICE}\n`);
	});

	test("round trips through the parser", () => {
		expect(
			parseSteamIds(
				serializeSteamIds("List banned players ID", [
					ALICE,
					BOB,
				]),
			),
		).toEqual([
			ALICE,
			BOB,
		]);
	});
});

describe("accepting a steam id from the panel", () => {
	test("takes a 17 digit id and trims it", () => {
		expect(requireSteamId(`  ${ALICE} `)).toBe(ALICE);
	});

	test("refuses a profile url, a name or a short number", () => {
		for (const input of [
			"https://steamcommunity.com/id/meslzy",
			"meslzy",
			"1234",
			"",
		]) {
			expect(() => requireSteamId(input)).toThrow(BridgeUserError);
		}
	});
});
