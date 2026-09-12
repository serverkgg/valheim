import { type Bridge, BridgeUserError } from "@serverkgg/bridge";
import { readStamp } from "@serverkgg/bridge/install";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { addPlatformId, BANNED_OPTIONS, removePlatformId } from "../collections";
import type { ValheimStamp } from "../install";
import { packInstalled, readPackStamp, readSidecar } from "../mods";
import {
	BEPINEX_FIELD,
	booleanOf,
	CROSSPLAY_FIELD,
	discoverWorlds,
	displayNameOf,
	formatByteSize,
	MAX_PLAYERS,
	metrics,
	missingHalf,
	parsePlatformId,
	platformOf,
	presenceOf,
	readSettings,
	requirePlatformId,
	roster,
	settingsOf,
	type ValheimPlayer,
} from "../shared";

const SPACING = /\s+/;

const MISSING = "unknown";

const ROSTER_HEADER = "player,account,platform,platformId";

const WORLDS_HEADER = "world,size,state";

const MODS_HEADER = "mod,version";

export interface ValheimConsoleLine {
	name: string;
	rest: string;
	args: string[];
}

export const parseConsoleLine = (input: string): ValheimConsoleLine => {
	const trimmed = input.trim();
	const boundary = trimmed.search(SPACING);
	const rest = boundary < 0 ? "" : trimmed.slice(boundary).trim();

	return {
		args: rest.length === 0 ? [] : rest.split(SPACING),
		name: (boundary < 0 ? trimmed : trimmed.slice(0, boundary)).toLowerCase(),
		rest,
	};
};

export const rosterLines = (players: ValheimPlayer[]): string[] => {
	if (players.length === 0) {
		return [
			"no players online",
		];
	}

	return [
		ROSTER_HEADER,
		...players.map((player) => {
			return [
				displayNameOf(player),
				player.account ?? "",
				player.platform,
				player.id,
			].join(",");
		}),
	];
};

export const findPlayer = (players: ValheimPlayer[], needle: string): ValheimPlayer | null => {
	const identity = parsePlatformId(needle);

	if (identity !== null) {
		return players.find((player) => player.id === identity.id) ?? null;
	}

	const wanted = needle.toLowerCase();
	const matches = players.filter((player) => {
		return player.character?.toLowerCase() === wanted || player.account?.toLowerCase() === wanted;
	});

	if (matches.length > 1) {
		throw new BridgeUserError({
			ar: "فيه أكثر من لاعب بهذا الاسم. انسخ معرّف اللاعب من قائمة اللاعبين واستخدمه بدل الاسم.",
			en: "More than one player has that name. Copy the player's platform ID from the players list and use it instead.",
		});
	}

	return matches.at(0) ?? null;
};

const needleOf = (line: ValheimConsoleLine) => {
	if (line.rest.length === 0) {
		throw new BridgeUserError({
			ar: "اكتب اسم اللاعب أو معرّفه أول.",
			en: "Write the player name or their platform id first.",
		});
	}

	return line.rest;
};

type ValheimConsoleCommand = (context: Bridge.Context, line: ValheimConsoleLine) => Promise<string[]>;

export const consoleCommands: Record<string, ValheimConsoleCommand> = {
	async status(context) {
		const stored = await readSettings(context);
		const settings = settingsOf(stored);
		const crossplay = booleanOf(stored[CROSSPLAY_FIELD] ?? null, false);
		const bepinex = booleanOf(stored[BEPINEX_FIELD] ?? null, false) && (await packInstalled(context));
		const stamp = await readStamp<ValheimStamp>(context);
		const snapshot = metrics.snapshot();
		const session = roster.session();
		const online = Math.max(roster.all().length, roster.count() ?? 0);

		return [
			`version: ${snapshot.version ?? MISSING}`,
			`network: ${snapshot.network ?? MISSING}`,
			`build: ${stamp?.buildId ?? MISSING}`,
			`world: ${settings.world}`,
			`players: ${online}/${MAX_PLAYERS}`,
			`uptime: ${snapshot.uptimeSeconds === null ? MISSING : `${snapshot.uptimeSeconds}s`}`,
			`last save: ${snapshot.lastSaveAt === null ? MISSING : new Date(snapshot.lastSaveAt).toISOString()}`,
			`crossplay: ${crossplay ? "on" : "off"}`,
			`join code: ${session?.joinCode ?? (crossplay ? "waiting" : "off")}`,
			`bepinex: ${bepinex ? "on" : "off"}`,
		];
	},

	async players() {
		return rosterLines(roster.all());
	},

	async worlds(context) {
		const worlds = await discoverWorlds(context);

		if (worlds.length === 0) {
			return [
				"no worlds yet",
			];
		}

		const active = settingsOf(await readSettings(context)).world;

		return [
			WORLDS_HEADER,
			...worlds.map((world) => {
				const missing = missingHalf(world);

				return [
					`${world.name}${world.name === active ? " *" : ""}`,
					formatByteSize(world.sizeBytes),
					missing === null ? "" : `missing .${missing}`,
				].join(",");
			}),
		];
	},

	async mods(context) {
		const installed = await packInstalled(context);
		const stamp = await readPackStamp(context);
		const sidecar = await readSidecar(context);
		const entries = Object.values(sidecar);

		return [
			`bepinex: ${installed ? (stamp?.version ?? "installed") : "not installed"}`,
			...(entries.length === 0
				? [
						"no mods installed",
					]
				: [
						MODS_HEADER,
						...entries.map((entry) => `${entry.id},${entry.version}`),
					]),
		];
	},

	async joincode(context) {
		const crossplay = booleanOf((await readSettings(context))[CROSSPLAY_FIELD] ?? null, false);

		if (!crossplay) {
			throw new BridgeUserError({
				ar: "كود الدخول يطلع بس لما تفعّل اللعب المشترك من الإعدادات.",
				en: "A join code only exists once you turn crossplay on in the settings.",
			});
		}

		const session = roster.session();

		if (session === null) {
			return [
				"join code: waiting for playfab",
			];
		}

		return [
			`join code: ${session.joinCode}`,
			`session: ${session.session}`,
			`address: ${session.address}`,
		];
	},

	async help() {
		return [
			"status — version, world, players, uptime, last save, crossplay and bepinex",
			"players — everyone the log says is connected",
			"worlds — the worlds on disk, the active one marked with *",
			"mods — bepinex and every installed thunderstore mod",
			"joincode — the crossplay join code",
			"ban <player|id> — add a platform id to the ban list",
			"unban <id> — take a platform id off the ban list",
		];
	},

	async ban(context, line) {
		const needle = needleOf(line);
		const known = findPlayer(roster.all(), needle);
		const id = await addPlatformId(context, BANNED_OPTIONS, known === null ? requirePlatformId(needle) : known.id);

		context.emit(
			BridgeEventName.PlayerBanned,
			presenceOf(
				known ?? {
					account: null,
					avatarHash: null,
					character: null,
					id,
					platform: platformOf(id),
				},
			),
		);

		return [
			`banned: ${id}`,
			"valheim reads the ban list at start, so restart the server to drop them if they are on right now",
		];
	},

	async unban(context, line) {
		const id = requirePlatformId(needleOf(line));

		await removePlatformId(context, BANNED_OPTIONS, id);

		return [
			`unbanned: ${id}`,
			"the server reads the ban list at start, so the change lands on the next restart",
		];
	},

	async save() {
		throw new BridgeUserError({
			ar: "فالهايم ما فيه أمر حفظ. يحفظ لحاله كل فترة تحددها من الإعدادات، وأي نسخة احتياطية تاخذ آخر حفظ. قصّر الفترة إذا تبي حفظ أكثر.",
			en: "Valheim has no save command. It autosaves on the interval you set in the settings, and a backup archives the last autosave. Shorten the interval if you want it saving more often.",
		});
	},
};

export const consoleHandler: NonNullable<Bridge.Terminal["run"]> = async (context, input) => {
	const line = parseConsoleLine(input);

	if (line.name.length === 0) {
		return null;
	}

	const command = Object.hasOwn(consoleCommands, line.name) ? consoleCommands[line.name] : undefined;

	if (!command) {
		throw new BridgeUserError({
			ar: "سيرفر فالهايم ما عنده كونسول ولا RCON، فما نقدر نمرر الأمر له. أوامر الأدمن تنكتب داخل اللعبة بزر F5، والأوامر اللي نرد عليها هنا تلقاها في قائمة الأوامر.",
			en: "A Valheim dedicated server has no console and no RCON, so we cannot pass that through. Admin commands are typed in game on F5, and the command list holds the ones we answer here.",
		});
	}

	return {
		groups: {},
		line: (await command(context, line)).join("\n"),
		sent: input,
	};
};
