import { describe, expect, test } from "bun:test";
import { ValheimPlatform } from "./valheimPlatformId";
import { createRoster, displayNameOf, presenceOf } from "./valheimRoster";

const ALICE = "V_76561198000000001";

const BOB = "V_76561198000000002";

const HASH = "a".repeat(40);

describe("following a valheim roster through the log", () => {
	test("holds a peer out of the name queue until the handshake, which is the line a password gate passes", () => {
		const roster = createRoster();

		roster.read(`Got connection "${ALICE}"`);

		expect(roster.all()).toHaveLength(1);
		expect(roster.all().at(0)?.character).toBeNull();

		roster.read(`Got handshake from client "${ALICE}"`);
		roster.read("Got character ZDOID from Meslzy : 123:1");

		expect(roster.all().map((player) => player.character)).toEqual([
			"Meslzy",
		]);
	});

	test("never lets a wrong-password peer steal the next character name", () => {
		const roster = createRoster();

		roster.read(`Got connection "${ALICE}"`);
		roster.read(`Peer "${ALICE}" has wrong password`);
		roster.read(`Got connection "${BOB}"`);
		roster.read(`Got handshake from client "${BOB}"`);
		roster.read("Got character ZDOID from Rakan : 456:1");

		expect(
			roster.all().map((player) => [
				player.id,
				player.character,
			]),
		).toEqual([
			[
				BOB,
				"Rakan",
			],
		]);
	});

	test("names two players in the order their handshakes arrived", () => {
		const roster = createRoster();

		roster.read(`Got handshake from client "${ALICE}"`);
		roster.read("Got character ZDOID from Meslzy : 123:1");
		roster.read(`Got handshake from client "${BOB}"`);
		roster.read("Got character ZDOID from Rakan : 456:1");

		expect(
			roster.all().map((player) => [
				player.id,
				player.character,
			]),
		).toEqual([
			[
				ALICE,
				"Meslzy",
			],
			[
				BOB,
				"Rakan",
			],
		]);
	});

	test("never renames a player who is already named when somebody dies", () => {
		const roster = createRoster();

		roster.read(`Got handshake from client "${ALICE}"`);
		roster.read("Got character ZDOID from Meslzy : 123:1");
		roster.read("Got character ZDOID from Meslzy : 0:0");

		expect(roster.all().map((player) => player.character)).toEqual([
			"Meslzy",
		]);
	});

	test("drops a player when the socket closes", () => {
		const roster = createRoster();

		roster.read(`Got handshake from client "${ALICE}"`);
		roster.read("Got character ZDOID from Meslzy : 123:1");
		roster.read(`Closing socket "${ALICE}"`);

		expect(roster.all()).toHaveLength(0);
	});

	test("ignores a second connection from a player who is already on", () => {
		const roster = createRoster();

		roster.read(`Got connection "${ALICE}"`);
		roster.read(`Got handshake from client "${ALICE}"`);
		roster.read(`Got handshake from client "${ALICE}"`);

		expect(roster.all()).toHaveLength(1);
	});

	test("names the platform behind every peer it sees", () => {
		const roster = createRoster();

		roster.read(`Got handshake from client "${ALICE}"`);
		roster.read('Got handshake from client "Xbox_2535400000000000"');

		expect(roster.all().map((player) => player.platform)).toEqual([
			ValheimPlatform.Steam,
			ValheimPlatform.Xbox,
		]);
	});

	test("keeps the newest crossplay session it saw", () => {
		const roster = createRoster();

		roster.read('Session "Serverk" with join code 111111 and IP 1.2.3.4:2456 is active with 0 player(s)');
		roster.read('Session "Serverk" with join code 222222 and IP 1.2.3.4:2456 is active with 1 player(s)');

		expect(roster.session()?.joinCode).toBe("222222");
	});

	test("counts crossplay peers off the session lines, because playfab gives no id", () => {
		const roster = createRoster();

		expect(roster.count()).toBeNull();

		roster.read('Player joined server "Serverk" that has join code 111111, now 2 player(s)');

		expect(roster.count()).toBe(2);

		roster.read('Player connection lost server "Serverk"');

		expect(roster.count()).toBe(1);
	});

	test("clears everything when the server restarts", () => {
		const roster = createRoster();

		roster.read(`Got handshake from client "${ALICE}"`);
		roster.read('Session "Serverk" with join code 111111 and IP 1.2.3.4:2456 is active with 0 player(s)');
		roster.clear();

		expect(roster.all()).toEqual([]);
		expect(roster.session()).toBeNull();
		expect(roster.count()).toBeNull();
	});
});

describe("describing a roster from the steam web api", () => {
	test("puts the avatar hash and the account name on the peer they belong to", () => {
		const roster = createRoster();

		roster.read(`Got handshake from client "${ALICE}"`);
		roster.describe(
			new Map([
				[
					ALICE,
					HASH,
				],
			]),
		);
		roster.identify(
			new Map([
				[
					ALICE,
					"meslzy",
				],
			]),
		);

		expect(roster.all().at(0)?.avatarHash).toBe(HASH);
		expect(roster.all().at(0)?.account).toBe("meslzy");
	});
});

describe("turning a roster row into a presence payload", () => {
	test("sends the character, the platform id, the account and the avatar", () => {
		expect(
			presenceOf({
				account: "meslzy",
				avatarHash: HASH,
				character: "Meslzy",
				id: ALICE,
				platform: ValheimPlatform.Steam,
			}),
		).toEqual({
			account: "meslzy",
			avatarHash: HASH,
			platform: ValheimPlatform.Steam,
			platformId: ALICE,
			player: "Meslzy",
		});
	});

	test("falls back from the character to the account and then to the id", () => {
		expect(
			displayNameOf({
				account: "meslzy",
				avatarHash: null,
				character: null,
				id: ALICE,
				platform: ValheimPlatform.Steam,
			}),
		).toBe("meslzy");

		expect(
			presenceOf({
				account: null,
				avatarHash: null,
				character: null,
				id: ALICE,
				platform: ValheimPlatform.Steam,
			}),
		).toEqual({
			platform: ValheimPlatform.Steam,
			platformId: ALICE,
			player: ALICE,
		});
	});
});

describe("crossplay counts across overlapping disconnect logs", () => {
	test("rejected unknown peers do not subtract connected players", () => {
		const roster = createRoster();
		roster.observeCount(3);
		roster.read(`Peer "${ALICE}" has wrong password`);
		roster.read(`Closing socket "${ALICE}"`);
		expect(roster.count()).toBe(3);
	});

	test("the socket and PlayFab leave for one player count only once", () => {
		const roster = createRoster();
		roster.handshake(ALICE);
		roster.observeCount(3);
		roster.read(`Closing socket "${ALICE}"`);
		roster.read('Player connection lost server "Serverk"');
		expect(roster.all()).toEqual([]);
		expect(roster.count()).toBe(2);
	});
});
