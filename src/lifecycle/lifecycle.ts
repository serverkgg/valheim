import { type Bridge, BridgeKind, BridgeUserError } from "@serverkgg/bridge";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { execDetail } from "@serverkgg/bridge/utils";
import { packInstalled } from "../mods";
import {
	guardSettings,
	installRoot,
	metrics,
	readSettings,
	readVersionBanner,
	roster,
	SAVE_DIRECTORY,
	SERVER_BINARY,
	SERVER_READY,
	startCommand,
	watchMetrics,
	watchRoster,
} from "../shared";

const STOP_TIMEOUT_SECONDS = 180;

const SIGNAL_TIMEOUT_MS = 15_000;

export const lifecycle: Bridge.Lifecycle = {
	kind: BridgeKind.Lifecycle,
	ready: SERVER_READY,
	stopTimeoutSeconds: STOP_TIMEOUT_SECONDS,

	async command(context) {
		const settings = guardSettings(await readSettings(context));

		if (settings.bepinex && !(await packInstalled(context))) {
			throw new BridgeUserError({
				ar: "المودات مفعّلة بس BepInEx مو مركّب. ركّبه من تبويب المودات أو طفّي الخيار.",
				en: "Mods are on but BepInEx is not installed. Install it from the mods tab, or turn the option off.",
			});
		}

		const root = await installRoot(context);

		return startCommand({
			gamePort: context.port("game"),
			instanceId: context.server.code,
			savedir: `${root}/${SAVE_DIRECTORY}`,
			settings,
		});
	},

	async onReady(context) {
		roster.clear();
		metrics.clear();
		metrics.markReady();
		watchRoster(context);
		watchMetrics(context);

		await readVersionBanner(context);

		context.emit(BridgeEventName.ServerStarted);
	},

	async stop(context) {
		context.emit(BridgeEventName.ServerStopping);

		roster.clear();
		metrics.clear();

		const signalled = await context.exec(
			[
				"pkill",
				"--signal",
				"INT",
				"-f",
				SERVER_BINARY,
			],
			{
				timeoutMs: SIGNAL_TIMEOUT_MS,
			},
		);

		if (signalled.code !== 0) {
			context.log.warn("could not interrupt valheim, the supervisor will terminate it instead", {
				detail: execDetail(signalled),
			});
		}
	},
};
