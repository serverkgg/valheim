import { type Bridge, BridgeKind, BridgeUserError } from "@serverkgg/bridge";
import { playerSummaries, steamWebApiReady } from "@serverkgg/bridge/steam";
import { platformOf, readPlatformIds, requirePlatformId, steam64Of, writePlatformIds } from "../shared";

export interface PlatformIdCollectionOptions {
	path: string;
	header: string;
	duplicate: Bridge.Text;
	missing: Bridge.Text;
}

const accountsOf = async (context: Bridge.Context, ids: string[]) => {
	const accounts = new Map<string, string>();
	const steamIds = ids.flatMap((id) => {
		const steam64 = steam64Of(id);

		return steam64 === null
			? []
			: [
					[
						id,
						steam64,
					] as const,
				];
	});

	if (steamIds.length === 0 || !steamWebApiReady(context)) {
		return accounts;
	}

	try {
		const personas = new Map(
			(
				await playerSummaries(
					context,
					steamIds.map(([, steam64]) => steam64),
				)
			).map((summary) => [
				summary.steamid,
				summary.personaname,
			]),
		);

		for (const [id, steam64] of steamIds) {
			const persona = personas.get(steam64);

			if (persona !== undefined) {
				accounts.set(id, persona);
			}
		}
	} catch (error) {
		context.log.warn("the steam web api did not answer for a list", {
			error: error instanceof Error ? error.message : String(error),
		});
	}

	return accounts;
};

export const addPlatformId = async (context: Bridge.Context, options: PlatformIdCollectionOptions, input: string) => {
	const id = requirePlatformId(input);
	const entries = await readPlatformIds(context, options.path);

	if (entries.some((entry) => entry.id === id)) {
		throw new BridgeUserError(options.duplicate);
	}

	await writePlatformIds(context, options.path, options.header, [
		...entries.map((entry) => entry.id),
		id,
	]);

	return id;
};

export const removePlatformId = async (context: Bridge.Context, options: PlatformIdCollectionOptions, id: string) => {
	const entries = await readPlatformIds(context, options.path);

	if (!entries.some((entry) => entry.id === id)) {
		throw new BridgeUserError(options.missing);
	}

	await writePlatformIds(
		context,
		options.path,
		options.header,
		entries.filter((entry) => entry.id !== id).map((entry) => entry.id),
	);
};

export const platformIdCollection = (options: PlatformIdCollectionOptions): Bridge.Collection => {
	return {
		kind: BridgeKind.Collection,

		async list(context) {
			const entries = await readPlatformIds(context, options.path);
			const accounts = await accountsOf(
				context,
				entries.map((entry) => entry.id),
			);

			return entries.map((entry) => {
				return {
					id: entry.id,
					platformId: entry.id,
					platform: platformOf(entry.id),
					account: accounts.get(entry.id) ?? "",
				};
			});
		},

		async add(context, input) {
			await addPlatformId(context, options, input);

			context.log("added a platform id to a list", {
				list: options.path,
			});
		},

		actions: {
			async remove(context, row) {
				await removePlatformId(context, options, row.id);

				context.log("removed a platform id from a list", {
					list: options.path,
				});
			},
		},
	};
};
