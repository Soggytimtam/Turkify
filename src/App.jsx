async function generateLesson(song) {
  const mel = MELODIES[song.melodyKey];
  const n = mel.lineBreaks.length;
  const sectionSpec =
    n <= 8 ? "Verse 1 (4 lines), Chorus (4 lines)" :
    n <= 12 ? "Verse 1 (4 lines), Chorus (4 lines), Verse 2 (4 lines)" :
              "Verse 1 (6 lines), Chorus (4 lines), Verse 2 (6 lines)";

  // YOUR GOOGLE GEMINI CONFIGURATION
  const API_KEY = "AIzaSyBqpEP3m09Ga-7gGAlmgEcQnDm-O4cC_8o";
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

  const promptText = `You are an expert Turkish linguist and music educator.
Write ORIGINAL educational Turkish lyrics for the "${song.title}" melody (${mel.bpm} BPM, ${mel.sig}).
TOPIC: "${song.topic}" | CEFR: ${song.cefr}
SECTIONS: ${sectionSpec} — exactly ${n} lines total.

STRICT RULES:
1. Write ORIGINAL Turkish content that teaches "${song.topic}".
2. Each line: 6–9 singable syllables that fit the melody's rhythm.
3. Each line teaches exactly ONE linguistic concept — tag it precisely.
4. Chorus = the single most important phrase to memorize (SRS anchor).
5. Phonetic guide: write syllables with CAPS on the stressed syllable (e.g. "mehr-hah-BAH").
6. Cover at least 8 vocabulary items or grammar forms.

Return ONLY valid JSON with no markdown:
{
  "objective": "one sentence learning goal",
  "sections": [
    {
      "id": "v1",
      "label": "Verse 1",
      "type": "verse",
      "accent": "#6aaed6",
      "lines": [
        { "tr": "Turkish lyric", "ph": "PHO-net-ic", "en": "English", "concept": "concept", "ct": "vocab" }
      ]
    },
    { "id": "ch", "label": "Chorus", "type": "chorus", "accent": "#c8985a", "lines": [] },
    { "id": "v2", "label": "Verse 2", "type": "verse", "accent": "#6aaed6", "lines": [] }
  ],
  "vocabulary": [{ "word": "word", "meaning": "meaning" }],
  "quiz": [{ "q": "Question?", "opts": ["a","b","c","d"], "ans": 0, "ref": "lyric" }]
}`;

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(`Google API Error: ${errData.error?.message || res.statusText}`);
  }

  const data = await res.json();
  
  try {
    // Gemini wraps the text inside candidates[0].content.parts[0].text
    const rawJson = data.candidates[0].content.parts[0].text;
    const parsed = JSON.parse(rawJson);

    // Validation to ensure it matches your app's UI needs
    if (!parsed.sections || !parsed.quiz) throw new Error("Incomplete lesson data");
    return parsed;
  } catch (e) {
    console.error("Parse Error:", e);
    throw new Error("AI returned invalid formatting. Try again!");
  }
}
