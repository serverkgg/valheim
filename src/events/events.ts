import { type Bridge, BridgeKind } from "@serverkgg/bridge";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { WORLD_SAVED_LINE } from "../shared";

export const events: Bridge.Events = {
	kind: BridgeKind.Events,
	patterns: [
		{
			match: WORLD_SAVED_LINE,
			emit: BridgeEventName.WorldSaved,
		},
		{
			match: /\[Info\s*:\s*BepInEx\] Loading \[(?<mod>[^\]]+)\]/,
			emit: BridgeEventName.ModLoaded,
		},
		{
			match: /\[Error\s*:\s*BepInEx\] Error loading \[(?<mod>[^\]]+)\]/,
			emit: BridgeEventName.ModCrashed,
		},
		{
			match: /Unhandled Exception:|Fatal error in GC|Segmentation fault|Aborted \(core dumped\)/,
			emit: BridgeEventName.ServerCrashed,
		},
		{
			match: /Failed to (?:bind|create) socket|Address already in use/i,
			emit: BridgeEventName.PortBindFailed,
		},
		{
			match: /(?:Failed|Error) loading world|World file .* is corrupt/i,
			emit: BridgeEventName.WorldCorrupt,
		},
	],
	emits: [
		BridgeEventName.ServerStarted,
		BridgeEventName.ServerStopping,
		BridgeEventName.ServerUpdated,
		BridgeEventName.PlayerJoined,
		BridgeEventName.PlayerLeft,
		BridgeEventName.PlayerBanned,
		BridgeEventName.ModLoaded,
	],
};
