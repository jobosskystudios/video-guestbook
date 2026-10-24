// =============================================================
//  Video Guestbook — configuration, defaults, text & prompts
//  Edit this file to change defaults for every new install.
//  (Per-event changes are made in the in-app Admin panel.)
// =============================================================

export const APP_VERSION = '1.1.0';

// Changing PROFILE_ID makes every iPad drop old event text/branding on next load
// (camera, mic, PIN and resolution are kept).
export const PROFILE_ID = 'mahati-sankar-oct-2026';

// One-tap event switching in Admin → Event. Each event gets its own Gallery folder.
export const EVENT_PRESETS = [
  { label: 'Reception — Sat 24 Oct, 7 PM', set: { eventDate: 'Reception · 24 October 2026', welcomeTitle: 'Leave a little love. Watch it bloom.' } },
  { label: 'Muhurtham — Sun 25 Oct, 9 AM', set: { eventDate: 'Muhurtham · 25 October 2026', welcomeTitle: 'Bless the couple on their big day' } },
];

export const LANGUAGES = [
  ['en-ta', 'English + தமிழ் (Tamil)'], ['en', 'English'], ['ta', 'தமிழ் (Tamil)'],
  ['en-hi', 'English + हिन्दी'], ['hi', 'हिन्दी (Hindi)'],
];

export const DEFAULTS = {
  // ---------- Event ----------
  coupleNames: 'Mahati & Sankar',
  eventDate: 'Reception · 24 October 2026',
  hashtag: '',
  welcomeTitle: 'Leave a little love. Watch it bloom.',
  thanksTitle: 'Thank you! · நன்றி!',
  thanksSub: 'Your presence and blessings make our celebration complete.',
  profileId: PROFILE_ID,
  galleryUrl: 'https://www.jobosskystudios.online/mswedding', // QR code on the Thank-you screen (swap for the couple's gallery per event)
  qrLabel: 'Scan to share photos & wishes',
  studioName: 'Jobossky Studios', // credit on the welcome screen (text fallback for the logo)
  studioLogo: 'icons/studio-logo.png', // white logo, transparent background
  showStudioLogo: true,

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
  language: 'en-ta',            // see LANGUAGES above
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
    'Share your best piece of marriage advice for Mahati & Sankar.',
    'How do you know the couple? Tell us the story!',
    'They grew up just 2 km apart but met at IIM Indore — destiny or what?',
    'What is your favourite memory with Mahati or Sankar?',
    'Where do you see these two in 10 years?',
    'Describe the couple in three words.',
    'Give them a blessing for their new journey.',
    'Predict it: who will say sorry first after a fight?',
    'One tip for Sankar — and one for Mahati!',
    'Sing them one line of your favourite love song!',
  ].join('\n'),
  promptsTa: [
    'மஹதி & சங்கருக்கு உங்கள் சிறந்த திருமண அறிவுரை என்ன?',
    'மணமக்களை உங்களுக்கு எப்படித் தெரியும்? கதையைச் சொல்லுங்கள்!',
    'இவர்களுடன் உங்கள் மறக்க முடியாத நினைவு எது?',
    'பத்து வருடங்கள் கழித்து இவர்களை எப்படிப் பார்க்க விரும்புகிறீர்கள்?',
    'மூன்று வார்த்தைகளில் இந்த ஜோடியை விவரியுங்கள்!',
    'புதிய வாழ்க்கைக்கு உங்கள் ஆசீர்வாதத்தைச் சொல்லுங்கள்.',
    'சண்டைக்குப் பிறகு முதலில் "சாரி" சொல்வது யார்?',
    'இவர்களுக்காக ஒரு காதல் பாடலின் ஒரு வரியைப் பாடுங்கள்!',
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
  ta: {
    tapStart: 'தொடங்க திரையில் எங்கு வேண்டுமானாலும் தொடவும்',
    chooseMode: 'எப்படி வாழ்த்த விரும்புகிறீர்கள்?',
    video: 'வீடியோ வாழ்த்து', audio: 'குரல் வாழ்த்து', photo: 'புகைப்படம்', boomerang: 'பூமராங்',
    yourName: 'வாழ்த்துபவர் யார்?',
    namePh: 'உ.தா: ராகுல் & ப்ரியா — கல்லூரி நண்பர்கள்',
    next: 'அடுத்து', back: 'பின்செல்',
    promptTitle: 'ஒரு யோசனை வேண்டுமா?',
    shuffle: 'வேறு கேள்வி', useThis: 'இதையே தேர்வு செய்', ownWords: 'வேண்டாம் — என் வார்த்தைகளில் சொல்கிறேன்',
    getReady: 'கேமரா முன் நின்று, பொத்தானை அழுத்தவும்',
    getReadyAudio: 'மைக் அருகில் பேசி, பொத்தானை அழுத்தவும்',
    tapStop: 'நிறுத்த தொடவும்',
    recording: 'REC',
    keepMoving: 'அசைந்து கொண்டே இருங்கள்!',
    making: 'உங்கள் பூமராங் தயாராகிறது…',
    save: 'வாழ்த்தைச் சேமி', retake: 'மீண்டும் பதிவு செய்',
    autosave: '{n} வினாடிகளில் தானாகச் சேமிக்கப்படும்',
    savePhoto: 'புகைப்படத்தைச் சேமி', saveIt: 'சேமி',
    cameraError: 'கேமரா தயாராக இல்லை.',
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
