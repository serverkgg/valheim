import { describe, expect, test } from "bun:test";
import { extensionOf, missingHalf, worldNameOf, worldPath, worldPaths } from "./valheimWorld";

describe("naming valheim world files", () => {
	test("reads the world name off either half of the pair", () => {
		expect(worldNameOf("Serverk.db")).toBe("Serverk");
		expect(worldNameOf("Serverk.fwl")).toBe("Serverk");
	});

	test("keeps a dot that belongs to the world name", () => {
		expect(worldNameOf("Serverk v2.db")).toBe("Serverk v2");
	});

	test("refuses a file that is neither half of the pair", () => {
		expect(worldNameOf("Serverk.db.old")).toBeNull();
		expect(worldNameOf("README.md")).toBeNull();
	});

	test("reads the extension back in lower case", () => {
		expect(extensionOf("Serverk.DB")).toBe("db");
		expect(extensionOf("Serverk.FWL")).toBe("fwl");
		expect(extensionOf("Serverk.txt")).toBeNull();
	});

	test("puts both halves under the worlds directory valheim reads", () => {
		expect(worldPaths("Serverk")).toEqual([
			"save/worlds_local/Serverk.db",
			"save/worlds_local/Serverk.fwl",
		]);
		expect(worldPath("Serverk", "db")).toBe("save/worlds_local/Serverk.db");
	});
});

describe("telling a player when the half that matters is missing", () => {
	test("says nothing while both halves are there", () => {
		expect(
			missingHalf({
				name: "Serverk",
				sizeBytes: 1,
				hasData: true,
				hasMeta: true,
			}),
		).toBeNull();
	});

	test("names the fwl first, because without the seed valheim builds a different world", () => {
		expect(
			missingHalf({
				name: "Serverk",
				sizeBytes: 1,
				hasData: true,
				hasMeta: false,
			}),
		).toBe("fwl");
	});

	test("says nothing about a world that has not written its first save yet, which every new world looks like", () => {
		expect(
			missingHalf({
				name: "Serverk",
				sizeBytes: 1,
				hasData: false,
				hasMeta: true,
			}),
		).toBeNull();
	});
});
