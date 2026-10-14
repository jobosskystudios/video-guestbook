# Video Guestbook — iPad app for weddings & events

A free, no-watermark video guestbook that runs on an **M1 iPad** in Safari (as a home-screen app), with a **Sony A7 III / A7 IV** as the camera.
No App Store and no Mac needed. It works **offline** at the venue, and every message is saved on the iPad until you export it.

---

## 1. What guests see

1. **Welcome screen**: couple names, date, headline, and buttons for **Video message · Voice message · Photo · Boomerang**. The background can be the live camera (blurred), a photo, or a solid colour.
2. **Name + consent** (optional): "Who is leaving this message?"
3. **Prompt card** (optional): a random question such as "Share your best marriage advice". Guests can pick *Another question*, *Use this one* or *I'll say my own*. Prompts come in English, Hindi or both.
4. **Live preview**: guests see exactly what will be recorded, including the frame and names burned into the video, a mic level meter and a filter strip (Natural / Soft glow / Golden / Vintage / B&W).
5. **3-2-1 countdown** with beeps, then recording with a REC timer and a progress bar. Recording stops automatically at the time limit.
6. **Review**: playback with **Save** or **Retake**. It saves automatically after 20 s if the guest walks away.
7. **Thank-you screen**: confetti, plus an optional **QR code** (couple's gallery, your Instagram or WhatsApp). It returns to the welcome screen by itself.

## 2. Full feature list

| Area | Features |
|---|---|
| Modes | Video message, **Voice message** (audio guestbook trend), Photo with flash, **Boomerang** (forward-reverse loop) |
| Branding | Couple names, date, hashtag, headline, logo, accent colour, 3 fonts (Script / Classic / Modern, all built into iPad so they work offline), welcome background |
| Burned-in frame | Elegant double border, bottom banner, minimal corner text, none, or **your own transparent PNG overlay** made in Canva |
| Output | **Landscape 16:9** or **Portrait 9:16** for Reels, 720p/1080p, MP4 (H.264/AAC) on iPad |
| Guest experience | Bilingual UI (English / हिन्दी / both), question prompts, name capture, consent checkbox, live filters, mic meter, countdown sounds, retake, auto-save, idle reset |
| Admin (PIN) | Tap the **top-left corner 5×**, then enter the PIN (default **1234**). Tabs: Event · Experience · Look · Devices · Gallery · Kiosk |
| Devices | Pick the camera (capture card) and mic, capture resolution, recording engine (Branded / Direct), voice cleanup, live check with resolution, fps, recorder format and storage |
| Gallery | Every message with thumbnail, guest name, prompt and time. Play / Share / Download / Delete, **Save-all in batches of 10** to Photos / Files / AirDrop, **guest list CSV**, per-event folders, delete event |
| Kiosk | Screen wake-lock, idle timeout, PIN, Guided Access instructions, auto-reconnect if the camera cable is bumped, offline support |
| Highlight reel | `tools/make-highlight-reel.sh` stitches every exported clip into one film for the couple (needs ffmpeg on your Mac/PC) |

## 3. Hardware setup (Sony + iPad)

```
A7 III ──micro-HDMI→HDMI cable──► 4K HDMI-to-USB capture card ──► USB-C hub (with PD charging) ──► iPad M1
   ▲                                                                      ▲
   └── RØDE Wireless PRO receiver → camera MIC jack                        └── USB-C charger / V-mount → PD
       (audio travels inside the HDMI signal)
```

**Which camera:** use the **A7 III** on the booth and keep the A7 IV for your main coverage. The booth only needs a clean live picture.
The **A7 IV** can also skip the capture card by setting its USB Connection Mode to **USB Streaming** (the menu name varies by firmware). Test this, because a capture card is usually more reliable.

**A7 III settings**
- Mode dial on **Movie**. MENU → Setup → **HDMI Settings**: HDMI Resolution **1080p** (or Auto), **HDMI Info. Display: Off** (removes the on-screen icons), TC Output Off, CTRL FOR HDMI Off.
- **Power:** use an NP-FZ100 **dummy battery / DC coupler** so it runs all night. Set Auto Power OFF Temp to **High** and Power Save Start Time to the maximum, then do a 2-hour idle test before your first event.
- **Focus:** manual focus at about 1–1.5 m with **f/4–f/5.6** keeps groups sharp. Alternatively use Continuous AF with Face Priority.
- **Exposure:** Manual, 1/50–1/60 s, Auto ISO. Lock white balance to your light (about 5600 K).
- **Lens:** 20–28 mm (for example the 28-70 kit lens at 28 mm) fits 2–4 people.
- **Audio:** plug the RØDE receiver into the **MIC jack**, set Audio Rec Level to Manual and aim for peaks around −12 dB.

**Capture card:** it must be **UVC**, which plug-and-play cards are. A **USB 3.0 card with the MS2130 chip** (inexpensive) or an Elgato Cam Link 4K works. Avoid the cheapest USB 2.0 "MS2109" sticks; they work but look softer.
**USB-C hub:** it needs **PD pass-through (60 W+)** and a USB-A 3.0 port, so the iPad charges while the capture card is plugged in.
**iPad:** needs **iPadOS 17 or newer**, which added external camera support. Update to the latest version.

## 4. Put the app on your iPad (one-time, 10 minutes)

Camera access needs **https**, so host the folder for free. Pick one:

- **Netlify Drop (easiest):** on a computer, go to app.netlify.com/drop and drag this whole folder in. You get an https link.
- **GitHub Pages:** ask Claude Code to do it (see `CLAUDE_CODE_PROMPT.md`).

Then, on the iPad:
1. Open the link in **Safari** and tap **Allow** for camera and microphone.
2. Share button → **Add to Home Screen**, then open it from the home screen. It runs full screen and keeps working offline.
3. Tap the top-left corner 5×, enter **1234**, then **Devices** → choose your capture card for both Camera and Microphone.
4. **Kiosk** tab → change the PIN. **Event** tab → enter the couple's details.
5. iPad Settings → Display → **Auto-Lock: Never**. Settings → Accessibility → **Guided Access: On**. In the app, triple-click the top button → Start.

> Updating later: after changing code, bump `CACHE` in `sw.js` and re-deploy. Open the app twice on the iPad to pick up the new version.

## 5. Testing checklist (do this before your first paid event)

- [ ] **Desktop test:** in this folder run `npx serve .`, open the localhost link in Chrome, and record a video, voice message, photo and boomerang with your laptop webcam.
- [ ] **iPad, built-in camera:** open the hosted link, allow the camera, record one of each mode, then check them in Admin → Gallery.
- [ ] **iPad + A7 III:** connect everything. Admin → Devices → choose the capture card. The **Live check** box should show `1920×1080 @ 30 fps` (or 60).
- [ ] **Audio:** RØDE into the A7 III, choose the capture card as the Microphone, and talk. The meter should move. Record and listen back with headphones.
- [ ] **Branding:** upload a logo and try each frame style, portrait mode and the custom PNG overlay.
- [ ] **Endurance:** leave it running 2–3 hours and record 20–30 clips. Check camera heat and power, iPad battery and storage (Devices → Storage).
- [ ] **Export:** Gallery → Save / share all → **Save Videos** (to Photos) or AirDrop to your Mac. Then run the highlight-reel script.
- [ ] **Kiosk:** Guided Access on, try to exit the app as a guest would, and unplug and replug the HDMI cable (the app should reconnect).

## 6. Troubleshooting

| Problem | Fix |
|---|---|
| Capture card not in the Camera list | iPadOS older than 17, a non-UVC card, or a hub without enough power. Try the card directly in the iPad. If Safari still won't list it, use the native-app route in `CLAUDE_CODE_PROMPT.md` (Phase 2). |
| Black picture from the A7 III | Turn HDMI Info Display Off, set HDMI Resolution to 1080p, put the dial on Movie mode, and reseat the micro-HDMI cable (it's fragile, so add a cable clamp). |
| No sound / wrong mic | Admin → Devices → Microphone → pick the capture card. Turn "Voice cleanup" OFF. |
| Recordings stutter | Devices → Capture resolution **1080p** and Recording engine **Direct**. Close other apps. |
| Filters don't show | Canvas filters need iPadOS 18+. They hide automatically on older versions. |
| Storage filling up | About 75 MB per minute of 1080p video. Export after **every** event and then delete it in the Gallery. Don't use the iPad as long-term storage. |

## 7. Files

```
index.html        screens & layout
styles.css        look & feel (iPad landscape + portrait)
app.js            all app logic: camera, compositing, recording, admin, gallery
config.js         defaults, English/Hindi text, prompts, filters, fonts  ← easy to edit
db.js             on-device storage (IndexedDB)
sw.js             offline support
manifest.webmanifest, icons/   home-screen app
vendor/qrcode.js  QR generator (MIT licence, Kazuhiko Arase)
tools/make-highlight-reel.sh   stitch exported clips into one film (ffmpeg)
```
