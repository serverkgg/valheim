import type { BridgeDriver } from "@serverkgg/bridge";
import { worldActions } from "./actions";
import { backup } from "./backup";
import { admins, bans, permitted, players } from "./collections";
import { session } from "./details";
import { events } from "./events";
import { install } from "./install";
import { lifecycle } from "./lifecycle";
import { bepinex, loader, mods } from "./mods";
import { branches } from "./options";
import { panel } from "./panel";
import { query } from "./query";
import { settings } from "./settings";
import { setup } from "./setup";
import { terminal } from "./terminal";
import { worlds } from "./worlds";

export const driver: BridgeDriver = {
	install,
	lifecycle,
	events,
	query,
	backup,
	setup,
	terminal,
	panel,
	modules: {
		settings,
		branches,
		worlds,
		worldActions,
		players,
		session,
		admins,
		bans,
		permitted,
		loader,
		bepinex,
		mods,
	},
};
