import { type Bridge, BridgeKind } from "@serverkgg/bridge";
import { createRosterSync } from "@serverkgg/bridge/presence";
import {
	booleanOf,
	CROSSPLAY_FIELD,
	enrichRoster,
	MAX_PLAYERS,
	presenceOf,
	readSettings,
	roster,
	type ValheimPlayer,
	watchRoster,
} from "../shared";

const REFRESH_SECONDS = 20;

const sync = createRosterSync<ValheimPlayer>({
	id: (player) => player.id,
	presenceOf,
});

export const query: Bridge.Query = {
	kind: BridgeKind.Query,
	refreshSeconds: REFRESH_SECONDS,

	async sample(context) {
		watchRoster(context);

		await enrichRoster(context);

		sync.sync(context, roster.named());

		const crossplay = booleanOf((await readSettings(context))[CROSSPLAY_FIELD] ?? null, false);

		if (!crossplay) {
			try {
				const info = await context.probe.a2s(context.port("query"));

				return {
					online: info.players.online,
					max: info.players.max,
				};
			} catch {
				context.log.warn("valheim did not answer the a2s query, counting the roster from the log instead");
			}
		}

		return {
			online: roster.named().length,
			max: MAX_PLAYERS,
		};
	},
};
