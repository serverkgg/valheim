const PEER_ID = `"?(?<id>[A-Za-z0-9][A-Za-z0-9_/-]{3,63})"?`;

export const CONNECTION_LINE = new RegExp(`Got connection (?:SteamID )?${PEER_ID}`);

export const HANDSHAKE_LINE = new RegExp(`Got handshake from client ${PEER_ID}`);

export const CLOSING_LINE = new RegExp(`Closing socket ${PEER_ID}`);

export const WRONG_PASSWORD_LINE = new RegExp(`Peer ${PEER_ID} has wrong password`);

export const CHARACTER_LINE = /Got character ZDOID from (?<player>.+?) : (?<zdoId>-?\d+:-?\d+)/;

export const JOIN_CODE_LINE =
	/Session "(?<session>.*)" with join code (?<joinCode>\d{4,12}) and IP (?<address>[^\s]+) is active/;

export const CROSSPLAY_JOIN_LINE =
	/Player joined server "(?<session>[^"]*)" that has join code (?<joinCode>\d{4,12}), now (?<players>\d+) player/;

export const CROSSPLAY_LEAVE_LINE = /Player connection lost server "(?<session>[^"]*)"/;

export const VERSION_LINE = /Valheim version:\s*(?<version>[^\s,]+)(?:[^\n]*?network version:?\s*(?<network>\d+))?/i;

export const WORLD_SAVED_LINE = /World saved\s*\(\s*(?<durationMs>[\d.,]+)\s*ms\s*\)/;

export const DEAD_ZDO_ID = "0:0";

export interface PeerLine {
	id: string;
}

export interface CharacterLine {
	player: string;
	zdoId: string;
}

export interface JoinCodeLine {
	session: string;
	joinCode: string;
	address: string;
}

export interface CrossplayJoinLine {
	session: string;
	joinCode: string;
	players: number;
}

export interface VersionLine {
	version: string;
	network: string | null;
}

const peerOf = (line: string, pattern: RegExp): PeerLine | null => {
	const id = line.match(pattern)?.groups?.id;

	return id === undefined
		? null
		: {
				id,
			};
};

export const parseConnection = (line: string): PeerLine | null => {
	return peerOf(line, CONNECTION_LINE);
};

export const parseHandshake = (line: string): PeerLine | null => {
	return peerOf(line, HANDSHAKE_LINE);
};

export const parseClosing = (line: string): PeerLine | null => {
	return peerOf(line, CLOSING_LINE);
};

export const parseWrongPassword = (line: string): PeerLine | null => {
	return peerOf(line, WRONG_PASSWORD_LINE);
};

export const parseCharacter = (line: string): CharacterLine | null => {
	const groups = line.match(CHARACTER_LINE)?.groups;
	const player = groups?.player?.trim();
	const zdoId = groups?.zdoId;

	if (player === undefined || player.length === 0 || zdoId === undefined) {
		return null;
	}

	return {
		player,
		zdoId,
	};
};

export const parseJoinCode = (line: string): JoinCodeLine | null => {
	const groups = line.match(JOIN_CODE_LINE)?.groups;
	const joinCode = groups?.joinCode;
	const address = groups?.address;

	if (joinCode === undefined || address === undefined) {
		return null;
	}

	return {
		session: groups?.session ?? "",
		joinCode,
		address,
	};
};

export const parseCrossplayJoin = (line: string): CrossplayJoinLine | null => {
	const groups = line.match(CROSSPLAY_JOIN_LINE)?.groups;
	const joinCode = groups?.joinCode;
	const players = groups?.players;

	if (joinCode === undefined || players === undefined) {
		return null;
	}

	return {
		session: groups?.session ?? "",
		joinCode,
		players: Number(players),
	};
};

export const parseCrossplayLeave = (line: string): boolean => {
	return CROSSPLAY_LEAVE_LINE.test(line);
};

export const parseVersion = (line: string): VersionLine | null => {
	const groups = line.match(VERSION_LINE)?.groups;
	const version = groups?.version;

	if (version === undefined) {
		return null;
	}

	return {
		version,
		network: groups?.network ?? null,
	};
};

export const isSpawn = (character: CharacterLine) => {
	return character.zdoId !== DEAD_ZDO_ID;
};
