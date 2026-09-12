import { type Bridge, BridgeKind, BridgeSetupStepKind } from "@serverkgg/bridge";
import { GuideOpenTab } from "@serverkgg/bridge/guides";
import { CROSSPLAY_FIELD, NAME_FIELD, PASSWORD_FIELD, PUBLIC_FIELD } from "../shared";

export const SETTINGS_TAB = "settings";

export const SERVER_SECTION = "server";

export const WORLDS_TAB = "worlds";

export const MODS_TAB = "mods";

export const setup: Bridge.Setup = {
	kind: BridgeKind.Setup,
	steps: [
		{
			kind: BridgeSetupStepKind.Form,
			id: "name",
			required: false,
			tab: SETTINGS_TAB,
			section: SERVER_SECTION,
			fields: [
				NAME_FIELD,
				PASSWORD_FIELD,
			],
			title: {
				ar: "سمِّ سيرفرك واختر كلمة المرور",
				en: "Name your server and set the password",
			},
			help: {
				ar: "جهّزنا لك كلمة مرور عشوائية عشان يشتغل من أول لحظة. غيّرها لكلمة تنعاد على أصحابك، ولا تحطها داخل الاسم.",
				en: "We generated a random password so the server runs from the first second. Change it to something you can pass around, and never put it inside the name.",
			},
		},
		{
			kind: BridgeSetupStepKind.Form,
			id: "world",
			required: false,
			tab: SETTINGS_TAB,
			section: SERVER_SECTION,
			fields: [
				PUBLIC_FIELD,
				CROSSPLAY_FIELD,
			],
			title: {
				ar: "كيف يدخلون عليك",
				en: "How people reach you",
			},
			help: {
				ar: "اعرضه في قائمة السيرفرات أو خلّه خاص، وفعّل اللعب المشترك إذا فيكم أحد على Xbox أو Game Pass.",
				en: "List it in the server browser or keep it private, and turn crossplay on if anyone plays on Xbox or Game Pass.",
			},
		},
		{
			kind: BridgeSetupStepKind.Open,
			id: "mods",
			required: false,
			target: {
				tab: GuideOpenTab.Panel,
				tabId: MODS_TAB,
			},
			title: {
				ar: "مودات؟ من هنا",
				en: "Want mods?",
			},
			help: {
				ar: "ركّب BepInEx بضغطة، وبعدها دوّر على أي مود من ثندرستور. كل لاعب لازم يركّب نفس المودات عنده.",
				en: "Install BepInEx with one press, then search Thunderstore for anything you like. Every player needs the same mods on their side.",
			},
		},
		{
			kind: BridgeSetupStepKind.Open,
			id: "invite",
			required: false,
			target: {
				tab: GuideOpenTab.Access,
			},
			title: {
				ar: "عزّم أصحابك",
				en: "Invite your friends",
			},
			help: {
				ar: "انسخ عنوان سيرفرك وأرسله لهم، يضيفونه من Join Game ➜ Add server. ولو مفعّل اللعب المشترك، كود الدخول يطلع لك في صفحة النظرة العامة ويدخلون فيه من Join by code.",
				en: "Copy your address and send it to them — they add it under Join Game, Add server. With crossplay on, the join code sits on the Overview page and they use Join by code instead.",
			},
		},
	],
};
