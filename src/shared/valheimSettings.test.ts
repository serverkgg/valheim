import { describe, expect, test } from "bun:test";
import { BridgeUserError } from "@serverkgg/bridge";
import {
	fieldValues,
	generatePassword,
	guardSettings,
	isValidWorldName,
	PASSWORD_MIN_LENGTH,
	passwordInName,
	SETTING_DEFAULTS,
	SETTING_FIELDS,
	settingsOf,
} from "./valheimSettings";

const stored = (over: Record<string, string | number | boolean | null> = {}) => {
	return {
		name: "Serverk Valheim",
		password: "vikings",
		world: "Serverk",
		...over,
	};
};

describe("reading the settings file the driver owns", () => {
	test("falls back to a default for every field the file has not seen", () => {
		const values = fieldValues({});

		for (const field of SETTING_FIELDS) {
			expect(values[field]).toBe(SETTING_DEFAULTS[field] ?? null);
		}
	});

	test("keeps what the file already holds", () => {
		expect(fieldValues(stored()).name).toBe("Serverk Valheim");
	});

	test("clamps a save interval outside the range valheim accepts", () => {
		expect(
			settingsOf(
				stored({
					saveinterval: 5,
				}),
			).saveInterval,
		).toBe(300);
		expect(
			settingsOf(
				stored({
					saveinterval: 99_999,
				}),
			).saveInterval,
		).toBe(3600);
	});

	test("reads a boolean the panel sent as a string", () => {
		expect(
			settingsOf(
				stored({
					crossplay: "true",
				}),
			).crossplay,
		).toBe(true);
	});

	test("falls back to the default when a field is blank", () => {
		expect(
			settingsOf(
				stored({
					world: "   ",
				}),
			).world,
		).toBe("Serverk");
	});
});

describe("guarding the two settings valheim refuses to start with", () => {
	test("refuses a password shorter than valheim's own minimum", () => {
		expect(() =>
			guardSettings(
				stored({
					password: "abc",
				}),
			),
		).toThrow(BridgeUserError);
		expect(
			guardSettings(
				stored({
					password: "a".repeat(PASSWORD_MIN_LENGTH),
				}),
			).password,
		).toHaveLength(PASSWORD_MIN_LENGTH);
	});

	test("refuses a password that sits inside the server name", () => {
		expect(() =>
			guardSettings(
				stored({
					name: "Serverk vikings hall",
					password: "vikings",
				}),
			),
		).toThrow(BridgeUserError);
	});

	test("catches the password in the name whatever the casing", () => {
		expect(passwordInName("Serverk VIKINGS hall", "vikings")).toBe(true);
		expect(passwordInName("Serverk hall", "vikings")).toBe(false);
	});

	test("refuses the password inside the world name, which valheim rejects the same way", () => {
		expect(() =>
			guardSettings(
				stored({
					password: "vikings",
					world: "Vikings",
				}),
			),
		).toThrow(BridgeUserError);
	});

	test("refuses a password with a space in it", () => {
		expect(() =>
			guardSettings(
				stored({
					password: "two words",
				}),
			),
		).toThrow(BridgeUserError);
	});

	test("refuses a world name valheim cannot turn into a file", () => {
		expect(() =>
			guardSettings(
				stored({
					world: "../escape",
				}),
			),
		).toThrow(BridgeUserError);
	});

	test("accepts the settings a fresh server ships with", () => {
		expect(guardSettings(stored()).world).toBe("Serverk");
	});
});

describe("naming a world", () => {
	test("takes letters, digits, spaces, dashes and underscores", () => {
		expect(isValidWorldName("Serverk")).toBe(true);
		expect(isValidWorldName("Serverk World 2")).toBe(true);
		expect(isValidWorldName("serverk_world-2")).toBe(true);
	});

	test("refuses anything that could reach outside the worlds folder", () => {
		expect(isValidWorldName("../escape")).toBe(false);
		expect(isValidWorldName("world/two")).toBe(false);
		expect(isValidWorldName(".hidden")).toBe(false);
		expect(isValidWorldName("")).toBe(false);
	});
});

describe("seeding a password so the server runs from the first second", () => {
	test("generates one long enough for valheim", () => {
		expect(generatePassword().length).toBeGreaterThanOrEqual(PASSWORD_MIN_LENGTH);
	});

	test("generates one with no space in it", () => {
		expect(generatePassword()).not.toMatch(/\s/);
	});

	test("generates a different one every time", () => {
		expect(generatePassword()).not.toBe(generatePassword());
	});
});
