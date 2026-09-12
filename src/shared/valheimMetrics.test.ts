import { describe, expect, test } from "bun:test";
import { createMetricsSampler } from "./valheimMetrics";

const START = 1_700_000_000_000;

describe("sampling what a running valheim server knows about itself", () => {
	test("answers with nothing before the server ever reached ready", () => {
		expect(createMetricsSampler().snapshot(START)).toEqual({
			lastSaveAt: null,
			network: null,
			players: null,
			readyAt: null,
			uptimeSeconds: null,
			version: null,
		});
	});

	test("counts uptime from the ready mark rather than from the container", () => {
		const sampler = createMetricsSampler();

		sampler.markReady(START);

		expect(sampler.snapshot(START + 90_000).uptimeSeconds).toBe(90);
	});

	test("never reports a negative uptime when the clock moves backwards", () => {
		const sampler = createMetricsSampler();

		sampler.markReady(START);

		expect(sampler.snapshot(START - 5000).uptimeSeconds).toBe(0);
	});

	test("keeps the newest save, the newest player count and the version banner", () => {
		const sampler = createMetricsSampler();

		sampler.markReady(START);
		sampler.recordSave(START + 1000);
		sampler.recordSave(START + 2000);
		sampler.recordPlayers(3);
		sampler.recordVersion("l-0.220.3", "16");

		expect(sampler.snapshot(START + 3000)).toEqual({
			lastSaveAt: START + 2000,
			network: "16",
			players: 3,
			readyAt: START,
			uptimeSeconds: 3,
			version: "l-0.220.3",
		});
	});

	test("keeps a banner that printed no network version", () => {
		const sampler = createMetricsSampler();

		sampler.recordVersion("0.217.14", null);

		expect(sampler.snapshot(START).network).toBeNull();
		expect(sampler.snapshot(START).version).toBe("0.217.14");
	});

	test("forgets everything on a restart, so a stopped server shows no stale numbers", () => {
		const sampler = createMetricsSampler();

		sampler.markReady(START);
		sampler.recordSave(START);
		sampler.recordPlayers(4);
		sampler.recordVersion("l-0.220.3", "16");
		sampler.clear();

		expect(sampler.snapshot(START).uptimeSeconds).toBeNull();
		expect(sampler.snapshot(START).players).toBeNull();
		expect(sampler.snapshot(START).version).toBeNull();
	});
});
