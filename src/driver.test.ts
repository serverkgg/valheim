import { describe, expect, test } from "bun:test";
import {
	type BridgeDriver,
	BridgeFormTarget,
	BridgeKind,
	BridgeLayout,
	BridgePlace,
	BridgeSetupStepKind,
	BridgeUploadMode,
} from "@serverkgg/bridge";
import { GuideOpenTab } from "@serverkgg/bridge/guides";
import { isBridgeEventName } from "@serverkgg/bridge/protocol";
import { bridgePanelSchema, bridgeSetupManifestSchema, bridgeTerminalManifestSchema } from "@serverkgg/bridge/wire";
import { driver } from "./driver";
import { PACK_ID } from "./mods";
import {
	ADMIN_LIST,
	BANNED_LIST,
	BEPINEX_FIELD,
	BRANCH_VARIABLE,
	PERMITTED_LIST,
	SAVE_DIRECTORY,
	SERVER_BINARY,
	SETTING_FIELDS,
	SETTINGS_FILE,
	WORLD_EXTENSIONS,
	WORLDS_DIRECTORY,
} from "./shared";

interface Manifest {
	container: {
		ports: {
			key: string;
			containerPort: number;
			protocol: string;
			mirror?: boolean;
			follows?: {
				key: string;
				offset: number;
			};
			hostRange: {
				default: number;
				min: number;
				max: number;
			};
		}[];
		runtime: {
			platform: string;
			installBudgetMinutes: number;
			bootBudgetMinutes: number;
		};
	};
	files: {
		protected: string[];
		notable: {
			match: string;
		}[];
	};
	backup: {
		only: string[];
		except: string[];
	};
	reset: {
		keep: string[];
	};
	presence: {
		id: string;
		name: string;
		avatar: string;
		fields: {
			key: string;
		}[];
	};
	secrets?: {
		key: string;
		required: boolean;
		description: {
			ar: string;
			en: string;
		};
	}[];
}

const VALIDATE_TIMEOUT_MS = 120_000;

const manifest = Bun.YAML.parse(await Bun.file(new URL("../serverk.yml", import.meta.url)).text()) as Manifest;

const modules = driver.modules ?? {};

const tabs = driver.panel?.tabs ?? [];

const sections = tabs.flatMap((tab) => tab.sections);

const forms = sections.flatMap((section) =>
	section.layout === BridgeLayout.Form
		? [
				section,
			]
		: [],
);

const tables = sections.flatMap((section) =>
	section.layout === BridgeLayout.Table
		? [
				section,
			]
		: [],
);

const portOf = (key: string) => {
	return manifest.container.ports.find((port) => port.key === key);
};

const formSection = (tabId: string, sectionId: string) => {
	const tab = tabs.find((entry) => entry.id === tabId);
	const section = tab?.sections.find((entry) => entry.id === sectionId);

	return section?.layout === BridgeLayout.Form ? section : null;
};

describe("assembling the valheim driver", () => {
	test(
		"passes the same validation the platform runs at boot",
		async () => {
			const validate = Bun.spawn(
				[
					"bunx",
					"serverk-bridge",
					"validate",
				],
				{
					cwd: new URL("..", import.meta.url).pathname,
					stderr: "pipe",
					stdout: "pipe",
				},
			);

			expect(await validate.exited).toBe(0);
		},
		VALIDATE_TIMEOUT_MS,
	);

	test("builds a panel the agent's own wire schema accepts, which validate does not check", () => {
		const parsed = bridgePanelSchema.safeParse(driver.panel);

		expect(
			parsed.success ? null : parsed.error.issues,
			"the agent drops a manifest its wire schema rejects",
		).toBeNull();
	});

	test("builds a terminal manifest the wire schema accepts", () => {
		const parsed = bridgeTerminalManifestSchema.safeParse({
			commands: driver.terminal?.commands ?? [],
			rules: (driver.terminal?.rules ?? []).map((rule) => {
				return {
					match: rule.match.source,
					flags: rule.match.flags,
					level: rule.level,
					...(rule.stream === undefined
						? {}
						: {
								stream: rule.stream,
							}),
				};
			}),
		});

		expect(parsed.success ? null : parsed.error.issues, "the terminal manifest crosses the same wire").toBeNull();
	});

	test("builds a setup manifest the wire schema accepts", () => {
		const parsed = bridgeSetupManifestSchema.safeParse({
			steps: driver.setup?.steps ?? [],
		});

		expect(parsed.success ? null : parsed.error.issues, "the setup manifest crosses the same wire").toBeNull();
	});

	test("declares every capability the panel and the platform depend on", () => {
		expect(driver.install).toBeDefined();
		expect(driver.lifecycle).toBeDefined();
		expect(driver.events).toBeDefined();
		expect(driver.query).toBeDefined();
		expect(driver.backup).toBeDefined();
		expect(driver.setup).toBeDefined();
		expect(driver.panel).toBeDefined();
	});

	test("declares no announce, because a valheim server has no way to speak to players", () => {
		expect(driver.announce).toBeUndefined();
	});

	test("answers its console commands in the driver, because valheim reads nothing from stdin", () => {
		expect(driver.terminal?.run).toBeDefined();
		expect((driver.terminal?.commands ?? []).length).toBeGreaterThan(0);
		expect(driver.terminal?.rules?.length).toBeGreaterThan(0);
	});

	test("offers a safe command the game smoke can run with no argument and no danger", () => {
		const safe = (driver.terminal?.commands ?? []).find((command) => {
			return command.danger !== true && (command.args ?? []).length === 0;
		});

		expect(safe?.name).toBe("status");
	});

	test("names an argument after the module and column the panel can fill it from", () => {
		const ban = (driver.terminal?.commands ?? []).find((command) => command.name === "ban");
		const target = (ban?.args ?? []).at(0);

		expect(ban?.danger).toBe(true);
		expect(target?.required).toBe(true);
		expect(target?.module).toBe("players");
		expect(target?.column).toBe("name");
	});

	test("declares the steam web api key as an optional platform secret, because the lists read names from it", () => {
		const secret = (manifest.secrets ?? []).find((entry) => entry.key === "STEAM_WEB_API_KEY");

		expect(secret?.required).toBe(false);
		expect(secret?.description.ar.length).toBeGreaterThan(0);
		expect(secret?.description.en.length).toBeGreaterThan(0);
	});

	test("registers every module the panel binds a section to", () => {
		for (const section of sections) {
			if (section.layout !== BridgeLayout.Form || section.module !== undefined) {
				expect(Object.keys(modules)).toContain(section.module ?? "");
			}
		}
	});

	test("keeps the setup singleton out of the panel modules, because its id is reserved", () => {
		expect(Object.keys(modules)).not.toContain("setup");
	});
});

describe("declaring the events the platform is allowed to act on", () => {
	test("names only events the platform's taxonomy knows, so none are dropped", () => {
		for (const name of [
			...(driver.events?.patterns ?? []).map((pattern) => pattern.emit),
			...(driver.events?.emits ?? []),
		]) {
			expect(isBridgeEventName(name)).toBe(true);
		}
	});

	test("raises join and leave from code, because valheim spreads them over two log lines", () => {
		expect(driver.events?.emits).toContain("PlayerJoined");
		expect(driver.events?.emits).toContain("PlayerLeft");
	});

	test("matches the save line valheim prints, which is the only save signal it gives", () => {
		const saved = driver.events?.patterns.find((pattern) => pattern.emit === "WorldSaved");

		expect(saved).toBeDefined();
		expect(saved?.match.test("World saved ( 1234.5ms )")).toBe(true);
	});

	test("matches a crash so the feed says the server died rather than stopped", () => {
		const crashed = driver.events?.patterns.find((pattern) => pattern.emit === "ServerCrashed");

		expect(crashed?.match.test("Unhandled Exception: System.NullReferenceException")).toBe(true);
	});

	test("announces a steam build change through ServerUpdated", () => {
		expect(driver.events?.emits).toContain("ServerUpdated");
	});
});

describe("the manifest and the driver agreeing on the ports", () => {
	test("declares the game port and the query port valheim derives from it", () => {
		expect(manifest.container.ports.map((port) => port.key)).toEqual([
			"game",
			"query",
		]);
	});

	test("publishes both over udp, which is all valheim speaks", () => {
		for (const port of manifest.container.ports) {
			expect(port.protocol).toBe("udp");
		}
	});

	test("mirrors both, because valheim advertises the port it bound to the steam master server", () => {
		for (const port of manifest.container.ports) {
			expect(port.mirror).toBe(true);
		}
	});

	test("follows the game port by one, which is the only query port valheim will ever use", () => {
		expect(portOf("query")?.follows).toEqual({
			key: "game",
			offset: 1,
		});
	});

	test("shifts the follower's host range by the same offset, so an allocation never falls outside it", () => {
		const game = portOf("game");
		const query = portOf("query");

		expect(query?.hostRange.min).toBe((game?.hostRange.min ?? 0) + 1);
		expect(query?.hostRange.max).toBe((game?.hostRange.max ?? 0) + 1);
		expect(query?.hostRange.default).toBe((game?.hostRange.default ?? 0) + 1);
	});

	test("runs a linux payload, so the manifest declares no wine runtime", () => {
		expect(manifest.container.runtime.platform).toBe("linux");
	});
});

describe("the manifest guarding the files the driver depends on", () => {
	test("protects the steam install the driver would otherwise redownload", () => {
		for (const path of [
			".steamcmd",
			"steamapps",
			SERVER_BINARY,
		]) {
			expect(manifest.files.protected).toContain(path);
		}
	});

	test("keeps the steam install through a reset, so a reset never re-downloads the game", () => {
		for (const path of [
			".steamcmd",
			"steamapps",
			SERVER_BINARY,
		]) {
			expect(manifest.reset.keep).toContain(path);
		}
	});

	test("throws away bepinex and every mod on a reset, so a reset really is a clean server", () => {
		expect(manifest.reset.keep).not.toContain("BepInEx");
		expect(manifest.reset.keep).not.toContain("doorstop_libs");
	});

	test("archives saves, settings and the exact mod runtime needed to restore them", () => {
		expect(manifest.backup.only).toEqual([
			`${SAVE_DIRECTORY}/**`,
			SETTINGS_FILE,
			"BepInEx/**",
			"doorstop_libs/**",
			"doorstop_config.ini",
			".doorstop_version",
			"winhttp.dll",
			"start_game_bepinex.sh",
			"start_server_bepinex.sh",
			".serverk-bepinex.json",
			".serverk-mods.json",
		]);
	});

	test("leaves valheim's half-written save files out of the archive", () => {
		expect(manifest.backup.except).toContain(`${SAVE_DIRECTORY}/**/*.db.new`);
		expect(manifest.backup.except).toContain(`${SAVE_DIRECTORY}/**/*.fwl.new`);
	});

	test("annotates every file a player might open, starting with the settings the driver owns", () => {
		const notable = manifest.files.notable.map((note) => note.match);

		expect(notable).toContain(SETTINGS_FILE);
		expect(notable).toContain(WORLDS_DIRECTORY);
		expect(notable).toContain(ADMIN_LIST);
		expect(notable).toContain(BANNED_LIST);
		expect(notable).toContain(PERMITTED_LIST);
	});
});

describe("the manifest presence matching what the roster actually sends", () => {
	test("names the payload keys the query module emits", () => {
		expect(manifest.presence.name).toBe("player");
		expect(manifest.presence.id).toBe("platformId");
		expect(manifest.presence.fields.map((field) => field.key)).toEqual([
			"account",
			"platform",
		]);
	});

	test("builds the avatar from the hash the steam web api gives us", () => {
		expect(manifest.presence.avatar).toContain("{avatarHash}");
	});
});

const PANEL_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;

const fieldKeys = sections.flatMap((section) => {
	const own = section.layout === BridgeLayout.Form ? section.fields : [];
	const actions = "actions" in section ? (section.actions ?? []) : [];

	return [
		...own,
		...actions.flatMap((action) => action.fields ?? []),
	].map((field) => field.key);
});

describe("keeping every panel key inside what the wire protocol accepts", () => {
	test("names no field with a character the agent's manifest schema rejects", () => {
		for (const key of fieldKeys) {
			expect(key).toMatch(PANEL_KEY_PATTERN);
		}
	});

	test("names no table column the wire would reject either", () => {
		for (const table of tables) {
			for (const column of table.columns) {
				expect(column.key).toMatch(PANEL_KEY_PATTERN);
			}
		}
	});

	test("puts every setting the driver reads in front of the owner", () => {
		for (const field of SETTING_FIELDS) {
			expect(fieldKeys).toContain(field);
		}
	});

	test("offers the branch as a variable, because it decides what gets installed", () => {
		const branch = forms.find((form) => form.fields.some((field) => field.key === BRANCH_VARIABLE));

		expect(branch?.target).toBe(BridgeFormTarget.Variables);
		expect(branch?.reinstall).toBe(true);
		expect(branch?.confirmText).toBeDefined();
	});

	test("fills the branch list from a module, so it follows what steam publishes", () => {
		const field = forms.flatMap((form) => form.fields).find((entry) => entry.key === BRANCH_VARIABLE);

		expect(field?.options).toEqual({
			module: "branches",
		});
	});

	test("hints a restart on every settings form, because valheim only reads argv at start", () => {
		for (const form of forms) {
			if (form.target === BridgeFormTarget.Settings) {
				expect(form.restartHint).toBe(true);
			}
		}
	});
});

describe("the worlds table doing what a save file needs", () => {
	test("uploads the db and the fwl one file at a time, because a world is a pair", () => {
		const saves = tables.find((table) => table.module === "worlds");

		expect(saves?.upload?.extensions).toEqual(WORLD_EXTENSIONS);
		expect(saves?.upload?.mode).toBe(BridgeUploadMode.File);
	});

	test("offers activate and delete, which is every world action valheim allows offline", () => {
		const saves = tables.find((table) => table.module === "worlds");

		expect((saves?.actions ?? []).map((action) => action.id)).toEqual([
			"activate",
			"delete",
		]);
	});
});

describe("the players page carrying every list valheim reads", () => {
	test("binds one table to each list file", () => {
		expect(tables.map((table) => table.module)).toContain("admins");
		expect(tables.map((table) => table.module)).toContain("bans");
		expect(tables.map((table) => table.module)).toContain("permitted");
	});

	test("lets an owner add an id to every one of them", () => {
		for (const module of [
			"admins",
			"bans",
			"permitted",
		]) {
			expect(tables.find((table) => table.module === module)?.add).toBeDefined();
		}
	});

	test("puts the roster and every moderation table on the platform's own players page", () => {
		for (const module of [
			"players",
			"admins",
			"bans",
			"permitted",
		]) {
			expect(tables.find((table) => table.module === module)?.place).toBe(BridgePlace.Players);
		}
	});

	test("shows the account, the platform and the id the panel bans by", () => {
		const online = tables.find((table) => table.module === "players");

		expect((online?.columns ?? []).map((column) => column.key)).toEqual([
			"name",
			"account",
			"platform",
			"platformId",
		]);
	});

	test("claims offline on ban, because a ban is written to a file the game reads at start", () => {
		const ban = (tables.find((table) => table.module === "players")?.actions ?? []).find(
			(action) => action.id === "ban",
		);

		expect(ban?.offline).toBe(true);
	});

	test("takes the name of no platform sidebar entry, now that the lists moved onto the players page", () => {
		for (const tab of tabs) {
			expect([
				"overview",
				"console",
				"files",
				"backups",
				"schedules",
				"analytics",
				"feed",
				"access",
				"integrations",
				"needs",
				"setup",
				"change-game",
			]).not.toContain(tab.id);
		}
	});

	test("leaves the sidebar entirely, because every section of the players tab is placed", () => {
		const players = tabs.find((tab) => tab.id === "players");

		for (const section of players?.sections ?? []) {
			expect("place" in section ? section.place : undefined).toBeDefined();
		}
	});
});

describe("the server health detail the overview renders", () => {
	test("places the metrics detail on the overview rather than on a tab of its own", () => {
		const metrics = sections.find((section) => section.layout === BridgeLayout.Detail && section.module === "metrics");

		expect(metrics?.layout === BridgeLayout.Detail && metrics.place).toBe(BridgePlace.Overview);
	});

	test("keeps a way back to the settings that decide what it shows", () => {
		const metrics = sections.find((section) => section.layout === BridgeLayout.Detail && section.module === "metrics");

		expect(metrics?.layout === BridgeLayout.Detail && metrics.related?.tab).toBe("settings");
	});
});

describe("explaining every section the owner opens", () => {
	test("writes one help line in both languages on every form", () => {
		for (const form of forms) {
			expect(form.help?.ar.length, `${form.id} has no arabic help`).toBeGreaterThan(0);
			expect(form.help?.en.length, `${form.id} has no english help`).toBeGreaterThan(0);
		}
	});

	test("writes one on every table too, because a list of ids explains nothing by itself", () => {
		for (const table of tables) {
			expect(table.help?.ar.length, `${table.id} has no arabic help`).toBeGreaterThan(0);
			expect(table.help?.en.length, `${table.id} has no english help`).toBeGreaterThan(0);
		}
	});
});

type PanelModule = NonNullable<BridgeDriver["modules"]>[string];

const declaredActionsOf = (module: PanelModule): string[] => {
	switch (module.kind) {
		case BridgeKind.Actions: {
			return Object.keys(module.actions);
		}

		case BridgeKind.Collection: {
			return [
				...(module.add
					? [
							"add",
						]
					: []),
				...Object.keys(module.actions ?? {}),
			];
		}

		case BridgeKind.Detail: {
			return Object.keys(module.actions ?? {});
		}

		case BridgeKind.Catalog: {
			return [
				"install",
				"remove",
				...(module.toggle
					? [
							"toggle",
						]
					: []),
			];
		}

		case BridgeKind.Settings: {
			return module.write
				? [
						"write",
					]
				: [];
		}

		default: {
			return [];
		}
	}
};

const protectedActionsOf = (module: PanelModule) => {
	return "protectedActions" in module ? (module.protectedActions ?? []) : [];
};

describe("taking a recovery copy only before an action destroys something nothing else brings back", () => {
	test("protects deleting a world and removing the loader, and nothing else", () => {
		const declared = Object.fromEntries(
			Object.entries(modules).flatMap(([id, module]) => {
				const actions = protectedActionsOf(module);

				return actions.length > 0
					? [
							[
								id,
								actions,
							],
						]
					: [];
			}),
		);

		expect(declared).toEqual({
			worlds: [
				"delete",
			],
			bepinex: [
				"uninstall",
			],
		});
	});

	test("protects only mutations the module declares, on modules that work while the game is stopped", () => {
		for (const [id, module] of Object.entries(modules)) {
			const actions = protectedActionsOf(module);

			if (actions.length === 0) {
				continue;
			}

			expect("requiresRunning" in module && module.requiresRunning === true, `${id} requires running`).toBe(false);

			for (const action of actions) {
				expect(declaredActionsOf(module), `${id} does not declare ${action}`).toContain(action);
			}
		}
	});

	test("leaves settings writes and the steam id lists unprotected, because a restart alone applies them", () => {
		for (const id of [
			"settings",
			"admins",
			"bans",
			"permitted",
		]) {
			const module = modules[id];

			expect(module === undefined ? [] : protectedActionsOf(module)).toEqual([]);
		}
	});

	test("leaves uploading, switching and creating a world unprotected, because none of them destroys a world", () => {
		const worldsModule = modules.worlds;
		const worldActionsModule = modules.worldActions;

		for (const action of [
			"add",
			"activate",
		]) {
			expect(worldsModule === undefined ? [] : declaredActionsOf(worldsModule)).toContain(action);
			expect(worldsModule === undefined ? [] : protectedActionsOf(worldsModule)).not.toContain(action);
		}

		expect(worldActionsModule === undefined ? [] : declaredActionsOf(worldActionsModule)).toContain("create");
		expect(worldActionsModule === undefined ? [] : protectedActionsOf(worldActionsModule)).toEqual([]);
	});

	test("leaves the mod catalog and the loader setup unprotected, because installing is additive and reversible", () => {
		const modsModule = modules.mods;
		const bepinexModule = modules.bepinex;

		expect(modsModule === undefined ? [] : protectedActionsOf(modsModule)).toEqual([]);
		expect(bepinexModule === undefined ? [] : declaredActionsOf(bepinexModule)).toContain("setup");
		expect(bepinexModule === undefined ? [] : protectedActionsOf(bepinexModule)).not.toContain("setup");
	});
});

describe("the mods tab", () => {
	test("shows the loader before the catalog, because nothing installs without it", () => {
		const mods = tabs.find((tab) => tab.id === "mods");

		expect((mods?.sections ?? []).map((section) => section.module)).toEqual([
			"loader",
			"bepinex",
			"settings",
			"mods",
		]);
	});

	test("keeps the bepinex switch on the settings form the start command reads", () => {
		const loading = formSection("mods", "loading");

		expect(loading?.target).toBe(BridgeFormTarget.Settings);
		expect((loading?.fields ?? []).map((field) => field.key)).toEqual([
			BEPINEX_FIELD,
		]);
	});

	test("installs the loader through its own action rather than through the catalog", () => {
		expect(PACK_ID).toBe("denikson-BepInExPack_Valheim");
	});
});

const steps = driver.setup?.steps ?? [];

describe("walking the customer through the first run", () => {
	test("names the server, settles how people reach it, then points at mods and the address", () => {
		expect(steps.map((step) => step.id)).toEqual([
			"name",
			"world",
			"mods",
			"invite",
		]);
	});

	test("blocks nothing, because a fresh valheim server already runs", () => {
		expect(steps.filter((step) => step.required !== false)).toEqual([]);
	});

	test("needs no driver step, so the setup declares no submit", () => {
		expect(steps.filter((step) => step.kind === BridgeSetupStepKind.Driver)).toEqual([]);
		expect(driver.setup?.submit).toBeUndefined();
	});

	test("points every form step at a form section the panel really declares", () => {
		for (const step of steps) {
			if (step.kind !== BridgeSetupStepKind.Form) {
				continue;
			}

			const section = formSection(step.tab, step.section);

			expect(section).not.toBeNull();

			for (const key of step.fields ?? []) {
				expect((section?.fields ?? []).map((field) => field.key)).toContain(key);
			}
		}
	});

	test("sends the invite step to the access page, where the address lives", () => {
		const invite = steps.find((step) => step.id === "invite");

		expect(invite?.kind === BridgeSetupStepKind.Open && invite.target.tab).toBe(GuideOpenTab.Access);
	});

	test("titles and explains every step in both arabic and english", () => {
		for (const step of steps) {
			expect(step.title.ar.length).toBeGreaterThan(0);
			expect(step.title.en.length).toBeGreaterThan(0);
			expect(step.help?.ar.length).toBeGreaterThan(0);
			expect(step.help?.en.length).toBeGreaterThan(0);
		}
	});
});
