import { describe, expect, it } from "bun:test";
import { type Bridge, BridgeUserError } from "@serverkgg/bridge";
import { INSTALL_STAMP_FILE } from "@serverkgg/bridge/install";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { appManifestPath, steamcmdScript } from "@serverkgg/bridge/steam";
import { BRANCH_VARIABLE, GAME_ROOTS, SETTINGS_FILE, STEAM_APP_ID } from "../shared";
import { install } from "./install";

const PASSWORD = "hunter2-secret";

interface HarnessOptions {
	build: string;
	branch?: string;
	stamp?: {
		buildId: string | null;
		branch: string;
	};
	installed?: boolean;
	delivers?: boolean;
	branches?: Record<
		string,
		{
			buildid: string;
			description?: string;
		}
	>;
	steamDown?: boolean;
	failStampWrite?: boolean;
}

const manifestOf = (build: string) => {
	return `"AppState"\n{\n\t"appid"\t\t"${STEAM_APP_ID}"\n\t"buildid"\t\t"${build}"\n}\n`;
};

const harness = (options: HarnessOptions) => {
	const files = new Map<string, string>([
		[
			steamcmdScript(),
			"#!/bin/sh",
		],
		[
			SETTINGS_FILE,
			JSON.stringify({
				password: PASSWORD,
			}),
		],
	]);
	const reported: Bridge.Activity[] = [];
	const emitted: string[] = [];
	const warnings: string[] = [];

	if (options.installed) {
		for (const root of GAME_ROOTS) {
			files.set(root, "installed");
		}
	}

	if (options.stamp) {
		files.set(INSTALL_STAMP_FILE, JSON.stringify(options.stamp));
	}

	const context = {
		activity: {
			report(entry: Bridge.Activity) {
				reported.push(entry);
			},
		},
		codec: {
			json: {
				async read(path: string) {
					return JSON.parse(files.get(path) ?? "{}");
				},
				async merge(path: string, values: Bridge.Values) {
					files.set(
						path,
						JSON.stringify({
							...JSON.parse(files.get(path) ?? "{}"),
							...values,
						}),
					);
				},
			},
		},
		emit(event: string) {
			emitted.push(event);
		},
		async exec(command: string[]) {
			if (command[0] === "pwd") {
				return {
					code: 0,
					stdout: "/serverk/server\n",
					stderr: "",
				};
			}

			if (command[0] === `./${steamcmdScript()}` && options.delivers !== false) {
				for (const root of GAME_ROOTS) {
					files.set(root, "installed");
				}

				files.set(appManifestPath(STEAM_APP_ID), manifestOf(options.build));
			}

			return {
				code: 0,
				stdout: "",
				stderr: "",
			};
		},
		files: {
			async exists(path: string) {
				return files.has(path);
			},
			async ensure() {},
			async read(path: string) {
				return files.get(path) ?? "";
			},
			async write(path: string, contents: string) {
				if (options.failStampWrite && path === INSTALL_STAMP_FILE) {
					throw new Error("no space left on device");
				}

				files.set(path, contents);
			},
		},
		log: Object.assign(() => undefined, {
			error: () => undefined,
			warn: (message: string) => {
				warnings.push(message);
			},
		}),
		net: {
			async json() {
				if (options.steamDown) {
					throw new Error("api.steamcmd.net could not be reached");
				}

				return {
					data: {
						[STEAM_APP_ID]: {
							depots: {
								branches: options.branches ?? {},
							},
						},
					},
				};
			},
		},
		variable(key: string) {
			return key === BRANCH_VARIABLE ? (options.branch ?? null) : null;
		},
	} as unknown as Bridge.Context;

	return {
		context,
		reported,
		emitted,
		warnings,
	};
};

describe("reporting installs and updates to the activity feed", () => {
	it("reports GameInstalled with the build and the branch label the panel shows", async () => {
		const { context, reported } = harness({
			build: "20001",
		});

		await install.run(context);

		expect(reported).toEqual([
			{
				name: BridgeEventName.GameInstalled,
				text: {
					ar: "تم تثبيت فالهايم (البيلد 20001)، الفرع على Steam: الإصدار الحالي (public)",
					en: "Installed Valheim (build 20001), Steam branch: Current release (public)",
				},
				subject: "public",
				details: {
					build: "20001",
					branch: "public",
					branchLabelAr: "الإصدار الحالي (public)",
					branchLabelEn: "Current release (public)",
				},
			},
		]);
		expect(JSON.stringify(reported)).not.toContain(PASSWORD);
	});

	it("keeps the plain ServerUpdated emit and reports the build change once beside it", async () => {
		const { context, reported, emitted } = harness({
			build: "20002",
			installed: true,
			stamp: {
				buildId: "20001",
				branch: "",
			},
		});

		await install.run(context);

		expect(emitted).toEqual([
			BridgeEventName.ServerUpdated,
		]);
		expect(reported).toEqual([
			{
				name: BridgeEventName.ServerUpdated,
				text: {
					ar: "تم تحديث فالهايم من البيلد 20001 إلى 20002",
					en: "Updated Valheim from build 20001 to 20002",
				},
				subject: "20002",
				details: {
					from: "20001",
					to: "20002",
				},
			},
		]);
	});

	it("names both steam branches by the labels the panel shows for them", async () => {
		const { context, reported, emitted } = harness({
			build: "30001",
			branch: "default_preml",
			installed: true,
			stamp: {
				buildId: "20001",
				branch: "",
			},
			branches: {
				public: {
					buildid: "20001",
				},
				default_preml: {
					buildid: "30001",
					description: "Pre-Mistlands",
				},
			},
		});

		await install.run(context);

		expect(emitted).toEqual([
			BridgeEventName.ServerUpdated,
		]);
		expect(reported).toEqual([
			{
				name: BridgeEventName.ServerUpdated,
				text: {
					ar: "تم تبديل الفرع على Steam من الإصدار الحالي (public) إلى Pre-Mistlands (البيلد 30001)",
					en: "Switched the Steam branch from Current release (public) to Pre-Mistlands (build 30001)",
				},
				subject: "default_preml",
				details: {
					from: "20001",
					to: "30001",
					branch: "default_preml",
					branchLabelAr: "Pre-Mistlands",
					branchLabelEn: "Pre-Mistlands",
					previousBranch: "public",
				},
			},
		]);
	});

	it("falls back to the branch name and still finishes the install when steam cannot list the branches", async () => {
		const { context, reported, warnings } = harness({
			build: "30001",
			branch: "default_preml",
			installed: true,
			stamp: {
				buildId: "20001",
				branch: "",
			},
			steamDown: true,
		});

		await install.run(context);

		expect(warnings).toEqual([
			"steam did not answer with the valheim branch list for the activity entry",
		]);
		expect(reported.map((entry) => entry.text.en)).toEqual([
			"Switched the Steam branch from Current release (public) to default_preml (build 30001)",
		]);
	});

	it("reports nothing when the install stamp cannot be written, so the row never claims a change that repeats", async () => {
		const { context, reported, emitted } = harness({
			build: "20002",
			installed: true,
			stamp: {
				buildId: "20001",
				branch: "",
			},
			failStampWrite: true,
		});

		await expect(install.run(context)).rejects.toThrow("no space left on device");
		expect(emitted).toEqual([
			BridgeEventName.ServerUpdated,
		]);
		expect(reported).toEqual([]);
	});

	it("reports nothing when the build did not move", async () => {
		const { context, reported, emitted } = harness({
			build: "20001",
			installed: true,
			stamp: {
				buildId: "20001",
				branch: "",
			},
		});

		await install.run(context);

		expect(emitted).toEqual([]);
		expect(reported).toEqual([]);
	});

	it("tells the owner to retry when steam finished without the game files, keeping the detail as the cause", async () => {
		const { context, reported } = harness({
			build: "20001",
			delivers: false,
		});

		const error = await install.run(context).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(BridgeUserError);
		expect(error instanceof BridgeUserError ? error.text.en : "").toBe(
			"The download from Steam finished but the game files are missing. Try the install again.",
		);
		expect(error instanceof Error && error.cause instanceof Error ? error.cause.message : "").toContain(
			"valheim_server.x86_64 is missing",
		);
		expect(reported).toEqual([]);
	});
});
