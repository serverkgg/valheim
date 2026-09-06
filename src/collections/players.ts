import { type Bridge, BridgeKind } from "@serverkgg/bridge";
import { presenceOf, roster, watchRoster } from "../shared";
import { BANNED_OPTIONS } from "./lists";
import { addSteamId } from "./steamIdCollection";

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
				name: player.player ?? "",
				steamId: player.id,
			};
		});
	},

	actions: {
		async ban(context, row) {
			await addSteamId(context, BANNED_OPTIONS, row.id);

			context.emit(
				"PlayerBanned",
				presenceOf({
					id: row.id,
					player: typeof row.name === "string" && row.name.length > 0 ? row.name : null,
					avatarHash: null,
				}),
			);

			context.log("banned a player", {
				steamId: row.id,
			});
		},
	},
};
