import { describe, expect, test } from "bun:test";
import { environmentPrefix, startCommand, worldModifierArgs } from "./valheimArgv";
import { settingsOf } from "./valheimSettings";

const settings = (over: Record<string, unknown> = {}) => {
	return settingsOf({
		name: "Serverk Valheim",
		password: "vikings",
		public: true,
		crossplay: false,
		world: "Serverk",
		saveinterval: 1800,
		backups: 4,
		backupshort: 7200,
		backuplong: 43_200,
		...over,
	} as Record<string, string | number | boolean | null>);
};

const command = (over: Record<string, unknown> = {}) => {
	return startCommand({
		gamePort: 9700,
		savedir: "/home/container/save",
		settings: settings(over),
	});
};

const valueAfter = (argv: string[], flag: string) => {
	const index = argv.indexOf(flag);

	return index < 0 ? null : (argv.at(index + 1) ?? null);
};

describe("building the valheim start command", () => {
	test("starts with an env prefix so nothing is exported outside the volume", () => {
		expect(command().at(0)).toBe("env");
	});

	test("starts the server binary itself, so the bridge holds the game and not a shell", () => {
		expect(command()).toContain("./valheim_server.x86_64");
	});

	test("takes the game port from the manifest rather than valheim's default", () => {
		expect(valueAfter(command(), "-port")).toBe("9700");
	});

	test("never passes a query port, because valheim always derives it from the game port", () => {
		expect(command()).not.toContain("-queryport");
	});

	test("saves inside the volume, so nothing lands in the home config directory", () => {
		expect(valueAfter(command(), "-savedir")).toBe("/home/container/save");
	});

	test("passes the name, the world and the password the settings carry", () => {
		expect(valueAfter(command(), "-name")).toBe("Serverk Valheim");
		expect(valueAfter(command(), "-world")).toBe("Serverk");
		expect(valueAfter(command(), "-password")).toBe("vikings");
	});

	test("writes public as the 1 or 0 valheim expects", () => {
		expect(valueAfter(command(), "-public")).toBe("1");
		expect(
			valueAfter(
				command({
					public: false,
				}),
				"-public",
			),
		).toBe("0");
	});

	test("adds crossplay only when it is on", () => {
		expect(command()).not.toContain("-crossplay");
		expect(
			command({
				crossplay: true,
			}),
		).toContain("-crossplay");
	});

	test("passes every save and backup number through", () => {
		const argv = command();

		expect(valueAfter(argv, "-saveinterval")).toBe("1800");
		expect(valueAfter(argv, "-backups")).toBe("4");
		expect(valueAfter(argv, "-backupshort")).toBe("7200");
		expect(valueAfter(argv, "-backuplong")).toBe("43200");
	});
});

describe("switching the start command onto bepinex", () => {
	test("loads only the game library path while mods are off", () => {
		expect(environmentPrefix(false)).toEqual([
			"env",
			"LD_LIBRARY_PATH=./linux64",
			"SteamAppId=892970",
		]);
	});

	test("adds every doorstop variable the bepinex pack's own script sets", () => {
		expect(environmentPrefix(true)).toEqual([
			"env",
			"LD_LIBRARY_PATH=./doorstop_libs:./linux64",
			"SteamAppId=892970",
			"DOORSTOP_ENABLED=1",
			"DOORSTOP_TARGET_ASSEMBLY=./BepInEx/core/BepInEx.Preloader.dll",
			"LD_PRELOAD=libdoorstop_x64.so",
		]);
	});

	test("keeps the doorstop variables in front of the binary", () => {
		const argv = command({
			bepinex: true,
		});

		expect(argv.indexOf("DOORSTOP_ENABLED=1")).toBeLessThan(argv.indexOf("./valheim_server.x86_64"));
	});
});

describe("building the world modifier arguments", () => {
	test("passes nothing when the owner changed nothing", () => {
		expect(worldModifierArgs(settings())).toEqual([]);
	});

	test("puts the preset first, because a preset overwrites what comes before it", () => {
		const args = worldModifierArgs(
			settings({
				preset: "hard",
				combat: "veryhard",
			}),
		);

		expect(args.at(0)).toBe("-preset");
		expect(args.at(1)).toBe("hard");
		expect(args.indexOf("-modifier")).toBeGreaterThan(1);
	});

	test("writes every modifier as the key and value pair valheim reads", () => {
		expect(
			worldModifierArgs(
				settings({
					deathPenalty: "casual",
					raids: "none",
				}),
			),
		).toEqual([
			"-modifier",
			"deathPenalty",
			"casual",
			"-modifier",
			"raids",
			"none",
		]);
	});

	test("drops a modifier value valheim does not accept", () => {
		expect(
			worldModifierArgs(
				settings({
					combat: "impossible",
				}),
			),
		).toEqual([]);
	});

	test("writes each checkbox as its own setkey", () => {
		expect(
			worldModifierArgs(
				settings({
					nomap: true,
					passivemobs: true,
				}),
			),
		).toEqual([
			"-setkey",
			"passivemobs",
			"-setkey",
			"nomap",
		]);
	});
});
