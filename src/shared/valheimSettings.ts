import { type Bridge, BridgeUserError } from "@serverkgg/bridge";
import { SETTINGS_FILE } from "./valheimApp";

export const NAME_FIELD = "name";

export const PASSWORD_FIELD = "password";

export const PUBLIC_FIELD = "public";

export const CROSSPLAY_FIELD = "crossplay";

export const WORLD_FIELD = "world";

export const SAVE_INTERVAL_FIELD = "saveinterval";

export const BACKUPS_FIELD = "backups";

export const BACKUP_SHORT_FIELD = "backupshort";

export const BACKUP_LONG_FIELD = "backuplong";

export const PRESET_FIELD = "preset";

export const COMBAT_FIELD = "combat";

export const DEATH_PENALTY_FIELD = "deathPenalty";

export const RESOURCES_FIELD = "resources";

export const RAIDS_FIELD = "raids";

export const PORTALS_FIELD = "portals";

export const NO_BUILD_COST_FIELD = "nobuildcost";

export const PLAYER_EVENTS_FIELD = "playerevents";

export const PASSIVE_MOBS_FIELD = "passivemobs";

export const NO_MAP_FIELD = "nomap";

export const BEPINEX_FIELD = "bepinex";

export const NAME_LENGTH = 64;

export const WORLD_LENGTH = 40;

export const PASSWORD_LENGTH = 64;

export const PASSWORD_MIN_LENGTH = 5;

export const PASSWORD_PATTERN = "^\\S{5,64}$";

export const WORLD_PATTERN = "^[A-Za-z0-9][A-Za-z0-9 _-]{0,39}$";

export const NAME_PATTERN = "^\\S(?:.*\\S)?$";

export const SAVE_INTERVAL_MIN = 300;

export const SAVE_INTERVAL_MAX = 3600;

export const BACKUPS_MIN = 1;

export const BACKUPS_MAX = 12;

export const BACKUP_SHORT_MIN = 600;

export const BACKUP_SHORT_MAX = 86_400;

export const BACKUP_LONG_MIN = 3600;

export const BACKUP_LONG_MAX = 172_800;

export const DEFAULT_WORLD = "Serverk";

export const DEFAULT_NAME = "Serverk Valheim";

export const PRESETS = [
	"normal",
	"casual",
	"easy",
	"hard",
	"hardcore",
	"immersive",
	"hammer",
] as const;

export const COMBAT_VALUES = [
	"veryeasy",
	"easy",
	"hard",
	"veryhard",
] as const;

export const DEATH_PENALTY_VALUES = [
	"casual",
	"veryeasy",
	"easy",
	"hard",
	"hardcore",
] as const;

export const RESOURCE_VALUES = [
	"muchless",
	"less",
	"more",
	"muchmore",
	"most",
] as const;

export const RAID_VALUES = [
	"none",
	"muchless",
	"less",
	"more",
	"muchmore",
] as const;

export const PORTAL_VALUES = [
	"casual",
	"hard",
	"veryhard",
] as const;

export const MODIFIER_KEYS: Record<string, readonly string[]> = {
	[COMBAT_FIELD]: COMBAT_VALUES,
	[DEATH_PENALTY_FIELD]: DEATH_PENALTY_VALUES,
	[RESOURCES_FIELD]: RESOURCE_VALUES,
	[RAIDS_FIELD]: RAID_VALUES,
	[PORTALS_FIELD]: PORTAL_VALUES,
};

export const SET_KEYS: Record<string, string> = {
	[NO_BUILD_COST_FIELD]: "nobuildcost",
	[PLAYER_EVENTS_FIELD]: "playerevents",
	[PASSIVE_MOBS_FIELD]: "passivemobs",
	[NO_MAP_FIELD]: "nomap",
};

export interface ValheimSettings {
	name: string;
	password: string;
	public: boolean;
	crossplay: boolean;
	world: string;
	saveInterval: number;
	backups: number;
	backupShort: number;
	backupLong: number;
	preset: string;
	modifiers: Record<string, string>;
	setKeys: string[];
	bepinex: boolean;
}

export const SETTING_DEFAULTS: Bridge.Values = {
	[NAME_FIELD]: DEFAULT_NAME,
	[PASSWORD_FIELD]: "",
	[PUBLIC_FIELD]: true,
	[CROSSPLAY_FIELD]: false,
	[WORLD_FIELD]: DEFAULT_WORLD,
	[SAVE_INTERVAL_FIELD]: 1800,
	[BACKUPS_FIELD]: 4,
	[BACKUP_SHORT_FIELD]: 7200,
	[BACKUP_LONG_FIELD]: 43_200,
	[PRESET_FIELD]: "",
	[COMBAT_FIELD]: "",
	[DEATH_PENALTY_FIELD]: "",
	[RESOURCES_FIELD]: "",
	[RAIDS_FIELD]: "",
	[PORTALS_FIELD]: "",
	[NO_BUILD_COST_FIELD]: false,
	[PLAYER_EVENTS_FIELD]: false,
	[PASSIVE_MOBS_FIELD]: false,
	[NO_MAP_FIELD]: false,
	[BEPINEX_FIELD]: false,
};

export const SETTING_FIELDS = Object.keys(SETTING_DEFAULTS);

export const clamp = (value: number, min: number, max: number) => {
	return Math.min(Math.max(Math.round(value), min), max);
};

export const numberOf = (value: Bridge.Value, fallback: number, min: number, max: number) => {
	if (value === null || typeof value === "boolean" || String(value).trim().length === 0) {
		return fallback;
	}

	const parsed = Number(value);

	return Number.isFinite(parsed) ? clamp(parsed, min, max) : fallback;
};

export const textOf = (value: Bridge.Value, fallback: string, length: number) => {
	if (value === null || typeof value === "boolean") {
		return fallback;
	}

	const text = String(value).trim();

	return text.length === 0 ? fallback : text.slice(0, length);
};

export const booleanOf = (value: Bridge.Value, fallback: boolean) => {
	if (typeof value === "boolean") {
		return value;
	}

	if (value === "true" || value === "false") {
		return value === "true";
	}

	return fallback;
};

export const choiceOf = (value: Bridge.Value, allowed: readonly string[]) => {
	if (value === null || typeof value === "boolean") {
		return "";
	}

	const text = String(value).trim().toLowerCase();

	return allowed.includes(text) ? text : "";
};

export const generatePassword = () => {
	const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	const bytes = new Uint8Array(10);

	crypto.getRandomValues(bytes);

	return Array.from(bytes, (byte) => alphabet[byte % alphabet.length] ?? "x").join("");
};

export const passwordInName = (name: string, password: string) => {
	if (password.length === 0) {
		return false;
	}

	return name.toLowerCase().includes(password.toLowerCase());
};

export const settingsOf = (values: Bridge.Values): ValheimSettings => {
	const modifiers: Record<string, string> = {};

	for (const [field, allowed] of Object.entries(MODIFIER_KEYS)) {
		const choice = choiceOf(values[field] ?? null, allowed);

		if (choice.length > 0) {
			modifiers[field] = choice;
		}
	}

	const setKeys = Object.entries(SET_KEYS)
		.filter(([field]) => booleanOf(values[field] ?? null, false))
		.map(([, key]) => key);

	return {
		name: textOf(values[NAME_FIELD] ?? null, DEFAULT_NAME, NAME_LENGTH),
		password: textOf(values[PASSWORD_FIELD] ?? null, "", PASSWORD_LENGTH),
		public: booleanOf(values[PUBLIC_FIELD] ?? null, true),
		crossplay: booleanOf(values[CROSSPLAY_FIELD] ?? null, false),
		world: textOf(values[WORLD_FIELD] ?? null, DEFAULT_WORLD, WORLD_LENGTH),
		saveInterval: numberOf(values[SAVE_INTERVAL_FIELD] ?? null, 1800, SAVE_INTERVAL_MIN, SAVE_INTERVAL_MAX),
		backups: numberOf(values[BACKUPS_FIELD] ?? null, 4, BACKUPS_MIN, BACKUPS_MAX),
		backupShort: numberOf(values[BACKUP_SHORT_FIELD] ?? null, 7200, BACKUP_SHORT_MIN, BACKUP_SHORT_MAX),
		backupLong: numberOf(values[BACKUP_LONG_FIELD] ?? null, 43_200, BACKUP_LONG_MIN, BACKUP_LONG_MAX),
		preset: choiceOf(values[PRESET_FIELD] ?? null, PRESETS),
		modifiers,
		setKeys,
		bepinex: booleanOf(values[BEPINEX_FIELD] ?? null, false),
	};
};

export const fieldValues = (stored: Bridge.Values): Bridge.Values => {
	const values: Bridge.Values = {};

	for (const field of SETTING_FIELDS) {
		values[field] = stored[field] ?? SETTING_DEFAULTS[field] ?? null;
	}

	return values;
};

export const readSettings = async (context: Bridge.Context): Promise<Bridge.Values> => {
	if (!(await context.files.exists(SETTINGS_FILE))) {
		return {};
	}

	return await context.codec.json.read(SETTINGS_FILE);
};

export const mergeSettings = async (context: Bridge.Context, values: Bridge.Values) => {
	await context.codec.json.merge(SETTINGS_FILE, values);
};

export const WORLD_NAME_MESSAGE: Bridge.Text = {
	ar: "اسم العالم يبدأ بحرف إنجليزي أو رقم، ويقبل الحروف والأرقام والمسافة والشرطة فقط.",
	en: "A world name starts with a latin letter or digit and takes letters, digits, spaces, dashes and underscores only.",
};

export const isValidWorldName = (name: string) => {
	return new RegExp(WORLD_PATTERN).test(name);
};

export const guardSettings = (values: Bridge.Values) => {
	const settings = settingsOf(values);

	if (settings.password.length < PASSWORD_MIN_LENGTH) {
		throw new BridgeUserError({
			ar: `كلمة المرور لازم ${PASSWORD_MIN_LENGTH} حروف على الأقل، فالهايم يرفض يشتغل بأقل من كذا.`,
			en: `The password needs at least ${PASSWORD_MIN_LENGTH} characters — Valheim refuses to start with a shorter one.`,
		});
	}

	if (/\s/.test(settings.password)) {
		throw new BridgeUserError({
			ar: "كلمة المرور ما تقبل مسافات.",
			en: "The password cannot contain spaces.",
		});
	}

	if (passwordInName(settings.name, settings.password)) {
		throw new BridgeUserError({
			ar: "كلمة المرور ما تنفع تكون داخل اسم السيرفر — فالهايم يرفض يشتغل كذا. غيّر وحدة منهم.",
			en: "The password cannot appear inside the server name — Valheim refuses to start. Change one of them.",
		});
	}

	if (!isValidWorldName(settings.world)) {
		throw new BridgeUserError(WORLD_NAME_MESSAGE);
	}

	return settings;
};
