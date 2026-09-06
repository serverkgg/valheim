import { describe, expect, test } from "bun:test";
import { branchOption, parseBranches } from "./valheimBranch";

const response = {
	data: {
		"896660": {
			depots: {
				branches: {
					public: {
						buildid: "21981590",
						timeupdated: "1771576792",
					},
					default_old: {
						buildid: "20460518",
						description: "Previous stable",
					},
					locked: {
						buildid: "1",
						description: "Internal",
						pwdrequired: "1",
					},
				},
			},
		},
	},
};

describe("reading the branches steam publishes for the valheim server", () => {
	test("lists the public branch first, because it is the one almost everybody wants", () => {
		expect(parseBranches(response, "896660").at(0)?.name).toBe("public");
	});

	test("drops a branch that needs a password we do not have", () => {
		expect(parseBranches(response, "896660").map((branch) => branch.name)).toEqual([
			"public",
			"default_old",
		]);
	});

	test("keeps the description and the build id steam gives", () => {
		const old = parseBranches(response, "896660").at(1);

		expect(old?.description).toBe("Previous stable");
		expect(old?.buildId).toBe("20460518");
	});

	test("answers with nothing for an app steam did not describe", () => {
		expect(parseBranches(response, "1")).toEqual([]);
		expect(parseBranches({}, "896660")).toEqual([]);
	});
});

describe("turning a branch into a panel option", () => {
	test("marks the public branch as the latest one", () => {
		expect(
			branchOption({
				name: "public",
				description: null,
				buildId: "1",
			}).latest,
		).toBe(true);
	});

	test("labels an older branch with its description and its build", () => {
		expect(
			branchOption({
				name: "default_old",
				description: "Previous stable",
				buildId: "20460518",
			}).label.en,
		).toBe("Previous stable — build 20460518");
	});

	test("falls back to the branch name when steam gave no description", () => {
		expect(
			branchOption({
				name: "default_preml",
				description: null,
				buildId: null,
			}).label.en,
		).toBe("default_preml");
	});
});
