import { describe, expect, test } from "bun:test";
import { BridgeFormTarget, BridgeLayout, BridgeSetupStepKind, BridgeUploadMode } from "@serverkgg/bridge";
import { GuideOpenTab } from "@serverkgg/bridge/guides";
import { isBridgeEventName } from "@serverkgg/bridge/protocol";
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

	test("declares a terminal with no commands, because the dedicated server has no console", () => {
		expect(driver.terminal?.commands).toEqual([]);
		expect(driver.terminal?.rules?.length).toBeGreaterThan(0);
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

	test("archives the save directory and the settings the driver owns, and nothing else", () => {
		expect(manifest.backup.only).toEqual([
			`${SAVE_DIRECTORY}/**`,
			SETTINGS_FILE,
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
		expect(manifest.presence.id).toBe("steamId");
		expect(manifest.presence.fields.map((field) => field.key)).toEqual([
			"steamId",
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

describe("the access tab covering all three lists valheim reads", () => {
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
