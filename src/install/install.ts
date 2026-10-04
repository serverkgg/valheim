import { type Bridge, BridgeKind, BridgeUserError } from "@serverkgg/bridge";
import { readStamp, writeStamp } from "@serverkgg/bridge/install";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { createSteamcmd } from "@serverkgg/bridge/steam";
import {
	BRANCH_VARIABLE,
	branchTitleOf,
	generatePassword,
	isGameInstalled,
	LIST_HEADERS,
	mergeSettings,
	migratePlatformIds,
	PASSWORD_FIELD,
	PUBLIC_BRANCH,
	PUBLIC_OPTION,
	readSettings,
	SAVE_DIRECTORY,
	SERVER_BINARY,
	SETTING_DEFAULTS,
	STEAM_APP_ID,
	serializePlatformIds,
	steamBranches,
	textOf,
	WORLDS_DIRECTORY,
} from "../shared";

export interface ValheimStamp {
	buildId: string | null;
	branch: string;
}

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

const branchNameOf = (branch: string) => {
	return branch.length === 0 ? PUBLIC_BRANCH : branch;
};

const branchLabelsOf = async (context: Bridge.Context, names: string[]) => {
	const labels = new Map<string, Bridge.Text>();

	for (const name of names) {
		labels.set(
			name,
			name === PUBLIC_BRANCH
				? PUBLIC_OPTION.label
				: {
						ar: name,
						en: name,
					},
		);
	}

	if (names.every((name) => name === PUBLIC_BRANCH)) {
		return labels;
	}

	try {
		for (const found of await steamBranches(context)) {
			if (found.name !== PUBLIC_BRANCH && labels.has(found.name)) {
				labels.set(found.name, {
					ar: branchTitleOf(found),
					en: branchTitleOf(found),
				});
			}
		}
	} catch (error) {
		context.log.warn("steam did not answer with the valheim branch list for the activity entry", {
			error: error instanceof Error ? error.message : String(error),
		});
	}

	return labels;
};

const labelOf = (labels: Map<string, Bridge.Text>, name: string): Bridge.Text => {
	return (
		labels.get(name) ?? {
			ar: name,
			en: name,
		}
	);
};

const installedActivity = (buildId: string | null, name: string, label: Bridge.Text): Bridge.Activity => {
	return {
		name: BridgeEventName.GameInstalled,
		text:
			buildId === null
				? {
						ar: `تم تثبيت فالهايم، الفرع على Steam: ${label.ar}`,
						en: `Installed Valheim, Steam branch: ${label.en}`,
					}
				: {
						ar: `تم تثبيت فالهايم (البيلد ${buildId})، الفرع على Steam: ${label.ar}`,
						en: `Installed Valheim (build ${buildId}), Steam branch: ${label.en}`,
					},
		subject: name,
		details: {
			build: buildId,
			branch: name,
			branchLabelAr: label.ar,
			branchLabelEn: label.en,
		},
	};
};

interface BranchSwitch {
	from: string | null;
	to: string | null;
	previous: string;
	branch: string;
}

const branchActivity = (change: BranchSwitch, labels: Map<string, Bridge.Text>): Bridge.Activity => {
	const label = labelOf(labels, change.branch);
	const previous = labelOf(labels, change.previous);

	return {
		name: BridgeEventName.ServerUpdated,
		text:
			change.to === null
				? {
						ar: `تم تبديل الفرع على Steam من ${previous.ar} إلى ${label.ar}`,
						en: `Switched the Steam branch from ${previous.en} to ${label.en}`,
					}
				: {
						ar: `تم تبديل الفرع على Steam من ${previous.ar} إلى ${label.ar} (البيلد ${change.to})`,
						en: `Switched the Steam branch from ${previous.en} to ${label.en} (build ${change.to})`,
					},
		subject: change.branch,
		details: {
			from: change.from,
			to: change.to,
			branch: change.branch,
			branchLabelAr: label.ar,
			branchLabelEn: label.en,
			previousBranch: change.previous,
		},
	};
};

const updatedActivity = (from: string, to: string): Bridge.Activity => {
	return {
		name: BridgeEventName.ServerUpdated,
		text: {
			ar: `تم تحديث فالهايم من البيلد ${from} إلى ${to}`,
			en: `Updated Valheim from build ${from} to ${to}`,
		},
		subject: to,
		details: {
			from,
			to,
		},
	};
};

interface InstallOutcome {
	fresh: boolean;
	stamp: ValheimStamp | null;
	branch: string;
	buildId: string | null;
}

const reportInstall = async (context: Bridge.Context, outcome: InstallOutcome) => {
	const { fresh, stamp, branch, buildId } = outcome;
	const name = branchNameOf(branch);

	if (fresh) {
		const labels = await branchLabelsOf(context, [
			name,
		]);

		context.activity.report(installedActivity(buildId, name, labelOf(labels, name)));

		return;
	}

	if (stamp !== null && stamp.branch !== branch) {
		const previous = branchNameOf(stamp.branch);

		context.log("valheim switched steam branch", {
			from: previous,
			to: name,
			build: buildId,
		});

		context.activity.report(
			branchActivity(
				{
					from: stamp.buildId,
					to: buildId,
					previous,
					branch: name,
				},
				await branchLabelsOf(context, [
					previous,
					name,
				]),
			),
		);

		return;
	}

	if (buildId !== null && stamp?.buildId != null && stamp.buildId !== buildId) {
		context.activity.report(updatedActivity(stamp.buildId, buildId));
	}
};

const seedSaveDirectory = async (context: Bridge.Context) => {
	await context.files.ensure(SAVE_DIRECTORY, WORLDS_DIRECTORY);

	for (const [path, header] of Object.entries(LIST_HEADERS)) {
		if (!(await context.files.exists(path))) {
			await context.files.write(path, serializePlatformIds(header, []));
		}
	}
};

const migrateLists = async (context: Bridge.Context) => {
	for (const path of Object.keys(LIST_HEADERS)) {
		if (!(await context.files.exists(path))) {
			continue;
		}

		const rewritten = migratePlatformIds(await context.files.read(path));

		if (rewritten.migrated === 0) {
			continue;
		}

		await context.files.write(path, rewritten.contents);

		context.log("rewrote bare steam ids as valheim platform user ids", {
			list: path,
			migrated: rewritten.migrated,
		});
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
			throw new BridgeUserError(
				{
					ar: "اكتمل التنزيل من Steam لكن ملفات اللعبة ناقصة. جرب التثبيت مرة ثانية.",
					en: "The download from Steam finished but the game files are missing. Try the install again.",
				},
				{
					cause: new Error(`steamcmd finished but ${SERVER_BINARY} is missing`),
				},
			);
		}

		await steamcmd.linkSteamClient();
		await seedSaveDirectory(context);
		await migrateLists(context);
		await seedSettings(context);

		const buildId = await steamcmd.buildId();

		if (buildId !== null && stamp?.buildId != null && stamp.buildId !== buildId) {
			context.log("valheim updated to a newer steam build", {
				from: stamp.buildId,
				to: buildId,
			});

			context.emit(BridgeEventName.ServerUpdated, {
				from: stamp.buildId,
				to: buildId,
			});
		}

		await writeStamp<ValheimStamp>(context, {
			buildId,
			branch,
		});

		await reportInstall(context, {
			fresh,
			stamp,
			branch,
			buildId,
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
