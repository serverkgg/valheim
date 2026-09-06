import { describe, expect, test } from "bun:test";
import { isSpawn, parseCharacter, parseClosing, parseConnection, parseJoinCode } from "./valheimLog";

describe("reading a valheim connection out of the log", () => {
	test("takes the steam id off the connection line", () => {
		expect(parseConnection("12/02/2025 19:04:11: Got connection SteamID 76561198000000001")?.steamId).toBe(
			"76561198000000001",
		);
	});

	test("takes the steam id off the closing line", () => {
		expect(parseClosing("12/02/2025 19:44:02: Closing socket 76561198000000001")?.steamId).toBe("76561198000000001");
	});

	test("ignores a line that only mentions a steam id", () => {
		expect(parseConnection("Sending peer info to 76561198000000001")).toBeNull();
		expect(parseClosing("Closing socket")).toBeNull();
	});
});

describe("reading the character line that carries the player name", () => {
	test("takes the name and the zdo id", () => {
		const character = parseCharacter("12/02/2025 19:04:18: Got character ZDOID from Meslzy : 1092837465:1");

		expect(character?.player).toBe("Meslzy");
		expect(character?.zdoId).toBe("1092837465:1");
	});

	test("keeps a name that holds spaces", () => {
		expect(parseCharacter("Got character ZDOID from Abu Rakan : -12345:7")?.player).toBe("Abu Rakan");
	});

	test("reads a death as a character line that is not a spawn", () => {
		const death = parseCharacter("Got character ZDOID from Meslzy : 0:0");

		expect(death).not.toBeNull();
		expect(death && isSpawn(death)).toBe(false);
	});

	test("reads a spawn as a spawn", () => {
		const spawn = parseCharacter("Got character ZDOID from Meslzy : 1092837465:1");

		expect(spawn && isSpawn(spawn)).toBe(true);
	});
});

describe("reading the crossplay session line", () => {
	test("takes the join code, the session name and the address", () => {
		const session = parseJoinCode(
			'12/02/2025 19:04:30: Session "Serverk Valheim" with join code 123456 and IP 51.68.1.2:2456 is active with 0 player(s)',
		);

		expect(session?.joinCode).toBe("123456");
		expect(session?.session).toBe("Serverk Valheim");
		expect(session?.address).toBe("51.68.1.2:2456");
	});

	test("ignores a line that names a session without a code", () => {
		expect(parseJoinCode('Session "Serverk Valheim" was closed')).toBeNull();
	});
});
