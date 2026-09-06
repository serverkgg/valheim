## BepInEx first

Nearly every Valheim mod runs on **BepInEx**, the mod loader. Without it no mod loads at all.

From the **Mods** tab press **Install or update BepInEx**. We pull the latest release from Thunderstore, install it on your server, and switch mod loading on for you. Restart and that is it.

@[open](panel:mods)

> [!note] BepInEx works through `doorstop`, which means your server starts with a few extra environment variables instead of starting plain. The panel does that for you — there is no script to run by hand.

## Install mods

The section below it is the **Thunderstore** catalog. Search for anything and press install.

When you install a mod we pull every mod it depends on with it — you never have to hunt them down one by one.

Each installed mod shows up in the list with:

- **Disable** — takes the mod out of the load path without deleting it, and you can bring it back any time
- **Remove** — deletes its files

> [!warning] Every player needs **the same mods** installed on their own game, or they cannot join. Send them your mod list.

## Turn mods off without deleting them

The **Mod loading** section has one switch: your server starts with BepInEx, or without it. Turn it off and your server runs plain Valheim while the mods stay installed — the fastest way to tell whether a problem is a mod or the game.

## Mods and your world

A mod that adds things to the world makes your world depend on it. Remove that mod later and whatever it built disappears from the world — sometimes quietly, sometimes as errors in the log.

> [!danger] Take a backup before installing or removing any mod that adds things to the world. A backup is your only way back.

@[open](backups)

## When Valheim updates

Valheim breaks mods on every major patch. What usually happens:

1. Valheim ships an update and your server takes it the next time it starts
2. Old mods crash the server or fill the log with errors
3. The mod authors publish new versions within a day or two

If your server stops coming up after an update: turn **Mod loading** off to get it running again immediately, then update your mods one at a time from the catalog.

@[open](console)
