import { SERVER_BINARY, STEAM_CLIENT_APP_ID } from "./valheimApp";
import { MODIFIER_KEYS, type ValheimSettings } from "./valheimSettings";

export const DOORSTOP_ASSEMBLY = "./BepInEx/core/BepInEx.Preloader.dll";

export const DOORSTOP_LIBRARY = "libdoorstop_x64.so";

export const DOORSTOP_LIBRARY_PATH = "./doorstop_libs";

export const GAME_LIBRARY_PATH = "./linux64";

export interface ValheimStart {
	gamePort: number;
	savedir: string;
	settings: ValheimSettings;
}

export const environmentPrefix = (bepinex: boolean) => {
	const environment = [
		`LD_LIBRARY_PATH=${bepinex ? `${DOORSTOP_LIBRARY_PATH}:${GAME_LIBRARY_PATH}` : GAME_LIBRARY_PATH}`,
		`SteamAppId=${STEAM_CLIENT_APP_ID}`,
	];

	if (bepinex) {
		environment.push(
			"DOORSTOP_ENABLED=1",
			`DOORSTOP_TARGET_ASSEMBLY=${DOORSTOP_ASSEMBLY}`,
			`LD_PRELOAD=${DOORSTOP_LIBRARY}`,
		);
	}

	return [
		"env",
		...environment,
	];
};

export const worldModifierArgs = (settings: ValheimSettings) => {
	const args: string[] = [];

	if (settings.preset.length > 0) {
		args.push("-preset", settings.preset);
	}

	for (const key of Object.keys(MODIFIER_KEYS)) {
		const value = settings.modifiers[key];

		if (value !== undefined && value.length > 0) {
			args.push("-modifier", key, value);
		}
	}

	for (const key of settings.setKeys) {
		args.push("-setkey", key);
	}

	return args;
};

export const startCommand = (start: ValheimStart): string[] => {
	const { settings } = start;

	return [
		...environmentPrefix(settings.bepinex),
		`./${SERVER_BINARY}`,
		"-name",
		settings.name,
		"-port",
		String(start.gamePort),
		"-world",
		settings.world,
		"-password",
		settings.password,
		"-public",
		settings.public ? "1" : "0",
		...(settings.crossplay
			? [
					"-crossplay",
				]
			: []),
		"-savedir",
		start.savedir,
		"-saveinterval",
		String(settings.saveInterval),
		"-backups",
		String(settings.backups),
		"-backupshort",
		String(settings.backupShort),
		"-backuplong",
		String(settings.backupLong),
		...worldModifierArgs(settings),
	];
};
