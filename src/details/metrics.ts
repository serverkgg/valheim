import { type Bridge, BridgeDetailFormat, BridgeDetailTone, BridgeKind } from "@serverkgg/bridge";
import { readStamp } from "@serverkgg/bridge/install";
import type { ValheimStamp } from "../install";
import { packInstalled, readSidecar } from "../mods";
import {
	BEPINEX_FIELD,
	booleanOf,
	CROSSPLAY_FIELD,
	formatByteSize,
	MAX_PLAYERS,
	readSettings,
	roster,
	metrics as sampler,
	settingsOf,
	watchMetrics,
	watchRoster,
	worldSizeOf,
} from "../shared";

const DETAIL_ID = "metrics";

const REFRESH_SECONDS = 15;

const MISSING = "—";

const MINUTE_SECONDS = 60;

const HOUR_SECONDS = 3600;

const arabicCount = (count: number, one: string, two: string, few: string, many: string) => {
	if (count === 1) {
		return one;
	}

	if (count === 2) {
		return two;
	}

	return `${count} ${count <= 10 ? few : many}`;
};

const arabicHours = (hours: number) => {
	return arabicCount(hours, "ساعة", "ساعتين", "ساعات", "ساعة");
};

const arabicMinutes = (minutes: number) => {
	return arabicCount(minutes, "دقيقة", "دقيقتين", "دقايق", "دقيقة");
};

export const formatUptime = (seconds: number): Bridge.Text => {
	const total = Math.max(0, Math.floor(seconds));
	const hours = Math.floor(total / HOUR_SECONDS);
	const minutes = Math.floor((total % HOUR_SECONDS) / MINUTE_SECONDS);

	if (hours === 0 && minutes === 0) {
		return {
			ar: "أقل من دقيقة",
			en: "Less than a minute",
		};
	}

	if (hours === 0) {
		return {
			ar: arabicMinutes(minutes),
			en: `${minutes}m`,
		};
	}

	if (minutes === 0) {
		return {
			ar: arabicHours(hours),
			en: `${hours}h`,
		};
	}

	return {
		ar: `${arabicHours(hours)} و${arabicMinutes(minutes)}`,
		en: `${hours}h ${minutes}m`,
	};
};

export const formatVersion = (version: string | null, network: string | null) => {
	if (version === null) {
		return MISSING;
	}

	return network === null ? version : `${version} (net ${network})`;
};

export const crossplayBadge = (crossplay: boolean): Bridge.DetailBadge => {
	return crossplay
		? {
				label: {
					ar: "لعب مشترك مفتوح",
					en: "Crossplay on",
				},
				tone: BridgeDetailTone.Success,
			}
		: {
				label: {
					ar: "PC بس",
					en: "PC only",
				},
				tone: BridgeDetailTone.Neutral,
			};
};

export const bepinexBadge = (bepinex: boolean): Bridge.DetailBadge => {
	return bepinex
		? {
				label: {
					ar: "BepInEx شغّال",
					en: "BepInEx on",
				},
				tone: BridgeDetailTone.Success,
			}
		: {
				label: {
					ar: "بدون مودات",
					en: "No mods",
				},
				tone: BridgeDetailTone.Neutral,
			};
};

export const sessionBadge = (crossplay: boolean, live: boolean): Bridge.DetailBadge | null => {
	if (!crossplay) {
		return null;
	}

	return live
		? {
				label: {
					ar: "الجلسة شغّالة",
					en: "Session live",
				},
				tone: BridgeDetailTone.Success,
			}
		: {
				label: {
					ar: "ننتظر كود الدخول",
					en: "Waiting for the code",
				},
				tone: BridgeDetailTone.Warning,
			};
};

export const metrics: Bridge.Detail = {
	kind: BridgeKind.Detail,
	refreshSeconds: REFRESH_SECONDS,

	async read(context) {
		watchRoster(context);
		watchMetrics(context);

		const stored = await readSettings(context);
		const settings = settingsOf(stored);
		const crossplay = booleanOf(stored[CROSSPLAY_FIELD] ?? null, false);
		const bepinex = booleanOf(stored[BEPINEX_FIELD] ?? null, false) && (await packInstalled(context));
		const stamp = await readStamp<ValheimStamp>(context);
		const snapshot = sampler.snapshot();
		const session = roster.session();
		const mods = Object.keys(await readSidecar(context)).length;
		const size = await worldSizeOf(context, settings.world);
		const players = snapshot.players ?? roster.all().length;
		const live = sessionBadge(crossplay, session !== null);

		return {
			actions: [],
			badges: [
				crossplayBadge(crossplay),
				bepinexBadge(bepinex),
				...(live === null
					? []
					: [
							live,
						]),
			],
			description: null,
			id: DETAIL_ID,
			image: null,
			links: [],
			stale: !context.server.running,
			stats: [
				{
					format: BridgeDetailFormat.Text,
					key: "version",
					label: {
						ar: "نسخة فالهايم",
						en: "Valheim version",
					},
					value: formatVersion(snapshot.version, snapshot.network),
				},
				{
					format: BridgeDetailFormat.Text,
					key: "build",
					label: {
						ar: "بِلد Steam",
						en: "Steam build",
					},
					value: stamp?.buildId ?? MISSING,
				},
				{
					format: BridgeDetailFormat.Text,
					key: "players",
					label: {
						ar: "اللاعبين",
						en: "Players",
					},
					value: `${players}/${MAX_PLAYERS}`,
				},
				{
					format: BridgeDetailFormat.Text,
					key: "world",
					label: {
						ar: "العالم الشغّال",
						en: "Active world",
					},
					value: settings.world,
				},
				{
					format: BridgeDetailFormat.Text,
					key: "worldSize",
					label: {
						ar: "حجم العالم",
						en: "World size",
					},
					value: size === 0 ? MISSING : formatByteSize(size),
				},
				{
					format: BridgeDetailFormat.Number,
					key: "mods",
					label: {
						ar: "المودات المركّبة",
						en: "Installed mods",
					},
					value: mods,
				},
				{
					format: BridgeDetailFormat.Text,
					key: "uptime",
					label: {
						ar: "شغّال من",
						en: "Up for",
					},
					value: snapshot.uptimeSeconds === null ? MISSING : formatUptime(snapshot.uptimeSeconds),
				},
				{
					format: snapshot.lastSaveAt === null ? BridgeDetailFormat.Text : BridgeDetailFormat.Date,
					key: "lastSave",
					label: {
						ar: "آخر حفظ",
						en: "Last save",
					},
					value: snapshot.lastSaveAt === null ? MISSING : new Date(snapshot.lastSaveAt).toISOString(),
				},
				...(crossplay
					? [
							{
								format: BridgeDetailFormat.Text,
								key: "joinCode",
								label: {
									ar: "كود الدخول",
									en: "Join code",
								},
								value: session?.joinCode ?? MISSING,
							},
						]
					: []),
			],
			subtitle: {
				ar: "الأرقام هذي طالعة من سيرفرك نفسه، مو تقدير.",
				en: "These numbers come straight from your own server, not an estimate.",
			},
			title: {
				ar: "حالة السيرفر",
				en: "Server health",
			},
		};
	},
};
