// =============================================================
//  Video Guestbook — main app
//  Flow: Welcome → (Name/Consent) → (Prompt card) → Live preview
//        → Countdown → Record → Review → Save → Thank-you → Welcome
//  Hidden admin: tap the top-left corner 5× (or open URL with #admin)
// =============================================================
import * as db from './db.js';
import { APP_VERSION, DEFAULTS, STRINGS, FILTERS, FONTS } from './config.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

const cam = $('#cam');
const view = $('#view');
const ctx = view.getContext('2d');

const ICONS = {
  video: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6" width="13" height="12" rx="2.5"/><path d="M15.5 10.5 21 7.5v9l-5.5-3"/></svg>',
  audio: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5v4M8.5 21.5h7"/></svg>',
  photo: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h2l1.5-2h6l1.5 2h2A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/><circle cx="12" cy="13" r="3.8"/></svg>',
  boomerang: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12c-2-2.6-3.6-4-5.5-4a4 4 0 0 0 0 8c1.9 0 3.5-1.4 5.5-4zm0 0c2 2.6 3.6 4 5.5 4a4 4 0 0 0 0-8c-1.9 0-3.5 1.4-5.5 4z"/></svg>',
};
const MODES = ['video', 'audio', 'photo', 'boomerang'];

// ------------------------------------------------------------- state
const S = {
  settings: loadSettings(),
  stream: null, starting: null,
  screen: 'attract', mode: 'video', filter: 'none',
  guestName: '', prompt: '', promptBag: [],
  overlay: null, assets: {}, assetUrls: {},
  liveState: 'idle',            // idle | countdown | recording | busy
  recorder: null, result: null, thumbP: null, reviewUrl: null,
  audioCtx: null, analyser: null, meterSrc: null, timeBuf: null, freqBuf: null,
  wakeLock: null, timers: {}, idleAt: Date.now(),
  galleryEvent: null, exportCursor: 0, galleryUrls: [],
  filterSupported: detectCanvasFilter(),
  needsRestart: false,
};

function loadSettings() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('vg.settings') || '{}') }; }
  catch { return { ...DEFAULTS }; }
}
function saveSettings() {
  try { localStorage.setItem('vg.settings', JSON.stringify(S.settings)); } catch (e) { console.warn(e); }
}
// ctx.filter is iPadOS 18+. Assigning it on older Safari just adds a plain JS property that reads back
// unchanged, so test that it actually renders: invert a white pixel and expect black.
function detectCanvasFilter() {
  try {
    if (!('filter' in CanvasRenderingContext2D.prototype)) return false;
    const c = document.createElement('canvas'); c.width = c.height = 1;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.filter = 'invert(1)'; g.fillStyle = '#fff'; g.fillRect(0, 0, 1, 1);
    return g.getImageData(0, 0, 1, 1).data[0] < 128;
  } catch { return false; }
}

// ------------------------------------------------------------- i18n
const fmt = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => (v && k in v ? v[k] : ''));
function str(lang, key, vars) { return fmt(STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key, vars); }
function t(key, vars) { return str(S.settings.language === 'hi' ? 'hi' : 'en', key, vars); }
function tHTML(key, vars) {
  if (S.settings.language === 'both') return `${esc(str('en', key, vars))}<small>${esc(str('hi', key, vars))}</small>`;
  return esc(t(key, vars));
}
function applyI18n(root = document) { $$('[data-t]', root).forEach((el) => { el.innerHTML = tHTML(el.dataset.t); }); }

// ------------------------------------------------------------- helpers
function toast(msg, kind = '') {
  const el = $('#toast'); el.textContent = msg; el.className = 'show ' + kind;
  clearTimeout(S.timers.toast); S.timers.toast = setTimeout(() => { el.className = ''; }, 3500);
}
function clearTimer(name) { clearTimeout(S.timers[name]); clearInterval(S.timers[name]); delete S.timers[name]; }
function slug(s) {
  return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}
function eventId() { return slug(`${S.settings.coupleNames} ${S.settings.eventDate}`) || 'event'; }
function eventLabel() { return [S.settings.coupleNames, S.settings.eventDate].filter(Boolean).join(' · '); }
function extFor(mime) {
  if (/^audio\/mp4/.test(mime)) return 'm4a';
  if (/^audio\/webm/.test(mime)) return 'weba';
  if (/mp4/.test(mime)) return 'mp4';
  if (/webm/.test(mime)) return 'webm';
  if (/jpeg/.test(mime)) return 'jpg';
  return 'bin';
}
function canvasToBlob(canvas, type = 'image/jpeg', q = 0.9) {
  return new Promise((res) => canvas.toBlob((b) => res(b), type, q));
}
function snapshot(maxW = 480) {
  const sc = Math.min(1, maxW / view.width);
  const c = document.createElement('canvas');
  c.width = Math.round(view.width * sc); c.height = Math.round(view.height * sc);
  c.getContext('2d').drawImage(view, 0, 0, c.width, c.height);
  return canvasToBlob(c, 'image/jpeg', 0.75);
}
function loadImg(blob) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(blob); });
}
function fmtTime(sec) { sec = Math.max(0, Math.round(sec)); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; }
function download(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 15000);
}
function enabledModes() { return MODES.filter((m) => S.settings['mode' + m[0].toUpperCase() + m.slice(1)]); }

// ------------------------------------------------------------- audio fx
function unlockAudio() {
  try {
    if (!S.audioCtx) S.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (S.audioCtx.state === 'suspended') S.audioCtx.resume();
  } catch {}
}
function beep(freq = 880, dur = 0.12, vol = 0.25) {
  if (!S.settings.sounds || !S.audioCtx) return;
  const a = S.audioCtx, o = a.createOscillator(), g = a.createGain(), n = a.currentTime;
  o.frequency.value = freq; g.gain.setValueAtTime(0.0001, n);
  g.gain.exponentialRampToValueAtTime(vol, n + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, n + dur);
  o.connect(g).connect(a.destination); o.start(n); o.stop(n + dur + 0.03);
}
function setupMeter() {
  try {
    unlockAudio();
    if (S.meterSrc) { try { S.meterSrc.disconnect(); } catch {} }
    const tracks = S.stream?.getAudioTracks() || [];
    if (!tracks.length || !S.audioCtx) return;
    S.meterSrc = S.audioCtx.createMediaStreamSource(new MediaStream(tracks));
    S.analyser = S.audioCtx.createAnalyser(); S.analyser.fftSize = 1024; S.analyser.smoothingTimeConstant = 0.75;
    S.meterSrc.connect(S.analyser);
    S.timeBuf = new Uint8Array(S.analyser.fftSize); S.freqBuf = new Uint8Array(S.analyser.frequencyBinCount);
  } catch (e) { console.warn('meter', e); }
}

// ------------------------------------------------------------- camera
async function listDevices() {
  const ds = await navigator.mediaDevices.enumerateDevices();
  return { cams: ds.filter((d) => d.kind === 'videoinput'), mics: ds.filter((d) => d.kind === 'audioinput') };
}
async function resolveIds() {
  try {
    const { cams, mics } = await listDevices(); const s = S.settings;
    const pick = (list, id, label) => list.find((d) => id && d.deviceId === id) || list.find((d) => label && d.label === label);
    return { camId: pick(cams, s.cameraId, s.cameraLabel)?.deviceId, micId: pick(mics, s.micId, s.micLabel)?.deviceId };
  } catch { return {}; }
}
const CAPTURE = { '720': [1280, 720], '1080': [1920, 1080], '2160': [3840, 2160] };

async function startCamera() {
  if (S.starting) return S.starting;
  S.starting = (async () => {
    stopStream();
    const s = S.settings; const [w, h] = CAPTURE[s.resolution] || CAPTURE['1080'];
    const { camId, micId } = await resolveIds();
    const video = { width: { ideal: w }, height: { ideal: h }, frameRate: { ideal: 30 } };
    if (camId) video.deviceId = { exact: camId };
    const clean = !!s.voiceCleanup;
    const audio = { echoCancellation: clean, noiseSuppression: clean, autoGainControl: clean, channelCount: { ideal: 2 } };
    if (micId) audio.deviceId = { exact: micId };
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ video, audio }); }
    catch (e) {
      console.warn('getUserMedia failed, retrying with defaults', e);
      try { stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: w }, height: { ideal: h } }, audio: true }); }
      catch (e2) { stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); toast('Microphone not available — recording without sound', 'error'); }
    }
    S.stream = stream;
    stream.getTracks().forEach((tr) => { tr.onended = onTrackEnded; });
    cam.srcObject = stream;
    await cam.play().catch(() => {});
    setupMeter();
    $('#a-error').hidden = true;
    return stream;
  })();
  try { return await S.starting; } finally { S.starting = null; }
}
function stopStream() {
  if (S.stream) S.stream.getTracks().forEach((tr) => { tr.onended = null; tr.stop(); });
  S.stream = null; cam.srcObject = null;
}
function onTrackEnded() {
  toast('Camera / mic disconnected — reconnecting…', 'error');
  if (S.liveState === 'recording') finishRecording();
  clearTimer('reconnect');
  S.timers.reconnect = setTimeout(async function retry() {
    try { await startCamera(); toast('Camera reconnected ✓'); }
    catch { S.timers.reconnect = setTimeout(retry, 3000); }
  }, 1500);
}
async function ensureCamera() {
  if (S.stream && S.stream.getVideoTracks().some((t) => t.readyState === 'live')) return true;
  try { await startCamera(); return true; }
  catch (e) {
    console.error(e);
    const el = $('#a-error'); el.textContent = `${t('cameraError')} (${e.name || e.message})`; el.hidden = false;
    return false;
  }
}

// ------------------------------------------------------------- compositing
function outSize() {
  const hi = S.settings.resolution !== '720';
  const [a, b] = hi ? [1920, 1080] : [1280, 720];
  return S.settings.orientation === 'portrait' ? [b, a] : [a, b];
}
function sizeCanvas() {
  const [w, h] = outSize();
  if (view.width !== w || view.height !== h) { view.width = w; view.height = h; }
  buildOverlay();
}
function buildOverlay() {
  const W = view.width, H = view.height, s = S.settings;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); const u = Math.min(W, H) / 1080;
  const head = FONTS[s.fontStyle] || FONTS.script, classic = FONTS.classic, modern = FONTS.modern;
  const shadow = () => { g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 14 * u; g.shadowOffsetY = 2 * u; };
  const noShadow = () => { g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0; };
  const scrim = (from) => { const gr = g.createLinearGradient(0, H * from, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = gr; g.fillRect(0, H * from, W, H * (1 - from)); };
  const subline = [s.eventDate, s.hashtag].filter(Boolean).join('   ·   ');

  if (s.useCustomOverlay && S.assets.overlay) {
    g.drawImage(S.assets.overlay, 0, 0, W, H);
  } else if (s.frameStyle === 'elegant') {
    scrim(0.62);
    g.strokeStyle = 'rgba(255,255,255,.92)'; g.lineWidth = 3 * u; g.strokeRect(30 * u, 30 * u, W - 60 * u, H - 60 * u);
    g.strokeStyle = s.accent; g.lineWidth = 1.5 * u; g.strokeRect(44 * u, 44 * u, W - 88 * u, H - 88 * u);
    shadow(); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.font = `${78 * u}px ${head}`; g.fillText(s.coupleNames, W / 2, H - 132 * u);
    g.font = `600 ${24 * u}px ${modern}`; g.fillStyle = 'rgba(255,255,255,.9)';
    if ('letterSpacing' in g) g.letterSpacing = `${4 * u}px`;
    g.fillText(subline.toUpperCase(), W / 2, H - 84 * u);
  } else if (s.frameStyle === 'banner') {
    scrim(0.55);
    g.fillStyle = s.accent; g.fillRect(56 * u, H - 150 * u, 6 * u, 92 * u);
    shadow(); g.fillStyle = '#fff'; g.textAlign = 'left';
    g.font = `${64 * u}px ${head}`; g.fillText(s.coupleNames, 82 * u, H - 92 * u);
    g.font = `500 ${24 * u}px ${modern}`; g.fillStyle = 'rgba(255,255,255,.88)'; g.fillText(s.eventDate || '', 84 * u, H - 58 * u);
    if (s.hashtag) { g.textAlign = 'right'; g.font = `600 ${28 * u}px ${modern}`; g.fillStyle = '#fff'; g.fillText(s.hashtag, W - 60 * u, H - 62 * u); }
  } else if (s.frameStyle === 'minimal') {
    shadow(); g.fillStyle = 'rgba(255,255,255,.92)'; g.textAlign = 'right';
    g.font = `${40 * u}px ${classic}`; g.fillText([s.coupleNames, s.eventDate].filter(Boolean).join('  ·  '), W - 48 * u, H - 48 * u);
  }
  noShadow();
  if (s.showLogo && S.assets.logo && !(s.useCustomOverlay && S.assets.overlay)) {
    const L = S.assets.logo, lh = 96 * u, lw = Math.min(L.width * (lh / L.height), 320 * u);
    const lhh = L.height * (lw / L.width);
    g.globalAlpha = 0.95; g.drawImage(L, W - lw - 64 * u, 62 * u, lw, lhh); g.globalAlpha = 1;
  }
  S.overlay = c;
}

function drawFrame() {
  if (!cam.videoWidth) return false;
  const W = view.width, H = view.height, vw = cam.videoWidth, vh = cam.videoHeight;
  const sc = Math.max(W / vw, H / vh), sw = W / sc, sh = H / sc, sx = (vw - sw) / 2, sy = (vh - sh) / 2;
  const composite = S.settings.engine !== 'direct';
  ctx.save();
  if (S.filterSupported) ctx.filter = composite ? (FILTERS[S.filter]?.css || 'none') : 'none';
  if (S.settings.mirror && composite) { ctx.translate(W, 0); ctx.scale(-1, 1); }
  ctx.drawImage(cam, sx, sy, sw, sh, 0, 0, W, H);
  ctx.restore();
  if (composite && S.overlay) ctx.drawImage(S.overlay, 0, 0);
  return true;
}

function drawMeter() {
  if (!S.analyser) return;
  S.analyser.getByteTimeDomainData(S.timeBuf);
  let sum = 0; for (let i = 0; i < S.timeBuf.length; i++) { const v = (S.timeBuf[i] - 128) / 128; sum += v * v; }
  const rms = Math.sqrt(sum / S.timeBuf.length);
  $('#meter').style.height = Math.min(100, rms * 420) + '%';
  if (S.mode === 'audio' && S.screen === 'live') {
    const c = $('#audio-viz'), g = c.getContext('2d'); S.analyser.getByteFrequencyData(S.freqBuf);
    g.clearRect(0, 0, c.width, c.height);
    const bars = 48, step = Math.floor(S.freqBuf.length / 2 / bars), bw = c.width / bars;
    g.fillStyle = S.settings.accent;
    for (let i = 0; i < bars; i++) {
      const v = S.freqBuf[i * step] / 255, h = Math.max(6, v * c.height * 0.9);
      const x = i * bw + bw * 0.2, y = (c.height - h) / 2;
      g.beginPath(); (g.roundRect ? g.roundRect(x, y, bw * 0.6, h, bw * 0.3) : g.rect(x, y, bw * 0.6, h)); g.fill();
    }
  }
}

function loop() {
  requestAnimationFrame(loop);
  if (S.screen !== 'admin' && S.screen !== 'review' && S.screen !== 'processing') drawFrame();
  if (S.screen === 'live') drawMeter();
}

// ------------------------------------------------------------- recording
function pickMime(kind) {
  const list = kind === 'audio'
    ? ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm']
    : ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  if (!window.MediaRecorder) return '';
  return list.find((m) => { try { return MediaRecorder.isTypeSupported(m); } catch { return false; } }) || '';
}
function startRecorder(kind) {
  const audioTracks = S.stream.getAudioTracks();
  let stream, ownTracks = [];
  if (kind === 'audio') stream = new MediaStream(audioTracks);
  else if (S.settings.engine === 'direct') stream = new MediaStream([...S.stream.getVideoTracks(), ...audioTracks]);
  else { const cs = view.captureStream(30); ownTracks = cs.getVideoTracks(); stream = new MediaStream([...ownTracks, ...audioTracks]); }
  const mimeType = pickMime(kind);
  const opts = { audioBitsPerSecond: 192000 };
  if (mimeType) opts.mimeType = mimeType;
  if (kind !== 'audio') opts.videoBitsPerSecond = view.height >= 1080 || view.width >= 1080 ? 10_000_000 : 6_000_000;
  const chunks = [];
  const rec = new MediaRecorder(stream, opts);
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  const done = new Promise((res) => { rec.onstop = res; });
  rec.start(1000);
  S.recorder = { rec, done, chunks, kind, ownTracks, mime: rec.mimeType || mimeType, start: performance.now() };
  S.thumbP = kind === 'audio' ? Promise.resolve(null) : sleep(700).then(() => snapshot());
}
async function stopRecorder() {
  const r = S.recorder; if (!r) return null; S.recorder = null;
  if (r.rec.state !== 'inactive') r.rec.stop();
  await r.done;
  r.ownTracks.forEach((tr) => tr.stop());
  const type = (r.mime || (r.kind === 'audio' ? 'audio/mp4' : 'video/mp4')).split(';')[0];
  return { blob: new Blob(r.chunks, { type }), mime: type, duration: (performance.now() - r.start) / 1000 };
}

// ------------------------------------------------------------- screens
function show(name) {
  S.screen = name; document.body.dataset.screen = name;
  $$('.screen').forEach((s) => s.classList.toggle('active', s.id === 's-' + name));
  S.idleAt = Date.now();
}
function setLive(state) {
  S.liveState = state;
  document.body.dataset.rec = state === 'recording' ? '1' : '0';
  document.body.dataset.busy = state === 'busy' || state === 'countdown' ? '1' : '0';
}

function renderAttract() {
  const s = S.settings;
  $('#a-names').textContent = s.coupleNames;
  $('#a-date').textContent = s.eventDate;
  $('#a-title').textContent = s.welcomeTitle;
  $('#a-hashtag').textContent = s.hashtag;
  // Studio logo replaces the credit text when shown; the text is the fallback.
  const studioLogo = $('#a-studio-logo'), useLogo = !!(s.showStudioLogo && s.studioLogo);
  if (useLogo) { studioLogo.src = s.studioLogo; studioLogo.alt = s.studioName; }
  studioLogo.hidden = !useLogo;
  $('#a-studio').textContent = useLogo ? '' : s.studioName;
  const logo = $('#a-logo');
  if (s.showLogo && S.assetUrls.logo) { logo.src = S.assetUrls.logo; logo.hidden = false; } else logo.hidden = true;
  const modes = enabledModes(), box = $('#a-modes');
  box.innerHTML = '';
  const multi = modes.length > 1;
  $('#a-choose').hidden = !multi; $('#a-tap').hidden = multi; box.hidden = !multi;
  if (multi) for (const m of modes) {
    const b = document.createElement('button'); b.className = 'mode-btn'; b.dataset.mode = m;
    b.innerHTML = ICONS[m] + `<span>${tHTML(m)}</span>`;
    b.addEventListener('click', (e) => { e.stopPropagation(); startFlow(m); });
    box.append(b);
  }
}

function goHome() {
  ['countdown', 'autosave', 'thanks', 'rec'].forEach(clearTimer);
  if (S.recorder) { stopRecorder(); }
  stopReviewMedia(); S.result = null;
  setLive('idle'); $('#countdown').textContent = '';
  renderAttract(); show('attract');
}

async function startFlow(mode) {
  unlockAudio();
  if (!S.wakeLock || S.wakeLock.released) requestWakeLock(); // Safari may refuse it at boot without a tap
  if (!enabledModes().includes(mode)) mode = enabledModes()[0] || 'video';
  S.mode = mode; S.guestName = ''; S.prompt = ''; S.result = null;
  S.filter = S.settings.defaultFilter;
  document.body.dataset.mode = mode;
  if (!(await ensureCamera())) return;
  if (S.settings.askName || S.settings.consent) return showName();
  afterName();
}

function showName() {
  const s = S.settings, input = $('#guest-name');
  input.value = ''; input.placeholder = t('namePh');
  input.hidden = !s.askName; $('#name-title').hidden = !s.askName;
  $('#consent-row').hidden = !s.consent; $('#consent-box').checked = false; $('#consent-text').textContent = s.consentText;
  validateName(); show('name');
  if (s.askName) setTimeout(() => input.focus(), 350);
}
function validateName() {
  const s = S.settings;
  const ok = (!s.askName || !s.nameRequired || $('#guest-name').value.trim().length > 0) && (!s.consent || $('#consent-box').checked);
  $('#name-next').disabled = !ok; return ok;
}
function afterName() {
  S.guestName = $('#guest-name').value.trim();
  $('#guest-name').blur();
  if (S.settings.showPrompts && (S.mode === 'video' || S.mode === 'audio') && promptList().length) return showPrompt();
  goLive();
}

function promptList() {
  const L = S.settings.language, lines = (k) => String(S.settings[k] || '').split('\n').map((x) => x.trim()).filter(Boolean);
  if (L === 'hi') return lines('promptsHi');
  if (L === 'both') return [...lines('promptsEn'), ...lines('promptsHi')];
  return lines('promptsEn');
}
function nextPrompt() {
  if (!S.promptBag.length) S.promptBag = promptList().sort(() => Math.random() - 0.5);
  return S.promptBag.pop() || '';
}
function showPrompt() {
  const el = $('#prompt-text'); el.textContent = nextPrompt(); show('prompt');
}

function goLive() {
  document.body.dataset.mode = S.mode;
  setLive('idle');
  $('#rec-badge').hidden = true; $('#rec-progress').style.width = '0';
  $('#live-prompt').textContent = S.prompt;
  $('#audio-names').textContent = S.settings.coupleNames;
  $('#live-hint').innerHTML = tHTML(S.mode === 'audio' ? 'getReadyAudio' : 'getReady');
  $('#meter-wrap').style.visibility = S.mode === 'video' || S.mode === 'audio' ? 'visible' : 'hidden';
  renderFilters();
  show('live');
}
function renderFilters() {
  const box = $('#filters'); box.innerHTML = '';
  const can = S.settings.guestFilters && S.filterSupported && S.settings.engine !== 'direct' && S.mode !== 'audio';
  if (!can) return;
  for (const [k, f] of Object.entries(FILTERS)) {
    const b = document.createElement('button'); b.className = 'chip' + (S.filter === k ? ' on' : ''); b.textContent = f.label;
    b.onclick = () => { S.filter = k; renderFilters(); };
    box.append(b);
  }
}

async function countdown(n) {
  const el = $('#countdown');
  for (let i = n; i > 0; i--) {
    if (S.screen !== 'live') return false;
    el.textContent = i; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    beep(i === 1 ? 990 : 660);
    await sleep(1000);
  }
  el.textContent = ''; el.classList.remove('pop');
  return S.screen === 'live';
}

async function onShutter() {
  unlockAudio();
  if (S.liveState === 'recording') {
    const r = S.recorder; if (!r) return;
    if ((performance.now() - r.start) / 1000 < S.settings.minSeconds) return;
    return finishRecording();
  }
  if (S.liveState !== 'idle') return;
  setLive('countdown');
  if (!(await countdown(Number(S.settings.countdown) || 0))) { setLive('idle'); return; }
  if (S.mode === 'photo') return takePhoto();
  if (S.mode === 'boomerang') return captureBoomerang();
  beginRecording();
}

function beginRecording() {
  if (S.mode === 'audio' && !S.stream?.getAudioTracks().length) {
    toast('No microphone — staff: check Admin → Devices', 'error'); setLive('idle'); return;
  }
  try { startRecorder(S.mode === 'audio' ? 'audio' : 'video'); }
  catch (e) { console.error(e); toast('Recording failed: ' + e.message, 'error'); setLive('idle'); return; }
  setLive('recording'); beep(1320, 0.08, 0.15);
  $('#rec-badge').hidden = false;
  $('#live-hint').innerHTML = tHTML('tapStop');
  const max = Number(S.settings.maxSeconds) || 60;
  S.timers.rec = setInterval(() => {
    const r = S.recorder; if (!r) return;
    const el = (performance.now() - r.start) / 1000;
    $('#rec-time').textContent = `${fmtTime(el)} / ${fmtTime(max)}`;
    $('#rec-progress').style.width = Math.min(100, (el / max) * 100) + '%';
    if (el >= max) finishRecording();
  }, 200);
}

async function finishRecording() {
  if (S.liveState !== 'recording') return;
  setLive('busy'); clearTimer('rec');
  const r = await stopRecorder();
  $('#rec-badge').hidden = true;
  if (S.screen !== 'live') return; // admin opened / reset while stopping
  if (!r || !r.blob.size) { toast('Nothing was recorded — please try again', 'error'); setLive('idle'); return; }
  S.result = { ...r, type: S.mode, ext: extFor(r.mime), thumb: await S.thumbP };
  showReview();
}

async function takePhoto() {
  setLive('busy');
  const f = $('#flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
  beep(2200, 0.05, 0.2); setTimeout(() => beep(1400, 0.06, 0.15), 60);
  const blob = await canvasToBlob(view, 'image/jpeg', 0.93);
  const thumb = await snapshot();
  await sleep(350);
  if (S.screen !== 'live') return; // guest left / admin opened meanwhile
  S.result = { blob, mime: 'image/jpeg', ext: 'jpg', duration: 0, type: 'photo', thumb };
  showReview();
}

async function captureBoomerang() {
  setLive('busy');
  $('#live-hint').innerHTML = tHTML('keepMoving');
  const W = view.width, H = view.height, sc = Math.min(1, 1280 / Math.max(W, H));
  const bw = Math.round((W * sc) / 2) * 2, bh = Math.round((H * sc) / 2) * 2;
  const N = 24, gap = 62, frames = [];
  for (let i = 0; i < N; i++) {
    const c = document.createElement('canvas'); c.width = bw; c.height = bh;
    c.getContext('2d').drawImage(view, 0, 0, bw, bh); frames.push(c);
    await sleep(gap);
    if (S.screen !== 'live') return; // guest left / admin opened meanwhile
  }
  show('processing');
  const bc = $('#proc-canvas'); bc.width = bw; bc.height = bh; const bx = bc.getContext('2d');
  bx.drawImage(frames[0], 0, 0);
  const seq = [...frames, ...frames.slice(1, -1).reverse()], loops = 3, fps = 24;
  const mime = pickMime('video'), chunks = [];
  let stream, rec;
  try {
    stream = bc.captureStream(fps);
    rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 6_000_000 });
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    const done = new Promise((r) => { rec.onstop = r; });
    rec.start(500);
    const t0 = performance.now(); let k = 0;
    for (let l = 0; l < loops; l++) for (const fr of seq) {
      bx.drawImage(fr, 0, 0); k++;
      const wait = t0 + (k * 1000) / fps - performance.now(); if (wait > 0) await sleep(wait);
    }
    await sleep(120); rec.stop(); await done;
  } catch (e) {
    console.error(e); stream?.getTracks().forEach((tr) => tr.stop());
    if (S.screen === 'processing') { toast('Boomerang failed: ' + e.message, 'error'); goLive(); }
    return;
  }
  stream.getTracks().forEach((tr) => tr.stop());
  if (S.screen !== 'processing') return; // guest walked away / reset
  if (!chunks.length) { toast('Nothing was recorded — please try again', 'error'); goLive(); return; }
  const type = (rec.mimeType || mime || 'video/mp4').split(';')[0];
  const thumbC = document.createElement('canvas'); thumbC.width = 480; thumbC.height = Math.round(480 * bh / bw);
  thumbC.getContext('2d').drawImage(frames[0], 0, 0, thumbC.width, thumbC.height);
  S.result = { blob: new Blob(chunks, { type }), mime: type, ext: extFor(type), duration: (loops * seq.length) / fps, type: 'boomerang', thumb: await canvasToBlob(thumbC, 'image/jpeg', 0.75) };
  showReview();
}

// ------------------------------------------------------------- review / save
function stopReviewMedia() {
  const m = $('#review-media'); $$('video,audio', m).forEach((v) => { try { v.pause(); } catch {} v.removeAttribute('src'); v.load?.(); });
  m.innerHTML = '';
  if (S.reviewUrl) { URL.revokeObjectURL(S.reviewUrl); S.reviewUrl = null; }
}
function showReview() {
  stopReviewMedia();
  const r = S.result, box = $('#review-media');
  const url = URL.createObjectURL(r.blob); S.reviewUrl = url;
  let el;
  if (r.type === 'photo') { el = new Image(); el.src = url; box.append(el); }
  else if (r.type === 'audio') {
    const wrap = document.createElement('div'); wrap.className = 'audio-review';
    wrap.innerHTML = `<p class="names small">${esc(S.settings.coupleNames)}</p>`;
    el = document.createElement('audio'); el.controls = true; el.src = url; wrap.append(el); box.append(wrap);
  } else {
    el = document.createElement('video'); el.playsInline = true; el.setAttribute('playsinline', '');
    el.src = url; el.loop = r.type === 'boomerang'; el.controls = r.type !== 'boomerang'; el.muted = r.type === 'boomerang';
    box.append(el);
  }
  if (el.play) el.play().catch(() => { el.muted = true; el.play().catch(() => {}); });
  $('#review-save').innerHTML = tHTML({ photo: 'savePhoto', boomerang: 'saveIt' }[r.type] || 'save');
  $('#review-retake').hidden = !S.settings.allowRetake;
  show('review'); setLive('idle');
  clearTimer('autosave');
  let n = Number(S.settings.reviewAutoSave) || 0;
  const auto = $('#review-autosave'); auto.textContent = '';
  if (n > 0) {
    auto.innerHTML = tHTML('autosave', { n });
    S.timers.autosave = setInterval(() => {
      n--; auto.innerHTML = tHTML('autosave', { n });
      if (n <= 0) saveResult();
    }, 1000);
  }
}
async function saveResult() {
  clearTimer('autosave');
  const r = S.result; if (!r) return; S.result = null;
  const clip = {
    id: uid(), eventId: eventId(), eventName: eventLabel(), type: r.type,
    blob: r.blob, mime: r.mime, ext: r.ext, size: r.blob.size, duration: r.duration,
    createdAt: Date.now(), guestName: S.guestName, prompt: S.prompt, thumb: r.thumb || null,
  };
  try { await db.putClip(clip); }
  catch (e) { console.error(e); toast('Could not save — iPad storage may be full! ' + (e?.message || ''), 'error'); }
  stopReviewMedia(); showThanks();
}
function retake() { clearTimer('autosave'); stopReviewMedia(); S.result = null; goLive(); }

function showThanks() {
  const s = S.settings;
  $('#t-title').textContent = s.thanksTitle; $('#t-sub').textContent = s.thanksSub;
  const qrBox = $('#t-qr');
  if (s.galleryUrl && window.qrcode) {
    try {
      const q = qrcode(0, 'M'); qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
      q.addData(s.galleryUrl); q.make(); qrBox.innerHTML = q.createSvgTag({ cellSize: 6, margin: 1, scalable: true });
      qrBox.hidden = false; $('#t-qr-label').textContent = s.qrLabel;
    } catch (e) { qrBox.hidden = true; console.warn(e); }
  } else { qrBox.hidden = true; $('#t-qr-label').textContent = ''; }
  show('thanks'); confetti();
  clearTimer('thanks'); S.timers.thanks = setTimeout(goHome, s.galleryUrl ? 12000 : 6000);
}
function confetti() {
  const c = $('#confetti'), g = c.getContext('2d');
  c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio;
  const cols = [S.settings.accent, '#ffffff', '#f4d9a6', '#e9b7c1'];
  const P = Array.from({ length: 140 }, () => ({
    x: Math.random() * c.width, y: -Math.random() * c.height * 0.5, r: (4 + Math.random() * 6) * devicePixelRatio,
    vy: (2 + Math.random() * 3) * devicePixelRatio, vx: (Math.random() - 0.5) * 2 * devicePixelRatio,
    a: Math.random() * Math.PI, va: (Math.random() - 0.5) * 0.2, col: cols[(Math.random() * cols.length) | 0],
  }));
  const end = performance.now() + 4500;
  (function frame(now) {
    g.clearRect(0, 0, c.width, c.height);
    if (now > end || S.screen !== 'thanks') return;
    for (const p of P) {
      p.x += p.vx; p.y += p.vy; p.a += p.va;
      g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.col; g.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); g.restore();
    }
    requestAnimationFrame(frame);
  })(performance.now());
}

// ------------------------------------------------------------- assets & settings
async function loadAssets() {
  for (const key of ['bg', 'logo', 'overlay']) {
    if (S.assetUrls[key]) URL.revokeObjectURL(S.assetUrls[key]);
    delete S.assetUrls[key]; delete S.assets[key];
    try {
      const blob = await db.getAsset(key);
      if (blob) { const img = await loadImg(blob); S.assets[key] = img; S.assetUrls[key] = img.src; }
    } catch (e) { console.warn('asset', key, e); }
  }
}
function applySettings() {
  const s = S.settings, root = document.documentElement.style;
  root.setProperty('--accent', s.accent);
  root.setProperty('--font-head', FONTS[s.fontStyle] || FONTS.script);
  document.body.dataset.bg = s.bgMode;
  const bd = $('#backdrop');
  bd.style.backgroundColor = s.bgColor;
  bd.style.backgroundImage = s.bgMode === 'image' && S.assetUrls.bg ? `url("${S.assetUrls.bg}")` : 'none';
  document.documentElement.lang = s.language === 'hi' ? 'hi' : 'en';
  sizeCanvas(); applyI18n(); renderAttract();
}

// ------------------------------------------------------------- kiosk
async function requestWakeLock() {
  if (!S.settings.wakeLock || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  try { S.wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { console.warn('wakeLock', e); }
}
function idleCheck() {
  const idle = (Date.now() - S.idleAt) / 1000, lim = Number(S.settings.idleSeconds) || 45;
  if (idle < lim) return;
  if (['name', 'prompt'].includes(S.screen) || (S.screen === 'live' && S.liveState === 'idle')) goHome();
}

// ------------------------------------------------------------- PIN / admin entry
let taps = [];
function onHotspot() {
  const now = Date.now(); taps = taps.filter((x) => now - x < 3000); taps.push(now);
  if (taps.length >= 5) { taps = []; openPin(); }
}
let pinBuf = '';
function openPin() {
  if (S.liveState === 'recording') return;
  pinBuf = ''; renderPin(); $('#m-pin').hidden = false;
}
function renderPin() {
  const n = String(S.settings.pin || '').length || 4;
  $('#pin-dots').innerHTML = Array.from({ length: n }, (_, i) => `<i class="${i < pinBuf.length ? 'f' : ''}"></i>`).join('');
}
function pinKey(k) {
  if (k === 'C') pinBuf = ''; else if (k === '⌫') pinBuf = pinBuf.slice(0, -1); else pinBuf += k;
  renderPin();
  const pin = String(S.settings.pin || '');
  if (pinBuf.length >= pin.length) {
    if (pinBuf === pin) { $('#m-pin').hidden = true; openAdmin(); }
    else { const c = $('.pin-card'); c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); pinBuf = ''; setTimeout(renderPin, 400); }
  }
}
function confirmBox(text, yes = 'Delete') {
  return new Promise((res) => {
    $('#confirm-text').textContent = text; $('#confirm-yes').textContent = yes; $('#m-confirm').hidden = false;
    const done = (v) => { $('#m-confirm').hidden = true; $('#confirm-yes').onclick = $('#confirm-no').onclick = null; res(v); };
    $('#confirm-yes').onclick = () => done(true); $('#confirm-no').onclick = () => done(false);
  });
}

// ------------------------------------------------------------- admin
const opt = (pairs) => pairs.map(([v, l]) => ({ v: String(v), l }));
const SCHEMA = {
  Event: [
    { key: 'coupleNames', label: 'Couple names', type: 'text' },
    { key: 'eventDate', label: 'Date (as displayed)', type: 'text' },
    { key: 'hashtag', label: 'Hashtag', type: 'text' },
    { key: 'welcomeTitle', label: 'Welcome headline', type: 'text' },
    { key: 'thanksTitle', label: 'Thank-you title', type: 'text' },
    { key: 'thanksSub', label: 'Thank-you message', type: 'text' },
    { key: 'galleryUrl', label: 'QR code link', type: 'url', help: 'Optional. Shows a QR code on the thank-you screen (e.g. the couple’s gallery, your Instagram or WhatsApp).' },
    { key: 'qrLabel', label: 'QR caption', type: 'text' },
    { key: 'studioName', label: 'Studio credit', type: 'text', help: 'Bottom-right of the welcome screen. Shown as text when the studio logo is off.' },
    { key: 'showStudioLogo', label: 'Show studio logo', type: 'toggle', help: 'Jobossky Studios logo on the welcome screen (not burned into videos).' },
  ],
  Experience: [
    { section: 'Modes guests can pick' },
    { key: 'modeVideo', label: 'Video message', type: 'toggle' },
    { key: 'modeAudio', label: 'Voice message (audio guestbook)', type: 'toggle' },
    { key: 'modePhoto', label: 'Photo', type: 'toggle' },
    { key: 'modeBoomerang', label: 'Boomerang', type: 'toggle' },
    { section: 'Recording' },
    { key: 'maxSeconds', label: 'Max length', type: 'select', num: true, options: opt([[15, '15 sec'], [30, '30 sec'], [45, '45 sec'], [60, '1 min'], [90, '1.5 min'], [120, '2 min'], [180, '3 min']]) },
    { key: 'minSeconds', label: 'Minimum before Stop works', type: 'select', num: true, options: opt([[1, '1 sec'], [3, '3 sec'], [5, '5 sec']]) },
    { key: 'countdown', label: 'Countdown', type: 'select', num: true, options: opt([[0, 'None'], [3, '3 sec'], [5, '5 sec'], [10, '10 sec']]) },
    { key: 'allowRetake', label: 'Allow retake', type: 'toggle' },
    { key: 'reviewAutoSave', label: 'Auto-save review after', type: 'select', num: true, options: opt([[0, 'Never (wait for tap)'], [10, '10 sec'], [20, '20 sec'], [30, '30 sec']]), help: 'Saves the message even if the guest walks away without tapping Save.' },
    { key: 'sounds', label: 'Countdown beeps & shutter sound', type: 'toggle' },
    { section: 'Guest details' },
    { key: 'askName', label: 'Ask for name', type: 'toggle' },
    { key: 'nameRequired', label: 'Name is required', type: 'toggle' },
    { key: 'consent', label: 'Show consent checkbox', type: 'toggle' },
    { key: 'consentText', label: 'Consent text', type: 'text' },
    { section: 'Prompts & language' },
    { key: 'showPrompts', label: 'Show question prompts', type: 'toggle' },
    { key: 'language', label: 'Language', type: 'select', options: opt([['en', 'English'], ['hi', 'हिन्दी (Hindi)'], ['both', 'English + हिन्दी']]) },
    { key: 'promptsEn', label: 'English prompts', type: 'textarea', help: 'One question per line.' },
    { key: 'promptsHi', label: 'Hindi prompts', type: 'textarea', help: 'One question per line.' },
  ],
  Look: [
    { section: 'Branding' },
    { key: 'fontStyle', label: 'Heading font', type: 'select', options: opt([['script', 'Script (Snell Roundhand)'], ['classic', 'Classic (Didot)'], ['modern', 'Modern (Avenir)']]) },
    { key: 'accent', label: 'Accent colour', type: 'color' },
    { key: 'logo', label: 'Logo / monogram', type: 'file', help: 'PNG with transparent background works best.' },
    { key: 'showLogo', label: 'Show logo', type: 'toggle' },
    { section: 'Welcome screen background' },
    { key: 'bgMode', label: 'Background', type: 'select', options: opt([['live', 'Live camera (blurred)'], ['image', 'Image'], ['color', 'Solid colour']]) },
    { key: 'bg', label: 'Background image', type: 'file' },
    { key: 'bgColor', label: 'Background colour', type: 'color' },
    { section: 'Burned into every video / photo' },
    { key: 'frameStyle', label: 'Frame style', type: 'select', options: opt([['elegant', 'Elegant double border + names'], ['banner', 'Bottom banner'], ['minimal', 'Minimal corner text'], ['none', 'None (clean)']]) },
    { key: 'overlay', label: 'Custom overlay PNG', type: 'file', help: 'Design in Canva at 1920×1080 (or 1080×1920 for portrait) with a transparent centre.' },
    { key: 'useCustomOverlay', label: 'Use custom overlay instead of frame', type: 'toggle' },
    { key: 'defaultFilter', label: 'Default filter', type: 'select', options: Object.entries(FILTERS).map(([v, f]) => ({ v, l: f.label })) },
    { key: 'guestFilters', label: 'Let guests pick a filter', type: 'toggle' },
    { key: 'mirror', label: 'Mirror image', type: 'toggle', help: 'Flips the camera like a selfie (affects the recording).' },
    { key: 'orientation', label: 'Output shape', type: 'select', options: opt([['landscape', 'Landscape 16:9'], ['portrait', 'Portrait 9:16 (Reels)']]), help: 'Portrait crops the centre of the camera — use 4K capture for the sharpest result.' },
  ],
  Devices: 'devices',
  Gallery: 'gallery',
  Kiosk: [
    { key: 'idleSeconds', label: 'Return to welcome after idle', type: 'select', num: true, options: opt([[20, '20 sec'], [45, '45 sec'], [90, '90 sec'], [180, '3 min']]) },
    { key: 'wakeLock', label: 'Keep screen awake', type: 'toggle' },
    { key: 'pin', label: 'Admin PIN', type: 'text', help: 'Digits only. Default is 1234 — change it before the event!' },
    { custom: 'kioskHelp' },
  ],
};
const DEVICE_KEYS = ['cameraId', 'micId', 'resolution', 'engine', 'voiceCleanup', 'orientation'];

let adminTab = 'Event';
function openAdmin() {
  if (S.recorder) stopRecorder();
  ['countdown', 'autosave', 'thanks', 'rec'].forEach(clearTimer);
  stopReviewMedia(); S.result = null; setLive('idle');
  show('admin'); renderAdminTabs(); renderAdmin();
}
async function closeAdmin() {
  revokeGallery();
  $('#admin-body').innerHTML = '';
  if (S.needsRestart) { S.needsRestart = false; try { await startCamera(); } catch (e) { toast('Camera error: ' + e.message, 'error'); } }
  applySettings(); requestWakeLock(); goHome();
}
function renderAdminTabs() {
  const nav = $('#admin-tabs'); nav.innerHTML = '';
  for (const tab of Object.keys(SCHEMA)) {
    const b = document.createElement('button'); b.textContent = tab; b.className = tab === adminTab ? 'on' : '';
    b.onclick = () => { adminTab = tab; renderAdminTabs(); renderAdmin(); };
    nav.append(b);
  }
}
function setSetting(key, value) {
  S.settings[key] = value; saveSettings();
  if (DEVICE_KEYS.includes(key)) S.needsRestart = true;
  if (['coupleNames', 'eventDate', 'hashtag', 'accent', 'fontStyle', 'frameStyle', 'showLogo', 'useCustomOverlay', 'orientation', 'resolution'].includes(key)) sizeCanvas();
  if (key === 'language' || key === 'promptsEn' || key === 'promptsHi') S.promptBag = [];
}
function renderAdmin() {
  revokeGallery();
  const body = $('#admin-body'); body.innerHTML = ''; body.scrollTop = 0;
  const sch = SCHEMA[adminTab];
  if (sch === 'devices') return renderDevices(body);
  if (sch === 'gallery') return renderGallery(body);
  const fs = document.createElement('div'); fs.className = 'fieldset'; body.append(fs);
  for (const f of sch) {
    if (f.section) { const h = document.createElement('h3'); h.className = 'section-title'; h.textContent = f.section; fs.append(h); continue; }
    if (f.custom === 'kioskHelp') { fs.append(kioskHelp()); continue; }
    fs.append(field(f));
  }
}
function field(f) {
  const row = document.createElement('div'); row.className = 'field';
  row.innerHTML = `<label>${esc(f.label)}${f.help ? `<span class="help">${esc(f.help)}</span>` : ''}</label><div class="ctl"></div>`;
  const ctl = $('.ctl', row), val = S.settings[f.key];
  if (f.type === 'toggle') {
    ctl.innerHTML = `<label class="switch"><input type="checkbox"><span></span></label>`;
    const i = $('input', ctl); i.checked = !!val; i.onchange = () => setSetting(f.key, i.checked);
  } else if (f.type === 'select') {
    const sel = document.createElement('select');
    sel.innerHTML = f.options.map((o) => `<option value="${esc(o.v)}">${esc(o.l)}</option>`).join('');
    sel.value = String(val); sel.onchange = () => setSetting(f.key, f.num ? Number(sel.value) : sel.value); ctl.append(sel);
  } else if (f.type === 'textarea') {
    const ta = document.createElement('textarea'); ta.value = val ?? ''; ta.oninput = () => setSetting(f.key, ta.value); ctl.append(ta);
  } else if (f.type === 'color') {
    const i = document.createElement('input'); i.type = 'color'; i.value = val; i.oninput = () => setSetting(f.key, i.value); ctl.append(i);
  } else if (f.type === 'file') {
    const wrap = document.createElement('div'); wrap.className = 'file-row';
    const has = !!S.assetUrls[f.key];
    wrap.innerHTML = `${has ? `<img src="${S.assetUrls[f.key]}" alt="">` : ''}<label class="btn small ghost">${has ? 'Replace' : 'Upload'}<input type="file" accept="image/*" hidden></label>${has ? '<button class="btn small ghost rm">Remove</button>' : ''}`;
    $('input', wrap).onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      await db.setAsset(f.key, file); await loadAssets(); sizeCanvas(); renderAdmin(); toast('Saved ✓');
    };
    const rm = $('.rm', wrap); if (rm) rm.onclick = async () => { await db.deleteAsset(f.key); await loadAssets(); sizeCanvas(); renderAdmin(); };
    ctl.append(wrap);
  } else {
    const i = document.createElement('input'); i.type = f.type === 'url' ? 'url' : 'text'; i.value = val ?? '';
    if (f.key === 'pin') { i.inputMode = 'numeric'; i.oninput = () => { i.value = i.value.replace(/\D/g, '').slice(0, 8); if (i.value.length >= 4) setSetting('pin', i.value); }; }
    else i.oninput = () => setSetting(f.key, i.value);
    ctl.append(i);
  }
  return row;
}
function kioskHelp() {
  const d = document.createElement('div'); d.className = 'help-text';
  d.innerHTML = `
  <h3 class="section-title" style="margin-left:0">Lock the iPad for guests</h3>
  <p><b>Guided Access</b> (recommended): Settings → Accessibility → Guided Access → On, set a passcode. Open this app, triple-click the top button → Start. Guests can’t leave the app.</p>
  <p><b>Never sleep:</b> Settings → Display &amp; Brightness → Auto-Lock → Never.</p>
  <p><b>Do Not Disturb:</b> turn on a Focus mode so no notifications pop up during recordings.</p>
  <p><b>Admin:</b> tap the top-left corner 5 times quickly → enter PIN.</p>
  <div class="row" style="justify-content:flex-start;margin-top:16px">
    <button class="btn small ghost" id="btn-fs">Go full screen</button>
    <button class="btn small danger" id="btn-reset">Reset all settings</button>
  </div>
  <p class="muted" style="margin-top:20px">Video Guestbook v${APP_VERSION}</p>`;
  $('#btn-fs', d).onclick = () => { const el = document.documentElement; (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el); };
  $('#btn-reset', d).onclick = async () => {
    if (!(await confirmBox('Reset every setting to defaults? (Recordings are kept.)', 'Reset'))) return;
    S.settings = { ...DEFAULTS }; saveSettings(); S.needsRestart = true; sizeCanvas(); renderAdmin(); toast('Settings reset');
  };
  return d;
}

async function renderDevices(body) {
  const fs = document.createElement('div'); fs.className = 'fieldset'; body.append(fs);
  if (!S.stream) { try { await startCamera(); } catch (e) { toast('Camera: ' + e.message, 'error'); } }
  let cams = [], mics = [];
  try { ({ cams, mics } = await listDevices()); } catch {}
  const devSelect = (label, list, idKey, labelKey, help) => {
    const row = document.createElement('div'); row.className = 'field';
    row.innerHTML = `<label>${label}<span class="help">${help}</span></label><div class="ctl"><select></select></div>`;
    const sel = $('select', row);
    sel.innerHTML = `<option value="">System default</option>` + list.map((d, i) => `<option value="${esc(d.deviceId)}">${esc(d.label || `${label} ${i + 1}`)}</option>`).join('');
    const cur = list.find((d) => d.deviceId === S.settings[idKey]) || list.find((d) => d.label && d.label === S.settings[labelKey]);
    sel.value = cur ? cur.deviceId : '';
    sel.onchange = async () => {
      const d = list.find((x) => x.deviceId === sel.value);
      setSetting(idKey, sel.value); setSetting(labelKey, d?.label || '');
      S.needsRestart = false; try { await startCamera(); toast('Switched ✓'); } catch (e) { toast(e.message, 'error'); }
      renderAdmin();
    };
    return row;
  };
  fs.append(devSelect('Camera', cams, 'cameraId', 'cameraLabel', 'Pick your HDMI capture card (often shows as “USB Video” or the card’s brand name).'));
  fs.append(devSelect('Microphone', mics, 'micId', 'micLabel', 'If the RØDE receiver is plugged into the A7 III, audio comes through the capture card — pick the capture card here.'));
  for (const f of [
    { key: 'resolution', label: 'Capture resolution', type: 'select', options: opt([['720', '720p'], ['1080', '1080p (recommended)'], ['2160', '4K (best for portrait crop)']]) },
    { key: 'engine', label: 'Recording engine', type: 'select', options: opt([['composite', 'Branded (frame + filters burned in)'], ['direct', 'Direct camera (max quality, no overlay)']]), help: 'If recordings stutter or fail on your iPad, try Direct.' },
    { key: 'voiceCleanup', label: 'Voice cleanup (noise suppression)', type: 'toggle', help: 'Keep OFF with a RØDE mic. Turn ON only for the iPad’s built-in mic in noisy halls.' },
  ]) fs.append(field(f));

  const prevRow = document.createElement('div'); prevRow.className = 'field';
  prevRow.innerHTML = `<label>Live check<span class="help">What the camera and mic are sending right now.</span></label><div class="ctl"></div>`;
  const v = document.createElement('video'); v.className = 'devices-preview'; v.muted = true; v.playsInline = true; v.autoplay = true; v.srcObject = S.stream;
  const status = document.createElement('div'); status.className = 'status-box';
  const ctl = $('.ctl', prevRow); ctl.append(v, status);
  const btns = document.createElement('div'); btns.className = 'row'; btns.style.justifyContent = 'flex-start'; btns.style.marginTop = '12px';
  btns.innerHTML = `<button class="btn small ghost" id="btn-restart">Restart camera</button>`;
  ctl.append(btns); fs.append(prevRow);
  $('#btn-restart', btns).onclick = async () => { try { await startCamera(); S.needsRestart = false; toast('Camera restarted ✓'); renderAdmin(); } catch (e) { toast(e.message, 'error'); } };

  const vt = S.stream?.getVideoTracks()[0], at = S.stream?.getAudioTracks()[0];
  const vs = vt?.getSettings?.() || {}, as = at?.getSettings?.() || {};
  let est = ''; try { const e = await navigator.storage.estimate(); est = `${(e.usage / 1e9).toFixed(2)} GB used of ~${(e.quota / 1e9).toFixed(0)} GB available to the app`; } catch {}
  let persisted = '?'; try { persisted = (await navigator.storage.persisted?.()) ? 'yes' : 'no'; } catch {}
  status.textContent = [
    `Camera:   ${vt ? vt.label : '— none —'}`,
    `          ${vs.width || '?'}×${vs.height || '?'} @ ${vs.frameRate ? Math.round(vs.frameRate) : '?'} fps`,
    `Mic:      ${at ? at.label : '— none —'}${as.sampleRate ? `  (${as.sampleRate} Hz, ${as.channelCount || '?'} ch)` : ''}`,
    `Output:   ${view.width}×${view.height} (${S.settings.orientation})`,
    `Recorder: video → ${pickMime('video') || 'unsupported!'}`,
    `          audio → ${pickMime('audio') || 'unsupported!'}`,
    `Filters:  ${S.filterSupported ? 'supported' : 'not supported on this iPadOS version'}`,
    `Storage:  ${est}  (persistent: ${persisted})`,
    `Device:   ${navigator.userAgent}`,
  ].join('\n');
}

// ---- gallery
function revokeGallery() { S.galleryUrls.forEach((u) => URL.revokeObjectURL(u)); S.galleryUrls = []; }
function fileName(c, i) {
  const d = new Date(c.createdAt), p = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  return `${slug(c.eventName) || 'event'}_${String(i ?? 0).padStart(3, '0')}_${stamp}_${slug(c.guestName) || c.type}.${c.ext || extFor(c.mime)}`;
}
async function shareClips(clips, startIndex = 0) {
  const files = clips.map((c, i) => new File([c.blob], fileName(c, startIndex + i + 1), { type: c.mime }));
  if (navigator.canShare && navigator.canShare({ files })) {
    try { await navigator.share({ files, title: clips[0]?.eventName || 'Guestbook' }); return true; }
    catch (e) { if (e.name !== 'AbortError') toast('Share failed: ' + e.message, 'error'); return false; }
  }
  files.forEach((f, i) => setTimeout(() => download(f, f.name), i * 400));
  return true;
}
async function renderGallery(body) {
  const events = await db.listEvents();
  if (!S.galleryEvent || !events.find((e) => e.eventId === S.galleryEvent)) S.galleryEvent = events.find((e) => e.eventId === eventId())?.eventId || events[0]?.eventId || eventId();
  const clips = (await db.getClips(S.galleryEvent)).reverse(); // oldest first for numbering
  const bar = document.createElement('div'); bar.className = 'toolbar';
  const totalMB = clips.reduce((a, c) => a + (c.size || 0), 0) / 1e6;
  bar.innerHTML = `
    <select id="g-event">${(events.length ? events : [{ eventId: eventId(), eventName: eventLabel(), count: 0 }]).map((e) => `<option value="${esc(e.eventId)}">${esc(e.eventName)} (${e.count})</option>`).join('')}</select>
    <button class="btn small primary" id="g-share">Save / share all</button>
    <button class="btn small ghost" id="g-csv">Guest list (CSV)</button>
    <button class="btn small danger" id="g-clear">Delete event</button>
    <span class="muted">${clips.length} items · ${totalMB.toFixed(0)} MB</span>`;
  body.append(bar);
  $('#g-event', bar).value = S.galleryEvent;
  $('#g-event', bar).onchange = (e) => { S.galleryEvent = e.target.value; S.exportCursor = 0; renderAdmin(); };
  const BATCH = 10, shareBtn = $('#g-share', bar);
  const label = () => {
    if (!clips.length) { shareBtn.disabled = true; return; }
    const a = S.exportCursor + 1, b = Math.min(clips.length, S.exportCursor + BATCH);
    shareBtn.textContent = clips.length <= BATCH ? 'Save / share all' : `Save / share ${a}–${b} of ${clips.length}`;
  };
  label();
  shareBtn.onclick = async () => {
    const part = clips.slice(S.exportCursor, S.exportCursor + BATCH);
    const ok = await shareClips(part, S.exportCursor);
    if (ok) { S.exportCursor += BATCH; if (S.exportCursor >= clips.length) { S.exportCursor = 0; toast('All items exported ✓'); } }
    label();
  };
  $('#g-csv', bar).onclick = () => {
    const rows = [['#', 'file', 'type', 'guest', 'prompt', 'recorded_at', 'seconds', 'size_mb']];
    clips.forEach((c, i) => rows.push([i + 1, fileName(c, i + 1), c.type, c.guestName, c.prompt, new Date(c.createdAt).toLocaleString(), (c.duration || 0).toFixed(1), ((c.size || 0) / 1e6).toFixed(1)]));
    const csv = '﻿' + rows.map((r) => r.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    download(new Blob([csv], { type: 'text/csv' }), `${slug(clips[0]?.eventName || eventLabel())}_guests.csv`);
  };
  $('#g-clear', bar).onclick = async () => {
    if (!clips.length) return;
    if (!(await confirmBox(`Permanently delete all ${clips.length} recordings for this event from the iPad? Export them first!`, 'Delete all'))) return;
    await db.clearEvent(S.galleryEvent); S.exportCursor = 0; renderAdmin(); toast('Event deleted');
  };

  const grid = document.createElement('div'); grid.className = 'gallery'; body.append(grid);
  if (!clips.length) { grid.outerHTML = '<p class="empty">No recordings yet for this event.</p>'; return; }
  clips.slice().reverse().forEach((c) => {
    const i = clips.indexOf(c) + 1;
    const card = document.createElement('div'); card.className = 'clip';
    let thumbStyle = '';
    if (c.thumb) { const u = URL.createObjectURL(c.thumb); S.galleryUrls.push(u); thumbStyle = `style="background-image:url('${u}')"`; }
    card.innerHTML = `
      <div class="thumb" ${thumbStyle}>${c.thumb ? '' : ICONS[c.type] || ''}<span class="badge">#${i} · ${c.type}</span></div>
      <div class="meta"><b>${esc(c.guestName || 'Guest')}</b>
        <span class="muted">${new Date(c.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} · ${c.duration ? fmtTime(c.duration) + ' · ' : ''}${((c.size || 0) / 1e6).toFixed(1)} MB</span>
        ${c.prompt ? `<span class="muted">“${esc(c.prompt)}”</span>` : ''}</div>
      <div class="acts"><button data-a="play">Play</button><button data-a="share">Share</button><button data-a="dl">Download</button><button data-a="del" class="del">Delete</button></div>`;
    card.querySelector('[data-a=play]').onclick = () => openPlayer(c);
    card.querySelector('[data-a=share]').onclick = () => shareClips([c], i - 1);
    card.querySelector('[data-a=dl]').onclick = () => download(c.blob, fileName(c, i));
    card.querySelector('[data-a=del]').onclick = async () => {
      if (!(await confirmBox(`Delete ${c.guestName ? c.guestName + '’s' : 'this'} ${c.type}?`))) return;
      await db.deleteClip(c.id); renderAdmin();
    };
    grid.append(card);
  });
}
function openPlayer(c) {
  const box = $('#player-media'); box.innerHTML = '';
  const u = URL.createObjectURL(c.blob); let el;
  if (c.type === 'photo') { el = new Image(); el.src = u; }
  else if (c.type === 'audio') { el = document.createElement('audio'); el.controls = true; el.src = u; }
  else { el = document.createElement('video'); el.controls = true; el.playsInline = true; el.loop = c.type === 'boomerang'; el.src = u; }
  box.append(el); el.play?.().catch(() => {});
  $('#player-info').textContent = [c.guestName, c.prompt].filter(Boolean).join(' — ');
  $('#m-player').hidden = false;
  $('#player-close').onclick = () => { el.pause?.(); box.innerHTML = ''; URL.revokeObjectURL(u); $('#m-player').hidden = true; };
}

// ------------------------------------------------------------- wiring
function wire() {
  $('#s-attract').addEventListener('click', () => { if (enabledModes().length <= 1) startFlow(enabledModes()[0] || 'video'); });
  $$('[data-act=home]').forEach((b) => b.addEventListener('click', goHome));
  $('#guest-name').addEventListener('input', validateName);
  $('#guest-name').addEventListener('keydown', (e) => { if (e.key === 'Enter' && validateName()) afterName(); });
  $('#consent-box').addEventListener('change', validateName);
  $('#name-next').addEventListener('click', () => { if (validateName()) afterName(); });
  $('#prompt-shuffle').addEventListener('click', () => { const el = $('#prompt-text'); el.textContent = nextPrompt(); el.classList.remove('swap'); void el.offsetWidth; el.classList.add('swap'); });
  $('#prompt-use').addEventListener('click', () => { S.prompt = $('#prompt-text').textContent; goLive(); });
  $('#prompt-skip').addEventListener('click', () => { S.prompt = ''; goLive(); });
  $('#shutter').addEventListener('click', onShutter);
  $('#review-save').addEventListener('click', saveResult);
  $('#review-retake').addEventListener('click', retake);
  $('#s-thanks').addEventListener('click', goHome);
  $('#hotspot').addEventListener('click', onHotspot);
  $('#admin-close').addEventListener('click', closeAdmin);
  $('#pin-cancel').addEventListener('click', () => { $('#m-pin').hidden = true; });
  const kp = $('#keypad');
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].forEach((k) => {
    const b = document.createElement('button'); b.textContent = k; b.onclick = () => pinKey(k); kp.append(b);
  });
  ['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, () => { S.idleAt = Date.now(); }, { passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { requestWakeLock(); if (!S.stream && S.screen !== 'admin') ensureCamera(); }
  });
  navigator.mediaDevices?.addEventListener?.('devicechange', () => { if (S.screen === 'admin' && adminTab === 'Devices') renderAdmin(); });
  document.addEventListener('gesturestart', (e) => e.preventDefault()); // no pinch-zoom
  setInterval(idleCheck, 2000);
}

async function boot() {
  wire();
  try { await navigator.storage?.persist?.(); } catch {}
  await loadAssets();
  applySettings();
  show('attract');
  requestAnimationFrame(loop);
  if (!navigator.mediaDevices?.getUserMedia) {
    const el = $('#a-error'); el.textContent = 'Camera API unavailable — open this app over https:// in Safari.'; el.hidden = false;
  } else {
    await ensureCamera();
  }
  requestWakeLock();
  if (location.hash === '#admin') openPin();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW', e));
  }
  window.__vg = S; // handy for debugging in Safari Web Inspector
}
boot();
