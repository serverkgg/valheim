import { type Bridge, BridgeKind, BridgeUserError } from "@serverkgg/bridge";
import { playerSummaries, steamWebApiReady } from "@serverkgg/bridge/steam";
import { readSteamIds, requireSteamId, writeSteamIds } from "../shared";

export interface SteamIdCollectionOptions {
	path: string;
	header: string;
	duplicate: Bridge.Text;
	missing: Bridge.Text;
}

const namesOf = async (context: Bridge.Context, ids: string[]) => {
	if (ids.length === 0 || !steamWebApiReady(context)) {
		return new Map<string, string>();
	}

	try {
		return new Map(
			(await playerSummaries(context, ids)).map((summary) => [
				summary.steamid,
				summary.personaname,
			]),
		);
	} catch (error) {
		context.log.warn("the steam web api did not answer for a list", {
			error: error instanceof Error ? error.message : String(error),
		});

		return new Map<string, string>();
	}
};

export const addSteamId = async (context: Bridge.Context, options: SteamIdCollectionOptions, id: string) => {
	const ids = await readSteamIds(context, options.path);

	if (ids.includes(id)) {
		throw new BridgeUserError(options.duplicate);
	}

	await writeSteamIds(context, options.path, options.header, [
		...ids,
		id,
	]);
};

export const steamIdCollection = (options: SteamIdCollectionOptions): Bridge.Collection => {
	return {
		kind: BridgeKind.Collection,

		async list(context) {
			const ids = await readSteamIds(context, options.path);
			const names = await namesOf(context, ids);

			return ids.map((id) => {
				return {
					id,
					steamId: id,
					player: names.get(id) ?? "",
				};
			});
		},

		async add(context, input) {
			await addSteamId(context, options, requireSteamId(input));

			context.log("added a steam id to a list", {
				list: options.path,
			});
		},

		actions: {
			async remove(context, row) {
				const ids = await readSteamIds(context, options.path);

				if (!ids.includes(row.id)) {
					throw new BridgeUserError(options.missing);
				}

				await writeSteamIds(
					context,
					options.path,
					options.header,
					ids.filter((id) => id !== row.id),
				);

				context.log("removed a steam id from a list", {
					list: options.path,
				});
			},
		},
	};
};
