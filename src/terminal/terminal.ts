import { type Bridge, BridgeKind, BridgeTerminalLevel } from "@serverkgg/bridge";

const rules: Bridge.TerminalRule[] = [
	{
		match: /\b\w*Exception\b|Unhandled Exception:/,
		level: BridgeTerminalLevel.Error,
	},
	{
		match: /^\s*\[Error\s*:|(?:^|\s)(?:ERROR|Error):/,
		level: BridgeTerminalLevel.Error,
	},
	{
		match: /^\s*\[Warning\s*:|(?:^|\s)(?:WARNING|Warning):/,
		level: BridgeTerminalLevel.Warn,
	},
	{
		match: /Got connection SteamID|Closing socket|Got character ZDOID|World saved/,
		level: BridgeTerminalLevel.Info,
	},
];

export const terminal: Bridge.Terminal = {
	kind: BridgeKind.Terminal,
	commands: [],
	rules,
};
