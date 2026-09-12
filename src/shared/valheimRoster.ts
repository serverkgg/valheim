import type { Bridge } from "@serverkgg/bridge";
import { createSteamAvatars, playerSummaries, steamWebApiReady } from "@serverkgg/bridge/steam";
import {
	CHARACTER_LINE,
	CLOSING_LINE,
	CONNECTION_LINE,
	CROSSPLAY_JOIN_LINE,
	CROSSPLAY_LEAVE_LINE,
	HANDSHAKE_LINE,
	isSpawn,
	JOIN_CODE_LINE,
	parseCharacter,
	parseClosing,
	parseConnection,
	parseCrossplayJoin,
	parseCrossplayLeave,
	parseHandshake,
	parseJoinCode,
	parseWrongPassword,
	WRONG_PASSWORD_LINE,
} from "./valheimLog";
import { platformOf, steam64Of, type ValheimPlatform } from "./valheimPlatformId";

export interface ValheimPlayer {
	id: string;
	platform: ValheimPlatform;
	account: string | null;
	character: string | null;
	avatarHash: string | null;
}

export interface ValheimSession {
	joinCode: string;
	address: string;
	session: string;
}

export interface ValheimRoster {
	connect(id: string): void;
	handshake(id: string): void;
	name(character: string): void;
	disconnect(id: string): void;
	clear(): void;
	all(): ValheimPlayer[];
	describe(hashes: Map<string, string>): void;
	identify(accounts: Map<string, string>): void;
	session(): ValheimSession | null;
	observe(session: ValheimSession): void;
	count(): number | null;
	observeCount(players: number | null): void;
	read(line: string): void;
}

export const displayNameOf = (player: ValheimPlayer) => {
	return player.character ?? player.account ?? player.id;
};

export const createRoster = (): ValheimRoster => {
	const players = new Map<string, ValheimPlayer>();
	const awaiting: string[] = [];

	let latest: ValheimSession | null = null;
	let crossplayCount: number | null = null;

	const remember = (id: string) => {
		const known = players.get(id);

		if (known) {
			return known;
		}

		const entry: ValheimPlayer = {
			account: null,
			avatarHash: null,
			character: null,
			id,
			platform: platformOf(id),
		};

		players.set(id, entry);

		return entry;
	};

	const roster: ValheimRoster = {
		connect(id) {
			remember(id);
		},

		handshake(id) {
			remember(id);

			if (!awaiting.includes(id)) {
				awaiting.push(id);
			}
		},

		name(character) {
			const id = awaiting.shift();
			const entry = id === undefined ? undefined : players.get(id);

			if (!entry) {
				return;
			}

			entry.character = character;
		},

		disconnect(id) {
			players.delete(id);

			const index = awaiting.indexOf(id);

			if (index >= 0) {
				awaiting.splice(index, 1);
			}
		},

		clear() {
			players.clear();
			awaiting.length = 0;
			latest = null;
			crossplayCount = null;
		},

		all() {
			return [
				...players.values(),
			];
		},

		describe(hashes) {
			for (const entry of players.values()) {
				const hash = hashes.get(entry.id);

				if (hash !== undefined) {
					entry.avatarHash = hash;
				}
			}
		},

		identify(accounts) {
			for (const entry of players.values()) {
				const account = accounts.get(entry.id);

				if (account !== undefined) {
					entry.account = account;
				}
			}
		},

		session() {
			return latest;
		},

		observe(session) {
			latest = session;
		},

		count() {
			return crossplayCount;
		},

		observeCount(count) {
			crossplayCount = count;
		},

		read(line) {
			const handshake = parseHandshake(line);

			if (handshake) {
				roster.handshake(handshake.id);

				return;
			}

			const connection = parseConnection(line);

			if (connection) {
				roster.connect(connection.id);

				return;
			}

			const rejected = parseWrongPassword(line);

			if (rejected) {
				roster.disconnect(rejected.id);

				return;
			}

			const closing = parseClosing(line);

			if (closing) {
				roster.disconnect(closing.id);

				return;
			}

			const character = parseCharacter(line);

			if (character && isSpawn(character)) {
				roster.name(character.player);

				return;
			}

			const joined = parseCrossplayJoin(line);

			if (joined) {
				roster.observeCount(joined.players);

				return;
			}

			if (parseCrossplayLeave(line)) {
				roster.observeCount(crossplayCount === null ? null : Math.max(0, crossplayCount - 1));

				return;
			}

			const session = parseJoinCode(line);

			if (session) {
				roster.observe(session);
			}
		},
	};

	return roster;
};

export const roster = createRoster();

export const avatars = createSteamAvatars({
	steamIdOf: steam64Of,
});

export const presenceOf = (player: ValheimPlayer): Bridge.Values => {
	return {
		player: displayNameOf(player),
		platformId: player.id,
		platform: player.platform,
		...(player.account === null
			? {}
			: {
					account: player.account,
				}),
		...(player.avatarHash === null
			? {}
			: {
					avatarHash: player.avatarHash,
				}),
	};
};

const identifyRoster = async (context: Bridge.Context) => {
	const missing = roster.all().flatMap((entry) => {
		const steam64 = entry.account === null ? steam64Of(entry.id) : null;

		return steam64 === null
			? []
			: [
					[
						entry.id,
						steam64,
					] as const,
				];
	});

	if (missing.length === 0 || !steamWebApiReady(context)) {
		return;
	}

	try {
		const summaries = await playerSummaries(
			context,
			missing.map(([, steam64]) => steam64),
		);
		const personas = new Map(
			summaries.map((summary) => [
				summary.steamid,
				summary.personaname,
			]),
		);

		roster.identify(
			new Map(
				missing.flatMap(([id, steam64]) => {
					const persona = personas.get(steam64);

					return persona === undefined
						? []
						: [
								[
									id,
									persona,
								] as const,
							];
				}),
			),
		);
	} catch (error) {
		context.log.warn("the steam web api did not answer for the roster", {
			error: error instanceof Error ? error.message : String(error),
		});
	}
};

export const enrichRoster = async (context: Bridge.Context) => {
	const ids = roster.all().map((entry) => entry.id);

	if (ids.length === 0) {
		return;
	}

	roster.describe(await avatars.resolve(context, ids));

	await identifyRoster(context);
};

let following = false;

export const watchRoster = (context: Bridge.Context) => {
	if (following) {
		return;
	}

	following = true;

	context.logs.follow(HANDSHAKE_LINE, (match) => {
		const id = match.groups?.id;

		if (id !== undefined) {
			roster.handshake(id);
		}
	});

	context.logs.follow(CONNECTION_LINE, (match) => {
		const id = match.groups?.id;

		if (id !== undefined) {
			roster.connect(id);
		}
	});

	context.logs.follow(WRONG_PASSWORD_LINE, (match) => {
		const id = match.groups?.id;

		if (id !== undefined) {
			roster.disconnect(id);
		}
	});

	context.logs.follow(CLOSING_LINE, (match) => {
		const id = match.groups?.id;

		if (id !== undefined) {
			roster.disconnect(id);
		}
	});

	context.logs.follow(CHARACTER_LINE, (match) => {
		const character = parseCharacter(match.at(0) ?? "");

		if (character && isSpawn(character)) {
			roster.name(character.player);
		}
	});

	context.logs.follow(CROSSPLAY_JOIN_LINE, (match) => {
		const joined = parseCrossplayJoin(match.at(0) ?? "");

		if (joined) {
			roster.observeCount(joined.players);
		}
	});

	context.logs.follow(CROSSPLAY_LEAVE_LINE, () => {
		const current = roster.count();

		roster.observeCount(current === null ? null : Math.max(0, current - 1));
	});

	context.logs.follow(JOIN_CODE_LINE, (match) => {
		const session = parseJoinCode(match.at(0) ?? "");

		if (session) {
			roster.observe(session);
		}
	});
};
