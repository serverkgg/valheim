## Create your server

From the **Create a server** page pick Valheim. The game is relatively light — 4GB of RAM carries a full group, and 2GB is the floor.

After payment your machine starts provisioning. There is nothing to set up: as soon as the machine is ready your server downloads the latest Valheim build from Steam, generates a world, and starts.

> [!note] We generated a random password so the server runs from the first second. Change it to something you can pass around from the settings tab before you invite anyone.

## The password — the one rule that stops the server

Valheim refuses to start when:

- the password is shorter than 5 characters
- or the password appears inside the server name

The panel blocks both before you save, but keep it in mind if you ever edit the file by hand.

@[open](panel:settings)

## Join the game

:::when server.address
Copy your address:

@[field](server.address)

Then inside Valheim:

1. Pick your character, then **Start Game**
2. From the world list choose **Join Game**
3. Open the **Servers** tab and press **Add server**
4. Paste the address exactly as shown, press **Add**, then **Connect** and type the password
:::else
Your server is still setting up, so it has no address yet — it appears here the moment the install finishes.

@[open](console)
:::

> [!note] Friends on Xbox, PS5 or Switch 2 cannot join by address. Turn **Crossplay** on in the settings and a six-digit join code appears on the Overview page — they use **Join Game, Join by code**.

## Make yourself admin

To unlock the in-game admin commands (the F5 console), your player id has to be on the admin list.

Since 1.0 Valheim reads a **Platform User ID** rather than a bare Steam number: on Steam that is `V_` followed by your Steam64 id, and on Xbox it is `Xbox_` followed by theirs.

1. Open the **Players** page
2. Add your own platform id — a bare Steam number (17 digits starting with 7656, which steamid.io resolves from your profile link) gets the `V_` prefix added for you
3. Restart your server

@[open](panel:players)

> [!warning] Valheim reads the admin, ban and allow lists at start only. Any addition or removal needs a restart to take effect.

## What a Valheim server cannot do

None of this is missing from your server — it is missing from Valheim itself, whose dedicated server ships with no console and no RCON:

- **No console commands.** Valheim reads nothing from the console at all, so the ones we answer there (`status`, `players`, `worlds`, `mods`, `joincode`, `ban`, `unban`) are handled by the panel rather than passed to the game. Anything else belongs in game on F5.
- **No announcements.** There is no way for the server to put a message in front of players.
- **No kick.** Ban from the Players page adds the platform id to the ban list and stops them the next time they try to join — restart your server to drop them if they are on right now.
- **No manual save.** Valheim saves on its interval (set in the settings) and on shutdown. A backup archives the last autosave.

Anything that needs live admin commands is done from inside Valheim on F5, once you are an admin.

## Your first night

- Every player's progress lives on their own machine, and the world lives on your server
- The server keeps running with nobody online, so farms and builds stay where they are
- 10 players is Valheim's own limit and only a mod changes it
- Your world is safe — we take automatic backups, and you can take one yourself

@[open](backups)

> [!warning] Valheim patches often. Your server pulls the newest Steam build every time it starts, so a restart is all it takes to catch up — just make sure your players updated their game too.
