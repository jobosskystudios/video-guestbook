# Paste this into Claude Code

Open Claude Code **inside the `video-guestbook` folder**, then copy everything between the lines below into it.

---

You are helping me (a wedding videographer in India) finish, test and deploy my own **iPad video guestbook app**. The working code is already in this folder; read `README.md` first.

## What the app is
- A **vanilla HTML/CSS/JS Progressive Web App** with no framework and no build step. It runs in Safari on an **M1 iPad (iPadOS 17+)** as a home-screen app and works **offline**.
- Camera: a **Sony A7 III** sends HDMI to a **UVC HDMI-to-USB capture card**, then through a USB-C hub into the iPad. Audio is a **RØDE Wireless PRO** plugged into the camera's mic jack, so it arrives through the capture card.
- Guests choose **Video message / Voice message / Photo / Boomerang**, enter a name, get a question prompt (English/Hindi), see a live preview with a branded frame burned in, count down, record, review, save, then see a thank-you screen with confetti and a QR code.
- Recording: `getUserMedia` → draw to `<canvas>` (crop, filter, overlay) → `canvas.captureStream()` + mic track → `MediaRecorder` (MP4/H.264 on Safari). A "Direct" engine records the raw camera stream instead.
- Storage: IndexedDB (`db.js`). Export goes through the Web Share API (batches of 10) or downloads, plus a CSV guest list.
- Hidden admin: tap the top-left corner 5× and enter the PIN (default 1234). Tabs: Event, Experience, Look, Devices, Gallery, Kiosk. Settings are in localStorage. Defaults, UI strings (en/hi), prompts, filters and fonts are in `config.js`.

## Rules
- Keep it **vanilla JS with no build step**, and keep it **working offline**. Don't add frameworks or CDNs that the app needs at runtime.
- Don't rewrite from scratch; make focused edits.
- Whenever you change any file, **bump `CACHE` in `sw.js`** and `APP_VERSION` in `config.js`.
- iPad Safari is the target. Check every API you use is supported on iPadOS 17+ and feature-detect anything newer (e.g. canvas `ctx.filter` is iPadOS 18+).

## Tasks, in order (stop after each and tell me what to test)
1. **Review & run locally.** Read all files and fix any bugs you find. Serve with `npx serve .` and tell me the link to test with my laptop webcam in Chrome.
2. **Automated smoke test.** Write a Playwright test (Chromium with `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream`) that records one of each mode, opens the admin with PIN 1234, and checks 4 items appear in the Gallery. Run it.
3. **Deploy over HTTPS** (camera needs https). Create a GitHub repo and publish with **GitHub Pages** using the `gh` CLI, then give me the URL to open on the iPad. (If I'd rather not use GitHub, give me Netlify Drop steps instead.)
4. **Brand it for my studio.** Ask me for my studio name, logo, colours and Instagram handle. Update `config.js` defaults (studioName, accent, qrLabel, galleryUrl) so every new event starts branded.
5. **iPad test session.** Give me a short checklist using README section 5, and help me debug anything that fails. To see iPad console logs: iPad Settings → Safari → Advanced → Web Inspector **On**, connect to a Mac → Safari → Develop menu. I may not have a Mac, so the in-app **Admin → Devices → Live check** box shows camera resolution, mic, recorder format and storage.

## Phase 2: trending upgrades (only when I ask, one at a time)
- **Instant guest copy via QR:** after saving, upload the clip to cloud storage (Cloudflare R2 or Supabase Storage with a tiny serverless function), then show a QR so the guest can download their own message. It needs venue Wi-Fi/4G and must queue uploads when offline.
- **Live message wall:** a second screen/TV page that shows new photos, boomerangs and messages as they come in (Supabase realtime or a local-network approach).
- **AI keepsake book:** transcribe every message (Whisper or a speech-to-text API), then generate a printable **PDF "guestbook"** with each guest's name, photo and words, in English and Hindi/Hinglish.
- **Auto-captioned highlight reel:** extend `tools/make-highlight-reel.sh` with title cards (couple names), background music ducking, and burned-in captions from the transcripts.
- **WhatsApp / Google Drive delivery** of the final folder to the couple.
- **Per-event templates:** save and load whole event presets (branding + overlay + prompts) as JSON files.
- **Native iPad app fallback** (only if Safari can't see the capture card): a SwiftUI + AVFoundation app with the same screens. It would use `AVCaptureDevice.DiscoverySession` with `.external` devices (iPadOS 17+), `AVCaptureMovieFileOutput`, save to Photos, and support Single App Mode. This needs a Mac with Xcode and an Apple Developer account.

---
