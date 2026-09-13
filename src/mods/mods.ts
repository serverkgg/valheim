import { type Bridge, BridgeFailureCode, BridgeFailureError, BridgeKind, BridgeUserError } from "@serverkgg/bridge";
import {
	type ThunderstoreCatalog,
	ThunderstoreSort,
	type ThunderstoreVersion,
	thunderstoreDependency,
	thunderstoreDownloadUrl,
} from "@serverkgg/bridge/catalogs";
import { execDetail } from "@serverkgg/bridge/utils";
import { STAGING_ROOT } from "../shared";
import { catalogOf, PACK_ID, packInstalled, requirePack } from "./bepinexPack";
import {
	CONFIG_DIRECTORY,
	DISABLED_DIRECTORY,
	disabledPath,
	enabledPath,
	type ModEntry,
	type ModsSidecar,
	modId,
	PATCHERS_DIRECTORY,
	PLUGINS_DIRECTORY,
	readSidecar,
	splitModId,
	writeSidecar,
} from "./modsSidecar";

const PAGE_SIZE = 20;

const DEPENDENCY_LIMIT = 32;

const MOD_STAGING = `${STAGING_ROOT}/mod`;

const METADATA_FILES = [
	"manifest.json",
	"icon.png",
	"README.md",
	"CHANGELOG.md",
	"LICENSE",
	"LICENSE.md",
];

const SORTS: Bridge.CatalogFacet[] = [
	{
		value: ThunderstoreSort.MostDownloaded,
		label: {
			ar: "الأكثر تحميلًا",
			en: "Most downloaded",
		},
	},
	{
		value: ThunderstoreSort.TopRated,
		label: {
			ar: "الأعلى تقييمًا",
			en: "Top rated",
		},
	},
	{
		value: ThunderstoreSort.LastUpdated,
		label: {
			ar: "آخر تحديث",
			en: "Recently updated",
		},
	},
	{
		value: ThunderstoreSort.Newest,
		label: {
			ar: "الأحدث",
			en: "Newest",
		},
	},
];

const PROVIDER = "thunderstore";

const NOT_READY_NOTE: Bridge.Text = {
	ar: "ركّب BepInEx أول من فوق، بعدها تقدر تنزّل المودات من هنا.",
	en: "Install BepInEx above first, then you can install mods from here.",
};

const providersOf = (ready: boolean): Bridge.CatalogProvider[] => {
	return [
		{
			id: PROVIDER,
			label: {
				ar: "ثندرستور",
				en: "Thunderstore",
			},
			ready,
			...(ready
				? {}
				: {
						note: NOT_READY_NOTE,
					}),
		},
	];
};

const sortOf = (value: string | null) => {
	const sorts: string[] = Object.values(ThunderstoreSort);

	return value !== null && sorts.includes(value) ? (value as ThunderstoreSort) : ThunderstoreSort.MostDownloaded;
};

export const isMetadataFile = (name: string) => {
	return METADATA_FILES.some((entry) => entry.toLowerCase() === name.toLowerCase());
};

const stagingFor = (id: string) => {
	return `${MOD_STAGING}/${id}`;
};

const copyTree = async (context: Bridge.Context, from: string, to: string) => {
	await context.files.ensure(to);

	const copied = await context.exec([
		"cp",
		"-a",
		`${from}/.`,
		to,
	]);

	if (copied.code !== 0) {
		throw new Error(`the mod files could not be copied — ${execDetail(copied)}`);
	}
};

const fileNames = async (context: Bridge.Context, directory: string) => {
	return (await context.files.list(`${directory}/*`)).map((entry) => entry.name);
};

const topLevelNames = async (context: Bridge.Context, directory: string) => {
	const listed = await context.exec([
		"find",
		directory,
		"-mindepth",
		"1",
		"-maxdepth",
		"1",
		"-printf",
		"%f\\n",
	]);

	if (listed.code !== 0) {
		throw new Error(`the mod folder could not be read — ${execDetail(listed)}`);
	}

	return listed.stdout.split("\n").filter((name) => name.length > 0);
};

const titleOf = (version: ThunderstoreVersion) => {
	return version.name.replaceAll("_", " ");
};

const extractMod = async (context: Bridge.Context, archive: string, staging: string, version: ThunderstoreVersion) => {
	try {
		await context.files.extract(archive, staging, {
			tree: true,
		});
	} catch (error) {
		context.log.error("could not unpack a mod", {
			mod: version.full_name,
			reason: error instanceof Error ? error.message : String(error),
		});

		throw new BridgeUserError({
			ar: `ما قدرنا نفك ملفات "${titleOf(version)}". جرّب مرة ثانية، وإذا تكرر اختر مود ثاني.`,
			en: `We could not unpack "${titleOf(version)}". Try again, and if it keeps failing pick another mod.`,
		});
	}
};

const removePaths = async (context: Bridge.Context, paths: string[]) => {
	for (const path of paths) {
		if (await context.files.exists(path)) {
			await context.files.remove(path);
		}
	}
};

const forget = async (context: Bridge.Context, sidecar: ModsSidecar, id: string) => {
	const tracked = sidecar[id];

	await removePaths(context, [
		enabledPath(id),
		disabledPath(id),
		...(tracked?.extras ?? []),
	]);

	delete sidecar[id];
};

interface UnpackResult {
	sizeBytes: number;
	extras: string[];
}

const unpack = async (context: Bridge.Context, id: string, version: ThunderstoreVersion): Promise<UnpackResult> => {
	const staging = stagingFor(id);
	const archive = `${staging}.zip`;

	await removePaths(context, [
		staging,
		archive,
	]);

	try {
		await context.files.ensure(staging);

		await context.files.download(archive, thunderstoreDownloadUrl(version.full_name));

		await extractMod(context, archive, staging, version);

		for (const name of await fileNames(context, staging)) {
			if (isMetadataFile(name)) {
				await context.files.remove(`${staging}/${name}`);
			}
		}

		const extras: string[] = [];

		let source = staging;

		if (await context.files.exists(`${staging}/BepInEx`)) {
			for (const [name, target] of [
				[
					"patchers",
					PATCHERS_DIRECTORY,
				],
				[
					"config",
					CONFIG_DIRECTORY,
				],
			] as const) {
				const nested = `${staging}/BepInEx/${name}`;

				if (!(await context.files.exists(nested))) {
					continue;
				}

				for (const entry of await topLevelNames(context, nested)) {
					extras.push(`${target}/${entry}`);
				}

				await copyTree(context, nested, target);
				await context.files.remove(nested);
			}

			source = (await context.files.exists(`${staging}/BepInEx/plugins`))
				? `${staging}/BepInEx/plugins`
				: `${staging}/BepInEx`;
		}

		await removePaths(context, [
			enabledPath(id),
			disabledPath(id),
		]);

		try {
			await copyTree(context, source, enabledPath(id));
		} catch (error) {
			await removePaths(context, [
				enabledPath(id),
			]);

			throw error;
		}

		return {
			sizeBytes: await context.files.size(enabledPath(id)),
			extras,
		};
	} finally {
		await removePaths(context, [
			staging,
			archive,
		]);
	}
};

const entryOf = (id: string, version: ThunderstoreVersion, unpacked: UnpackResult): ModEntry => {
	return {
		id,
		fullName: version.full_name,
		namespace: version.namespace,
		name: version.name,
		version: version.version_number,
		title: titleOf(version),
		icon: version.icon,
		pageUrl: version.website_url,
		sizeBytes: unpacked.sizeBytes,
		extras: unpacked.extras,
	};
};

const catalogEntryOf = (entry: ModEntry, enabled: boolean): Bridge.CatalogEntry => {
	return {
		id: entry.id,
		provider: PROVIDER,
		path: enabled ? enabledPath(entry.id) : disabledPath(entry.id),
		title: entry.title,
		version: entry.version,
		sizeBytes: entry.sizeBytes,
		enabled,
		gameVersion: null,
		stale: false,
		pageUrl: entry.pageUrl,
		icon: entry.icon,
	};
};

const resolveVersion = async (catalog: ThunderstoreCatalog, id: string) => {
	const parts = splitModId(id);

	if (!parts) {
		throw new BridgeUserError({
			ar: `"${id}" مو معرّف حزمة صحيح على ثندرستور.`,
			en: `"${id}" is not a Thunderstore package identifier.`,
		});
	}

	const pack = await catalog.resolve(parts.namespace, parts.name);

	return pack.latest;
};

const dependencyPlan = async (catalog: ThunderstoreCatalog, version: ThunderstoreVersion, installed: Set<string>) => {
	const plan: ThunderstoreVersion[] = [];
	const seen = new Set<string>();

	const walk = async (current: ThunderstoreVersion, depth: number) => {
		const id = modId(current.namespace, current.name);

		if (seen.has(id) || plan.length >= DEPENDENCY_LIMIT || depth > DEPENDENCY_LIMIT) {
			return;
		}

		seen.add(id);

		for (const reference of current.dependencies) {
			const dependency = thunderstoreDependency(reference);

			if (!dependency) {
				continue;
			}

			const dependencyId = modId(dependency.namespace, dependency.name);

			if (dependencyId === PACK_ID || installed.has(dependencyId) || seen.has(dependencyId)) {
				continue;
			}

			await walk(await catalog.version(dependency.namespace, dependency.name, dependency.version), depth + 1);
		}

		plan.push(current);
	};

	await walk(version, 0);

	return plan;
};

let lock: Promise<unknown> = Promise.resolve();

const exclusive = <Result>(run: () => Promise<Result>): Promise<Result> => {
	const next = lock.then(run, run);

	lock = next.catch(() => undefined);

	return next;
};

const installPackage = async (context: Bridge.Context, id: string): Promise<Bridge.CatalogEntry> => {
	await requirePack(context);

	const catalog = catalogOf(context);
	const version = await resolveVersion(catalog, id);

	if (!version.is_active) {
		throw new BridgeFailureError(
			BridgeFailureCode.NoCatalogVersionAvailable,
			`"${version.full_name}" has no active version on thunderstore`,
		);
	}

	const sidecar = await readSidecar(context);
	const plan = await dependencyPlan(catalog, version, new Set(Object.keys(sidecar)));

	let installed: ModEntry | null = null;

	for (const step of plan) {
		const stepId = modId(step.namespace, step.name);
		const entry = entryOf(stepId, step, await unpack(context, stepId, step));

		sidecar[stepId] = entry;

		await writeSidecar(context, sidecar);

		context.log("installed a mod", {
			mod: entry.fullName,
			dependency: stepId !== id,
		});

		context.emit("ModLoaded", {
			mod: entry.title,
			version: entry.version,
		});

		if (stepId === id) {
			installed = entry;
		}
	}

	if (!installed) {
		throw new Error(`the install plan for ${id} never reached the package itself`);
	}

	return catalogEntryOf(installed, true);
};

const removePackage = async (context: Bridge.Context, id: string) => {
	const sidecar = await readSidecar(context);

	if (!sidecar[id]) {
		throw new BridgeUserError({
			ar: `"${id}" مو مركّب.`,
			en: `"${id}" is not installed.`,
		});
	}

	await forget(context, sidecar, id);
	await writeSidecar(context, sidecar);

	context.log("removed a mod", {
		mod: id,
	});
};

const togglePackage = async (context: Bridge.Context, id: string, enabled: boolean) => {
	const sidecar = await readSidecar(context);

	if (!sidecar[id]) {
		throw new BridgeUserError({
			ar: `"${id}" مو مركّب.`,
			en: `"${id}" is not installed.`,
		});
	}

	const active = enabledPath(id);
	const parked = disabledPath(id);

	if (enabled && (await context.files.exists(parked))) {
		await context.files.ensure(PLUGINS_DIRECTORY);
		await removePaths(context, [
			active,
		]);
		await context.files.move(parked, active);
	}

	if (!enabled && (await context.files.exists(active))) {
		await context.files.ensure(DISABLED_DIRECTORY);
		await removePaths(context, [
			parked,
		]);
		await context.files.move(active, parked);
	}
};

export const mods: Bridge.Catalog = {
	kind: BridgeKind.Catalog,
	protectedActions: [
		"install",
		"remove",
		"toggle",
	],
	pageSize: PAGE_SIZE,

	async search(context, query) {
		const ready = await packInstalled(context);
		const providers = providersOf(ready);
		const catalog = catalogOf(context);

		const page = await catalog.search({
			query: query.query,
			page: query.page + 1,
			sort: sortOf(query.sort),
		});

		return {
			hits: page.results
				.filter((listing) => modId(listing.namespace, listing.name) !== PACK_ID)
				.map((listing) => {
					return {
						id: modId(listing.namespace, listing.name),
						provider: PROVIDER,
						title: listing.name.replaceAll("_", " "),
						description: listing.description,
						icon: listing.icon_url,
						downloads: listing.download_count,
						author: listing.namespace,
						categories: listing.categories.map((category) => category.name),
						updatedAt: listing.last_updated,
						pageUrl: `https://thunderstore.io/c/valheim/p/${listing.namespace}/${listing.name}/`,
					};
				}),
			total: page.count,
			providers,
			categories: [],
			sorts: SORTS,
		};
	},

	async installed(context) {
		const sidecar = await readSidecar(context);
		const entries: Bridge.CatalogEntry[] = [];

		for (const entry of Object.values(sidecar)) {
			entries.push(catalogEntryOf(entry, await context.files.exists(enabledPath(entry.id))));
		}

		return entries;
	},

	async install(context, id) {
		return await exclusive(() => installPackage(context, id));
	},

	async remove(context, id) {
		await exclusive(() => removePackage(context, id));
	},

	async toggle(context, id, enabled) {
		await exclusive(() => togglePackage(context, id, enabled));
	},
};
