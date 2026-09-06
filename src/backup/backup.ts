import { type Bridge, BridgeKind } from "@serverkgg/bridge";

const SETTLE_SECONDS = 5;

export const backup: Bridge.Backup = {
	kind: BridgeKind.Backup,
	settleSeconds: SETTLE_SECONDS,
};
