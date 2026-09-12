import { type Bridge, BridgeKind, BridgeTerminalLevel } from "@serverkgg/bridge";
import { consoleHandler } from "./consoleHandler";

const player: Bridge.TerminalArg = {
	key: "player",
	label: {
		ar: "اللاعب",
		en: "Player",
	},
	required: true,
	module: "players",
	column: "name",
};

const platformId: Bridge.TerminalArg = {
	key: "platformId",
	label: {
		ar: "المعرّف",
		en: "Platform ID",
	},
	required: true,
};

const commands: Bridge.TerminalCommand[] = [
	{
		name: "status",
		summary: {
			ar: "حالة سيرفرك: النسخة، العالم، اللاعبين، آخر حفظ، واللعب المشترك.",
			en: "Your server's state: version, world, players, last save and crossplay.",
		},
	},
	{
		name: "players",
		summary: {
			ar: "اللاعبين اللي داخلين الحين بمعرّفاتهم.",
			en: "The players who are on right now, with their platform ids.",
		},
	},
	{
		name: "worlds",
		summary: {
			ar: "عوالمك اللي على القرص، والشغّال منها معلّم بنجمة.",
			en: "The worlds on disk, with the active one marked.",
		},
	},
	{
		name: "mods",
		summary: {
			ar: "حالة BepInEx وكل مود مركّب.",
			en: "The BepInEx state and every installed mod.",
		},
	},
	{
		name: "joincode",
		summary: {
			ar: "كود الدخول حق اللعب المشترك.",
			en: "The crossplay join code.",
		},
	},
	{
		name: "help",
		summary: {
			ar: "الأوامر اللي نرد عليها من هنا.",
			en: "The commands we answer from here.",
		},
	},
	{
		name: "ban",
		summary: {
			ar: "يضيف اللاعب لقائمة المحظورين. اكتب اسمه لو داخل، أو معرّفه لو مو داخل.",
			en: "Add a player to the ban list. Write their name while they are on, or their platform id when they are not.",
		},
		syntax: "ban <player>",
		args: [
			player,
		],
		danger: true,
	},
	{
		name: "unban",
		summary: {
			ar: "يشيل المعرّف من قائمة المحظورين.",
			en: "Take a platform id off the ban list.",
		},
		syntax: "unban <platformId>",
		args: [
			platformId,
		],
	},
];

const rules: Bridge.TerminalRule[] = [
	{
		match: /Unhandled Exception:|Fatal error in GC|DllNotFoundException|Segmentation fault/,
		level: BridgeTerminalLevel.Error,
	},
	{
		match: /^\s*\[Error\s*:/,
		level: BridgeTerminalLevel.Error,
	},
	{
		match: /^\s*\[Warning\s*:|Failed to place all|is not supported on this platform|has wrong password/,
		level: BridgeTerminalLevel.Warn,
	},
	{
		match:
			/Got connection|Got handshake from client|Closing socket|Got character ZDOID|World saved|Game server connected|with join code|Player joined server|Player connection lost server|Valheim version:/,
		level: BridgeTerminalLevel.Info,
	},
];

export const terminal: Bridge.Terminal = {
	kind: BridgeKind.Terminal,
	commands,
	rules,
	run: consoleHandler,
};
