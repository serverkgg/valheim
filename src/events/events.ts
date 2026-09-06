import { type Bridge, BridgeKind } from "@serverkgg/bridge";
import { WORLD_SAVED_LINE } from "../shared";

export const events: Bridge.Events = {
	kind: BridgeKind.Events,
	patterns: [
		{
			match: WORLD_SAVED_LINE,
			emit: "WorldSaved",
		},
		{
			match: /\[Info\s*:\s*BepInEx\] Loading \[(?<mod>[^\]]+)\]/,
			emit: "ModLoaded",
		},
		{
			match: /\[Error\s*:\s*BepInEx\] Error loading \[(?<mod>[^\]]+)\]/,
			emit: "ModCrashed",
		},
		{
			match: /Unhandled Exception:|Fatal error in GC|Segmentation fault|Aborted \(core dumped\)/,
			emit: "ServerCrashed",
		},
		{
			match: /Failed to (?:bind|create) socket|Address already in use/i,
			emit: "PortBindFailed",
		},
		{
			match: /(?:Failed|Error) loading world|World file .* is corrupt/i,
			emit: "WorldCorrupt",
		},
	],
	emits: [
		"ServerStarted",
		"ServerStopping",
		"ServerUpdated",
		"PlayerJoined",
		"PlayerLeft",
		"PlayerBanned",
		"ModLoaded",
	],
};
