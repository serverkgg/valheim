import { describe, expect, it } from "bun:test";
import { BridgeUserError } from "@serverkgg/bridge";
import {
	isBareSteam64,
	normalizePlatformId,
	PLATFORM_ID_PATTERN,
	parsePlatformId,
	platformOf,
	requirePlatformId,
	steam64Of,
	ValheimPlatform,
} from "./valheimPlatformId";

const STEAM64 = "76561198000000001";

const STEAM_ID = `V_${STEAM64}`;

describe("naming the platform behind an id", () => {
	it("reads steam off both the 1.0 prefix and a bare steam number", () => {
		expect(platformOf(STEAM_ID)).toBe(ValheimPlatform.Steam);
		expect(platformOf(STEAM64)).toBe(ValheimPlatform.Steam);
	});

	it("reads the consoles valheim 1.0 opened crossplay to", () => {
		expect(platformOf("Xbox_2535400000000000")).toBe(ValheimPlatform.Xbox);
		expect(platformOf("PSN_0123456789")).toBe(ValheimPlatform.PlayStation);
		expect(platformOf("Switch_0123456789")).toBe(ValheimPlatform.Switch);
		expect(platformOf("playfab/0a1b2c3d4e5f6789")).toBe(ValheimPlatform.PlayFab);
	});

	it("does not guess at a prefix it has never seen", () => {
		expect(platformOf("Mystery_0123456789")).toBe(ValheimPlatform.Unknown);
	});
});

describe("reading the steam number back out of an id", () => {
	it("takes it off the prefixed form and off a bare number", () => {
		expect(steam64Of(STEAM_ID)).toBe(STEAM64);
		expect(steam64Of(STEAM64)).toBe(STEAM64);
	});

	it("answers with nothing for an id no steam account is behind", () => {
		expect(steam64Of("Xbox_2535400000000000")).toBeNull();
		expect(steam64Of("V_not-a-number")).toBeNull();
	});
});

describe("normalising what an owner types", () => {
	it("prefixes a bare steam number, because 1.0 stopped honouring one", () => {
		expect(normalizePlatformId(` ${STEAM64} `)).toBe(STEAM_ID);
		expect(isBareSteam64(STEAM64)).toBe(true);
	});

	it("leaves an id that already carries a platform alone", () => {
		expect(normalizePlatformId(STEAM_ID)).toBe(STEAM_ID);
		expect(normalizePlatformId("Xbox_2535400000000000")).toBe("Xbox_2535400000000000");
		expect(isBareSteam64(STEAM_ID)).toBe(false);
	});
});

describe("parsing an id into what the panel shows", () => {
	it("flags a bare steam number as legacy while still normalising it", () => {
		expect(parsePlatformId(STEAM64)).toEqual({
			id: STEAM_ID,
			legacy: true,
			platform: ValheimPlatform.Steam,
			steam64: STEAM64,
		});
	});

	it("keeps a playfab peer with the slash it really carries", () => {
		expect(parsePlatformId("playfab/0a1b2c3d4e5f6789")).toEqual({
			id: "playfab/0a1b2c3d4e5f6789",
			legacy: false,
			platform: ValheimPlatform.PlayFab,
			steam64: null,
		});
	});

	it("refuses anything that is not an id at all", () => {
		for (const input of [
			"meslzy",
			"1234",
			"https://steamcommunity.com/id/meslzy",
			"",
		]) {
			expect(parsePlatformId(input)).toBeNull();
		}
	});
});

describe("accepting an id from the panel", () => {
	it("answers with the normalised id", () => {
		expect(requirePlatformId(` ${STEAM64} `)).toBe(STEAM_ID);
		expect(requirePlatformId("Xbox_2535400000000000")).toBe("Xbox_2535400000000000");
	});

	it("refuses a name or a profile link in both languages", () => {
		for (const input of [
			"meslzy",
			"https://steamcommunity.com/id/meslzy",
			"",
		]) {
			expect(() => requirePlatformId(input)).toThrow(BridgeUserError);
		}
	});

	it("publishes the same rule it enforces, so a field and the parser cannot disagree", () => {
		const pattern = new RegExp(PLATFORM_ID_PATTERN);

		expect(pattern.test(STEAM_ID)).toBe(true);
		expect(pattern.test(STEAM64)).toBe(true);
		expect(pattern.test("meslzy")).toBe(false);
	});
});
