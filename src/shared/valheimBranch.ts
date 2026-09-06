import type { Bridge } from "@serverkgg/bridge";
import { PUBLIC_BRANCH, STEAM_APP_ID, STEAM_APP_INFO } from "./valheimApp";

const BRANCH_CACHE_SECONDS = 3600;

const BRANCH_NAME = /^[a-z0-9][a-z0-9._-]{0,63}$/;

export interface SteamBranch {
	name: string;
	description: string | null;
	buildId: string | null;
}

interface AppInfoBranch {
	buildid?: string;
	description?: string;
	pwdrequired?: string | number | boolean;
}

interface AppInfoResponse {
	data?: Record<
		string,
		{
			depots?: {
				branches?: Record<string, AppInfoBranch>;
			};
		}
	>;
}

export const parseBranches = (response: AppInfoResponse, appId: string): SteamBranch[] => {
	const branches = response.data?.[appId]?.depots?.branches ?? {};
	const parsed: SteamBranch[] = [];

	for (const [name, branch] of Object.entries(branches)) {
		const required = branch.pwdrequired;
		const locked = required === true || required === 1 || required === "1";

		if (locked || !BRANCH_NAME.test(name)) {
			continue;
		}

		parsed.push({
			name,
			description:
				typeof branch.description === "string" && branch.description.trim().length > 0
					? branch.description.trim()
					: null,
			buildId: typeof branch.buildid === "string" ? branch.buildid : null,
		});
	}

	return parsed.sort((left, right) => {
		if (left.name === PUBLIC_BRANCH) {
			return -1;
		}

		if (right.name === PUBLIC_BRANCH) {
			return 1;
		}

		return left.name.localeCompare(right.name);
	});
};

export const PUBLIC_OPTION: Bridge.Option = {
	value: PUBLIC_BRANCH,
	label: {
		ar: "الإصدار الحالي (public)",
		en: "Current release (public)",
	},
	help: {
		ar: "آخر إصدار رسمي من فالهايم. هذا اللي تبيه إلا إذا عندك سبب.",
		en: "The current Valheim release. This is the one you want unless you have a reason.",
	},
	latest: true,
};

export const branchOption = (branch: SteamBranch): Bridge.Option => {
	if (branch.name === PUBLIC_BRANCH) {
		return PUBLIC_OPTION;
	}

	const build = branch.buildId === null ? "" : ` — build ${branch.buildId}`;

	return {
		value: branch.name,
		label: {
			ar: `${branch.description ?? branch.name}${build}`,
			en: `${branch.description ?? branch.name}${build}`,
		},
		help: {
			ar: "نسخة قديمة يثبّتها فالهايم على Steam. اللاعبين لازم ينزّلون نفس النسخة عشان يدخلون.",
			en: "An older build Iron Gate pins on Steam. Players must run the same build to join.",
		},
	};
};

export const steamBranches = async (context: Bridge.Context): Promise<SteamBranch[]> => {
	const response = await context.net.json<AppInfoResponse>(STEAM_APP_INFO, {
		cacheSeconds: BRANCH_CACHE_SECONDS,
	});

	return parseBranches(response, STEAM_APP_ID);
};
