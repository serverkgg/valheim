import { describe, expect, it } from "bun:test";
import { BridgeTerminalLevel } from "@serverkgg/bridge";
import { PUBLIC_IP_LOOP_LINE } from "../shared";
import { terminal } from "./terminal";

const PUBLIC_IP_LOOP_EXCEPTION =
	"Exception while waiting for respons from https://api6.ipify.org -> System.InvalidOperationException: This instance has already started one or more requests. Properties can only be modified before sending the first request.";

const PUBLIC_IP_LOOP_ROUND = [
	PUBLIC_IP_LOOP_EXCEPTION,
	"  at System.Net.Http.HttpClient.CheckDisposedOrStarted () [0x00010] in <b40a11c7e558480c8010e5eef077b1e0>:0",
	"  at System.Net.Http.HttpClient.set_Timeout (System.TimeSpan value) [0x00032] in <b40a11c7e558480c8010e5eef077b1e0>:0",
	"  at ZNet.<GetPublicIP>g__DownloadStringAsync|15_1 (System.String downloadUrl, System.Int32 timeoutMS) [0x00027] in <e8e9a68025ea4b87bdd407412665a2ad>:0",
	"09/11/2026 15:44:37: Could not extract valid IP address from externalIP download string.",
];

const ruleOf = (line: string) => {
	return (terminal.rules ?? []).find((candidate) => candidate.match.test(line)) ?? null;
};

describe("naming valheim's public ip lookup loop in the terminal", () => {
	it("marks the exception line the loop repeats as an error under its own rule", () => {
		const rule = ruleOf(PUBLIC_IP_LOOP_EXCEPTION);

		expect(rule?.match).toBe(PUBLIC_IP_LOOP_LINE);
		expect(rule?.level).toBe(BridgeTerminalLevel.Error);
	});

	it("matches only the exception line of the five the loop prints each round", () => {
		expect(PUBLIC_IP_LOOP_ROUND.filter((line) => PUBLIC_IP_LOOP_LINE.test(line))).toEqual([
			PUBLIC_IP_LOOP_EXCEPTION,
		]);
	});

	it("leaves the ordinary valheim lines to the rules they already had", () => {
		for (const line of [
			"Valheim version: l-0.220.3 (network version 16)",
			'12/02/2025 19:04:11: Got connection "V_76561198000000001"',
			"Game server connected",
		]) {
			expect(ruleOf(line)?.match).not.toBe(PUBLIC_IP_LOOP_LINE);
		}
	});
});
