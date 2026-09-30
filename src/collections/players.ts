import { type Bridge, BridgeKind } from "@serverkgg/bridge";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { displayNameOf, platformOf, presenceOf, roster, type ValheimPlayer, watchRoster } from "../shared";
import { BANNED_OPTIONS } from "./lists";
import { addPlatformId, platformIdActivity } from "./platformIdCollection";

const REFRESH_SECONDS = 15;

export const players: Bridge.Collection = {
	kind: BridgeKind.Collection,
	requiresRunning: true,
	refreshSeconds: REFRESH_SECONDS,

	async list(context) {
		watchRoster(context);

		return roster.all().map((player) => {
			return {
				id: player.id,
				name: displayNameOf(player),
				account: player.account ?? "",
				platform: player.platform,
				platformId: player.id,
			};
		});
	},

	actions: {
		async ban(context, row) {
			const id = await addPlatformId(context, BANNED_OPTIONS, row.id);
			const banned: ValheimPlayer = roster.all().find((player) => player.id === id) ?? {
				account: typeof row.account === "string" && row.account.length > 0 ? row.account : null,
				avatarHash: null,
				character: typeof row.name === "string" && row.name.length > 0 ? row.name : null,
				id,
				platform: platformOf(id),
			};

			context.emit(BridgeEventName.PlayerBanned, presenceOf(banned));

			context.log("banned a player", {
				platformId: id,
			});

			context.activity.report(platformIdActivity(BANNED_OPTIONS, BANNED_OPTIONS.added, displayNameOf(banned), id));
		},
	},
};
