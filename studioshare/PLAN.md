# StudioShare — Plan (Step 1, waiting for your OK)

Peer-to-peer delivery of wedding photos and films, straight from the studio computer to the client, using normal BitTorrent so **any** torrent app works, plus a browser option.

Nothing in this plan has been built yet. Read it, answer the questions in section 12, and say OK (or ask for changes). Then I start Phase 1, milestone M0.

---

## 1. The short version

```
                         ┌────────────────────── Cloudflare (free) ──────────────────────┐
                         │  share.yourstudio.in  →  share web page (static site)          │
                         └───────────────────────────────┬───────────────────────────────┘
                                                         │ asks for share info / password check
┌──────────── YOUR PC ────────────┐            ┌──────── SMALL VPS (~₹450/month) ─────────┐
│ StudioShare app (Electron)      │  announce  │  Caddy (HTTPS)                            │
│  • hashes folder, makes torrent │──────────► │  API + database (share links, passwords,  │
│  • seeds on TWO networks:       │  heartbeat │      expiry, progress reports)            │
│      TCP/uTP  → torrent apps    │            │  Tracker: HTTPS + WSS (only our shares)   │
│      WebRTC   → browsers        │◄─ tunnel ─►│  Relay: TURN (browsers) + TCP relay       │
│  • tray, autostart, dashboard   │  (only if  │         (torrent apps) — ONLY when a      │
│  • reads files READ-ONLY        │   needed)  │         direct connection is impossible   │
└───────────────┬─────────────────┘            └───────────────────────────────────────────┘
                │  photo/video data flows peer-to-peer (never stored on any server)
      ┌─────────┴───────────┬──────────────────────┐
  uTorrent / qBittorrent  Browser (Chrome/Edge)   Our downloader app (Phase 2)
```

* You pick a folder → app makes a standard BitTorrent v1 torrent → starts seeding → gives you a share link + magnet + .torrent + a ready WhatsApp message.
* The client opens the link, (types the password), and chooses: browser download, open in torrent app, or download .torrent.
* When your PC is off, everyone's download pauses. When it is back, their apps reconnect by themselves (within ~1–2 minutes) and continue. BitTorrent checks every piece with a hash, so files cannot arrive corrupted.

---

## 2. Honest warnings first (things that change the design)

These are the places where what you asked for is harder than it sounds. I have designed around each one.

### 2.1 CGNAT is the biggest problem — for torrent apps, not only browsers
If **your** internet is behind CGNAT (common on Jio/Airtel) and the **client** is behind a normal home router (almost everyone), a standard torrent app **cannot connect to you at all**. TURN (coturn) only helps browsers; uTorrent/qBittorrent do not use TURN.

My solution, tried in this order, automatically:
1. **UPnP / NAT-PMP** port opening on your router (works if you are not on CGNAT).
2. **IPv6.** Jio and Airtel fibre give most homes IPv6, which has no CGNAT. Many clients also have IPv6. The app will detect it and announce it. (Sometimes you must allow incoming IPv6 in the router — I'll give you exact steps for your router model.)
3. **Relay tunnel through our VPS** (fallback). Your app keeps one outgoing connection open to the VPS; the VPS gives you a public port and passes torrent traffic through it. Files are **not stored** on the VPS; it only forwards bytes, like TURN does for browsers. This uses VPS bandwidth (see 2.5).
4. Long-term best fix: ask your ISP for a **public IPv4** (Jio/Airtel usually charge for a static IP; I'll explain how to ask). Then no relay is needed.

The app's dashboard will show one clear line: *"Reachable directly ✅"* / *"Reachable via IPv6 only ⚠️"* / *"Using relay 🔁"*.

### 2.2 Browser download of a 500 GB wedding is possible, but not the best way
* Only **Chrome and Edge on desktop/laptop** can save big downloads straight to a folder (File System Access API). Firefox, Safari and **all phones** cannot do this properly → the page will tell those users to use a torrent app (or our app in Phase 2).
* To make browser downloads **resumable** (survive closing the tab, power cuts), each file is first written to the browser's private disk area (OPFS), then moved to the chosen folder when that file is complete. This needs temporary free space about equal to the files currently downloading, not the whole wedding.
* The tab must stay open while downloading. Re-opening the link continues where it stopped.
* My recommendation for clients: **torrent app (or our app) for the full wedding; browser for "just the highlight film" or a few folders.** The page will explain this simply.

### 2.3 Password protects the link, not the files after someone has the magnet
Once a client has the magnet/.torrent, they can forward it. To keep real control, every link gets a **secret per-link key ("passkey") inside the tracker address**. Disabling a share or a single link makes our tracker refuse that key, so new downloads cannot find you. (Someone already connected to you can finish — disabling also stops your seeding, which ends that too.) You can also make separate links for "Bride's family" and "Groom's family" and see/disable each one.

### 2.4 "Private" flag, DHT and public trackers
* **Private flag ON by default** — torrent apps then use only our tracker (no DHT/peer exchange). Recommended.
* **Public trackers: I recommend OFF.** You are the only source of the files, so public trackers add nothing except leaking your share and IP to strangers. I'll keep the setting, default off.
* **UDP tracker:** I recommend HTTP(S) + WSS only. Every listed client supports HTTP trackers, and the per-link passkey works reliably over HTTP but not over UDP in all clients (uTorrent handles UDP tracker paths inconsistently). Saying no to UDP keeps "disable link" really working. I can add UDP if you insist, with the trade-off explained.
* **Testing:** In this cloud environment I can automatically test with **libtorrent** (the engine inside qBittorrent and Deluge) and **Transmission**. I cannot run **uTorrent** here (Windows-only, closed source) — that part will be in your hand-test checklist, and you tell me the result. I will report the qBittorrent/Transmission results both ways (private on/off).

### 2.5 Speed and bandwidth reality
* The client's speed is limited by **your upload speed**. 500 GB at 100 Mbps upload ≈ 11–12 hours; at 40 Mbps ≈ 28 hours. Tell me your upload speed (speedtest.net) so I can set sensible defaults.
* Good news: if 3 family members download the same wedding, they also share pieces **with each other**, so it gets faster for everyone.
* Relay traffic counts against the VPS's monthly bandwidth. Hetzner's European servers include ~20 TB/month, which covers many weddings. (Hetzner's Singapore location has lower latency to India but much less included bandwidth — I'll confirm current numbers with you before you buy.)

### 2.6 "Never modify my original files" — I enforce this in code
The torrent library normally opens files for reading **and writing** (it can create or resize files). I will give it a **read-only storage layer** that opens your files with read-only access and refuses any write. If a file was changed, renamed or moved after sharing, the app shows a warning ("Relink folder" in Phase 2) instead of touching anything.

### 2.7 Windows installer warning
An unsigned installer shows *"Windows protected your PC" → More info → Run anyway*. For your own PC that's fine (free). A code-signing certificate costs roughly ₹15,000–35,000/year (or a cheaper cloud-signing subscription if you're eligible); it only matters for the Phase 2 **client** app. Mac builds need an Apple Developer account ($99/year). I'll warn again before anything paid.

### 2.8 Android client app — probably skip
Phones can't hold a 500 GB wedding, and good free Android torrent apps exist (LibreTorrent, Flud). I'll recommend those on the page instead of building our own Android app. Revisit in Phase 2 if you really want it.

---

## 3. Technology choices (and why)

| Part | Choice | Why |
|---|---|---|
| Torrent engine | **WebTorrent v2** (Node.js) | The only mature engine that seeds to **both** normal torrent apps (TCP/uTP) **and** browsers (WebRTC) from one process. Standard v1 torrents → uTorrent compatible. (v2/hybrid torrents are not supported by WebTorrent and add nothing for us, so we use v1.) |
| Studio app | **Electron + TypeScript** | Runs Node.js (needed for WebTorrent), has tray, auto-start, sleep prevention, Windows installer (NSIS) and Mac builds. Tauri would be smaller but can't run WebTorrent's hybrid mode without bundling Node anyway. |
| UI (studio app + share page) | **Svelte + Vite** | Small, fast pages; simple code. |
| Share website | **Cloudflare Pages** (free) | Static page; a tiny Pages Function makes nice WhatsApp link previews (logo + couple name). |
| API + tracker | **One Node.js service** (Fastify + `bittorrent-tracker`) | Tracker and API share one database, so "only active shares" and passkeys are a simple lookup. |
| Database | **SQLite** (with daily backup), via a query builder that also supports Postgres | Zero cost, zero admin. Every table has a `studio_id` from day one, so the Phase 3 multi-studio version needs no rewrite; we can move to Postgres then. |
| Relay | **coturn** (TURN, for browsers) + a **TCP relay tunnel** (for torrent apps) | See 2.1. Tunnel: either the proven tool `frp` or a small built-in one — I'll pick after a test. |
| HTTPS | **Caddy** | Gets and renews Let's Encrypt certificates automatically. |
| Server setup | **Docker Compose** on Ubuntu | One command to start/update everything. |
| Tests | **Vitest** (unit), **Playwright** (share page + browser download), **libtorrent + Transmission** in Docker (compatibility) | Automated where possible + your hand checklist. |
| Phase 2 client app | Decide then: **Tauri + Rust torrent library (rqbit)** for a ~10 MB app, or reuse Electron (~90 MB) | It only needs TCP to reach you, not WebRTC. |
| Thumbnails (Phase 2) | **Cloudflare R2** (recommended) | 10 GB free, no download fees; previews must work while your PC is off, so peer-to-peer previews are a bad fit. Above 10 GB it costs ~₹1.3 per GB per month — I'll warn before enabling. Auto-deleted when a share expires. |

---

## 4. Costs

| Item | Cost |
|---|---|
| VPS (Hetzner CX22 or similar, 2 vCPU, 4 GB, 40 GB disk, ~20 TB traffic) | ~€4–6/month ≈ ₹400–550 |
| `.in` domain | ~₹600–900/year ≈ ₹50–75/month |
| Cloudflare Pages + DNS | Free |
| Cloudflare R2 (Phase 2 thumbnails) | Free up to 10 GB |
| **Total** | **≈ ₹450–650/month** ✅ within your ₹600–800 target |

Nothing paid is used without asking you first.

### DNS records you'll add (domain managed on Cloudflare, free)
| Name | Type | Points to | Cloudflare proxy |
|---|---|---|---|
| `share` | CNAME | your Cloudflare Pages project | Proxied (orange) |
| `api` | A | VPS IPv4 (+ AAAA for IPv6) | DNS only (grey) |
| `tracker` | A | VPS IPv4 (+ AAAA) | DNS only (grey) |
| `turn` | A | VPS IPv4 (+ AAAA) | DNS only (grey) |

(Grey cloud is required: Cloudflare's free proxy can't carry TURN/relay traffic.)

---

## 5. Security and privacy design

* Share links: `https://share.yourstudio.in/s/<22-character random ID>` (128 bits — cannot be guessed).
* Password (optional, per share): hashed with Argon2 on the server; rate-limited; the page only gets the magnet/.torrent **after** the password is correct.
* Per-link passkeys in tracker URLs; tracker answers only for **active, unexpired** shares with a **valid** passkey.
* Disable / expire → tracker stops answering immediately; the studio app stops seeding that share at its next sync (within a minute when online).
* Studio app ↔ server: the app is paired once with a secret device token; all calls over HTTPS.
* TURN: short-lived credentials (expire after a few hours), so the relay can't be abused by strangers.
* Personal data: no client accounts, no emails, no names (unless you type a link label). IP addresses are used live by the tracker but **not stored**; download progress is stored per link, not per person.
* Files: never uploaded; never modified (read-only store).

---

## 6. Database design (multi-studio ready)

```
studios        id, name, slug, branding(json), plan, created_at
users          id, studio_id, email, password_hash, role            (Phase 3; Phase 1 = one owner)
devices        id, studio_id, name, token_hash, kind(main|seeder), last_seen, reachability
shares         id, studio_id, public_id, title, couple_name, infohash, piece_length,
               total_size, file_count, is_private, password_hash, status(active|paused|disabled),
               expires_at, created_at
share_files    share_id, idx, path, size                 (folder list on the page, selective download)
links          id, share_id, label, passkey, status, created_at   ("Bride's family", …)
download_sessions  id, share_id, link_id, peer_key(hash), client_name, downloaded, left,
               first_seen, last_seen, completed_at
events         id, studio_id, share_id, type, payload(json), created_at   (notifications, audit)
favourites     share_id, link_id, file_idx, created_at     (Phase 3)
```
Every query is filtered by `studio_id`, so adding more studios later is safe.

---

## 7. Folder structure

```
studioshare/
├── apps/
│   ├── studio/            Electron app (Windows first, Mac possible)
│   │   ├── src/main/      tray, autostart, torrent engine, read-only store, sync with server
│   │   ├── src/preload/
│   │   └── src/renderer/  Svelte UI: New share, Dashboard, Settings, Network check
│   ├── web/               Share website (Cloudflare Pages) + browser downloader
│   └── downloader/        Phase 2 client app
├── server/                API + tracker (Fastify, bittorrent-tracker, SQLite)
├── packages/
│   └── shared/            types, API client, link/magnet helpers, constants
├── deploy/
│   ├── docker-compose.yml, Caddyfile, turnserver.conf, .env.example
│   └── DEPLOY.md          beginner step-by-step VPS + Cloudflare guide
├── tests/
│   └── compat/            libtorrent + Transmission compatibility tests (Docker)
├── docs/
│   ├── TEST_CHECKLIST.md  hand tests (uTorrent, Wi-Fi off/on, power cut, …)
│   └── NETWORK_HELP.md    CGNAT, port forwarding, public IP, IPv6 — in plain English
└── README.md
```

---

## 8. Order of work — Phase 1 (you test after each milestone)

| # | Milestone | What you'll be able to test |
|---|---|---|
| **M0** | Setup: install Node.js, Git, VS Code (I'll give exact links/clicks). Project skeleton. | An empty StudioShare window opens on your PC. |
| **M1** | Torrent core: folder → torrent (sensible piece size, e.g. 16 MB for big weddings), read-only seeding on TCP/uTP + WebRTC, fast restart without re-hashing. Automated test: seed → download with WebTorrent, libtorrent and Transmission; byte-for-byte check. | Run one command; it shares a test folder on your home network; download it in qBittorrent on another PC. |
| **M2** | Server on your own PC first (Docker): API, database, tracker with whitelist + passkeys, TURN. | Same test, now through our tracker; disable the link and see new downloads refused. |
| **M3** | Studio app UI: drag-drop folder, name, password, Share button with hashing progress, link/magnet/.torrent/WhatsApp message, dashboard (size, files, downloaders, % each, speed, total uploaded), tray, start with Windows, restore after restart, settings (speed limit, night schedule, active shares, prevent sleep), network check. | Make a real share from the app and copy the WhatsApp message. |
| **M4** | Share web page: branding, couple name, size, folder list, password screen, 3 download options, live online/offline + progress + speed + time left, help section; Chrome/Edge resumable browser download; warnings for other browsers/phones. | Open the link on another PC, download in the browser, close tab, reopen, it continues. |
| **M5** | Go live: rent VPS, buy/point domain, deploy with Docker Compose + HTTPS, Cloudflare Pages. Reachability check + IPv6 + relay tunnel fallback. | A friend on a different internet connection (e.g. mobile hotspot) downloads from you. |
| **M6** | Windows installer (with firewall rule so Windows doesn't block seeding). | Install StudioShare like a normal program. |
| **M7** | README, troubleshooting, full hand-test checklist, private-flag results report. | Follow the checklist end to end (5 GB share, Wi-Fi off halfway, power cut, sleep, etc.). |

Then **Phase 2** (gallery previews, selective download, our client app, completion notifications + WhatsApp "done" message, expiry, seeder-only mode for a second PC/NAS, relink folder) and **Phase 3** (favourites, branding settings + custom domain, multi-studio subscription with admin panel) — each planned in detail when we get there.

---

## 9. How downloads survive real life

| Situation | What happens |
|---|---|
| Your PC sleeps / shuts down / power cut | Client apps keep retrying. Our tracker tells them to check every ~1–2 min, so they reconnect soon after you're back. The app restores all shares at startup **without re-hashing** (it trusts files whose size and modified-time didn't change). |
| Your internet drops or your IP changes | App notices, re-announces to the tracker, reconnects. |
| Client closes torrent app / PC | Torrent apps resume by themselves. |
| Client closes browser tab | Re-open the link → continues from the saved pieces (Chrome/Edge). |
| Corrupted piece | Detected by hash, downloaded again automatically. |
| While uploading | Windows sleep is blocked (setting, on by default); allowed again when idle. |

---

## 10. Where the code lives

This repository is your **video guestbook** app (served by GitHub Pages). StudioShare is a completely separate product, so I recommend a **new repository** (e.g. `jobosskystudios/studioshare`). For now I've put only this plan in `studioshare/PLAN.md` on the working branch; I'll move it when the new repo exists.

---

## 11. What I need from you to start

See section 12 — once answered and you say **OK**, I begin M0.

## 12. Questions

1. **New repo?** Create an empty GitHub repo `studioshare` (I'll tell you how) — or should I build inside this guestbook repo's `studioshare/` folder?
2. **Your internet:** ISP (Jio / Airtel / other), plan speed, and your **upload** speed from speedtest.net.
3. **Studio branding:** studio name "Jobossky Studios" (from your guestbook app)? Logo file, main colour, WhatsApp/contact number.
4. **Domain:** have you bought it yet? Which name?
5. **Test computers:** do you have a second computer (or a friend's) for download tests? Which torrent app do you prefer to test with?
6. **Choices I recommend — OK?** HTTP(S)+WSS trackers instead of UDP; public trackers off; private flag on; Hetzner Europe VPS; browser download for Chrome/Edge desktop only.
