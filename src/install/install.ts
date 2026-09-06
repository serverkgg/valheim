import { type Bridge, BridgeKind } from "@serverkgg/bridge";
import { readStamp, writeStamp } from "@serverkgg/bridge/install";
import { createSteamcmd } from "@serverkgg/bridge/steam";
import {
	ADMIN_LIST,
	BANNED_LIST,
	BRANCH_VARIABLE,
	generatePassword,
	isGameInstalled,
	mergeSettings,
	PASSWORD_FIELD,
	PERMITTED_LIST,
	PUBLIC_BRANCH,
	readSettings,
	SAVE_DIRECTORY,
	SERVER_BINARY,
	SETTING_DEFAULTS,
	STEAM_APP_ID,
	serializeSteamIds,
	textOf,
	WORLDS_DIRECTORY,
} from "../shared";

export interface ValheimStamp {
	buildId: string | null;
	branch: string;
}

const LIST_HEADERS: Record<string, string> = {
	[ADMIN_LIST]: "List admin players ID\nOne Steam ID per line",
	[BANNED_LIST]: "List banned players ID\nOne Steam ID per line",
	[PERMITTED_LIST]: "List permitted players ID\nOne Steam ID per line\nAn empty list lets everybody in",
};

const BRANCH_NAME = /^[a-z0-9][a-z0-9._-]{0,63}$/;

export const branchOf = (context: Bridge.Context) => {
	const branch = (context.variable(BRANCH_VARIABLE) ?? "").trim();

	return branch.length === 0 || branch === PUBLIC_BRANCH || !BRANCH_NAME.test(branch) ? "" : branch;
};

export const steamcmdOf = (context: Bridge.Context) => {
	return createSteamcmd(context, {
		appId: STEAM_APP_ID,
		label: "valheim",
	});
};

const seedSaveDirectory = async (context: Bridge.Context) => {
	await context.files.ensure(SAVE_DIRECTORY, WORLDS_DIRECTORY);

	for (const [path, header] of Object.entries(LIST_HEADERS)) {
		if (!(await context.files.exists(path))) {
			await context.files.write(path, serializeSteamIds(header, []));
		}
	}
};

const seedSettings = async (context: Bridge.Context) => {
	const stored = await readSettings(context);
	const missing: Bridge.Values = {};

	for (const [key, value] of Object.entries(SETTING_DEFAULTS)) {
		if (stored[key] === undefined) {
			missing[key] = value;
		}
	}

	if (textOf(stored[PASSWORD_FIELD] ?? null, "", 64).length === 0) {
		missing[PASSWORD_FIELD] = generatePassword();
	}

	if (Object.keys(missing).length > 0) {
		await mergeSettings(context, missing);
	}
};

export const install: Bridge.Install = {
	kind: BridgeKind.Install,
	async run(context) {
		const stamp = await readStamp<ValheimStamp>(context);
		const branch = branchOf(context);
		const fresh = !(await isGameInstalled(context));
		const steamcmd = steamcmdOf(context);

		await steamcmd.prepare();

		context.log(
			fresh ? "downloading the valheim dedicated server from steam" : "checking steam for a newer valheim build",
			{
				app: STEAM_APP_ID,
				branch: branch.length === 0 ? PUBLIC_BRANCH : branch,
			},
		);

		await steamcmd.update({
			validate: fresh || stamp?.branch !== branch,
			...(branch.length === 0
				? {}
				: {
						branch,
					}),
		});

		if (!(await isGameInstalled(context))) {
			throw new Error(`steamcmd finished but ${SERVER_BINARY} is missing`);
		}

		await steamcmd.linkSteamClient();
		await seedSaveDirectory(context);
		await seedSettings(context);

		const buildId = await steamcmd.buildId();

		if (buildId !== null && stamp?.buildId != null && stamp.buildId !== buildId) {
			context.log("valheim updated to a newer steam build", {
				from: stamp.buildId,
				to: buildId,
			});

			context.emit("ServerUpdated", {
				from: stamp.buildId,
				to: buildId,
			});
		}

		await writeStamp<ValheimStamp>(context, {
			buildId,
			branch,
		});

		context.log("install complete", {
			app: STEAM_APP_ID,
			build: buildId,
		});
	},

	async describe(context) {
		const stamp = await readStamp<ValheimStamp>(context);

		return {
			version: stamp?.buildId ?? null,
			variant: stamp?.branch !== undefined && stamp.branch.length > 0 ? stamp.branch : null,
			build: stamp?.buildId ?? null,
		};
	},
};
