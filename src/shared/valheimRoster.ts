import type { Bridge } from "@serverkgg/bridge";
import { playerSummaries, steamWebApiReady } from "@serverkgg/bridge/steam";
import {
	CHARACTER_LINE,
	CLOSING_LINE,
	CONNECTION_LINE,
	isSpawn,
	JOIN_CODE_LINE,
	parseCharacter,
	parseClosing,
	parseConnection,
	parseJoinCode,
} from "./valheimLog";

export interface ValheimPlayer {
	id: string;
	player: string | null;
	avatarHash: string | null;
}

export interface ValheimSession {
	joinCode: string;
	address: string;
	session: string;
}

const STEAM_AVATAR = /\/([0-9a-f]{40})(?:_[a-z]+)?\.jpg/;

export const avatarHashOf = (url: string) => {
	return url.match(STEAM_AVATAR)?.at(1) ?? null;
};

export interface ValheimRoster {
	connect(steamId: string): void;
	name(player: string): void;
	disconnect(steamId: string): void;
	clear(): void;
	named(): ValheimPlayer[];
	all(): ValheimPlayer[];
	describe(hashes: Map<string, string>): void;
	session(): ValheimSession | null;
	observe(session: ValheimSession): void;
	read(line: string): void;
}

export const createRoster = (): ValheimRoster => {
	const players = new Map<string, ValheimPlayer>();
	const awaiting: string[] = [];

	let latest: ValheimSession | null = null;

	const roster: ValheimRoster = {
		connect(steamId) {
			if (players.has(steamId)) {
				return;
			}

			players.set(steamId, {
				id: steamId,
				player: null,
				avatarHash: null,
			});

			awaiting.push(steamId);
		},

		name(player) {
			const steamId = awaiting.shift();
			const entry = steamId === undefined ? undefined : players.get(steamId);

			if (!entry) {
				return;
			}

			entry.player = player;
		},

		disconnect(steamId) {
			players.delete(steamId);

			const index = awaiting.indexOf(steamId);

			if (index >= 0) {
				awaiting.splice(index, 1);
			}
		},

		clear() {
			players.clear();
			awaiting.length = 0;
			latest = null;
		},

		named() {
			return [
				...players.values(),
			].filter((entry) => entry.player !== null);
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

		session() {
			return latest;
		},

		observe(session) {
			latest = session;
		},

		read(line) {
			const connection = parseConnection(line);

			if (connection) {
				roster.connect(connection.steamId);

				return;
			}

			const closing = parseClosing(line);

			if (closing) {
				roster.disconnect(closing.steamId);

				return;
			}

			const character = parseCharacter(line);

			if (character && isSpawn(character)) {
				roster.name(character.player);

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

export const presenceOf = (player: ValheimPlayer): Bridge.Values => {
	return {
		player: player.player ?? player.id,
		steamId: player.id,
		...(player.avatarHash === null
			? {}
			: {
					avatarHash: player.avatarHash,
				}),
	};
};

export const enrichRoster = async (context: Bridge.Context) => {
	const missing = roster
		.all()
		.filter((entry) => entry.avatarHash === null)
		.map((entry) => entry.id);

	if (missing.length === 0 || !steamWebApiReady(context)) {
		return;
	}

	try {
		const summaries = await playerSummaries(context, missing);

		roster.describe(
			new Map(
				summaries.flatMap((summary) => {
					const hash = avatarHashOf(summary.avatarfull);

					return hash === null
						? []
						: [
								[
									summary.steamid,
									hash,
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

let following = false;

export const watchRoster = (context: Bridge.Context) => {
	if (following) {
		return;
	}

	following = true;

	context.logs.follow(CONNECTION_LINE, (match) => {
		const steamId = match.groups?.steamId;

		if (steamId !== undefined) {
			roster.connect(steamId);
		}
	});

	context.logs.follow(CLOSING_LINE, (match) => {
		const steamId = match.groups?.steamId;

		if (steamId !== undefined) {
			roster.disconnect(steamId);
		}
	});

	context.logs.follow(CHARACTER_LINE, (match) => {
		const character = parseCharacter(match.at(0) ?? "");

		if (character && isSpawn(character)) {
			roster.name(character.player);
		}
	});

	context.logs.follow(JOIN_CODE_LINE, (match) => {
		const session = parseJoinCode(match.at(0) ?? "");

		if (session) {
			roster.observe(session);
		}
	});
};
