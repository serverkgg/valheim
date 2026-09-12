import { BridgeUserError } from "@serverkgg/bridge";

export enum ValheimPlatform {
	Steam = "Steam",
	Xbox = "Xbox",
	PlayStation = "PlayStation",
	Switch = "Switch",
	PlayFab = "PlayFab",
	Unknown = "Unknown",
}

export const STEAM_PLATFORM_PREFIX = "V_";

export const STEAM64_PATTERN = "^7656\\d{13}$";

export const STEAM64 = new RegExp(STEAM64_PATTERN);

export const PLATFORM_ID_PATTERN = "^(?:7656\\d{13}|[A-Za-z][A-Za-z0-9]{0,15}[_/][A-Za-z0-9_/-]{2,48})$";

export const PLATFORM_ID = new RegExp(PLATFORM_ID_PATTERN);

const PLATFORM_PREFIXES: readonly (readonly [
	string,
	ValheimPlatform,
])[] = [
	[
		STEAM_PLATFORM_PREFIX,
		ValheimPlatform.Steam,
	],
	[
		"steam_",
		ValheimPlatform.Steam,
	],
	[
		"xbox_",
		ValheimPlatform.Xbox,
	],
	[
		"xuid_",
		ValheimPlatform.Xbox,
	],
	[
		"psn_",
		ValheimPlatform.PlayStation,
	],
	[
		"ps_",
		ValheimPlatform.PlayStation,
	],
	[
		"switch_",
		ValheimPlatform.Switch,
	],
	[
		"nintendo_",
		ValheimPlatform.Switch,
	],
	[
		"ns_",
		ValheimPlatform.Switch,
	],
	[
		"playfab/",
		ValheimPlatform.PlayFab,
	],
	[
		"playfab_",
		ValheimPlatform.PlayFab,
	],
];

export interface ValheimPlatformId {
	id: string;
	platform: ValheimPlatform;
	steam64: string | null;
	legacy: boolean;
}

export const isBareSteam64 = (input: string) => {
	return STEAM64.test(input.trim());
};

export const normalizePlatformId = (input: string) => {
	const text = input.trim();

	return isBareSteam64(text) ? `${STEAM_PLATFORM_PREFIX}${text}` : text;
};

export const steam64Of = (id: string): string | null => {
	const text = id.trim();

	if (STEAM64.test(text)) {
		return text;
	}

	if (!text.toLowerCase().startsWith(STEAM_PLATFORM_PREFIX.toLowerCase())) {
		return null;
	}

	const digits = text.slice(STEAM_PLATFORM_PREFIX.length);

	return STEAM64.test(digits) ? digits : null;
};

export const platformOf = (id: string): ValheimPlatform => {
	const text = id.trim().toLowerCase();

	if (STEAM64.test(text)) {
		return ValheimPlatform.Steam;
	}

	for (const [prefix, platform] of PLATFORM_PREFIXES) {
		if (text.startsWith(prefix.toLowerCase()) && text.length > prefix.length) {
			return platform;
		}
	}

	return ValheimPlatform.Unknown;
};

export const parsePlatformId = (input: string): ValheimPlatformId | null => {
	const text = input.trim();

	if (!PLATFORM_ID.test(text)) {
		return null;
	}

	const legacy = isBareSteam64(text);
	const id = legacy ? `${STEAM_PLATFORM_PREFIX}${text}` : text;

	return {
		id,
		platform: platformOf(id),
		steam64: steam64Of(id),
		legacy,
	};
};

export const requirePlatformId = (input: string) => {
	const parsed = parsePlatformId(input);

	if (parsed === null) {
		throw new BridgeUserError({
			ar: `هذا مو معرّف لاعب. فالهايم يبي Platform User ID — للي على Steam يكون ${STEAM_PLATFORM_PREFIX} ومعه رقم Steam64، ولو كتبت رقم Steam لحاله نحطه لك بالبادئة.`,
			en: `That is not a player id. Valheim wants a Platform User ID — on Steam that is ${STEAM_PLATFORM_PREFIX} followed by the Steam64 id, and a bare Steam number gets the prefix added for you.`,
		});
	}

	return parsed.id;
};
