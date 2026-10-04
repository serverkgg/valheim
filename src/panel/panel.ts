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

const DEFAULT_CHOICE = choice(UNSET, "كما هو", "Leave as it is");

const PRESET_OPTIONS = [
	DEFAULT_CHOICE,
	choice("normal", "عادي", "Normal"),
	choice("casual", "هادئ", "Casual"),
	choice("easy", "سهل", "Easy"),
	choice("hard", "صعب", "Hard"),
	choice("hardcore", "هاردكور", "Hardcore"),
	choice("immersive", "غامر", "Immersive"),
	choice("hammer", "بناء حر", "Hammer"),
];

const COMBAT_OPTIONS = [
	DEFAULT_CHOICE,
	choice("veryeasy", "سهل جدًا", "Very easy"),
	choice("easy", "سهل", "Easy"),
	choice("hard", "صعب", "Hard"),
	choice("veryhard", "صعب جدًا", "Very hard"),
];

const DEATH_PENALTY_OPTIONS = [
	DEFAULT_CHOICE,
	choice("casual", "بلا خسارة", "Casual"),
	choice("veryeasy", "سهل جدًا", "Very easy"),
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
	choice("most", "الحد الأقصى", "Most"),
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
	choice("casual", "تنقل كل شيء", "Carry anything"),
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
				ar: "اسم سيرفرك وكلمة مروره ومابه، وطريقة وصول أصحابك إليه.",
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
						ar: "الاسم الذي يراه اللاعبون في قائمة سيرفرات فالهايم.",
						en: "The name players see in the Valheim server browser.",
					},
					warning: {
						ar: "لا تضع كلمة المرور داخل الاسم، فلن يشتغل فالهايم بهذا الشكل.",
						en: "Never put the password inside the name. Valheim refuses to start.",
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
						ar: `${PASSWORD_MIN_LENGTH} أحرف على الأقل، دون مسافات. يكتبها كل لاعب مرة واحدة عند أول دخول.`,
						en: `At least ${PASSWORD_MIN_LENGTH} characters, no spaces. Every player types it once when they join.`,
					},
					pattern: PASSWORD_PATTERN,
					patternHint: {
						ar: `من ${PASSWORD_MIN_LENGTH} إلى ${PASSWORD_LENGTH} حرفًا، دون مسافات.`,
						en: `Between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_LENGTH} characters, with no spaces.`,
					},
					maxLength: PASSWORD_LENGTH,
				},
				{
					key: WORLD_FIELD,
					control: BridgeControl.Text,
					label: {
						ar: "الماب الشغّالة",
						en: "Active world",
					},
					help: {
						ar: "اسم ملف الحفظ الذي يشتغل عليه سيرفرك. الاسم الذي ليس له ملف يُنشئ ماب جديدة. تبويب المابات أسهل من كتابة الاسم هنا.",
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
						ar: "عند إيقافه يختفي سيرفرك من القائمة، ويدخله أصحابك بالعنوان المباشر فقط.",
						en: "Turn it off and your server disappears from the browser. Friends join by the direct address only.",
					},
				},
				{
					key: CROSSPLAY_FIELD,
					control: BridgeControl.Boolean,
					label: {
						ar: "الكروس بلاي (Crossplay)",
						en: "Crossplay",
					},
					help: {
						ar: "يسمح للاعبي Xbox و Game Pass بالدخول بكود دخول. لكنه ينقل السيرفر إلى شبكة PlayFab، فيتوقف عداد اللاعبين المباشر، ونحسب اللاعبين من السجل بدلًا منه.",
						en: "Lets Xbox and Game Pass players join with a code. It moves the server onto PlayFab, so the live A2S player count stops answering and we count from the log instead.",
					},
				},
			],
		},
		{
			layout: BridgeLayout.Form,
			id: "world-rules",
			title: {
				ar: "قواعد الماب",
				en: "World rules",
			},
			help: {
				ar: "صعوبة اللعب وكل قاعدة فيه. يضبطها النمط كلها دفعة واحدة.",
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
						ar: "يضبط كل القواعد في الأسفل دفعة واحدة، ويلغي اختياره أي تعديل يدوي عليها.",
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
						ar: "قوة الوحوش والضرر الذي تتلقاه.",
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
						ar: "ما تخسره عند الموت: الأغراض، أو الخبرة، أو لا شيء.",
						en: "What you lose when you die: items, skill levels, or nothing at all.",
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
						ar: "كمية الموارد التي تحصل عليها من كل ما تجمعه.",
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
						ar: "عدد مرات هجوم الوحوش على قاعدتكم.",
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
						ar: "ما ينتقل معك عبر البورتال، ومنه المعادن.",
						en: "What travels through a portal with you, metals or not.",
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
						ar: "تبني دون أن تصرف أي موارد.",
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
						ar: "تلحق الأحداث العشوائية اللاعبين أينما ذهبوا.",
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
						ar: "لا تبدأ الوحوش بالهجوم.",
						en: "Creatures never attack first.",
					},
				},
				{
					key: NO_MAP_FIELD,
					control: BridgeControl.Boolean,
					label: {
						ar: "بدون ماب",
						en: "No map",
					},
					help: {
						ar: "تلعبون دون ماب أو علامات. تحدٍّ كبير.",
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
				ar: "عدد مرات الحفظ التلقائي في فالهايم، وعدد النسخ التي يحتفظ بها داخل مجلد الماب.",
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
						ar: "فترة الحفظ (بالثواني)",
						en: "Save interval (seconds)",
					},
					help: {
						ar: "لا يوجد في فالهايم أمر حفظ يدوي، فهذا الرقم يحدد مقدار ما قد يضيع إذا تعطّل السيرفر. وتأخذ النسخة الاحتياطية آخر حفظ.",
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
						ar: "نسخ فالهايم الاحتياطية الداخلية",
						en: "Valheim's own backups",
					},
					help: {
						ar: "عدد النسخ التي يحتفظ بها فالهايم داخل مجلد الماب. وهي منفصلة عن النسخ الاحتياطية لسيرفرك.",
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
						ar: "عدد مرات أخذ فالهايم للنسخة القريبة.",
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
						ar: "عدد مرات أخذ فالهايم للنسخة البعيدة، لتبقى نسخة الأمس متاحة إذا تلف شيء.",
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
				ar: "بيلد اللعبة",
				en: "Game build",
			},
			help: {
				ar: "الفرع الذي ننزّل منه فالهايم من Steam. تغييره يعيد تنزيل اللعبة.",
				en: "The Steam branch we pull Valheim from. Changing it redownloads the game.",
			},
			target: BridgeFormTarget.Variables,
			reinstall: true,
			confirm: BridgeConfirm.Strong,
			confirmText: {
				ar: "سنوقف سيرفرك، وننزّل بيلد آخر من فالهايم من Steam، ثم نشغّله من جديد. يبقى مابك وإعداداتك كما هي، لكن يلزم أن يشغّل اللاعبون البيلد نفسه ليدخلوا.",
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
						ar: "أبقِه على الإصدار الحالي، إلا إذا أردت تثبيت سيرفرك على بيلد قديم.",
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
		ar: "المابات",
		en: "Worlds",
	},
	icon: BridgeIcon.Map,
	sections: [
		{
			layout: BridgeLayout.Table,
			id: "saves",
			title: {
				ar: "ماباتك",
				en: "Your worlds",
			},
			help: {
				ar: "يتطلب الرفع أن يكون سيرفرك متوقفًا. قبل الحذف نأخذ نسخة احتياطية، وإذا كان سيرفرك شغّالًا نوقفه ثم نشغّله من جديد تلقائيًا. ارفع كل ماب باسم مختلف، فلا نستبدل الملفات الموجودة. ويُطبَّق تفعيل الماب بعد الريستارت.",
				en: "Uploading needs your server stopped. Deleting takes a backup first, stopping your server and starting it again for you if it's running. Use a distinct name for each world, because existing files can't be replaced. Activating a world applies after a restart.",
			},
			module: "worlds",
			restartHint: true,
			columns: [
				{
					key: "name",
					label: {
						ar: "الماب",
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
						ar: "الشغّالة",
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
					ar: "ارفع ماب",
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
						ar: "فعّل",
						en: "Activate",
					},
					confirm: BridgeConfirm.Normal,
					confirmText: {
						ar: "سيشتغل سيرفرك على هذه الماب. يُطبَّق التغيير بعد الريستارت.",
						en: "Your server switches to this world. It applies after a restart.",
					},
				},
				{
					id: "delete",
					label: {
						ar: "احذف",
						en: "Delete",
					},
					confirm: BridgeConfirm.Strong,
					confirmText: {
						ar: "حذف الماب يحذف ملفيها .db و .fwl نهائيًا. النسخة الاحتياطية هي الطريقة الوحيدة لاسترجاعها، فخذ نسخة قبل الحذف.",
						en: "Deleting a world removes its .db and .fwl forever. A backup is your only way back, so take one first.",
					},
				},
			],
			empty: {
				ar: "لا توجد مابات بعد. يُنشئ سيرفرك مابه عند أول تشغيل.",
				en: "No worlds yet. Your server builds its own the first time it starts.",
			},
		},
		{
			layout: BridgeLayout.Actions,
			id: "new-world",
			title: {
				ar: "ماب جديدة",
				en: "A new world",
			},
			help: {
				ar: "سمِّ ماب جديدة، وسيُنشئها فالهايم من الصفر بعد ريستارت سيرفرك. تبقى مابك الحالية محفوظة، وارجع إليها متى أردت.",
				en: "Name a new world and Valheim generates it from scratch on the next restart. Your current world stays where it is and you can switch back any time.",
			},
			module: "worldActions",
			actions: [
				{
					id: "create",
					label: {
						ar: "أنشئ ماب جديدة",
						en: "Create a world",
					},
					confirm: BridgeConfirm.Normal,
					confirmText: {
						ar: "سينتقل سيرفرك إلى الماب الجديدة بعد الريستارت، وتبقى القديمة محفوظة في جدول المابات.",
						en: "Your server moves to the new world after a restart. The old one stays in the worlds table.",
					},
					fields: [
						{
							key: WORLD_NAME_ARGUMENT,
							control: BridgeControl.Text,
							label: {
								ar: "اسم الماب",
								en: "World name",
							},
							help: {
								ar: "حروف إنجليزية وأرقام ومسافات. يصبح هذا الاسم اسم ملف الحفظ.",
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
		ar: "اللاعبون",
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
				ar: "الإصدار، والماب، واللاعبون، وآخر حفظ، وكود الدخول عند تفعيل الكروس بلاي.",
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
				ar: "تعذّر قراءة حالة سيرفرك.",
				en: "We couldn't read your server's state.",
			},
		},
		{
			layout: BridgeLayout.Table,
			id: "online",
			title: {
				ar: "المتصلون الآن",
				en: "Online now",
			},
			help: {
				ar: "اللاعبون الموجودون في سيرفرك الآن. نقرأ الاسم من السجل، فيظهر بعد دخول اللاعب بلحظة.",
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
						ar: "احظر",
						en: "Ban",
					},
					offline: true,
					confirm: BridgeConfirm.Strong,
					confirmText: {
						ar: "سنضيف معرّفه إلى قائمة المحظورين. لا يوجد في فالهايم أمر طرد، فيمنعه الحظر عند محاولته التالية للدخول. وإذا كان متصلًا الآن، فنفّذ ريستارت لسيرفرك ليخرج.",
						en: "We add their platform ID to the ban list. Valheim has no kick command, so the ban stops them the next time they try to join. Restart your server to drop them if they're on right now.",
					},
				},
			],
			empty: {
				ar: "لا يوجد لاعبون متصلون الآن.",
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
				ar: `يفتح كل من في هذه القائمة كونسول الأدمن داخل اللعبة بزر F5. اكتب معرّف اللاعب، وإذا كتبت رقم Steam وحده نضيف له البادئة ${STEAM_PLATFORM_PREFIX}. يُطبَّق التغيير بعد الريستارت.`,
				en: `Anyone here unlocks the in-game admin console on F5. Write the player's platform ID. A bare Steam number gets the ${STEAM_PLATFORM_PREFIX} prefix added for you. A change needs a restart.`,
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
						ar: "أزله",
						en: "Remove",
					},
					confirm: BridgeConfirm.Normal,
				},
			],
			empty: {
				ar: "لا يوجد أدمن بعد. أضف معرّفك لتفتح أوامر الأدمن داخل اللعبة بزر F5.",
				en: "No admins yet. Add your own platform ID to unlock the in-game admin commands on F5.",
			},
		},
		{
			layout: BridgeLayout.Table,
			id: "bans",
			title: {
				ar: "المحظورون",
				en: "Banned players",
			},
			help: {
				ar: `المعرّفات الممنوعة من الدخول. يقرأ فالهايم الملف عند التشغيل، فلإخراج لاعب متصل الآن يلزم ريستارت بعد الإضافة. وإذا كتبت رقم Steam وحده نضيف له البادئة ${STEAM_PLATFORM_PREFIX}.`,
				en: `The platform IDs that can't join. Valheim reads the file at start, so a new entry needs a restart to drop somebody already on. A bare Steam number gets the ${STEAM_PLATFORM_PREFIX} prefix added for you.`,
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
					ar: "احظر معرّفًا",
					en: "Ban an ID",
				},
				placeholder: `${STEAM_PLATFORM_PREFIX}76561198000000000`,
			},
			actions: [
				{
					id: "remove",
					label: {
						ar: "فك الحظر",
						en: "Unban",
					},
					confirm: BridgeConfirm.Normal,
				},
			],
			empty: {
				ar: "لا يوجد لاعبون محظورون.",
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
				ar: `بمجرد إضافة معرّف واحد هنا، لا يدخل سيرفرك إلا من في هذه القائمة. اتركها فارغة إذا أردت أن يدخل الجميع بكلمة المرور.`,
				en: `Put a single platform ID here and nobody outside this list can join. Leave it empty to let anyone with the password in.`,
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
					ar: "أضف لاعبًا",
					en: "Add a player",
				},
				placeholder: `${STEAM_PLATFORM_PREFIX}76561198000000000`,
			},
			actions: [
				{
					id: "remove",
					label: {
						ar: "أزله",
						en: "Remove",
					},
					confirm: BridgeConfirm.Normal,
				},
			],
			empty: {
				ar: "القائمة فارغة، فيستطيع الجميع الدخول بكلمة المرور. أول معرّف تضيفه هنا يقصر الدخول على من في القائمة فقط.",
				en: "The list is empty, so anyone with the password can join. The first ID you add locks the server to the list.",
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
				ar: "حالة BepInEx على سيرفرك: هل هو مثبّت، وإصداره، وعدد المودات التي تشتغل عليه.",
				en: "Where BepInEx stands on your server: whether it's installed, its version, and how many mods run on it.",
			},
			module: "loader",
			empty: {
				ar: "تعذّر قراءة حالة BepInEx.",
				en: "We couldn't read the BepInEx status.",
			},
		},
		{
			layout: BridgeLayout.Actions,
			id: "loader-actions",
			help: {
				ar: "BepInEx هو مشغّل المودات. ننزّله لك من Thunderstore ونشغّله مع سيرفرك.",
				en: "BepInEx is the mod loader. We pull it from Thunderstore and start your server with it.",
			},
			module: "bepinex",
			actions: [
				{
					id: "setup",
					label: {
						ar: "ثبّت BepInEx أو حدّثه",
						en: "Install or update BepInEx",
					},
					confirm: BridgeConfirm.Normal,
					confirmText: {
						ar: "سننزّل آخر إصدار من BepInEx، ونثبّته على سيرفرك، ونفعّل تشغيل المودات. يُطبَّق ذلك بعد الريستارت.",
						en: "We download the latest BepInEx, install it on your server, and switch mod loading on. It applies after a restart.",
					},
				},
				{
					id: "uninstall",
					label: {
						ar: "أزل BepInEx وكل المودات",
						en: "Remove BepInEx and every mod",
					},
					confirm: BridgeConfirm.Strong,
					confirmText: {
						ar: "سيتم حذف BepInEx وكل المودات وإعداداتها. تبقى مابك كما هي، لكن كل ما أضافه مود إليها سيختفي.",
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
				ar: "يحدد ما إذا كان سيرفرك يشتغل مع BepInEx أو بفالهايم الأصلي.",
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
						ar: "عند إيقافه يشتغل سيرفرك بفالهايم الأصلي دون أي مود، وتبقى المودات مثبّتة في مكانها.",
						en: "Off means your server runs plain Valheim with no mods, and the installed mods stay where they are.",
					},
					warning: {
						ar: "يلزم أن يثبّت كل لاعب المودات نفسها على جهازه ليدخل.",
						en: "Every player needs the same mods installed on their own game to join.",
					},
				},
			],
		},
		{
			layout: BridgeLayout.Catalog,
			id: "catalog",
			title: {
				ar: "مودات Thunderstore",
				en: "Thunderstore mods",
			},
			help: {
				ar: "ابحث عن أي مود في Thunderstore وثبّته، وننزّل معه كل ما يعتمد عليه.",
				en: "Search Thunderstore for any mod and install it, and we pull everything it depends on with it.",
			},
			module: "mods",
			restartHint: true,
			empty: {
				ar: "لا توجد مودات مثبّتة. ابحث عن مود وثبّته، وننزّل معه كل ما يعتمد عليه.",
				en: "No mods installed. Search for one and install it, and we pull everything it depends on with it.",
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
