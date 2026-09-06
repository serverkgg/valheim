import { describe, expect, test } from "bun:test";
import { avatarHashOf, createRoster, presenceOf } from "./valheimRoster";

const ALICE = "76561198000000001";

const BOB = "76561198000000002";

describe("following a valheim roster through the log", () => {
	test("holds a connection back until the character spawns, because that line carries the name", () => {
		const roster = createRoster();

		roster.read(`Got connection SteamID ${ALICE}`);

		expect(roster.all()).toHaveLength(1);
		expect(roster.named()).toHaveLength(0);

		roster.read("Got character ZDOID from Meslzy : 123:1");

		expect(roster.named().map((player) => player.player)).toEqual([
			"Meslzy",
		]);
	});

	test("names two players in the order their connections arrived", () => {
		const roster = createRoster();

		roster.read(`Got connection SteamID ${ALICE}`);
		roster.read("Got character ZDOID from Meslzy : 123:1");
		roster.read(`Got connection SteamID ${BOB}`);
		roster.read("Got character ZDOID from Rakan : 456:1");

		expect(
			roster.named().map((player) => [
				player.id,
				player.player,
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

		roster.read(`Got connection SteamID ${ALICE}`);
		roster.read("Got character ZDOID from Meslzy : 123:1");
		roster.read("Got character ZDOID from Meslzy : 0:0");

		expect(roster.named().map((player) => player.player)).toEqual([
			"Meslzy",
		]);
	});

	test("drops a player when the socket closes", () => {
		const roster = createRoster();

		roster.read(`Got connection SteamID ${ALICE}`);
		roster.read("Got character ZDOID from Meslzy : 123:1");
		roster.read(`Closing socket ${ALICE}`);

		expect(roster.all()).toHaveLength(0);
	});

	test("forgets a connection that closed before the character ever spawned", () => {
		const roster = createRoster();

		roster.read(`Got connection SteamID ${ALICE}`);
		roster.read(`Closing socket ${ALICE}`);
		roster.read(`Got connection SteamID ${BOB}`);
		roster.read("Got character ZDOID from Rakan : 456:1");

		expect(
			roster.named().map((player) => [
				player.id,
				player.player,
			]),
		).toEqual([
			[
				BOB,
				"Rakan",
			],
		]);
	});

	test("ignores a second connection from a player who is already on", () => {
		const roster = createRoster();

		roster.read(`Got connection SteamID ${ALICE}`);
		roster.read(`Got connection SteamID ${ALICE}`);

		expect(roster.all()).toHaveLength(1);
	});

	test("keeps the newest crossplay session it saw", () => {
		const roster = createRoster();

		roster.read('Session "Serverk" with join code 111111 and IP 1.2.3.4:2456 is active with 0 player(s)');
		roster.read('Session "Serverk" with join code 222222 and IP 1.2.3.4:2456 is active with 1 player(s)');

		expect(roster.session()?.joinCode).toBe("222222");
	});

	test("clears everything when the server restarts", () => {
		const roster = createRoster();

		roster.read(`Got connection SteamID ${ALICE}`);
		roster.read('Session "Serverk" with join code 111111 and IP 1.2.3.4:2456 is active with 0 player(s)');
		roster.clear();

		expect(roster.all()).toEqual([]);
		expect(roster.session()).toBeNull();
	});
});

describe("turning a roster row into a presence payload", () => {
	test("sends the name, the steam id and the avatar the web api gave us", () => {
		expect(
			presenceOf({
				id: ALICE,
				player: "Meslzy",
				avatarHash: "a".repeat(40),
			}),
		).toEqual({
			player: "Meslzy",
			steamId: ALICE,
			avatarHash: "a".repeat(40),
		});
	});

	test("falls back to the steam id while the name has not arrived", () => {
		expect(
			presenceOf({
				id: ALICE,
				player: null,
				avatarHash: null,
			}),
		).toEqual({
			player: ALICE,
			steamId: ALICE,
		});
	});

	test("reads the avatar hash out of a steam avatar url", () => {
		expect(avatarHashOf(`https://avatars.steamstatic.com/${"b".repeat(40)}_full.jpg`)).toBe("b".repeat(40));
		expect(avatarHashOf("https://avatars.steamstatic.com/broken.png")).toBeNull();
	});
});
