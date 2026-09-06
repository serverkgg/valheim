import { describe, expect, test } from "bun:test";
import { disabledPath, enabledPath, modId, parseSidecar, serializeSidecar, splitModId } from "./modsSidecar";

const entry = {
	id: "ValheimModding-Jotunn",
	fullName: "ValheimModding-Jotunn-2.24.3",
	namespace: "ValheimModding",
	name: "Jotunn",
	version: "2.24.3",
	title: "Jotunn",
	icon: null,
	pageUrl: null,
	sizeBytes: 2048,
	extras: [],
};

describe("identifying a thunderstore package", () => {
	test("joins the namespace and the name the way thunderstore does", () => {
		expect(modId("ValheimModding", "Jotunn")).toBe("ValheimModding-Jotunn");
	});

	test("splits back, because thunderstore names never carry a dash", () => {
		expect(splitModId("ValheimModding-Jotunn")).toEqual({
			namespace: "ValheimModding",
			name: "Jotunn",
		});
	});

	test("refuses anything that is not exactly a namespace and a name", () => {
		expect(splitModId("Jotunn")).toBeNull();
		expect(splitModId("ValheimModding-Jotunn-2.24.3")).toBeNull();
	});
});

describe("placing a mod on disk", () => {
	test("puts an enabled mod where bepinex scans", () => {
		expect(enabledPath(entry.id)).toBe("BepInEx/plugins/ValheimModding-Jotunn");
	});

	test("parks a disabled mod outside that scan, so bepinex cannot load it", () => {
		expect(disabledPath(entry.id)).toBe("BepInEx/disabled/ValheimModding-Jotunn");
		expect(disabledPath(entry.id).startsWith("BepInEx/plugins")).toBe(false);
	});
});

describe("the mods sidecar", () => {
	test("round trips what the catalog installed", () => {
		expect(
			parseSidecar(
				serializeSidecar({
					[entry.id]: entry,
				}),
			),
		).toEqual({
			[entry.id]: entry,
		});
	});

	test("answers with an empty sidecar rather than throwing on a broken file", () => {
		expect(parseSidecar("{ not json")).toEqual({});
		expect(parseSidecar("[]")).toEqual({});
		expect(parseSidecar("")).toEqual({});
	});
});
