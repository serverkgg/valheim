import { type Bridge, BridgeKind } from "@serverkgg/bridge";
import { branchOption, PUBLIC_OPTION, steamBranches } from "../shared";

const TTL_SECONDS = 3600;

export const branches: Bridge.Options = {
	kind: BridgeKind.Options,
	ttlSeconds: TTL_SECONDS,

	async list(context) {
		try {
			const found = await steamBranches(context);

			if (found.length > 0) {
				return found.map(branchOption);
			}
		} catch (error) {
			context.log.warn("steam did not answer with the valheim branch list", {
				error: error instanceof Error ? error.message : String(error),
			});
		}

		return [
			PUBLIC_OPTION,
		];
	},
};
