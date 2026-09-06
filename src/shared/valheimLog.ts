export const CONNECTION_LINE = /Got connection SteamID (?<steamId>\d{5,20})/;

export const CHARACTER_LINE = /Got character ZDOID from (?<player>.+?) : (?<zdoId>-?\d+:-?\d+)/;

export const CLOSING_LINE = /Closing socket (?<steamId>\d{5,20})/;

export const JOIN_CODE_LINE =
	/Session "(?<session>.*)" with join code (?<joinCode>\d{4,12}) and IP (?<address>[^\s]+) is active/;

export const WORLD_SAVED_LINE = /World saved\s*\(\s*(?<durationMs>[\d.,]+)\s*ms\s*\)/;

export const DEAD_ZDO_ID = "0:0";

export interface ConnectionLine {
	steamId: string;
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

export const parseConnection = (line: string): ConnectionLine | null => {
	const steamId = line.match(CONNECTION_LINE)?.groups?.steamId;

	return steamId === undefined
		? null
		: {
				steamId,
			};
};

export const parseClosing = (line: string): ConnectionLine | null => {
	const steamId = line.match(CLOSING_LINE)?.groups?.steamId;

	return steamId === undefined
		? null
		: {
				steamId,
			};
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

export const isSpawn = (character: CharacterLine) => {
	return character.zdoId !== DEAD_ZDO_ID;
};
