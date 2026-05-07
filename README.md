# 🧿 Türkify

Learn Turkish through music. Pick a melody, get AI-generated Turkish lyrics synced karaoke-style, and sing your way to fluency.

---

## How to put this on GitHub (copy-paste method)

**Step 1 — Create the repo**

Go to [github.com/new](https://github.com/new), give it a name like `turkify`, make it public, and click **Create repository**.

**Step 2 — Create the files**

In the repo, click **Add file → Create new file** and create these files one by one, pasting the contents from your downloads:

```
turkify/
├── index.html        ← paste contents of index.html
├── package.json      ← paste contents of package.json
├── vite.config.js    ← paste contents of vite.config.js
├── .gitignore        ← paste contents of .gitignore
├── README.md         ← this file
└── src/
    ├── main.jsx      ← paste contents of main.jsx
    └── App.jsx       ← paste contents of App.jsx
```

> To create a file inside a folder: type `src/App.jsx` in the filename box — GitHub will create the folder automatically.

**Step 3 — Deploy for free on Vercel**

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **Add New → Project**
3. Select your `turkify` repo
4. Leave all settings as default and click **Deploy**

Your app will be live at `https://turkify-xxx.vercel.app` in about 60 seconds.

---

## Add your Anthropic API key (to enable AI lyrics)

In Vercel: go to your project → **Settings → Environment Variables** → add:

```
VITE_ANTHROPIC_KEY = sk-ant-your-key-here
```

Then in `src/App.jsx`, find the `generateLesson` function and update the fetch headers:

```js
headers: {
  "Content-Type": "application/json",
  "x-api-key": import.meta.env.VITE_ANTHROPIC_KEY,
  "anthropic-version": "2023-06-01",
  "anthropic-dangerous-direct-browser-access": "true",
},
```

Redeploy and the other 5 songs will generate AI lyrics when clicked.

> **Without the API key:** The ⭐ Star Song lesson works fully out of the box — it has pre-built lyrics, melody, quiz, and vocab. Only the other 5 songs need the API to generate their lyrics.

---

## What's included

| Feature | Details |
|---|---|
| 🎵 Melody playback | Web Audio API — synthesized in the browser, no audio files |
| 🤖 AI lyrics | Claude generates original Turkish lyrics fitted to the melody |
| 🎤 Karaoke sync | Lines highlight beat-accurately as the melody plays |
| 📊 SRS quiz | Post-lesson quiz with 6 questions per song |
| 🎚️ Pitch & Tempo | Sliders to modify the melody in real time |
| A1 → B1 CEFR | 6 songs across beginner, intermediate, and advanced |

## Songs

| Song | Level | Topic |
|---|---|---|
| ⭐ Star Song | Beginner A1 | Greetings & Farewells |
| 🎂 Waltz of Numbers | Beginner A1 | Numbers 1–10 |
| 🔔 Bell Rhythm | Intermediate A2 | Present Tense Verbs |
| 🎤 City Beat | Intermediate B1 | Past Tense (-dı) |
| ☀️ Sunny Day | Intermediate A2 | Adjectives & Colors |
| 🌿 Modal Ballad | Advanced B1 | Noun Cases |
