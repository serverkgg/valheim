import {
	type Bridge,
	BridgeConfirm,
	BridgeControl,
	BridgeFormTarget,
	BridgeIcon,
	BridgeLayout,
	BridgePlace,
	BridgeUploadMode,
} from "@serverkgg/bridge";
import { WORLD_NAME_ARGUMENT } from "../actions";
import {
	BACKUP_LONG_FIELD,
	BACKUP_LONG_MAX,
	BACKUP_LONG_MIN,
	BACKUP_SHORT_FIELD,
	BACKUP_SHORT_MAX,
	BACKUP_SHORT_MIN,
	BACKUPS_FIELD,
	BACKUPS_MAX,
	BACKUPS_MIN,
	BEPINEX_FIELD,
	BRANCH_VARIABLE,
	COMBAT_FIELD,
	CROSSPLAY_FIELD,
	DEATH_PENALTY_FIELD,
	NAME_FIELD,
	NAME_LENGTH,
	NO_BUILD_COST_FIELD,
	NO_MAP_FIELD,
	PASSIVE_MOBS_FIELD,
	PASSWORD_FIELD,
	PASSWORD_LENGTH,
	PASSWORD_MIN_LENGTH,
	PASSWORD_PATTERN,
	PLAYER_EVENTS_FIELD,
	PORTALS_FIELD,
	PRESET_FIELD,
	PUBLIC_FIELD,
	RAIDS_FIELD,
	RESOURCES_FIELD,
	SAVE_INTERVAL_FIELD,
	SAVE_INTERVAL_MAX,
	SAVE_INTERVAL_MIN,
	STEAM_PLATFORM_PREFIX,
	UNSET,
	WORLD_EXTENSIONS,
	WORLD_FIELD,
	WORLD_LENGTH,
	WORLD_PATTERN,
	WORLD_STAGING,
} from "../shared";

const choice = (value: string, ar: string, en: string) => {
	return {
		value,
		label: {
			ar,
			en,
		},
	};
};

const DEFAULT_CHOICE = choice(UNSET, "زي ما هو", "Leave as it is");

const PRESET_OPTIONS = [
	DEFAULT_CHOICE,
	choice("normal", "عادي", "Normal"),
	choice("casual", "هادي", "Casual"),
	choice("easy", "سهل", "Easy"),
	choice("hard", "صعب", "Hard"),
	choice("hardcore", "هاردكور", "Hardcore"),
	choice("immersive", "غامر", "Immersive"),
	choice("hammer", "بناء حر", "Hammer"),
];

const COMBAT_OPTIONS = [
	DEFAULT_CHOICE,
	choice("veryeasy", "سهل مرة", "Very easy"),
	choice("easy", "سهل", "Easy"),
	choice("hard", "صعب", "Hard"),
	choice("veryhard", "صعب مرة", "Very hard"),
];

const DEATH_PENALTY_OPTIONS = [
	DEFAULT_CHOICE,
	choice("casual", "ما تخسر شي", "Casual"),
	choice("veryeasy", "سهل مرة", "Very easy"),
	choice("easy", "سهل", "Easy"),
	choice("hard", "صعب", "Hard"),
	choice("hardcore", "هاردكور", "Hardcore"),
];

const RESOURCE_OPTIONS = [
	DEFAULT_CHOICE,
	choice("muchless", "أقل بكثير", "Much less"),
	choice("less", "أقل", "Less"),
	choice("more", "أكثر", "More"),
	choice("muchmore", "أكثر بكثير", "Much more"),
	choice("most", "أقصى شي", "Most"),
];

const RAID_OPTIONS = [
	DEFAULT_CHOICE,
	choice("none", "بدون هجمات", "No raids"),
	choice("muchless", "أقل بكثير", "Much less"),
	choice("less", "أقل", "Less"),
	choice("more", "أكثر", "More"),
	choice("muchmore", "أكثر بكثير", "Much more"),
];

const PORTAL_OPTIONS = [
	DEFAULT_CHOICE,
	choice("casual", "تنقل كل شي", "Carry anything"),
	choice("hard", "قيود أكثر", "Stricter"),
	choice("veryhard", "بورتالات مقفلة", "No portals"),
];

const settingsTab: Bridge.Tab = {
	id: "settings",
	title: {
		ar: "الإعدادات",
		en: "Settings",
	},
	icon: BridgeIcon.Settings,
	sections: [
		{
			layout: BridgeLayout.Form,
			id: "server",
			title: {
				ar: "سيرفرك",
				en: "Your server",
			},
			help: {
				ar: "اسم سيرفرك وكلمة مروره وعالمه، وكيف يوصلون له أصحابك.",
				en: "Your server's name, password and world, and how your friends reach it.",
			},
			target: BridgeFormTarget.Settings,
			module: "settings",
			restartHint: true,
			fields: [
				{
					key: NAME_FIELD,
					control: BridgeControl.Text,
					label: {
						ar: "اسم السيرفر",
						en: "Server name",
					},
					help: {
						ar: "الاسم اللي يشوفه اللاعبين في قائمة سيرفرات فالهايم.",
						en: "The name players see in the Valheim server browser.",
					},
					warning: {
						ar: "لا تحط كلمة المرور داخل الاسم — فالهايم يرفض يشتغل كذا.",
						en: "Never put the password inside the name — Valheim refuses to start.",
					},
					maxLength: NAME_LENGTH,
				},
				{
					key: PASSWORD_FIELD,
					control: BridgeControl.Secret,
					label: {
						ar: "كلمة مرور الدخول",
						en: "Join password",
					},
					help: {
						ar: `لازم ${PASSWORD_MIN_LENGTH} حروف على الأقل وبدون مسافات. كل لاعب بيكتبها مرة وحدة أول ما يدخل.`,
						en: `At least ${PASSWORD_MIN_LENGTH} characters, no spaces. Every player types it once when they join.`,
					},
					pattern: PASSWORD_PATTERN,
					patternHint: {
						ar: `من ${PASSWORD_MIN_LENGTH} إلى ${PASSWORD_LENGTH} حرف، وبدون مسافات.`,
						en: `Between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_LENGTH} characters, with no spaces.`,
					},
					maxLength: PASSWORD_LENGTH,
				},
				{
					key: WORLD_FIELD,
					control: BridgeControl.Text,
					label: {
						ar: "العالم الشغّال",
						en: "Active world",
					},
					help: {
						ar: "اسم ملف الحفظ اللي يشتغل عليه سيرفرك. اسم ما له ملف يبني عالم جديد. تبويب العوالم أسهل من كتابته هنا.",
						en: "The save file your server runs. A name with no file behind it generates a new world. The worlds tab is easier than typing it here.",
					},
					pattern: WORLD_PATTERN,
					patternHint: {
						ar: "يبدأ بحرف إنجليزي أو رقم، ويقبل الحروف والأرقام والمسافة والشرطة فقط.",
						en: "Starts with a latin letter or digit, and takes letters, digits, spaces, dashes and underscores only.",
					},
					maxLength: WORLD_LENGTH,
				},
				{
					key: PUBLIC_FIELD,
					control: BridgeControl.Boolean,
					label: {
						ar: "اعرضه في قائمة السيرفرات",
						en: "List in the server browser",
					},
					help: {
						ar: "لما تطفّيه يختفي سيرفرك من القائمة، ويدخلونه أصحابك بالعنوان المباشر بس.",
						en: "Turn it off and your server disappears from the browser — friends join by the direct address only.",
					},
				},
				{
					key: CROSSPLAY_FIELD,
					control: BridgeControl.Boolean,
					label: {
						ar: "اللعب المشترك (Crossplay)",
						en: "Crossplay",
					},
					help: {
						ar: "يخلي لاعبين Xbox و Game Pass يدخلون بكود دخول. بس ينقل السيرفر لشبكة PlayFab، فيوقف عداد اللاعبين المباشر ونحسبهم من اللوق.",
						en: "Lets Xbox and Game Pass players join with a code. It moves the server onto PlayFab, so the live A2S player count stops answering and we count from the log instead.",
					},
				},
			],
		},
		{
			layout: BridgeLayout.Form,
			id: "world-rules",
			title: {
				ar: "قواعد العالم",
				en: "World rules",
			},
			help: {
				ar: "صعوبة اللعب وكل قاعدة فيه. النمط يضبطها كلها دفعة وحدة.",
				en: "How hard the world plays, rule by rule. A preset sets them all in one move.",
			},
			target: BridgeFormTarget.Settings,
			module: "settings",
			restartHint: true,
			fields: [
				{
					key: PRESET_FIELD,
					control: BridgeControl.Select,
					label: {
						ar: "نمط اللعب",
						en: "Preset",
					},
					help: {
						ar: "يضبط كل القواعد تحت دفعة وحدة. اختياره يلغي أي تعديل يدوي تحته.",
						en: "Sets every rule below in one move. Picking one overrides whatever you set by hand underneath.",
					},
					options: PRESET_OPTIONS,
				},
				{
					key: COMBAT_FIELD,
					control: BridgeControl.Select,
					label: {
						ar: "القتال",
						en: "Combat",
					},
					help: {
						ar: "قوة الوحوش والضرر اللي تاخذه.",
						en: "How hard the creatures hit and how much damage you take.",
					},
					options: COMBAT_OPTIONS,
				},
				{
					key: DEATH_PENALTY_FIELD,
					control: BridgeControl.Select,
					label: {
						ar: "عقوبة الموت",
						en: "Death penalty",
					},
					help: {
						ar: "وش تخسر لما تموت — الأغراض، الخبرة، ولا ولا شي.",
						en: "What you lose when you die — items, skill levels, or nothing at all.",
					},
					options: DEATH_PENALTY_OPTIONS,
				},
				{
					key: RESOURCES_FIELD,
					control: BridgeControl.Select,
					label: {
						ar: "الموارد",
						en: "Resources",
					},
					help: {
						ar: "كم مورد يطلع لك من كل شي تجمعه.",
						en: "How much every gathered thing gives you.",
					},
					options: RESOURCE_OPTIONS,
				},
				{
					key: RAIDS_FIELD,
					control: BridgeControl.Select,
					label: {
						ar: "هجمات القاعدة",
						en: "Base raids",
					},
					help: {
						ar: "كم مرة تهجم الوحوش على قاعدتكم.",
						en: "How often creatures come for your base.",
					},
					options: RAID_OPTIONS,
				},
				{
					key: PORTALS_FIELD,
					control: BridgeControl.Select,
					label: {
						ar: "البورتالات",
						en: "Portals",
					},
					help: {
						ar: "وش ينقل معك في البورتال — المعادن ولا لا.",
						en: "What travels through a portal with you — metals or not.",
					},
					options: PORTAL_OPTIONS,
				},
				{
					key: NO_BUILD_COST_FIELD,
					control: BridgeControl.Boolean,
					label: {
						ar: "بناء بلا تكلفة",
						en: "No build cost",
					},
					help: {
						ar: "تبني بدون ما تصرف موارد.",
						en: "Build without spending any resources.",
					},
				},
				{
					key: PLAYER_EVENTS_FIELD,
					control: BridgeControl.Boolean,
					label: {
						ar: "أحداث اللاعبين",
						en: "Player events",
					},
					help: {
						ar: "الأحداث العشوائية تلحق اللاعبين وين ما راحوا.",
						en: "Random events follow players wherever they go.",
					},
				},
				{
					key: PASSIVE_MOBS_FIELD,
					control: BridgeControl.Boolean,
					label: {
						ar: "وحوش مسالمة",
						en: "Passive creatures",
					},
					help: {
						ar: "الوحوش ما تهاجم أول.",
						en: "Creatures never attack first.",
					},
				},
				{
					key: NO_MAP_FIELD,
					control: BridgeControl.Boolean,
					label: {
						ar: "بدون خريطة",
						en: "No map",
					},
					help: {
						ar: "تلعبون بدون خريطة ولا علامات. تحدي كبير.",
						en: "You play with no map and no markers at all. A serious challenge.",
					},
				},
			],
		},
		{
			layout: BridgeLayout.Form,
			id: "saving",
			title: {
				ar: "الحفظ والنسخ",
				en: "Saving and backups",
			},
			help: {
				ar: "كل كم يحفظ فالهايم لحاله، وكم نسخة يحتفظ فيها جوّا مجلد العالم.",
				en: "How often Valheim autosaves, and how many copies it keeps inside the world folder.",
			},
			target: BridgeFormTarget.Settings,
			module: "settings",
			restartHint: true,
			fields: [
				{
					key: SAVE_INTERVAL_FIELD,
					control: BridgeControl.Number,
					label: {
						ar: "كل كم يحفظ (بالثواني)",
						en: "Save interval (seconds)",
					},
					help: {
						ar: "فالهايم ما فيه أمر حفظ يدوي، فهذا الرقم هو اللي يقرّر كم ممكن يضيع لو تعطّل السيرفر. النسخة الاحتياطية تاخذ آخر حفظ.",
						en: "Valheim has no manual save command, so this number decides how much a crash can cost. A backup archives the last autosave.",
					},
					min: SAVE_INTERVAL_MIN,
					max: SAVE_INTERVAL_MAX,
					step: 60,
				},
				{
					key: BACKUPS_FIELD,
					control: BridgeControl.Number,
					label: {
						ar: "نسخ فالهايم الداخلية",
						en: "Valheim's own backups",
					},
					help: {
						ar: "كم نسخة يحتفظ فيها فالهايم جوّا مجلد العالم. هذي غير النسخ الاحتياطية حقت سيرفرك.",
						en: "How many copies Valheim keeps inside the world folder. These are separate from your Serverk backups.",
					},
					min: BACKUPS_MIN,
					max: BACKUPS_MAX,
				},
				{
					key: BACKUP_SHORT_FIELD,
					control: BridgeControl.Number,
					label: {
						ar: "النسخة القريبة (بالثواني)",
						en: "Short backup (seconds)",
					},
					help: {
						ar: "كل كم ياخذ فالهايم نسخة قريبة.",
						en: "How often Valheim takes its short-interval copy.",
					},
					min: BACKUP_SHORT_MIN,
					max: BACKUP_SHORT_MAX,
					step: 600,
				},
				{
					key: BACKUP_LONG_FIELD,
					control: BridgeControl.Number,
					label: {
						ar: "النسخة البعيدة (بالثواني)",
						en: "Long backup (seconds)",
					},
					help: {
						ar: "كل كم ياخذ فالهايم نسخة بعيدة، عشان ترجع لك ليوم أمس لو خرب شي.",
						en: "How often Valheim takes its long-interval copy, so yesterday is still there when something breaks.",
					},
					min: BACKUP_LONG_MIN,
					max: BACKUP_LONG_MAX,
					step: 3600,
				},
			],
		},
		{
			layout: BridgeLayout.Form,
			id: "branch",
			title: {
				ar: "نسخة اللعبة",
				en: "Game build",
			},
			help: {
				ar: "الفرع اللي ننزّل منه فالهايم من Steam. تغييره يعيد التنزيل.",
				en: "The Steam branch we pull Valheim from. Changing it redownloads the game.",
			},
			target: BridgeFormTarget.Variables,
			reinstall: true,
			confirm: BridgeConfirm.Strong,
			confirmText: {
				ar: "بنوقف سيرفرك وننزّل نسخة ثانية من فالهايم من Steam ونشغّله من جديد. عالمك وإعداداتك تبقى مكانها، بس اللاعبين لازم يكونون على نفس النسخة عشان يدخلون.",
				en: "We stop your server, pull a different Valheim build from Steam, and start it again. Your world and settings stay, but players must run the same build to join.",
			},
			fields: [
				{
					key: BRANCH_VARIABLE,
					control: BridgeControl.Select,
					label: {
						ar: "الفرع على Steam",
						en: "Steam branch",
					},
					help: {
						ar: "خلّه على الإصدار الحالي إلا إذا تبي تثبّت سيرفرك على نسخة قديمة.",
						en: "Leave it on the current release unless you want to pin your server to an older build.",
					},
					options: {
						module: "branches",
					},
				},
			],
		},
	],
};

const worldsTab: Bridge.Tab = {
	id: "worlds",
	title: {
		ar: "العوالم",
		en: "Worlds",
	},
	icon: BridgeIcon.Map,
	sections: [
		{
			layout: BridgeLayout.Table,
			id: "saves",
			title: {
				ar: "عوالمك",
				en: "Your worlds",
			},
			help: {
				ar: "الرفع يبي سيرفرك واقف. الحذف ناخذ له نسخة احتياطية أول، وإذا سيرفرك شغّال نوقفه ونرجّع نشغّله لحالنا. ارفع كل عالم باسم مختلف؛ ما نستبدل ملفات موجودة. تفعيل عالم ينطبق بعد إعادة التشغيل.",
				en: "Uploading needs your server stopped. Deleting takes a backup first, stopping your server and starting it again for you if it is running. Use a distinct name for each world; existing files cannot be replaced. Activating a world applies after a restart.",
			},
			module: "worlds",
			restartHint: true,
			columns: [
				{
					key: "name",
					label: {
						ar: "العالم",
						en: "World",
					},
				},
				{
					key: "size",
					label: {
						ar: "الحجم",
						en: "Size",
					},
				},
				{
					key: "active",
					label: {
						ar: "الشغّال",
						en: "Active",
					},
				},
				{
					key: "state",
					label: {
						ar: "ملاحظة",
						en: "Note",
					},
				},
			],
			upload: {
				label: {
					ar: "ارفع عالم",
					en: "Upload a world",
				},
				extensions: WORLD_EXTENSIONS,
				staging: WORLD_STAGING,
				mode: BridgeUploadMode.File,
			},
			actions: [
				{
					id: "activate",
					label: {
						ar: "تفعيل",
						en: "Activate",
					},
					confirm: BridgeConfirm.Normal,
					confirmText: {
						ar: "بنخلي سيرفرك يشتغل على هذا العالم. التغيير ينطبق بعد إعادة التشغيل.",
						en: "Your server switches to this world. It applies after a restart.",
					},
				},
				{
					id: "delete",
					label: {
						ar: "حذف",
						en: "Delete",
					},
					confirm: BridgeConfirm.Strong,
					confirmText: {
						ar: "حذف العالم يشيل ملف .db وملف .fwl حقّه للأبد. النسخة الاحتياطية هي طريقك الوحيد للرجوع، فخذ لك وحدة قبل.",
						en: "Deleting a world removes its .db and .fwl forever. A backup is your only way back, so take one first.",
					},
				},
			],
			empty: {
				ar: "ما فيه عوالم بعد. سيرفرك يبني عالمه أول ما يشتغل.",
				en: "No worlds yet — your server builds its own the first time it starts.",
			},
		},
		{
			layout: BridgeLayout.Actions,
			id: "new-world",
			title: {
				ar: "عالم جديد",
				en: "A new world",
			},
			help: {
				ar: "سمِّ عالم جديد، ويبنيه فالهايم من الصفر أول ما تعيد تشغيل سيرفرك. عالمك الحالي يبقى مكانه وترجع له متى ما بغيت.",
				en: "Name a new world and Valheim generates it from scratch on the next restart. Your current world stays where it is and you can switch back any time.",
			},
			module: "worldActions",
			actions: [
				{
					id: "create",
					label: {
						ar: "ابنِ عالم جديد",
						en: "Create a world",
					},
					confirm: BridgeConfirm.Normal,
					confirmText: {
						ar: "سيرفرك بينتقل للعالم الجديد بعد إعادة التشغيل. القديم يبقى محفوظ في جدول العوالم.",
						en: "Your server moves to the new world after a restart. The old one stays in the worlds table.",
					},
					fields: [
						{
							key: WORLD_NAME_ARGUMENT,
							control: BridgeControl.Text,
							label: {
								ar: "اسم العالم",
								en: "World name",
							},
							help: {
								ar: "حروف إنجليزية وأرقام ومسافات. هذا الاسم يصير اسم ملف الحفظ.",
								en: "Latin letters, digits and spaces. This name becomes the save file name.",
							},
							pattern: WORLD_PATTERN,
							patternHint: {
								ar: "يبدأ بحرف إنجليزي أو رقم، ويقبل الحروف والأرقام والمسافة والشرطة فقط.",
								en: "Starts with a latin letter or digit, and takes letters, digits, spaces, dashes and underscores only.",
							},
							maxLength: WORLD_LENGTH,
						},
					],
				},
			],
		},
	],
};

const playersTab: Bridge.Tab = {
	id: "players",
	title: {
		ar: "اللاعبين",
		en: "Players",
	},
	icon: BridgeIcon.Users,
	sections: [
		{
			layout: BridgeLayout.Detail,
			id: "metrics",
			title: {
				ar: "حالة السيرفر",
				en: "Server health",
			},
			help: {
				ar: "النسخة، العالم، اللاعبين، آخر حفظ، وكود الدخول لو اللعب المشترك مفتوح.",
				en: "Version, world, players, last save, and the join code while crossplay is on.",
			},
			place: BridgePlace.Overview,
			module: "metrics",
			related: {
				tab: "settings",
				label: {
					ar: "إعدادات الدخول",
					en: "Join settings",
				},
			},
			empty: {
				ar: "ما قدرنا نقرأ حالة سيرفرك.",
				en: "We could not read your server's state.",
			},
		},
		{
			layout: BridgeLayout.Table,
			id: "online",
			title: {
				ar: "داخلين الحين",
				en: "Online now",
			},
			help: {
				ar: "اللي داخلين سيرفرك الحين. الاسم يطلع من اللوق، فياخذ لحظة بعد ما يدخل اللاعب.",
				en: "Everyone on your server right now. The name comes from the log, so it lands a moment after they join.",
			},
			place: BridgePlace.Players,
			module: "players",
			columns: [
				{
					key: "name",
					label: {
						ar: "اللاعب",
						en: "Player",
					},
				},
				{
					key: "account",
					label: {
						ar: "الحساب",
						en: "Account",
					},
				},
				{
					key: "platform",
					label: {
						ar: "المنصة",
						en: "Platform",
					},
				},
				{
					key: "platformId",
					label: {
						ar: "المعرّف",
						en: "Platform ID",
					},
				},
			],
			actions: [
				{
					id: "ban",
					label: {
						ar: "حظر",
						en: "Ban",
					},
					offline: true,
					confirm: BridgeConfirm.Strong,
					confirmText: {
						ar: "بنضيف معرّفه لقائمة المحظورين. فالهايم ما فيه أمر طرد، فالحظر يمنعه أول ما يحاول يدخل مرة ثانية — وإذا كان داخل الحين، أعد تشغيل سيرفرك عشان يطلع.",
						en: "We add their platform id to the ban list. Valheim has no kick command, so the ban stops them the next time they try to join — restart your server to drop them if they are on right now.",
					},
				},
			],
			empty: {
				ar: "ما فيه أحد داخل الحين.",
				en: "Nobody is online right now.",
			},
		},
		{
			layout: BridgeLayout.Table,
			id: "admins",
			title: {
				ar: "الأدمن",
				en: "Admins",
			},
			help: {
				ar: `اللي هنا يفتح له كونسول الأدمن داخل اللعبة بزر F5. اكتب معرّف اللاعب، ولو كتبت رقم Steam لحاله نحطه لك بالبادئة ${STEAM_PLATFORM_PREFIX}. التغيير يبي إعادة تشغيل.`,
				en: `Anyone here unlocks the in-game admin console on F5. Write the player's platform id — a bare Steam number gets the ${STEAM_PLATFORM_PREFIX} prefix added for you. A change needs a restart.`,
			},
			place: BridgePlace.Players,
			module: "admins",
			restartHint: true,
			columns: [
				{
					key: "account",
					label: {
						ar: "الحساب",
						en: "Account",
					},
				},
				{
					key: "platform",
					label: {
						ar: "المنصة",
						en: "Platform",
					},
				},
				{
					key: "platformId",
					label: {
						ar: "المعرّف",
						en: "Platform ID",
					},
				},
			],
			add: {
				label: {
					ar: "أضف أدمن",
					en: "Add an admin",
				},
				placeholder: `${STEAM_PLATFORM_PREFIX}76561198000000000`,
			},
			actions: [
				{
					id: "remove",
					label: {
						ar: "شيله",
						en: "Remove",
					},
					confirm: BridgeConfirm.Normal,
				},
			],
			empty: {
				ar: "ما فيه أدمن. أضف معرّفك عشان تفتح أوامر الأدمن داخل اللعبة بزر F5.",
				en: "No admins yet. Add your own platform id to unlock the in-game admin commands on F5.",
			},
		},
		{
			layout: BridgeLayout.Table,
			id: "bans",
			title: {
				ar: "المحظورين",
				en: "Bans",
			},
			help: {
				ar: `المعرّفات الممنوعة من الدخول. فالهايم يقرأ الملف عند التشغيل، فأي إضافة تبي إعادة تشغيل عشان تطرد اللي داخل الحين. رقم Steam لحاله ناخذه ونحطه بالبادئة ${STEAM_PLATFORM_PREFIX}.`,
				en: `The platform ids that cannot join. Valheim reads the file at start, so a new entry needs a restart to drop somebody already on. A bare Steam number gets the ${STEAM_PLATFORM_PREFIX} prefix added for you.`,
			},
			place: BridgePlace.Players,
			module: "bans",
			restartHint: true,
			columns: [
				{
					key: "account",
					label: {
						ar: "الحساب",
						en: "Account",
					},
				},
				{
					key: "platform",
					label: {
						ar: "المنصة",
						en: "Platform",
					},
				},
				{
					key: "platformId",
					label: {
						ar: "المعرّف",
						en: "Platform ID",
					},
				},
			],
			add: {
				label: {
					ar: "احظر معرّف",
					en: "Ban an ID",
				},
				placeholder: `${STEAM_PLATFORM_PREFIX}76561198000000000`,
			},
			actions: [
				{
					id: "remove",
					label: {
						ar: "فُك الحظر",
						en: "Unban",
					},
					confirm: BridgeConfirm.Normal,
				},
			],
			empty: {
				ar: "ما فيه أحد محظور.",
				en: "Nobody is banned.",
			},
		},
		{
			layout: BridgeLayout.Table,
			id: "permitted",
			title: {
				ar: "القائمة البيضاء",
				en: "Allow list",
			},
			help: {
				ar: `إذا كتبت معرّف واحد هنا، ما يدخل سيرفرك إلا اللي في هذي القائمة. خلّها فاضية إذا تبي الكل يدخل بكلمة المرور.`,
				en: `Put a single platform id here and nobody outside this list can join. Leave it empty to let anyone with the password in.`,
			},
			place: BridgePlace.Players,
			module: "permitted",
			restartHint: true,
			columns: [
				{
					key: "account",
					label: {
						ar: "الحساب",
						en: "Account",
					},
				},
				{
					key: "platform",
					label: {
						ar: "المنصة",
						en: "Platform",
					},
				},
				{
					key: "platformId",
					label: {
						ar: "المعرّف",
						en: "Platform ID",
					},
				},
			],
			add: {
				label: {
					ar: "أضف لاعب",
					en: "Add a player",
				},
				placeholder: `${STEAM_PLATFORM_PREFIX}76561198000000000`,
			},
			actions: [
				{
					id: "remove",
					label: {
						ar: "شيله",
						en: "Remove",
					},
					confirm: BridgeConfirm.Normal,
				},
			],
			empty: {
				ar: "القائمة فاضية، يعني الكل يقدر يدخل بكلمة المرور. أول معرّف تضيفه هنا يقفل السيرفر على المضافين بس.",
				en: "The list is empty, so anyone with the password can join. The first id you add locks the server to the list.",
			},
		},
	],
};

const modsTab: Bridge.Tab = {
	id: "mods",
	title: {
		ar: "المودات",
		en: "Mods",
	},
	icon: BridgeIcon.Puzzle,
	sections: [
		{
			layout: BridgeLayout.Detail,
			id: "loader",
			help: {
				ar: "حالة BepInEx على سيرفرك: مركّب ولا لا، إصداره، وكم مود يشتغل عليه.",
				en: "Where BepInEx stands on your server: whether it is installed, its version, and how many mods run on it.",
			},
			module: "loader",
			empty: {
				ar: "ما قدرنا نقرأ حالة BepInEx.",
				en: "We could not read the BepInEx status.",
			},
		},
		{
			layout: BridgeLayout.Actions,
			id: "loader-actions",
			help: {
				ar: "BepInEx هو محمّل المودات. ننزّله لك من ثندرستور ونشغّله مع سيرفرك.",
				en: "BepInEx is the mod loader. We pull it from Thunderstore and start your server with it.",
			},
			module: "bepinex",
			actions: [
				{
					id: "setup",
					label: {
						ar: "ركّب BepInEx أو حدّثه",
						en: "Install or update BepInEx",
					},
					confirm: BridgeConfirm.Normal,
					confirmText: {
						ar: "بننزّل آخر إصدار من BepInEx ونركّبه على سيرفرك ونفعّل تشغيل المودات. يشتغل بعد إعادة التشغيل.",
						en: "We download the latest BepInEx, install it on your server, and switch mod loading on. It applies after a restart.",
					},
				},
				{
					id: "uninstall",
					label: {
						ar: "شيل BepInEx وكل المودات",
						en: "Remove BepInEx and every mod",
					},
					confirm: BridgeConfirm.Strong,
					confirmText: {
						ar: "بنمسح BepInEx وكل المودات وإعداداتها. عالمك ما ينمس، بس أي شي بناه مود بيختفي منه.",
						en: "BepInEx, every mod and their configs are deleted. Your world is untouched, but anything a mod added to it disappears.",
					},
				},
			],
		},
		{
			layout: BridgeLayout.Form,
			id: "loading",
			title: {
				ar: "تشغيل المودات",
				en: "Mod loading",
			},
			help: {
				ar: "يقرّر إذا يشتغل سيرفرك مع BepInEx ولا فالهايم أصلي.",
				en: "Decides whether your server starts with BepInEx or as plain Valheim.",
			},
			target: BridgeFormTarget.Settings,
			module: "settings",
			restartHint: true,
			fields: [
				{
					key: BEPINEX_FIELD,
					control: BridgeControl.Boolean,
					label: {
						ar: "شغّل سيرفرك مع BepInEx",
						en: "Start the server with BepInEx",
					},
					help: {
						ar: "لما يكون مطفّي يشتغل سيرفرك فالهايم أصلي بدون أي مود، وتبقى المودات مركّبة مكانها.",
						en: "Off means your server runs plain Valheim with no mods, and the installed mods stay where they are.",
					},
					warning: {
						ar: "كل لاعب لازم يركّب نفس المودات على جهازه عشان يدخل.",
						en: "Every player needs the same mods installed on their own game to join.",
					},
				},
			],
		},
		{
			layout: BridgeLayout.Catalog,
			id: "catalog",
			title: {
				ar: "مودات ثندرستور",
				en: "Thunderstore mods",
			},
			help: {
				ar: "دوّر على أي مود من ثندرستور وركّبه، وننزّل معه كل اللي يعتمد عليه.",
				en: "Search Thunderstore for any mod and install it — we pull everything it depends on with it.",
			},
			module: "mods",
			restartHint: true,
			empty: {
				ar: "ما فيه مودات مركّبة. دوّر على مود وركّبه، وننزّل معه كل اللي يعتمد عليه.",
				en: "No mods installed. Search for one and install it — we pull everything it depends on with it.",
			},
		},
	],
};

export const panel: Bridge.Panel = {
	tabs: [
		settingsTab,
		worldsTab,
		playersTab,
		modsTab,
	],
};
