# Five Blades on the Solana dApp Store (Seeker)

Everything needed to put Five Blades in the Solana dApp Store, the store on the Seeker phone. The game itself is
ready for it: it installs as a web app, plays offline, fits a phone held sideways, and has the pages and features the
store's policy asks for. What is left is listed under **Before you submit** and **Steps only you can do**.

Sources: [Submit a new app](https://docs.solanamobile.com/dapp-store/submit-new-app),
[Build and sign an APK](https://docs.solanamobile.com/dapp-store/build-and-sign-an-apk),
[Listing page guidelines](https://docs.solanamobile.com/dapp-store/listing-page-guidelines),
[webshell CLI](https://docs.solanamobile.com/cli/webshell),
[Publisher policy](https://legal.solanamobile.com/publisher-policy-web). Checked 15 November 2026.

---

## Before you submit

1. **Set the contact email.** `apps/app/public/privacy.html` and `apps/app/public/terms.html` say `CONTACT_EMAIL` in
   six places. Replace it with an address you will answer (a dedicated one is best; it is public). The store also asks
   for a support email and a contact email: use the same.
2. **Deploy.** The app is a shell around the live site, so the live site must have this work: the installable app
   (service worker, manifest, icons), the touch and phone changes, account deletion, name reporting and filtering,
   and the privacy and terms pages. Then check that these answer:
   - https://fiveblades.online/privacy
   - https://fiveblades.online/terms
   - https://fiveblades.online/manifest.webmanifest
3. **Confirm the art licences.** The store refuses apps that use art, sound or type without the right to. Check that
   each pack in the game's credits allows use in a published, distributed game (most game asset packs do; some
   forbid NFTs, and publishing to this store mints NFTs that carry the app's icon and screenshots):
   - Hooded Seeker by Primitive Pixels (the five fighters; also in every screenshot and the icon's colours)
   - Free Pixel Art Forest (Eder Muniz), Luis Zuno's backgrounds, David Marah's demon woods
   - The Dawn, NightForest and Background Hills packs; SHADOW Series, Dark Samurai, Knight, Sicklezeep
   - Stringstar Fields, Mossy Assets, Plant Animations, Lore tiles; Reaper (Animated Pixel Art)
   - Platform Fighter Template (Versus stage and sounds); the supplied sound effects and music
   - The menu picture (`apps/app/src/home.webp`) and the banner made from it: confirm where it came from
   - pixelfx (MIT), Chakra Petch and IBM Plex Mono (SIL OFL): fine
4. **Choose the Android application id.** It can never be changed and must be unique. Suggested:
   `xyz.fiveblades.game` (or your own domain, reversed). Used in the build below and in the portal.

## The listing

| Field | Value |
|---|---|
| App name (25 max) | `Five Blades` |
| Short description (50 max) | `Pixel-art brawler: campaign, waves & online duels` (49) |
| Category | Games |
| Website | https://fiveblades.online (or your domain) |
| Privacy policy | https://fiveblades.online/privacy |
| Terms of service | https://fiveblades.online/terms |
| Support and contact email | the address you put in the pages |

**Long description**

> Five blades. Five stories. One stolen god.
>
> Five Blades is a fast pixel-art brawler built for your phone held sideways. Pick one of five hooded fighters, each
> with their own blade, element and story, and fight across a world that remembers what you did.
>
> - **Campaign:** five intertwined stories of an executioner, a revolutionary, an exile, a healer and an architect.
>   Find the three pieces of each level's key, face its guardian, and choose how to answer them. Your choices shape
>   the world and which ending you reach.
> - **Survival:** endless waves that grow with every round. Climb the global leaderboard.
> - **Versus:** online duels for up to five players. Share a link and fight your friends in seconds.
> - **Daily challenge:** one fighter and one seed for everyone, every day.
> - **Six specials per fighter,** from meteor storms and black suns to absolute zero and a summoned thunder god.
> - **Items** dropped by fallen foes: healing draughts, aura vials, fire bombs, ward charms and more.
> - **Made for touch,** with a floating stick, adjustable buttons and haptics, and full controller support.
> - **Plays offline** once installed. No ads.

**What's new (first release)**

> First release on the dApp Store: five campaigns, Survival, online Versus and the Daily challenge, with touch
> controls made for the phone held sideways.

## The assets

All in `art/store/`:

| Asset | File | Spec |
|---|---|---|
| Icon | `icon-512.png` | 512 × 512, opaque (checked: no alpha channel) |
| Banner | `banner-1200x600.png` | 1200 × 600 |
| Screenshots (8) | `shot-1-title.png` … `shot-8-boss.png` | 1920 × 1080 each, all landscape 16:9 |

The screenshots are the game as it looks on a phone held sideways (drawn at phone size, at twice the density): the
title, fighter select, a Survival fight with the touch controls, four of the greater arts (Meteor Fall, Black Sun,
Absolute Zero, Thunder God) and a boss. The order above is the order to upload them in; the first one sets the shape
of the gallery, and every other one matches it.

## Building the signed APK

The store accepts a signed release APK. For a web game, Solana Mobile's own CLI makes one: a small Android app that
shows the live site in a WebView (not a Trusted Web Activity, so no Digital Asset Links file is needed). Because it
shows the live site, every deploy reaches players without a new APK; a new APK is needed only to change the app
itself (its name, icon, version).

**What this machine has:** JDK 17 (`C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot`) and JDK 21
(`C:\tools\jdk-21.0.12.1+1`), and `keytool`. **What it lacks:** the Android SDK. Install it once, either with
Android Studio (`winget install Google.AndroidStudio`, then open it once and let it download the SDK) or the
command-line tools alone, and set `ANDROID_HOME` to it (usually `%LOCALAPPDATA%\Android\Sdk`). About 2 GB; C: had
38 GB free.

Then, from `~/dev/ledge-brawler/mobile`, in a terminal of your own (these make the key that every update must be
signed with, so you should hold its passwords, not an assistant):

```powershell
# 1. Check the tools. It says what is missing.
npx solana-mobile@latest doctor

# 2. Make the Android project. It asks for a keystore password: choose a strong one and keep it in a password manager.
npx solana-mobile@latest webshell init five-blades-android `
  --url https://fiveblades.online/?source=app `
  --manifest https://fiveblades.online/manifest.webmanifest `
  --application-id xyz.fiveblades.game `
  --app-name "Five Blades" `
  --keystore-path ./five-blades.keystore `
  --keystore-alias five-blades `
  --version-code 1 --version-name 1.0.0

# 3. Build the signed release APK.
npx solana-mobile@latest webshell build five-blades-android --keystore-path ./five-blades.keystore --keystore-alias five-blades

# 4. Check its signature. The APK is five-blades-android/app/build/outputs/apk/release/app-release.apk
& "$env:ANDROID_HOME\build-tools\<version>\apksigner.bat" verify --print-certs five-blades-android\app\build\outputs\apk\release\app-release.apk
```

Back up `five-blades.keystore` and its passwords somewhere off this computer. Without them the app can never be
updated. `mobile/.gitignore` keeps them, and the generated project, out of the repository.

**Two things to check in the generated project before building** (the docs do not say whether the shell does them):

- **Landscape.** In `five-blades-android/app/src/main/AndroidManifest.xml`, the main activity should have
  `android:screenOrientation="sensorLandscape"`. Without it the game starts upright and asks the player to turn the
  phone.
- **Full screen.** The game asks for full screen itself, but a WebView may ignore that. If the status and navigation
  bars stay visible on the phone, the activity needs an immersive full-screen theme.

To test on a phone: `npx solana-mobile@latest device install <apk>` with the phone connected and USB debugging on.

**For a new version later:** raise `SOLANA_MOBILE_VERSION_CODE` and `SOLANA_MOBILE_VERSION_NAME` in
`five-blades-android/gradle.properties`, build again with the same keystore, and submit it as a new release.

## Steps only you can do

These need your identity, your wallet and your approval, so they are yours alone:

1. **Publisher account** at https://publish.solanamobile.com.
2. **Publisher profile:** individual or organisation, name, website.
3. **Identity check** (KYC for an individual, KYB for a company). You can make the profile before it is approved, but
   not add the app. If it stalls, the `#developer` channel and a ticket in `#dev-answers` on Solana Mobile's Discord.
4. **Publisher wallet:** a browser extension wallet (Phantom, Solflare) with a little SOL, about 0.2 SOL for fees and
   storage. Use a **new** wallet only for this: every future version must be signed by the same one, so do not lose
   it.
5. **Add the app:** the details and assets above, then approve the transaction that mints the app's NFT.
6. **Releases → New Version:** upload the signed APK, paste "What's new", submit, and approve each transaction.
7. **Review:** usually 3 to 4 working days, by email from `publishersupport@dappstore.solanamobile.com`.

## How the game meets the policy

| The policy asks | Where Five Blades does it |
|---|---|
| A privacy policy that says what is collected | `/privacy`: written from what the code keeps (device-only progress, leaderboard names, Privy sign-in, Versus relay, hosting) |
| Terms of service | `/terms` |
| Accounts can be deleted, with their data | Title screen → your name → **Delete my account** (two taps): deletes the cloud save, every standing kept under the account, and the Privy sign-in (`server/api/account.js`) |
| Players can report what others put up | The ⚑ beside each name on the leaderboard (`server/api/report.js`); three reports hide a standing until reviewed (the `reports` table) |
| Content is moderated | Offensive names are shown as "Player" (`server/api/_names.js`); Versus names are made by the game, not typed |
| No disruptive ads, no tracking | None in the game |
| No gratuitous violence | Stylised pixel-art combat; no blood or gore |
| The WebView loads only trusted content | The shell loads only the game's own site |

**To review in the reports table** (Neon project `five-blades`):
`SELECT board, ref, count(*) FROM reports GROUP BY board, ref HAVING count(*) >= 3;` then delete the standing, or
delete its reports to restore it.
