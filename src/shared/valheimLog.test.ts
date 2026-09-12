import { describe, expect, test } from "bun:test";
import {
	isSpawn,
	parseCharacter,
	parseClosing,
	parseConnection,
	parseCrossplayJoin,
	parseCrossplayLeave,
	parseHandshake,
	parseJoinCode,
	parseVersion,
	parseWrongPassword,
} from "./valheimLog";

const STEAM64 = "76561198000000001";

const STEAM_ID = `V_${STEAM64}`;

describe("reading a valheim connection out of the log", () => {
	test("takes the quoted platform id 1.0 prints", () => {
		expect(parseConnection(`12/02/2025 19:04:11: Got connection "${STEAM_ID}"`)?.id).toBe(STEAM_ID);
	});

	test("still takes the bare steam id the pre-1.0 line carried", () => {
		expect(parseConnection(`12/02/2025 19:04:11: Got connection SteamID ${STEAM64}`)?.id).toBe(STEAM64);
	});

	test("takes the id off the handshake line, which is where the name queue starts", () => {
		expect(parseHandshake(`Got handshake from client "${STEAM_ID}"`)?.id).toBe(STEAM_ID);
		expect(parseHandshake(`Got handshake from client ${STEAM64}`)?.id).toBe(STEAM64);
	});

	test("takes the id off the closing line in both shapes", () => {
		expect(parseClosing(`12/02/2025 19:44:02: Closing socket "${STEAM_ID}"`)?.id).toBe(STEAM_ID);
		expect(parseClosing(`12/02/2025 19:44:02: Closing socket ${STEAM64}`)?.id).toBe(STEAM64);
	});

	test("takes the id off a peer that failed the password", () => {
		expect(parseWrongPassword(`Peer "${STEAM_ID}" has wrong password`)?.id).toBe(STEAM_ID);
		expect(parseWrongPassword(`Peer ${STEAM64} has wrong password`)?.id).toBe(STEAM64);
	});

	test("reads a console peer, whose id is neither a number nor steam", () => {
		expect(parseConnection('Got connection "Xbox_2535400000000000"')?.id).toBe("Xbox_2535400000000000");
		expect(parseHandshake('Got handshake from client "playfab/0a1b2c3d4e5f6789"')?.id).toBe("playfab/0a1b2c3d4e5f6789");
	});

	test("ignores a line that only mentions an id", () => {
		expect(parseConnection(`Sending peer info to ${STEAM64}`)).toBeNull();
		expect(parseClosing("Closing socket")).toBeNull();
		expect(parseHandshake("Got handshake from client")).toBeNull();
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

	test("counts the crossplay peers off the join line, which is all playfab gives us", () => {
		const joined = parseCrossplayJoin(
			'Player joined server "Serverk Valheim" that has join code 123456, now 2 player(s)',
		);

		expect(joined?.joinCode).toBe("123456");
		expect(joined?.players).toBe(2);
		expect(joined?.session).toBe("Serverk Valheim");
	});

	test("reads the crossplay leave line, which carries no id at all", () => {
		expect(parseCrossplayLeave('Player connection lost server "Serverk Valheim"')).toBe(true);
		expect(parseCrossplayLeave("Closing socket")).toBe(false);
	});
});

describe("reading the version banner valheim prints before it is ready", () => {
	test("takes the build string and the network version beside it", () => {
		const banner = parseVersion("Valheim version: l-0.220.3 (network version 16)");

		expect(banner?.version).toBe("l-0.220.3");
		expect(banner?.network).toBe("16");
	});

	test("takes the version alone when the banner carries nothing else", () => {
		const banner = parseVersion("Valheim version: 0.217.14");

		expect(banner?.version).toBe("0.217.14");
		expect(banner?.network).toBeNull();
	});

	test("ignores any other line", () => {
		expect(parseVersion("Game server connected")).toBeNull();
	});
});
