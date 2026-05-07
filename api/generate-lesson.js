export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { songTitle, songTopic, songCefr, melodyBpm, meldSig, lineCount } = req.body;

  if (!songTitle || !songTopic || !songCefr) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const apiKey = process.env.turkifykey;
  if (!apiKey) {
    console.error("turkifykey not set");
    return res.status(500).json({ error: "Server configuration error" });
  }

  const sectionSpec =
    lineCount <= 8  ? "Verse 1 (4 lines), Chorus (4 lines)" :
    lineCount <= 12 ? "Verse 1 (4 lines), Chorus (4 lines), Verse 2 (4 lines)" :
                      "Verse 1 (6 lines), Chorus (4 lines), Verse 2 (6 lines)";

  const userPrompt = `Write ORIGINAL educational Turkish lyrics for the "${songTitle}" melody (${melodyBpm} BPM, ${meldSig}).
TOPIC: "${songTopic}" | CEFR: ${songCefr}
SECTIONS: ${sectionSpec} — exactly ${lineCount} lines total.

STRICT RULES:
1. Write ORIGINAL Turkish content that teaches "${songTopic}" — do NOT translate or reference the original song
2. Each line: 6–9 singable syllables that fit the melody's rhythm naturally
3. Each line teaches exactly ONE linguistic concept — tag it precisely
4. Chorus = the single most important phrase to memorize (SRS anchor)
5. Phonetic guide: write syllables with CAPS on the stressed syllable (e.g. "mehr-hah-BAH")
6. Cover at least 8 vocabulary items or grammar forms from the topic

Return ONLY valid JSON with no markdown fences:
{
  "objective": "one sentence learning goal",
  "sections": [
    {
      "id": "v1",
      "label": "Verse 1",
      "type": "verse",
      "accent": "#6aaed6",
      "lines": [
        { "tr": "Turkish lyric", "ph": "PHO-net-ic GUIDE", "en": "English meaning", "concept": "concept name", "ct": "vocab" }
      ]
    },
    { "id": "ch", "label": "Chorus — SRS Anchor", "type": "chorus", "accent": "#c8985a", "lines": [] },
    { "id": "v2", "label": "Verse 2", "type": "verse", "accent": "#6aaed6", "lines": [] }
  ],
  "vocabulary": [{ "word": "Turkish word", "meaning": "English meaning" }],
  "quiz": [{ "q": "Question?", "opts": ["a","b","c","d"], "ans": 0, "ref": "lyric line reference" }]
}

Constraints: ct must be "vocab" | "grammar" | "phonology". vocabulary: exactly 8 items. quiz: exactly 6 questions, ans is integer 0–3.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",  // ← the fix
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2800,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Anthropic API error:", response.status, errorData);
      return res.status(response.status).json({
        error: `Claude API error: ${errorData.error?.message || "Unknown error"}`,
      });
    }

    const data = await response.json();
    const rawText = data.content.map((b) => b.text || "").join("").trim();
    const cleanJson = rawText.replace(/^```json|^```|```$/gm, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleanJson);
    } catch (e) {
      console.error("JSON parse error:", e.message);
      return res.status(400).json({
        error: "Claude returned invalid JSON",
      });
    }

    if (!Array.isArray(parsed.sections) || parsed.sections.length < 2) {
      return res.status(400).json({ error: "Invalid lesson structure: missing sections" });
    }
    if (!Array.isArray(parsed.quiz) || parsed.quiz.length < 3) {
      return res.status(400).json({ error: "Invalid lesson structure: incomplete quiz" });
    }
    if (!Array.isArray(parsed.vocabulary)) {
      return res.status(400).json({ error: "Invalid lesson structure: missing vocabulary" });
    }

    return res.status(200).json(parsed);

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({
      error: "Server error: " + (err.message || "Unknown"),
    });
  }
}
