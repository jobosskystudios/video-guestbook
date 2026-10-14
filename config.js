// =============================================================
//  Video Guestbook — configuration, defaults, text & prompts
//  Edit this file to change defaults for every new install.
//  (Per-event changes are made in the in-app Admin panel.)
// =============================================================

export const APP_VERSION = '1.0.3';

export const DEFAULTS = {
  // ---------- Event ----------
  coupleNames: 'Aarav & Diya',
  eventDate: '12 December 2026',
  hashtag: '#AaravWedsDiya',
  welcomeTitle: 'Leave us a message!',
  thanksTitle: 'Thank you!',
  thanksSub: 'Your message means the world to us.',
  galleryUrl: '',               // optional: QR code shown on the Thank-you screen
  qrLabel: 'Scan to see the wedding gallery',
  studioName: '',               // small credit on the welcome screen, e.g. "by Jobossky Studios"

  // ---------- Experience ----------
  modeVideo: true,
  modeAudio: true,              // "audio guestbook" (retro phone style voice message)
  modePhoto: true,
  modeBoomerang: true,
  maxSeconds: 60,
  minSeconds: 3,
  countdown: 3,
  allowRetake: true,
  reviewAutoSave: 20,           // seconds before the review screen saves by itself (0 = never)
  askName: true,
  nameRequired: false,
  consent: false,
  consentText: 'I agree that the couple may share my message.',
  showPrompts: true,
  language: 'en',               // 'en' | 'hi' | 'both'
  sounds: true,

  // ---------- Look ----------
  fontStyle: 'script',          // 'script' | 'classic' | 'modern'
  accent: '#C9A96E',
  bgMode: 'live',               // 'live' (blurred camera) | 'image' | 'color'
  bgColor: '#141210',
  showLogo: true,
  frameStyle: 'elegant',        // 'none' | 'elegant' | 'banner' | 'minimal'
  useCustomOverlay: false,      // use an uploaded transparent PNG frame instead
  defaultFilter: 'none',
  guestFilters: true,
  mirror: false,
  orientation: 'landscape',     // 'landscape' | 'portrait' (9:16 for Reels)

  // ---------- Devices ----------
  cameraId: '', cameraLabel: '',
  micId: '', micLabel: '',
  resolution: '1080',           // '720' | '1080' | '2160' (capture size)
  engine: 'composite',          // 'composite' (overlays+filters burned in) | 'direct' (raw camera)
  voiceCleanup: false,          // browser noise suppression / AGC (keep OFF with a RØDE mic)

  // ---------- Kiosk ----------
  idleSeconds: 45,
  wakeLock: true,
  pin: '1234',

  // ---------- Prompts (one per line) ----------
  promptsEn: [
    'Share your best piece of marriage advice.',
    'How do you know the couple? Tell us the story!',
    'What is your favourite memory with them?',
    'Where do you see these two in 10 years?',
    'Describe the couple in three words.',
    'Give them a blessing for their new journey.',
    'Predict it: who will say sorry first after a fight?',
    'Sing them one line of your favourite love song!',
    'What should they never stop doing together?',
    'Spill one funny secret about the bride or groom!',
  ].join('\n'),
  promptsHi: [
    'नवविवाहित जोड़े को शादी की एक सलाह दीजिए।',
    'आप इन्हें कैसे जानते हैं? पूरी कहानी बताइए!',
    'इनके साथ आपकी सबसे प्यारी याद क्या है?',
    '10 साल बाद आप इन्हें कहाँ देखना चाहते हैं?',
    'तीन शब्दों में इस जोड़ी के बारे में बताइए।',
    'इनकी नई ज़िंदगी के लिए आशीर्वाद दीजिए।',
    'बताइए, झगड़े के बाद पहले सॉरी कौन बोलेगा?',
    'इनके लिए किसी प्यार भरे गाने की एक लाइन गाइए!',
    'दूल्हे या दुल्हन का कोई मज़ेदार राज़ खोलिए!',
  ].join('\n'),
};

// UI text. Add a language by adding another block with the same keys.
export const STRINGS = {
  en: {
    tapStart: 'Tap anywhere to begin',
    chooseMode: 'What would you like to leave?',
    video: 'Video message', audio: 'Voice message', photo: 'Photo', boomerang: 'Boomerang',
    yourName: 'Who is leaving this message?',
    namePh: 'e.g. Rahul & Priya — college friends',
    next: 'Next', back: 'Back',
    promptTitle: 'Need an idea?',
    shuffle: 'Another question', useThis: 'Use this one', ownWords: 'Skip — I’ll say my own',
    getReady: 'Get in frame, then tap the button',
    getReadyAudio: 'Speak close to the mic, then tap the button',
    tapStop: 'Tap to stop',
    recording: 'REC',
    keepMoving: 'Keep moving!',
    making: 'Making your boomerang…',
    save: 'Save my message', retake: 'Retake',
    autosave: 'Saving automatically in {n}s',
    savePhoto: 'Save my photo', saveIt: 'Save it!',
    cameraError: 'Camera not ready — staff: tap the top-left corner 5 times for settings.',
  },
  hi: {
    tapStart: 'शुरू करने के लिए कहीं भी टैप करें',
    chooseMode: 'आप कैसा संदेश देना चाहेंगे?',
    video: 'वीडियो संदेश', audio: 'आवाज़ संदेश', photo: 'फ़ोटो', boomerang: 'बूमरैंग',
    yourName: 'यह संदेश कौन दे रहा है?',
    namePh: 'जैसे: राहुल और प्रिया — कॉलेज के दोस्त',
    next: 'आगे', back: 'पीछे',
    promptTitle: 'कुछ सूझ नहीं रहा?',
    shuffle: 'दूसरा सवाल', useThis: 'यही ठीक है', ownWords: 'रहने दीजिए — अपने शब्दों में कहूँगा',
    getReady: 'कैमरे के सामने आइए, फिर बटन दबाइए',
    getReadyAudio: 'माइक के पास बोलिए, फिर बटन दबाइए',
    tapStop: 'रोकने के लिए टैप करें',
    recording: 'REC',
    keepMoving: 'हिलते रहिए!',
    making: 'आपका बूमरैंग बन रहा है…',
    save: 'संदेश सेव करें', retake: 'दोबारा रिकॉर्ड करें',
    autosave: '{n} सेकंड में अपने-आप सेव होगा',
    savePhoto: 'फ़ोटो सेव करें', saveIt: 'सेव करें',
    cameraError: 'कैमरा तैयार नहीं है।',
  },
};

// Canvas filters (CSS filter syntax, applied while recording).
export const FILTERS = {
  none:    { label: 'Natural', css: 'none' },
  glow:    { label: 'Soft glow', css: 'brightness(1.07) contrast(0.92) saturate(1.12)' },
  warm:    { label: 'Golden', css: 'sepia(0.22) saturate(1.25) brightness(1.04)' },
  vintage: { label: 'Vintage', css: 'sepia(0.45) contrast(0.92) brightness(1.06) saturate(0.85)' },
  bw:      { label: 'B&W', css: 'grayscale(1) contrast(1.12)' },
};

// Fonts that ship with iPadOS (work offline at the venue).
export const FONTS = {
  script:  '"Snell Roundhand","Savoye LET","Great Vibes","Brush Script MT",cursive',
  classic: '"Didot","Bodoni 72","Playfair Display",Georgia,serif',
  modern:  '"Avenir Next","Helvetica Neue",Helvetica,Arial,sans-serif',
};
