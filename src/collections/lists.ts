import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { ADMIN_LIST, BANNED_LIST, LIST_HEADERS, PERMITTED_LIST } from "../shared";
import { type PlatformIdCollectionOptions, PlatformIdListName, platformIdCollection } from "./platformIdCollection";

export const ADMIN_OPTIONS: PlatformIdCollectionOptions = {
	path: ADMIN_LIST,
	header: LIST_HEADERS[ADMIN_LIST] ?? "",
	list: PlatformIdListName.Admins,
	duplicate: {
		ar: "هذا اللاعب أدمن أصلًا.",
		en: "That player is already an admin.",
	},
	missing: {
		ar: "هذا المعرّف مو في قائمة الأدمن.",
		en: "That ID is not on the admin list.",
	},
	added: {
		name: BridgeEventName.AccessGranted,
		text: (player) => {
			return {
				ar: `تمت إضافة ${player} لقائمة الأدمن`,
				en: `Added ${player} to the admin list`,
			};
		},
	},
	removed: {
		name: BridgeEventName.AccessRevoked,
		text: (player) => {
			return {
				ar: `تمت إزالة ${player} من قائمة الأدمن`,
				en: `Removed ${player} from the admin list`,
			};
		},
	},
};

export const BANNED_OPTIONS: PlatformIdCollectionOptions = {
	path: BANNED_LIST,
	header: LIST_HEADERS[BANNED_LIST] ?? "",
	list: PlatformIdListName.Bans,
	duplicate: {
		ar: "هذا اللاعب محظور أصلًا.",
		en: "That player is already banned.",
	},
	missing: {
		ar: "هذا المعرّف مو في قائمة المحظورين.",
		en: "That ID is not on the ban list.",
	},
	added: {
		name: BridgeEventName.PlayerBanned,
		text: (player) => {
			return {
				ar: `تم حظر ${player}`,
				en: `Banned ${player}`,
			};
		},
	},
	removed: {
		name: BridgeEventName.PlayerUnbanned,
		text: (player) => {
			return {
				ar: `تم فك الحظر عن ${player}`,
				en: `Unbanned ${player}`,
			};
		},
	},
};

export const PERMITTED_OPTIONS: PlatformIdCollectionOptions = {
	path: PERMITTED_LIST,
	header: LIST_HEADERS[PERMITTED_LIST] ?? "",
	list: PlatformIdListName.Permitted,
	duplicate: {
		ar: "هذا اللاعب في القائمة البيضاء أصلًا.",
		en: "That player is already on the allow list.",
	},
	missing: {
		ar: "هذا المعرّف مو في القائمة البيضاء.",
		en: "That ID is not on the allow list.",
	},
	added: {
		name: BridgeEventName.AccessGranted,
		text: (player) => {
			return {
				ar: `تمت إضافة ${player} للقائمة البيضاء`,
				en: `Added ${player} to the allow list`,
			};
		},
	},
	removed: {
		name: BridgeEventName.AccessRevoked,
		text: (player) => {
			return {
				ar: `تمت إزالة ${player} من القائمة البيضاء`,
				en: `Removed ${player} from the allow list`,
			};
		},
	},
};

export const admins = platformIdCollection(ADMIN_OPTIONS);

export const bans = platformIdCollection(BANNED_OPTIONS);

export const permitted = platformIdCollection(PERMITTED_OPTIONS);
