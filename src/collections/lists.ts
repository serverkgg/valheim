import { ADMIN_LIST, BANNED_LIST, LIST_HEADERS, PERMITTED_LIST } from "../shared";
import { type PlatformIdCollectionOptions, platformIdCollection } from "./platformIdCollection";

export const ADMIN_OPTIONS: PlatformIdCollectionOptions = {
	path: ADMIN_LIST,
	header: LIST_HEADERS[ADMIN_LIST] ?? "",
	duplicate: {
		ar: "هذا اللاعب أدمن أصلًا.",
		en: "That player is already an admin.",
	},
	missing: {
		ar: "هذا المعرّف مو في قائمة الأدمن.",
		en: "That ID is not on the admin list.",
	},
};

export const BANNED_OPTIONS: PlatformIdCollectionOptions = {
	path: BANNED_LIST,
	header: LIST_HEADERS[BANNED_LIST] ?? "",
	duplicate: {
		ar: "هذا اللاعب محظور أصلًا.",
		en: "That player is already banned.",
	},
	missing: {
		ar: "هذا المعرّف مو في قائمة المحظورين.",
		en: "That ID is not on the ban list.",
	},
};

export const PERMITTED_OPTIONS: PlatformIdCollectionOptions = {
	path: PERMITTED_LIST,
	header: LIST_HEADERS[PERMITTED_LIST] ?? "",
	duplicate: {
		ar: "هذا اللاعب في القائمة البيضاء أصلًا.",
		en: "That player is already on the allow list.",
	},
	missing: {
		ar: "هذا المعرّف مو في القائمة البيضاء.",
		en: "That ID is not on the allow list.",
	},
};

export const admins = platformIdCollection(ADMIN_OPTIONS);

export const bans = platformIdCollection(BANNED_OPTIONS);

export const permitted = platformIdCollection(PERMITTED_OPTIONS);
