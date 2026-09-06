## A world is two files

Every Valheim world is two files sharing one name:

- `Serverk.db` — everything built in the world, every chest and every tamed animal
- `Serverk.fwl` — the world seed and its rules (the preset and the modifiers)

They belong together. Upload a `.db` without its `.fwl` and Valheim treats the world as new and rolls a different seed — everything built disappears.

@[open](panel:worlds)

## Upload the world from your own game

The world you played solo lives on your machine at:

```txt
%USERPROFILE%\AppData\LocalLow\IronGate\Valheim\worlds_local
```

On Linux:

```txt
~/.config/unity3d/IronGate/Valheim/worlds_local
```

1. Close Valheim first so the world is written out completely
2. Open the **Worlds** tab in the panel and press **Upload a world**
3. Pick both files together — the `.db` and the `.fwl`
4. Press **Activate** on the world once it appears in the table
5. Restart your server

> [!warning] Never upload a world while your server is running on it. Stop the server, upload, then start it again.

## Switch between worlds

Every row in the table has an **Activate** button. Activating changes which world your server runs, and it applies after a restart. The old world stays exactly where it is — switch back whenever you like.

You cannot delete the active world. Activate another one first, then delete it.

## Start a fresh world

From the same tab, **Create a world**: type a new name and Valheim generates a complete world under it the next time your server restarts. Your current world stays in the table.

> [!note] The preset and the modifiers (under Settings) are written into the `.fwl` the first time that world runs. Changing them later needs **at least one start** to stick, and clearing them does not restore the defaults — you have to pick the default value yourself.

## Backups

You have two layers:

- **Valheim's own backups** — kept by Valheim inside the world folder; the count and the timing are in the settings
- **Your Serverk backups** — taken automatically, or by you on demand, and they are the ones that restore in one press

@[open](backups)

> [!warning] Valheim has no manual save command. A backup archives the last autosave, so with a **save interval** of 1800 seconds you can lose half an hour. Lower it if your server is busy.
