import { ADMIN_LIST, BANNED_LIST, PERMITTED_LIST } from "../shared";
import { type SteamIdCollectionOptions, steamIdCollection } from "./steamIdCollection";

export const ADMIN_OPTIONS: SteamIdCollectionOptions = {
	path: ADMIN_LIST,
	header: "List admin players ID\nOne Steam ID per line",
	duplicate: {
		ar: "هذا اللاعب أدمن أصلًا.",
		en: "That player is already an admin.",
	},
	missing: {
		ar: "هذا الرقم مو في قائمة الأدمن.",
		en: "That ID is not on the admin list.",
	},
};

export const BANNED_OPTIONS: SteamIdCollectionOptions = {
	path: BANNED_LIST,
	header: "List banned players ID\nOne Steam ID per line",
	duplicate: {
		ar: "هذا اللاعب محظور أصلًا.",
		en: "That player is already banned.",
	},
	missing: {
		ar: "هذا الرقم مو في قائمة المحظورين.",
		en: "That ID is not on the ban list.",
	},
};

export const PERMITTED_OPTIONS: SteamIdCollectionOptions = {
	path: PERMITTED_LIST,
	header: "List permitted players ID\nOne Steam ID per line\nAn empty list lets everybody in",
	duplicate: {
		ar: "هذا اللاعب في القائمة البيضاء أصلًا.",
		en: "That player is already on the allow list.",
	},
	missing: {
		ar: "هذا الرقم مو في القائمة البيضاء.",
		en: "That ID is not on the allow list.",
	},
};

export const admins = steamIdCollection(ADMIN_OPTIONS);

export const bans = steamIdCollection(BANNED_OPTIONS);

export const permitted = steamIdCollection(PERMITTED_OPTIONS);
