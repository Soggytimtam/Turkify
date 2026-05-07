import { useState, useEffect, useRef, useCallback, useMemo } from "react";

/* ============================================================
   TÜRKIFY — Learn Turkish Through Music
   ─────────────────────────────────────────────────────────
   Nazar (evil eye) visual identity — Pastel edition:
     Cream #faf8f4 · Lavender #f0edf8 · Sky #c8e8f5
     Periwinkle #a8b8e8 · Peach #f5c8b8 · Sage #b8ddc8
   ─────────────────────────────────────────────────────────
   Audio: Web Audio API synthesized melody
   AI:    Claude API generates original Turkish lyrics
   UX:    Karaoke sync · SRS quiz · A1→B1 CEFR progression
   ============================================================ */

// ─────────────────────────────────────────────────────────────
// DESIGN SYSTEM — Pastel nazar palette
// ─────────────────────────────────────────────────────────────
const C = {
  // Backgrounds — warm cream, layered
  bg:       "#faf8f4",
  surface:  "#f3efe8",
  card:     "#ffffff",
  cardHov:  "#f7f4ff",
  // Borders
  border:   "rgba(140,120,200,0.15)",
  borderHov:"rgba(140,120,200,0.35)",
  // Text — rich dark for readability on light bg
  text:     "#2d2540",
  muted:    "rgba(45,37,64,0.55)",
  dim:      "rgba(45,37,64,0.35)",
  // Brand accents — pastel nazar tones
  sky:      "#6aaed6",   // pastel nazar blue — primary interactive
  cobalt:   "#8898c8",   // pastel periwinkle — nazar outer ring
  gold:     "#c8985a",   // warm pastel gold
  red:      "#d47878",   // pastel blush — nazar pupil
  white:    "#ffffff",
  // Concept tags
  vocab:    { bg:"rgba(200,152,90,0.12)",  bd:"rgba(200,152,90,0.30)",  cl:"#9a6e30" },
  grammar:  { bg:"rgba(106,174,214,0.14)", bd:"rgba(106,174,214,0.35)", cl:"#3a7fa8" },
  phonol:   { bg:"rgba(212,120,120,0.12)", bd:"rgba(212,120,120,0.30)", cl:"#a04040" },
  // Difficulty levels
  beg:      "#5aaa7a",
  int:      "#c8985a",
  adv:      "#d47878",
};

const FONT_HEADING = "'Playfair Display', Georgia, serif";
const FONT_BODY    = "'DM Sans', system-ui, sans-serif";
const FONT_MONO    = "'DM Mono', 'Fira Mono', monospace";

// ─────────────────────────────────────────────────────────────
// AUDIO ENGINE — Web Audio API
// ─────────────────────────────────────────────────────────────
const FREQ = {
  C3:130.81, D3:146.83, E3:164.81, F3:174.61, G3:196.00, A3:220.00, B3:246.94,
  C4:261.63, D4:293.66, E4:329.63, F4:349.23, G4:392.00, A4:440.00, B4:493.88,
  C5:523.25, D5:587.33, E5:659.25, F5:698.46, G5:783.99,
  R: 0,
};

function scheduleNote(ctx, freq, t0, dur) {
  if (!freq || freq <= 0 || dur < 0.02) return;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  const lp  = ctx.createBiquadFilter();

  osc.type = "triangle";
  osc.frequency.value = freq;
  lp.type = "lowpass";
  lp.frequency.value = 2400;
  lp.Q.value = 0.5;

  const att = 0.018;
  const rel = Math.min(dur * 0.28, 0.14);
  env.gain.setValueAtTime(0,     t0);
  env.gain.linearRampToValueAtTime(0.20, t0 + att);
  env.gain.setValueAtTime(0.20,  t0 + dur - rel);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(env);
  env.connect(lp);
  lp.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

async function buildSchedule(melodyKey, ctx, pitchShift = 1.0, tempoFactor = 1.0) {
  const mel = MELODIES[melodyKey];
  if (!mel) return { events: [], totalMs: 0 };

  if (ctx.state === "suspended") await ctx.resume();

  const beatSec = (60 / mel.bpm) / tempoFactor;
  const origin  = ctx.currentTime + 0.30;

  // Map noteIndex → lineIndex for O(1) lookup
  const lineAtNote = {};
  mel.lineBreaks.forEach((noteIdx, lineIdx) => { lineAtNote[noteIdx] = lineIdx; });

  const events = [];
  let cursor = origin;

  mel.notes.forEach(([name, beats], ni) => {
    if (lineAtNote[ni] !== undefined) {
      events.push({ lineIdx: lineAtNote[ni], delayMs: (cursor - origin) * 1000 });
    }
    scheduleNote(ctx, (FREQ[name] ?? 0) * pitchShift, cursor, beats * beatSec);
    cursor += beats * beatSec;
  });

  return { events, totalMs: (cursor - origin) * 1000 };
}

// ─────────────────────────────────────────────────────────────
// MELODY DATA — Public domain compositions
// ─────────────────────────────────────────────────────────────
const MELODIES = {
  twinkle: {
    bpm: 100, sig: "4/4",
    lineBreaks: [0,7,14,21,28,35, 42,49,56,63, 70,77,84,91,98,105],
    notes: [
      ["C4",1],["C4",1],["G4",1],["G4",1],["A4",1],["A4",1],["G4",2],
      ["F4",1],["F4",1],["E4",1],["E4",1],["D4",1],["D4",1],["C4",2],
      ["G4",1],["G4",1],["F4",1],["F4",1],["E4",1],["E4",1],["D4",2],
      ["G4",1],["G4",1],["F4",1],["F4",1],["E4",1],["E4",1],["D4",2],
      ["C4",1],["C4",1],["G4",1],["G4",1],["A4",1],["A4",1],["G4",2],
      ["F4",1],["F4",1],["E4",1],["E4",1],["D4",1],["D4",1],["C4",2],
      ["G4",1],["G4",1],["F4",1],["F4",1],["E4",1],["E4",1],["D4",2],
      ["G4",1],["G4",1],["F4",1],["F4",1],["E4",1],["E4",1],["D4",2],
      ["C4",1],["C4",1],["G4",1],["G4",1],["A4",1],["A4",1],["G4",2],
      ["F4",1],["F4",1],["E4",1],["E4",1],["D4",1],["D4",1],["C4",2],
      ["C4",1],["C4",1],["G4",1],["G4",1],["A4",1],["A4",1],["G4",2],
      ["F4",1],["F4",1],["E4",1],["E4",1],["D4",1],["D4",1],["C4",2],
      ["G4",1],["G4",1],["F4",1],["F4",1],["E4",1],["E4",1],["D4",2],
      ["G4",1],["G4",1],["F4",1],["F4",1],["E4",1],["E4",1],["D4",2],
      ["C4",1],["C4",1],["G4",1],["G4",1],["A4",1],["A4",1],["G4",2],
      ["F4",1],["F4",1],["E4",1],["E4",1],["D4",1],["D4",1],["C4",2],
    ],
  },
  birthday: {
    bpm: 82, sig: "3/4",
    lineBreaks: [0,7,14,23, 31,38,45,54],
    notes: [
      ["G3",.75],["G3",.25],["A3",1],["G3",1],["C4",1],["B3",2],["R",1],
      ["G3",.75],["G3",.25],["A3",1],["G3",1],["D4",1],["C4",2],["R",1],
      ["G3",.75],["G3",.25],["G4",1],["E4",1],["C4",1],["B3",1],["A3",2],["R",.01],["R",.01],
      ["F4",.75],["F4",.25],["E4",1],["C4",1],["D4",1],["C4",2],["R",1],
      ["G3",.75],["G3",.25],["A3",1],["G3",1],["C4",1],["B3",2],["R",1],
      ["G3",.75],["G3",.25],["A3",1],["G3",1],["D4",1],["C4",2],["R",1],
      ["G3",.75],["G3",.25],["G4",1],["E4",1],["C4",1],["B3",1],["A3",2],["R",.01],["R",.01],
      ["F4",.75],["F4",.25],["E4",1],["C4",1],["D4",1],["C4",2],["R",1],
    ],
  },
  jingle: {
    bpm: 130, sig: "4/4",
    lineBreaks: [0,8,16,24, 32,40,48,56],
    notes: [
      ["E4",1],["E4",1],["E4",2],["E4",1],["E4",1],["E4",2],["E4",1],["G4",1],
      ["C4",1],["D4",1],["E4",1],["E4",1],["E4",1],["F4",1],["F4",1],["F4",1],
      ["F4",1],["E4",1],["E4",1],["E4",1],["E4",1],["D4",1],["D4",1],["E4",1],
      ["D4",2],["G4",1],["G4",1],["G4",1],["G4",1],["G4",2],["R",.01],["R",.01],
      ["E4",1],["E4",1],["E4",2],["E4",1],["E4",1],["E4",2],["E4",1],["G4",1],
      ["C4",1],["D4",1],["E4",1],["E4",1],["E4",1],["F4",1],["F4",1],["F4",1],
      ["G4",1],["G4",1],["F4",1],["E4",1],["D4",1],["D4",1],["D4",1],["E4",1],
      ["D4",2],["C4",1],["C4",1],["C4",2],["C4",1],["C4",1],["R",.01],["R",.01],
    ],
  },
  hiphop: {
    bpm: 88, sig: "4/4",
    lineBreaks: [0,8,16,24, 32,40,48,56, 64,72,80,88],
    notes: [
      ["G3",1],["G3",1],["A3",1],["C4",2],["R",.5],["C4",.5],["D4",1],["C4",1],
      ["A3",1],["A3",1],["G3",1],["E3",2],["R",.5],["G3",.5],["A3",1],["G3",1],
      ["G3",1],["C4",1],["C4",1],["D4",1],["C4",2],["A3",1],["G3",2],
      ["E3",1],["G3",1],["A3",1],["G3",1],["E3",2],["D3",2],["R",.01],
      ["C4",1],["C4",1],["D4",1],["E4",2],["D4",1],["C4",1],["A3",1],
      ["G3",1],["A3",1],["C4",1],["D4",2],["C4",1],["A3",1],["G3",1],
      ["C4",1],["C4",1],["D4",1],["E4",2],["D4",1],["C4",1],["A3",1],
      ["G3",2],["A3",1],["G3",1],["E3",2],["G3",1],["G3",1],
      ["G3",1],["G3",1],["A3",1],["C4",2],["R",.5],["C4",.5],["D4",1],["C4",1],
      ["A3",1],["A3",1],["G3",1],["E3",2],["R",.5],["G3",.5],["A3",1],["G3",1],
      ["G3",1],["C4",1],["C4",1],["D4",1],["C4",2],["A3",1],["G3",2],
      ["E3",1],["G3",1],["A3",1],["G3",1],["E3",2],["D3",2],["R",.01],
    ],
  },
  scarborough: {
    bpm: 72, sig: "3/4",
    lineBreaks: [0,8,16,25],
    notes: [
      ["A4",2],["C5",1],["D5",1],["E5",2],["D5",1],["C5",1],["A4",2],["R",.01],
      ["E4",2],["A4",1],["C5",1],["B4",1],["A4",1],["G4",2],["A4",1],["R",.01],
      ["A4",1],["G4",1],["A4",1],["C5",1],["D5",1],["C5",1],["A4",1],["G4",1],["E4",1],
      ["E5",2],["D5",1],["C5",1],["B4",2],["A4",1],["G4",1],["A4",2],
    ],
  },
  sunshine: {
    bpm: 96, sig: "4/4",
    lineBreaks: [0,9,15,24, 32,41,47,56],
    notes: [
      ["C4",1],["E4",1],["G4",1],["G4",1],["G4",2],["E4",1],["G4",1],["A4",1],["G4",1],
      ["E4",2],["C4",1],["E4",1],["G4",2],["G4",2],
      ["C4",1],["E4",1],["G4",1],["G4",1],["G4",2],["A4",1],["C5",1],["B4",1],["A4",1],
      ["G4",2],["E4",1],["C4",1],["D4",2],["C4",2],["R",.01],["R",.01],["R",.01],
      ["C4",1],["E4",1],["G4",1],["G4",1],["G4",2],["E4",1],["G4",1],["A4",1],["G4",1],
      ["E4",2],["C4",1],["E4",1],["G4",2],["G4",2],
      ["C4",1],["E4",1],["G4",1],["G4",1],["G4",2],["A4",1],["C5",1],["B4",1],["A4",1],
      ["G4",2],["E4",1],["C4",1],["D4",2],["C4",2],["R",.01],["R",.01],["R",.01],
    ],
  },
};

// ─────────────────────────────────────────────────────────────
// SONG CATALOG
// ─────────────────────────────────────────────────────────────
const SONGS = [
  {
    id: "twinkle",    melodyKey: "twinkle",
    title: "Star Song",   inspiredBy: "Classic Lullaby",
    genre: "Folk",    level: "beginner",    cefr: "A1",
    topic: "Greetings & Farewells", topicIcon: "👋",
    emoji: "⭐",  accent: C.sky,   prebuilt: true,
    desc: "Gentle lullaby melody — master A1 greetings",
  },
  {
    id: "birthday",   melodyKey: "birthday",
    title: "Waltz of Numbers",   inspiredBy: "Birthday Waltz",
    genre: "Folk",    level: "beginner",    cefr: "A1",
    topic: "Numbers 1–10", topicIcon: "🔢",
    emoji: "🎂",  accent: C.gold,  prebuilt: false,
    desc: "Lilting waltz — count to ten in Turkish",
  },
  {
    id: "jingle",     melodyKey: "jingle",
    title: "Bell Rhythm",   inspiredBy: "Upbeat Carol",
    genre: "Pop",     level: "intermediate",cefr: "A2",
    topic: "Present Tense Verbs", topicIcon: "⚡",
    emoji: "🔔",  accent: "#5aaa7a", prebuilt: false,
    desc: "Energetic pop feel — verb conjugation drills",
  },
  {
    id: "hiphop",     melodyKey: "hiphop",
    title: "City Beat",   inspiredBy: "Hip-Hop Groove",
    genre: "Hip-Hop", level: "intermediate",cefr: "B1",
    topic: "Past Tense (-dı)", topicIcon: "⏪",
    emoji: "🎤",  accent: "#9b7fe8", prebuilt: false,
    desc: "16-bar groove — past tense narration",
  },
  {
    id: "scarborough",melodyKey: "scarborough",
    title: "Modal Ballad",   inspiredBy: "Folk Ballad",
    genre: "Folk",    level: "advanced",    cefr: "B1",
    topic: "Noun Cases", topicIcon: "🏛️",
    emoji: "🌿",  accent: "#6888d8", prebuilt: false,
    desc: "Modal harmony — dative & accusative cases",
  },
  {
    id: "sunshine",   melodyKey: "sunshine",
    title: "Sunny Day",   inspiredBy: "Country Swing",
    genre: "Country", level: "intermediate",cefr: "A2",
    topic: "Adjectives & Colors", topicIcon: "🎨",
    emoji: "☀️",  accent: "#e88a2e", prebuilt: false,
    desc: "Country swing — descriptive vocabulary",
  },
];

// ─────────────────────────────────────────────────────────────
// PRE-BUILT LESSON — Star Song / Greetings
// ─────────────────────────────────────────────────────────────
const PREBUILT_LESSON = {
  objective: "Master 8 essential Turkish greetings and farewells (CEFR A1)",
  sections: [
    {
      id: "v1", label: "Verse 1", type: "verse", accent: C.sky,
      lines: [
        { tr:"Merhaba, merhaba,",      ph:"mehr-hah-BAH, mehr-hah-BAH",         en:"Hello, hello,",                  concept:"greeting",          ct:"vocab"   },
        { tr:"Günaydın her sabaha!",   ph:"gew-nay-DUN hehr sah-BAH-hah",       en:"Good morning every day!",        concept:"morning greeting",  ct:"vocab"   },
        { tr:"İyi günler diyelim,",    ph:"ee-YEE gewn-lehr dee-yeh-LEEM",      en:"Let us say 'good day,'",         concept:"cohortative -elim", ct:"grammar" },
        { tr:"Herkese güzelce gidem.", ph:"hehr-keh-SEH gew-ZEL-jeh gee-DEHM", en:"To all, kindly we go.",          concept:"dative case -e",    ct:"grammar" },
        { tr:"Merhaba, merhaba,",      ph:"mehr-hah-BAH, mehr-hah-BAH",         en:"Hello, hello,",                  concept:"greeting repeat",   ct:"vocab"   },
        { tr:"Günaydın her sabaha!",   ph:"gew-nay-DUN hehr sah-BAH-hah",       en:"Good morning every day!",        concept:"morning greeting",  ct:"vocab"   },
      ],
    },
    {
      id: "ch", label: "Chorus — SRS Anchor", type: "chorus", accent: C.gold,
      lines: [
        { tr:"Nasılsın, nasılsın?",      ph:"nah-SIL-sin, nah-SIL-sin?",          en:"How are you, how are you?",  concept:"question -sın",    ct:"grammar" },
        { tr:"İyiyim, teşekkürlerim!",   ph:"ee-YEE-yim, teh-shek-KEWR-lehr",    en:"I'm fine, thank you!",       concept:"1st person -im",   ct:"grammar" },
        { tr:"Nasılsın, nasılsın?",      ph:"nah-SIL-sin, nah-SIL-sin?",          en:"How are you, how are you?",  concept:"SRS repeat",       ct:"grammar" },
        { tr:"Çok iyiyim, şükrülerim!", ph:"chok ee-YEE-yim, shewk-REW-lehr",   en:"Very fine, my gratitude!",   concept:"intensifier çok",  ct:"vocab"   },
      ],
    },
    {
      id: "v2", label: "Verse 2", type: "verse", accent: C.sky,
      lines: [
        { tr:"Hoşça kal, hoşça kal,",   ph:"hosh-CHA kahl, hosh-CHA kahl",         en:"Goodbye (stay well),",         concept:"farewell",          ct:"vocab"   },
        { tr:"Görüşürüz yakında hep!",  ph:"gur-ew-shew-REWZ yah-KIN-dah hep",    en:"We'll meet again very soon!",  concept:"future -ürüz",      ct:"grammar" },
        { tr:"İyi geceler diyorum,",    ph:"ee-YEE geh-jeh-LEHR dee-YOR-um",      en:"I say 'good night,'",           concept:"present -iyor",     ct:"grammar" },
        { tr:"Seviyorum, unuturum.",    ph:"seh-VEE-yor-um, oo-noo-TOO-room",     en:"I love (you), I'll remember.", concept:"1st person -um",    ct:"grammar" },
        { tr:"Hoşça kal, hoşça kal,",   ph:"hosh-CHA kahl, hosh-CHA kahl",         en:"Goodbye, goodbye,",            concept:"farewell repeat",   ct:"vocab"   },
        { tr:"Görüşürüz yakında hep!",  ph:"gur-ew-shew-REWZ yah-KIN-dah hep",    en:"We'll meet again very soon!",  concept:"future -ürüz",      ct:"grammar" },
      ],
    },
  ],
  vocabulary: [
    { word:"merhaba",     meaning:"hello" },
    { word:"günaydın",    meaning:"good morning" },
    { word:"iyi günler",  meaning:"good day" },
    { word:"nasılsın",    meaning:"how are you?" },
    { word:"iyiyim",      meaning:"I am fine" },
    { word:"teşekkürler", meaning:"thank you" },
    { word:"hoşça kal",   meaning:"goodbye (stay well)" },
    { word:"görüşürüz",   meaning:"see you / we'll meet again" },
  ],
  quiz: [
    { q:"What does 'merhaba' mean?",          opts:["Goodbye","Hello","Thank you","Good morning"],     ans:1, ref:"Merhaba, merhaba,"        },
    { q:"How do you say 'Good morning'?",      opts:["İyi geceler","Hoşça kal","Günaydın","Görüşürüz"], ans:2, ref:"Günaydın her sabaha!"     },
    { q:"What does 'nasılsın' mean?",          opts:["I'm fine","Goodbye","How are you?","Thank you"],  ans:2, ref:"Nasılsın, nasılsın?"      },
    { q:"What does 'iyiyim' mean?",            opts:["I'm fine","Good night","Hello","See you"],        ans:0, ref:"İyiyim, teşekkürlerim!"   },
    { q:"'Hoşça kal' means:",                  opts:["Good morning","How are you?","Thank you","Goodbye"],ans:3,ref:"Hoşça kal, hoşça kal,"  },
    { q:"'-iyor' suffix indicates:",           opts:["Past tense","Future","Present continuous","Plural"],ans:2,ref:"İyi geceler diyorum,"   },
  ],
};

// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// AI LESSON GENERATION
// ─────────────────────────────────────────────────────────────
async function generateLesson(song) {
  const mel = MELODIES[song.melodyKey];
  const n   = mel.lineBreaks.length;

  try {
    const res = await fetch("/api/generate-lesson", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        songTitle:   song.title,
        songTopic:   song.topic,
        songCefr:    song.cefr,
        melodyBpm:   mel.bpm,
        meldSig:     mel.sig,
        lineCount:   n,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(errorData.error || `Server error ${res.status}`);
    }

    const parsed = await res.json();

    if (!Array.isArray(parsed.sections) || parsed.sections.length < 2) {
      throw new Error("AI lesson missing sections");
    }
    if (!Array.isArray(parsed.quiz) || parsed.quiz.length < 3) {
      throw new Error("AI lesson missing quiz");
    }
    if (!Array.isArray(parsed.vocabulary)) {
      throw new Error("AI lesson missing vocabulary");
    }

    return parsed;

  } catch (err) {
    throw new Error(err.message || "Failed to generate lesson. Please try again.");
  }
}

// ─────────────────────────────────────────────────────────────
// SHARED UI ATOMS
// ─────────────────────────────────────────────────────────────

/** Nazar eye SVG — used in logo and decorative elements */
function NazarEye({ size = 24, className }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={className}
      style={{ display: "inline-block", flexShrink: 0 }}
    >
      {/* Outer white ring */}
      <circle cx="16" cy="16" r="16" fill="#dce8f5" />
      {/* Middle blue ring */}
      <circle cx="16" cy="16" r="11.5" fill={C.cobalt} />
      {/* Inner white ring */}
      <circle cx="16" cy="16" r="7.5" fill="#e8f4fc" />
      {/* Pupil */}
      <circle cx="16" cy="16" r="4" fill={C.cobalt} />
      {/* Dark centre */}
      <circle cx="16" cy="16" r="2" fill="#2d2540" />
      {/* Glint */}
      <circle cx="14.5" cy="14.5" r="1.1" fill="white" opacity="0.85" />
    </svg>
  );
}

function Tag({ bg, bd, cl, size = 10, children }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      borderRadius: 4, padding: "3px 8px",
      background: bg, border: `1px solid ${bd}`, color: cl,
      fontSize: size, fontFamily: FONT_MONO, fontWeight: 600,
      letterSpacing: 0.3, textTransform: "uppercase", whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function LevelTag({ level }) {
  const map = { beginner: C.beg, intermediate: C.int, advanced: C.adv };
  const col = map[level] || C.muted;
  return <Tag bg={col + "18"} bd={col + "50"} cl={col} size={9}>{level}</Tag>;
}

function ConceptTag({ ct, concept }) {
  const map = { vocab: C.vocab, grammar: C.grammar, phonology: C.phonol };
  const s   = map[ct] || C.vocab;
  return <Tag bg={s.bg} bd={s.bd} cl={s.cl} size={9}>{concept}</Tag>;
}

function ProgressBar({ value, color }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{ height: 2, background: "rgba(78,201,224,0.08)" }}
    >
      <div style={{
        height: "100%",
        width: `${value * 100}%`,
        background: color,
        transition: "width .1s linear",
        boxShadow: `0 0 10px ${color}90`,
      }} />
    </div>
  );
}

function Spinner({ color = C.sky, size = 22 }) {
  return (
    <div
      aria-label="Loading"
      style={{
        width: size, height: size, borderRadius: "50%",
        border: `2px solid ${color}30`,
        borderTopColor: color,
        animation: "spin .7s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

function WaveformBars({ color }) {
  return (
    <div aria-hidden="true" style={{ display: "flex", gap: 3, alignItems: "center", height: 18 }}>
      {[0,1,2,3,4].map(i => (
        <div key={i} style={{
          width: 3, borderRadius: 2, background: color,
          animation: `wave ${0.5 + i * 0.1}s ease-in-out infinite alternate`,
          animationDelay: `${i * 0.09}s`,
        }} />
      ))}
    </div>
  );
}

// Global keyframe styles — injected once
const GLOBAL_CSS = `
  @keyframes spin  { to { transform: rotate(360deg); } }
  @keyframes wave  { from { height: 3px; } to { height: 18px; } }
  @keyframes fadeUp{
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes nazarPulse {
    0%, 100% { opacity: 0.18; transform: scale(1); }
    50%       { opacity: 0.28; transform: scale(1.04); }
  }
`;

function GlobalStyles() {
  return <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />;
}

// ─────────────────────────────────────────────────────────────
// QUIZ COMPONENT
// ─────────────────────────────────────────────────────────────
function Quiz({ quiz, accent, onDone }) {
  const [idx,   setIdx]   = useState(0);
  const [sel,   setSel]   = useState(null);
  const [score, setScore] = useState(0);
  const [log,   setLog]   = useState([]);
  const [done,  setDone]  = useState(false);

  const q = quiz[idx];

  function pick(i) {
    if (sel !== null) return;
    setSel(i);
    const ok = (i === q.ans);
    if (ok) setScore(s => s + 1);
    setLog(l => [...l, ok]);
    setTimeout(() => {
      if (idx + 1 < quiz.length) { setIdx(n => n + 1); setSel(null); }
      else setDone(true);
    }, 1000);
  }

  if (done) {
    const pct = Math.round(score / quiz.length * 100);
    const msg = pct >= 83 ? "Lesson mastered — well done!" : pct >= 60 ? "Good work — review a few phrases." : "Keep singing along to reinforce it!";
    return (
      <div style={{ padding: "44px 32px", textAlign: "center" }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>{pct >= 83 ? "🎉" : pct >= 60 ? "👍" : "📚"}</div>
        <div style={{ fontFamily: FONT_HEADING, fontSize: 36, fontWeight: 700, color: C.text, marginBottom: 6 }}>
          {score}/{quiz.length}
        </div>
        <div style={{ fontSize: 15, color: C.muted, marginBottom: 28 }}>{msg}</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 28 }}>
          {log.map((ok, i) => (
            <span key={i} style={{
              width: 32, height: 32, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: ok ? "rgba(90,170,122,0.15)" : "rgba(212,120,120,0.15)",
              color: ok ? "#5aaa7a" : C.red,
              fontWeight: 700, fontSize: 15,
            }}>{ok ? "✓" : "✗"}</span>
          ))}
        </div>
        <button
          onClick={onDone}
          style={{
            background: accent, border: "none", borderRadius: 8,
            padding: "12px 32px", fontSize: 14, fontWeight: 700,
            color: C.bg, cursor: "pointer", letterSpacing: 0.3,
          }}
        >Back to Lyrics</button>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.dim, letterSpacing: 2, textTransform: "uppercase" }}>
          {idx + 1} / {quiz.length}
        </span>
        <div style={{ display: "flex", gap: 5 }}>
          {quiz.map((_, i) => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: "50%",
              background: i < idx ? accent : i === idx ? accent : C.border,
              opacity: i < idx ? 0.6 : 1,
              transition: "all .3s",
            }} />
          ))}
        </div>
      </div>

      {/* Lyric reference */}
      {q.ref && (
        <div style={{
          background: "rgba(78,201,224,0.06)",
          border: `1px solid ${C.border}`,
          borderLeft: `3px solid ${accent}`,
          borderRadius: "0 6px 6px 0",
          padding: "10px 14px", marginBottom: 20,
          fontStyle: "italic", color: C.muted, fontSize: 13,
        }}>
          🎵 &ldquo;{q.ref}&rdquo;
        </div>
      )}

      {/* Question */}
      <div style={{ fontFamily: FONT_HEADING, fontSize: 20, fontWeight: 600, color: C.text, marginBottom: 20, lineHeight: 1.5 }}>
        {q.q}
      </div>

      {/* Options */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {q.opts.map((opt, i) => {
          let bg = C.card, bd = C.border, cl = C.muted, fw = 400;
          if (sel !== null) {
            if (i === q.ans)      { bg = "rgba(90,170,122,0.12)"; bd = "rgba(90,170,122,0.50)"; cl = "#5aaa7a"; fw = 700; }
            else if (i === sel)   { bg = `${C.red}12`; bd = `${C.red}50`; cl = C.muted; }
            else                  { cl = C.dim; bd = "transparent"; }
          }
          return (
            <button
              key={i}
              onClick={() => pick(i)}
              disabled={sel !== null}
              aria-pressed={sel === i}
              style={{
                background: bg, border: `1px solid ${bd}`, borderRadius: 8,
                padding: "12px 16px", fontSize: 14, cursor: sel !== null ? "default" : "pointer",
                textAlign: "left", color: cl, fontWeight: fw,
                transition: "all .2s", lineHeight: 1.4, fontFamily: FONT_BODY,
              }}
            >{opt}</button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LYRIC ROW
// ─────────────────────────────────────────────────────────────
function LyricRow({ line, active, showPh, showEn, idx }) {
  return (
    <div
      aria-current={active ? "true" : undefined}
      style={{
        display: "grid",
        gridTemplateColumns: "2fr 2fr 2fr 150px",
        padding: "14px 20px",
        borderBottom: `1px solid ${C.border}`,
        background: active ? "rgba(78,201,224,0.06)" : "transparent",
        borderLeft: `3px solid ${active ? C.sky : "transparent"}`,
        transition: "background .3s, border-color .3s",
      }}
    >
      <div style={{
        padding: "0 12px", fontWeight: 600, fontSize: 15,
        color: active ? C.text : "rgba(232,234,240,.80)",
        lineHeight: 1.55,
        fontFamily: FONT_BODY,
      }}>{line.tr}</div>

      <div style={{
        padding: "0 12px", fontFamily: FONT_MONO, fontSize: 12,
        color: C.sky, lineHeight: 1.65,
        opacity: showPh ? 1 : 0, transition: "opacity .3s",
      }}>{line.ph}</div>

      <div style={{
        padding: "0 12px", fontSize: 13, color: C.muted,
        fontStyle: "italic", lineHeight: 1.55,
        opacity: showEn ? 1 : 0.15, transition: "opacity .3s",
      }}>{line.en}</div>

      <div style={{ padding: "0 12px", display: "flex", alignItems: "flex-start", paddingTop: 2 }}>
        <ConceptTag ct={line.ct} concept={line.concept} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LESSON VIEW
// ─────────────────────────────────────────────────────────────
function LessonView({ song, lesson, onBack }) {
  const [tab,         setTab]         = useState("lyrics");
  const [showPh,      setShowPh]      = useState(true);
  const [showEn,      setShowEn]      = useState(true);
  const [playing,     setPlaying]     = useState(false);
  const [activeLine,  setActiveLine]  = useState(-1);
  const [progress,    setProgress]    = useState(0);
  const [pitchShift,  setPitchShift]  = useState(1.0);
  const [tempo,       setTempo]       = useState(1.0);
  const [audioError,  setAudioError]  = useState(null);

  const ctxRef    = useRef(null);
  const timersRef = useRef([]);
  const rafRef    = useRef(null);
  const stopFlag  = useRef(false);
  const startMs   = useRef(0);
  const totalMs   = useRef(0);

  const stopPlayback = useCallback(() => {
    stopFlag.current = true;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    cancelAnimationFrame(rafRef.current);
    try { ctxRef.current?.close(); } catch (_) {}
    ctxRef.current = null;
    setPlaying(false);
    setActiveLine(-1);
    setProgress(0);
  }, []);

  const startPlayback = useCallback(async () => {
    stopPlayback();
    stopFlag.current = false;
    setAudioError(null);

    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctxRef.current = ctx;

      const { events, totalMs: dur } = await buildSchedule(song.melodyKey, ctx, pitchShift, tempo);
      if (stopFlag.current) return; // was stopped while awaiting

      totalMs.current = dur;
      startMs.current = performance.now();
      setPlaying(true);

      events.forEach(({ lineIdx, delayMs }) => {
        const id = setTimeout(() => {
          if (!stopFlag.current) setActiveLine(lineIdx);
        }, delayMs);
        timersRef.current.push(id);
      });

      function tick() {
        if (stopFlag.current) return;
        const elapsed = performance.now() - startMs.current;
        setProgress(Math.min(elapsed / dur, 1));
        if (elapsed < dur) { rafRef.current = requestAnimationFrame(tick); }
        else { setPlaying(false); setActiveLine(-1); setProgress(1); }
      }
      rafRef.current = requestAnimationFrame(tick);

    } catch (err) {
      setAudioError("Could not start audio. Please check your browser settings.");
      setPlaying(false);
    }
  }, [song.melodyKey, pitchShift, tempo, stopPlayback]);

  // Clean up on unmount or navigation
  useEffect(() => () => stopPlayback(), [stopPlayback]);

  // Section → global-line offset map
  const secOffsets = useMemo(() => {
    const offsets = [];
    let off = 0;
    lesson.sections.forEach(s => { offsets.push(off); off += s.lines.length; });
    return offsets;
  }, [lesson.sections]);

  const mel = MELODIES[song.melodyKey];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: FONT_BODY }}>
      {/* ── Header ── */}
      <header style={{
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        padding: "0 24px",
        display: "flex", alignItems: "center", gap: 16, height: 60,
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <button
          onClick={() => { stopPlayback(); onBack(); }}
          aria-label="Back to song list"
          style={{
            background: "transparent", border: `1px solid ${C.border}`,
            borderRadius: 6, padding: "6px 14px",
            color: C.muted, cursor: "pointer", fontSize: 13,
            display: "flex", alignItems: "center", gap: 6,
            transition: "border-color .2s, color .2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.sky; e.currentTarget.style.color = C.text; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}
        >
          ← Songs
        </button>

        <NazarEye size={28} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT_HEADING, fontSize: 17, fontWeight: 700, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {song.title}
          </div>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 1 }}>{lesson.objective}</div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          {playing && <WaveformBars color={song.accent} />}
          <LevelTag level={song.level} />
        </div>
      </header>

      <ProgressBar value={progress} color={song.accent} />

      {/* ── Tab bar ── */}
      <nav
        role="tablist"
        aria-label="Lesson sections"
        style={{
          background: C.surface,
          borderBottom: `1px solid ${C.border}`,
          display: "flex", padding: "0 24px",
        }}
      >
        {["lyrics", "quiz", "vocab"].map(t => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            style={{
              background: "none", border: "none",
              borderBottom: tab === t ? `2px solid ${song.accent}` : "2px solid transparent",
              color: tab === t ? song.accent : C.dim,
              padding: "12px 18px", cursor: "pointer",
              fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 2,
              textTransform: "uppercase", marginBottom: -1,
              fontWeight: tab === t ? 700 : 400,
              transition: "color .2s",
            }}
          >{t}</button>
        ))}
      </nav>

      {/* ── Content ── */}
      <main style={{ maxWidth: 1040, margin: "0 auto", padding: "24px 20px" }}>

        {/* LYRICS TAB */}
        {tab === "lyrics" && (
          <>
            {/* Audio controls */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
              <button
                onClick={playing ? stopPlayback : startPlayback}
                aria-label={playing ? "Stop melody" : "Play melody"}
                style={{
                  background: playing ? song.accent : "transparent",
                  border: `1.5px solid ${song.accent}`,
                  borderRadius: 8, padding: "10px 24px",
                  color: playing ? C.bg : song.accent,
                  cursor: "pointer", fontSize: 14, fontWeight: 700,
                  display: "flex", alignItems: "center", gap: 8,
                  boxShadow: playing ? `0 0 20px ${song.accent}50` : "none",
                  transition: "all .25s", letterSpacing: 0.3,
                  fontFamily: FONT_BODY,
                }}
              >
                <span aria-hidden="true">{playing ? "⏹" : "▶"}</span>
                {playing ? `${mel.bpm} BPM — Playing` : "Play Melody"}
              </button>

              <button
                onClick={() => setShowPh(p => !p)}
                aria-pressed={showPh}
                title="Toggle phonetic guide"
                style={{
                  background: showPh ? "rgba(78,201,224,.09)" : "transparent",
                  border: `1px solid ${showPh ? `${C.sky}50` : C.border}`,
                  borderRadius: 8, padding: "9px 14px",
                  cursor: "pointer", fontSize: 12,
                  color: showPh ? C.sky : C.muted,
                  transition: "all .2s", fontFamily: FONT_BODY,
                }}
              >🔤 Phonetic</button>

              <button
                onClick={() => setShowEn(e => !e)}
                aria-pressed={showEn}
                title="Toggle English translation"
                style={{
                  background: showEn ? "rgba(212,168,71,.09)" : "transparent",
                  border: `1px solid ${showEn ? `${C.gold}50` : C.border}`,
                  borderRadius: 8, padding: "9px 14px",
                  cursor: "pointer", fontSize: 12,
                  color: showEn ? C.gold : C.muted,
                  transition: "all .2s", fontFamily: FONT_BODY,
                }}
              >🇬🇧 English</button>

              <span style={{ marginLeft: "auto", fontFamily: FONT_MONO, fontSize: 10, color: C.dim }}>
                {mel.sig} · {mel.bpm} BPM
              </span>
            </div>

            {/* Pitch / tempo */}
            <div style={{
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 8, padding: "14px 20px",
              marginBottom: 16, display: "flex", gap: 28,
              flexWrap: "wrap", alignItems: "center",
            }}>
              {[
                { label: `PITCH ×${pitchShift.toFixed(2)}`, val: pitchShift, set: setPitchShift, min: 0.7, max: 1.5 },
                { label: `TEMPO ×${tempo.toFixed(2)}`,      val: tempo,      set: setTempo,      min: 0.6, max: 1.6 },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: C.dim, letterSpacing: 1.5, marginBottom: 6 }}>
                    {s.label}
                  </div>
                  <input
                    type="range" min={s.min} max={s.max} step=".01"
                    value={s.val}
                    onChange={e => s.set(parseFloat(e.target.value))}
                    style={{ width: 120, accentColor: song.accent }}
                    aria-label={s.label}
                  />
                </div>
              ))}
              <span style={{ fontSize: 12, color: C.dim, lineHeight: 1.5, maxWidth: 200 }}>
                Adjust, then press Play to apply changes
              </span>
            </div>

            {/* Audio error */}
            {audioError && (
              <div role="alert" style={{
                background: "rgba(212,120,120,0.12)", border: `1px solid ${C.red}40`,
                borderRadius: 8, padding: "12px 16px", marginBottom: 14,
                fontSize: 13, color: "#a04040",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span>⚠ {audioError}</span>
                <button
                  onClick={() => setAudioError(null)}
                  aria-label="Dismiss error"
                  style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16 }}
                >×</button>
              </div>
            )}

            {/* Concept legend */}
            <div style={{ display: "flex", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
              {([["Vocabulary", C.vocab], ["Grammar", C.grammar], ["Phonology", C.phonol]] ).map(([l, s]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.cl, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: C.muted }}>{l}</span>
                </div>
              ))}
            </div>

            {/* Column headers */}
            <div style={{
              display: "grid", gridTemplateColumns: "2fr 2fr 2fr 150px",
              padding: "8px 20px",
              background: C.surface, borderRadius: "10px 10px 0 0",
              borderBottom: `1px solid ${C.border}`,
            }}>
              {["TURKISH", "PHONETIC", "ENGLISH", "CONCEPT"].map(h => (
                <span key={h} style={{
                  padding: "0 12px", fontFamily: FONT_MONO, fontSize: 9,
                  letterSpacing: 2, color: C.dim,
                }}>{h}</span>
              ))}
            </div>

            {/* Sections */}
            {lesson.sections.map((sec, si) => (
              <div key={sec.id}>
                {/* Section label */}
                <div style={{
                  background: sec.type === "chorus" ? `${sec.accent}12` : C.card,
                  borderLeft: `3px solid ${sec.accent}`,
                  padding: "10px 20px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  borderBottom: `1px solid ${C.border}`,
                }}>
                  <span style={{
                    fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 2,
                    color: sec.accent, textTransform: "uppercase", fontWeight: 700,
                  }}>{sec.label}</span>
                  {sec.type === "chorus" && (
                    <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: C.dim }}>
                      Repeats in melody — memorize this phrase
                    </span>
                  )}
                </div>

                {/* Lyric rows */}
                {sec.lines.map((line, li) => (
                  <LyricRow
                    key={`${sec.id}-${li}`}
                    line={line}
                    active={playing && activeLine === (secOffsets[si] + li)}
                    showPh={showPh}
                    showEn={showEn}
                    idx={secOffsets[si] + li}
                  />
                ))}
              </div>
            ))}

            {/* Tip */}
            <div style={{
              marginTop: 16,
              background: "rgba(78,201,224,.04)",
              border: `1px solid ${C.border}`,
              borderRadius: 8, padding: "13px 18px",
              fontSize: 13, color: C.muted, lineHeight: 1.7,
            }}>
              <strong style={{ color: C.sky }}>Tip:</strong> Each lyric line highlights in sync with the melody.
              After two passes, toggle Phonetic off and try reading from Turkish text alone. Use the Quiz tab to test retention.
            </div>
          </>
        )}

        {/* QUIZ TAB */}
        {tab === "quiz" && (
          <div style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 12, maxWidth: 660,
          }}>
            <Quiz quiz={lesson.quiz} accent={song.accent} onDone={() => setTab("lyrics")} />
          </div>
        )}

        {/* VOCAB TAB */}
        {tab === "vocab" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontFamily: FONT_HEADING, fontSize: 24, fontWeight: 700, color: C.text, marginBottom: 6 }}>
                {song.topic}
              </h2>
              <p style={{ fontSize: 14, color: C.muted }}>
                8 words from this lesson. Review again tomorrow for spaced-repetition reinforcement.
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
              {lesson.vocabulary.map((v, i) => (
                <div
                  key={v.word}
                  style={{
                    background: C.card, border: `1px solid ${C.border}`,
                    borderTop: `2px solid ${song.accent}`,
                    borderRadius: 10, padding: "16px 18px",
                    animation: "fadeUp .4s ease both",
                    animationDelay: `${i * 0.05}s`,
                  }}
                >
                  <div style={{ fontFamily: FONT_HEADING, fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 4 }}>
                    {v.word}
                  </div>
                  <div style={{ fontSize: 13, color: C.muted }}>{v.meaning}</div>
                  <div style={{ marginTop: 10, fontFamily: FONT_MONO, fontSize: 9, color: C.dim, letterSpacing: 1 }}>
                    #{String(i + 1).padStart(2, "0")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SONG CARD
// ─────────────────────────────────────────────────────────────
function SongCard({ song, onSelect, ready, loading }) {
  const mel = MELODIES[song.melodyKey];
  return (
    <button
      onClick={() => onSelect(song)}
      disabled={loading}
      aria-label={`Open ${song.title} — ${song.topic}`}
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderTop: `2px solid ${song.accent}`,
        borderRadius: 12, padding: 20,
        textAlign: "left", cursor: loading ? "wait" : "pointer",
        width: "100%", transition: "all .2s",
        position: "relative", overflow: "hidden",
        fontFamily: FONT_BODY,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = C.cardHov;
        e.currentTarget.style.borderColor = song.accent + "60";
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = `0 10px 32px rgba(0,0,0,.45), 0 0 0 1px ${song.accent}20`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = C.card;
        e.currentTarget.style.borderColor = C.border;
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "";
      }}
    >
      {/* Ready dot */}
      {ready && !loading && (
        <div aria-label="Lesson ready" style={{
          position: "absolute", top: 14, right: 14,
          width: 8, height: 8, borderRadius: "50%",
          background: C.beg, boxShadow: `0 0 6px ${C.beg}90`,
        }} />
      )}

      {/* Loading spinner */}
      {loading && (
        <div style={{ position: "absolute", top: 12, right: 12 }}>
          <Spinner color={song.accent} size={18} />
        </div>
      )}

      {/* Content */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 26 }}>{song.topicIcon}</span>
        <div>
          <div style={{ fontFamily: FONT_HEADING, fontSize: 17, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>
            {song.topic}
          </div>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 3 }}>
            {song.title} · {song.inspiredBy}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <LevelTag level={song.level} />
        <Tag bg="transparent" bd={C.border} cl={C.dim} size={9}>{song.cefr}</Tag>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// HOME SCREEN
// ─────────────────────────────────────────────────────────────
function HomeScreen({ onSelectSong, lessons, loadingId, error, onDismissError }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const visible = useMemo(() => SONGS.filter(s => {
    if (filter !== "all" && s.level !== filter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return s.title.toLowerCase().includes(q)
        || s.topic.toLowerCase().includes(q)
        || s.genre.toLowerCase().includes(q)
        || s.inspiredBy.toLowerCase().includes(q);
  }), [filter, search]);

  const levels = ["all", "beginner", "intermediate", "advanced"];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: FONT_BODY }}>

      {/* ── Hero ── */}
      <header style={{ position: "relative", padding: "72px 28px 60px", overflow: "hidden" }}>

        {/* Nazar eye background decoration */}
        <div aria-hidden="true" style={{
          position: "absolute", top: -100, right: -80,
          width: 500, height: 500, borderRadius: "50%",
          background: `radial-gradient(circle, ${C.cobalt}30 0%, transparent 65%)`,
          animation: "nazarPulse 6s ease-in-out infinite",
          pointerEvents: "none",
        }} />
        <div aria-hidden="true" style={{
          position: "absolute", bottom: -60, left: -60,
          width: 300, height: 300, borderRadius: "50%",
          background: `radial-gradient(circle, ${C.sky}25 0%, transparent 70%)`,
          animation: "nazarPulse 8s ease-in-out infinite reverse",
          pointerEvents: "none",
        }} />

        <div style={{ maxWidth: 920, margin: "0 auto", position: "relative" }}>

          {/* Wordmark */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            marginBottom: 28,
          }}>
            <NazarEye size={40} />
            <div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: C.sky, letterSpacing: 3, textTransform: "uppercase", marginBottom: 2 }}>
                Music-Based Turkish Learning
              </div>
              <h1 style={{
                fontFamily: FONT_HEADING,
                fontSize: "clamp(42px, 8vw, 80px)",
                fontWeight: 900, lineHeight: 1.0,
                margin: 0, letterSpacing: -1,
              }}>
                Türk<span style={{ color: C.red }}>ify</span>
              </h1>
            </div>
          </div>

          <p style={{
            fontSize: 17, color: C.muted,
            maxWidth: 520, lineHeight: 1.85, marginBottom: 32,
          }}>
            Learn Turkish through songs you already love. Pick a melody, follow
            the AI-generated lyrics in karaoke sync, and let the tune become your memory.
          </p>


        </div>
      </header>

      {/* ── Filter bar ── */}
      <div style={{
        borderTop: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
        background: C.surface,
        padding: "12px 28px",
        position: "sticky", top: 0, zIndex: 40,
      }}>
        <div style={{
          maxWidth: 920, margin: "0 auto",
          display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap",
        }}>
          {/* Search */}
          <label htmlFor="song-search" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>
            Search songs
          </label>
          <input
            id="song-search"
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search melodies, topics…"
            style={{
              background: "rgba(78,201,224,.05)",
              border: `1px solid ${C.border}`,
              borderRadius: 7, padding: "7px 14px",
              color: C.text, fontSize: 12, fontFamily: FONT_MONO,
              outline: "none", width: 200,
            }}
          />

          {/* Level filters */}
          <div role="group" aria-label="Filter by difficulty" style={{ display: "flex", gap: 5 }}>
            {levels.map(l => (
              <button
                key={l}
                onClick={() => setFilter(l)}
                aria-pressed={filter === l}
                style={{
                  background: filter === l ? "rgba(78,201,224,.12)" : "transparent",
                  border: `1px solid ${filter === l ? C.sky + "60" : C.border}`,
                  borderRadius: 7, padding: "6px 14px",
                  cursor: "pointer", fontSize: 11,
                  color: filter === l ? C.sky : C.muted,
                  fontWeight: filter === l ? 700 : 400,
                  textTransform: "capitalize",
                  fontFamily: FONT_MONO, letterSpacing: 0.4,
                  transition: "all .15s",
                }}
              >{l}</button>
            ))}
          </div>

          <span style={{ marginLeft: "auto", fontFamily: FONT_MONO, fontSize: 10, color: C.dim }}>
            {visible.length} {visible.length === 1 ? "song" : "songs"}
          </span>
        </div>
      </div>

      {/* ── Content ── */}
      <main style={{ maxWidth: 920, margin: "0 auto", padding: "32px 20px" }}>

        {/* Error banner */}
        {error && (
          <div
            role="alert"
            style={{
              background: "rgba(212,120,120,0.10)",
              border: `1px solid ${C.red}40`,
              borderRadius: 8, padding: "13px 18px", marginBottom: 20,
              fontSize: 13, color: "#a04040",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}
          >
            <span>⚠ {error}</span>
            <button
              onClick={onDismissError}
              aria-label="Dismiss error"
              style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, lineHeight: 1 }}
            >×</button>
          </div>
        )}

        {/* Loading overlay */}
        {loadingId && (
          <div
            aria-live="polite"
            aria-label="Generating lesson"
            style={{
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 12, padding: "32px",
              textAlign: "center", marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <Spinner color={C.sky} size={28} />
            </div>
            <div style={{ fontFamily: FONT_HEADING, fontSize: 18, color: C.text, marginBottom: 6 }}>
              Writing Turkish lyrics…
            </div>
            <div style={{ fontSize: 13, color: C.muted }}>
              Claude is composing original educational lyrics fitted to the melody's syllable structure.
            </div>
          </div>
        )}

        {/* Song grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {visible.map((song, i) => (
            <div
              key={song.id}
              style={{ animation: "fadeUp .4s ease both", animationDelay: `${i * 0.06}s` }}
            >
              <SongCard
                song={song}
                onSelect={onSelectSong}
                ready={!!(lessons[song.id] || song.prebuilt)}
                loading={loadingId === song.id}
              />
            </div>
          ))}
        </div>

        {/* Empty state */}
        {visible.length === 0 && (
          <div style={{ textAlign: "center", padding: "64px 20px", color: C.muted }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>🔍</div>
            <div style={{ fontFamily: FONT_HEADING, fontSize: 20, color: C.text, marginBottom: 8 }}>No songs found</div>
            <div style={{ fontSize: 14 }}>Try a different search or clear the filter.</div>
            <button
              onClick={() => { setSearch(""); setFilter("all"); }}
              style={{
                marginTop: 18, background: "transparent",
                border: `1px solid ${C.border}`, borderRadius: 8,
                padding: "9px 20px", color: C.sky, cursor: "pointer",
                fontSize: 13, fontFamily: FONT_BODY,
              }}
            >Clear filters</button>
          </div>
        )}

        {/* How it works */}
        <section aria-labelledby="how-it-works" style={{ marginTop: 56, paddingTop: 40, borderTop: `1px solid ${C.border}` }}>
          <h2 id="how-it-works" style={{ fontFamily: FONT_HEADING, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 24 }}>
            How Türkify Works
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
            {[
              { icon:"🎵", title:"Pick a Melody",     body:"Choose from folk, pop, hip-hop, and country melodies — all synthesized live in your browser." },
              { icon:"🤖", title:"AI Writes Lyrics",  body:"Claude composes original Turkish educational lyrics fitted to each melody's syllable structure and rhythm." },
              { icon:"🎤", title:"Karaoke Sync",      body:"Hit Play and each lyric line highlights exactly on the beat. Sing along as you learn." },
              { icon:"🧠", title:"Quiz & Reinforce",  body:"End-of-lesson quiz tests what stuck. The chorus repeats in the melody — it's your SRS anchor." },
            ].map(c => (
              <div key={c.title} style={{
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 10, padding: "20px",
              }}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>{c.icon}</div>
                <div style={{ fontFamily: FONT_HEADING, fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>
                  {c.title}
                </div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.65 }}>{c.body}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer style={{ marginTop: 60, paddingTop: 24, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <NazarEye size={20} />
            <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.dim }}>Türkify</span>
          </div>
          <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.dim }}>
            All melodies are original synthesized compositions · AI lyrics generated by Claude
          </span>
        </footer>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ROOT APPLICATION
// ─────────────────────────────────────────────────────────────
export default function App() {
  const [activeSong,  setActiveSong]  = useState(null);
  const [activeLesson,setActiveLesson]= useState(null);
  const [lessons,     setLessons]     = useState({});
  const [loadingId,   setLoadingId]   = useState(null);
  const [error,       setError]       = useState(null);

  // Update document title based on view
  useEffect(() => {
    document.title = activeSong
      ? `${activeSong.title} — Türkify`
      : "Türkify — Learn Turkish Through Music";
  }, [activeSong]);

  const handleSelectSong = useCallback(async (song) => {
    if (loadingId) return;
    setError(null);

    // Use cached or prebuilt lesson
    const cached = song.prebuilt ? PREBUILT_LESSON : lessons[song.id];
    if (cached) {
      setActiveSong(song);
      setActiveLesson(cached);
      return;
    }

    // Generate via AI
    setLoadingId(song.id);
    try {
      const lesson = await generateLesson(song);
      setLessons(prev => ({ ...prev, [song.id]: lesson }));
      setActiveSong(song);
      setActiveLesson(lesson);
    } catch (err) {
      setError(err.message || "Failed to generate lesson. Please try again.");
    } finally {
      setLoadingId(null);
    }
  }, [loadingId, lessons]);

  const handleBack = useCallback(() => {
    setActiveSong(null);
    setActiveLesson(null);
  }, []);

  return (
    <>
      <GlobalStyles />
      {activeSong && activeLesson ? (
        <LessonView
          song={activeSong}
          lesson={activeLesson}
          onBack={handleBack}
        />
      ) : (
        <HomeScreen
          onSelectSong={handleSelectSong}
          lessons={lessons}
          loadingId={loadingId}
          error={error}
          onDismissError={() => setError(null)}
        />
      )}
    </>
  );
}
