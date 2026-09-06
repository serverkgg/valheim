import { type Bridge, BridgeDetailFormat, BridgeDetailTone, BridgeKind } from "@serverkgg/bridge";
import { booleanOf, CROSSPLAY_FIELD, readSettings, roster, settingsOf, watchRoster } from "../shared";

export const session: Bridge.Detail = {
	kind: BridgeKind.Detail,
	requiresRunning: true,

	async read(context) {
		watchRoster(context);

		const stored = await readSettings(context);
		const settings = settingsOf(stored);
		const crossplay = booleanOf(stored[CROSSPLAY_FIELD] ?? null, false);
		const current = roster.session();

		if (!crossplay) {
			return null;
		}

		return {
			id: "join-code",
			title: {
				ar: "كود الدخول (Crossplay)",
				en: "Crossplay join code",
			},
			subtitle: {
				ar: "اللاعب يفتح Join Game ➜ Join by code ويكتب هذا الرقم.",
				en: "A player opens Join Game, then Join by code, and types this number.",
			},
			description: current
				? null
				: {
						ar: "لسه ما وصلنا الكود. فالهايم يطبعه بعد ما يسجّل نفسه عند PlayFab، خذ لك دقيقة وارجع.",
						en: "The code has not arrived yet. Valheim prints it once it registers with PlayFab — give it a minute.",
					},
			image: null,
			badges: [
				{
					label: current
						? {
								ar: "الجلسة شغّالة",
								en: "Session live",
							}
						: {
								ar: "ننتظر الكود",
								en: "Waiting for the code",
							},
					tone: current ? BridgeDetailTone.Success : BridgeDetailTone.Warning,
				},
			],
			stats: [
				{
					key: "joinCode",
					label: {
						ar: "كود الدخول",
						en: "Join code",
					},
					value: current?.joinCode ?? "—",
					format: BridgeDetailFormat.Text,
				},
				{
					key: "session",
					label: {
						ar: "اسم الجلسة",
						en: "Session name",
					},
					value: current?.session.length ? current.session : settings.name,
					format: BridgeDetailFormat.Text,
				},
			],
			links: [],
			stale: false,
			actions: [],
		};
	},
};
