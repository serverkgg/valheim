import { describe, expect, test } from "bun:test";
import { extensionOf, worldNameOf, worldPath, worldPaths } from "./valheimWorld";

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
