import type { Bridge } from "@serverkgg/bridge";
import { parseVersion, VERSION_LINE, WORLD_SAVED_LINE } from "./valheimLog";

export const VERSION_TAIL_LINES = 400;

export interface ValheimMetricsSnapshot {
	readyAt: number | null;
	players: number | null;
	lastSaveAt: number | null;
	uptimeSeconds: number | null;
	version: string | null;
	network: string | null;
}

export interface ValheimMetricsSampler {
	markReady(at?: number): void;
	recordPlayers(online: number | null): void;
	recordSave(at?: number): void;
	recordVersion(version: string, network: string | null): void;
	snapshot(at?: number): ValheimMetricsSnapshot;
	clear(): void;
}

export const createMetricsSampler = (): ValheimMetricsSampler => {
	let readyAt: number | null = null;
	let players: number | null = null;
	let lastSaveAt: number | null = null;
	let version: string | null = null;
	let network: string | null = null;

	return {
		markReady(at = Date.now()) {
			readyAt = at;
		},

		recordPlayers(online) {
			players = online;
		},

		recordSave(at = Date.now()) {
			lastSaveAt = at;
		},

		recordVersion(next, nextNetwork) {
			version = next;
			network = nextNetwork;
		},

		snapshot(at = Date.now()) {
			return {
				lastSaveAt,
				network,
				players,
				readyAt,
				uptimeSeconds: readyAt === null ? null : Math.max(0, Math.floor((at - readyAt) / 1000)),
				version,
			};
		},

		clear() {
			readyAt = null;
			players = null;
			lastSaveAt = null;
			version = null;
			network = null;
		},
	};
};

export const metrics = createMetricsSampler();

let following = false;

export const watchMetrics = (context: Bridge.Context) => {
	if (following) {
		return;
	}

	following = true;

	context.logs.follow(WORLD_SAVED_LINE, () => {
		metrics.recordSave();
	});

	context.logs.follow(VERSION_LINE, (match) => {
		const banner = parseVersion(match.at(0) ?? "");

		if (banner) {
			metrics.recordVersion(banner.version, banner.network);
		}
	});
};

export const readVersionBanner = async (context: Bridge.Context) => {
	for (const line of await context.logs.tail(VERSION_TAIL_LINES)) {
		const banner = parseVersion(line);

		if (banner) {
			metrics.recordVersion(banner.version, banner.network);

			return banner;
		}
	}

	return null;
};
