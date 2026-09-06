import { type Bridge, BridgeKind, BridgeTerminalLevel } from "@serverkgg/bridge";

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
		match: /^\s*\[Warning\s*:|Failed to place all|is not supported on this platform/,
		level: BridgeTerminalLevel.Warn,
	},
	{
		match: /Got connection SteamID|Closing socket|Got character ZDOID|World saved|Game server connected|with join code/,
		level: BridgeTerminalLevel.Info,
	},
];

export const terminal: Bridge.Terminal = {
	kind: BridgeKind.Terminal,
	commands: [],
	rules,
};
