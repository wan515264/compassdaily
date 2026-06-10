import fs from "node:fs/promises";

const SITE_TITLE = "The Daily Compass｜每日罗盘";
const SITE_SUBTITLE = "A bilingual daily briefing for navigating global news, culture, AI, and social change.";
const TIME_ZONE = "Asia/Shanghai";
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const FORCE = process.env.FORCE === "1";

const BRIEFING_DIR = new URL("../data/briefings/", import.meta.url);
const INDEX_FILE = new URL("../data/briefings/index.json", import.meta.url);

const SOURCE_FEEDS = [
  { name: "NPR", siteUrl: "https://www.npr.org/", feedUrl: "https://feeds.npr.org/1001/rss.xml", category: "global-news" },
  { name: "ABC News", siteUrl: "https://abcnews.com/", feedUrl: "https://feeds.abcnews.com/abcnews/topstories", category: "global-news" },
  { name: "The Conversation AU", siteUrl: "https://theconversation.com/au", feedUrl: "https://theconversation.com/au/home-page/articles.atom", category: "gender-culture" },
  { name: "Aeon", siteUrl: "https://aeon.co/", feedUrl: "https://aeon.co/feed.rss", category: "gender-culture" },
  { name: "The Pudding", siteUrl: "https://pudding.cool/", feedUrl: "https://pudding.cool/rss.xml", category: "art-media" },
];

const SECTION_SKELETON = [
  { id: "global-news", heading: "Global News｜全球新闻" },
  { id: "gender-culture", heading: "Gender & Culture｜性别与文化" },
  { id: "art-media", heading: "Art, Fashion & Media｜艺术、时尚与媒介" },
  { id: "ai-tech", heading: "AI & Tech｜AI 与科技" },
];

function todayInShanghai() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

function stripTags(text = "") {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

function decodeEntities(text = "") {
  return stripTags(text)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

function readTag(item, tag) {
  const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return decodeEntities(match?.[1] || "");
}

function readAtomLink(item) {
  const link = item.match(/<link[^>]+rel=["']alternate["'][^>]+href=["']([^"']+)["'][^>]*>/i) || item.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);
  return decodeEntities(link?.[1] || "");
}

function extractFeedEntries(xml) {
  const rssItems = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => match[0]);
  if (rssItems.length) return rssItems;
  return [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map((match) => match[0]);
}

function extractFeedItems(xml, source) {
  return extractFeedEntries(xml)
    .map((entry) => ({
      source: source.name,
      category: source.category,
      url: readTag(entry, "link") || readAtomLink(entry) || source.siteUrl,
      title: readTag(entry, "title"),
      summary: readTag(entry, "description") || readTag(entry, "summary") || readTag(entry, "content"),
      published: readTag(entry, "pubDate") || readTag(entry, "published") || readTag(entry, "updated"),
    }))
    .filter((item) => item.title)
    .slice(0, 5);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFeed(source) {
  try {
    const response = await fetchWithTimeout(source.feedUrl, {
      headers: {
        "User-Agent": "The-Daily-Compass/1.0 (+https://github.com/)",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
      },
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return extractFeedItems(await response.text(), source);
  } catch (error) {
    console.warn(`Could not fetch ${source.name}: ${error.message}`);
    return [];
  }
}

async function collectSourceMaterial() {
  const settled = await Promise.all(SOURCE_FEEDS.map(fetchFeed));
  const items = settled.flat();
  const selected = [];
  for (const category of ["global-news", "gender-culture", "art-media"]) {
    selected.push(...items.filter((item) => item.category === category).slice(0, 3));
  }
  const aiCandidates = items.filter((item) => /\bAI\b|artificial intelligence|technology|tech|platform|data|algorithm|digital/i.test(`${item.title} ${item.summary}`));
  selected.push(...aiCandidates.slice(0, 3));

  const unique = [];
  const seen = new Set();
  for (const item of selected.length ? selected : items.slice(0, 10)) {
    const key = `${item.source}:${item.title}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }
  return unique.slice(0, 12);
}

function fallbackSourceNotes() {
  return SOURCE_FEEDS.map((source) => ({
    source: source.name,
    category: source.category,
    url: source.siteUrl,
    title: `${source.name} source list`,
    summary: "RSS material was unavailable during this run. Use this source only as a broad editorial direction, not as evidence for precise factual claims.",
  }));
}

function sourceMaterialForPrompt(items) {
  return items
    .map(
      (item, index) => `
[${index + 1}] ${item.source} (${item.category})
Title: ${item.title}
Summary: ${item.summary || "No summary available."}
URL: ${item.url}
Published: ${item.published || "unknown"}
`,
    )
    .join("\n");
}

function buildPrompt({ date, items }) {
  const material = items.length ? items : fallbackSourceNotes();
  const sourceLimitation = items.length < 4 ? "Source material is limited today. Make the briefing more thematic and explicitly avoid precise unsourced factual claims." : "Use the source material below as the factual basis.";
  return `
Generate today's bilingual mini-newspaper for The Daily Compass.

Date: ${date}
Brand title: ${SITE_TITLE}
Subtitle: ${SITE_SUBTITLE}

Editorial requirements:
- Generate a warm, thoughtful bilingual mini-newspaper.
- Focus on global news, gender/culture, art/media, and AI/tech.
- Include English learning value: useful expressions, examples, keywords, and one sentence analysis.
- Tone: calm, intelligent, gentle, globally aware.
- Do not fabricate precise facts without source material.
- ${sourceLimitation}
- Do not mention internal implementation details.
- Return strict JSON only. No markdown fences. No comments.

Required JSON shape:
{
  "date": "YYYY-MM-DD",
  "title": "The Daily Compass｜每日罗盘",
  "subtitle": "A bilingual daily briefing for navigating global news, culture, AI, and social change.",
  "theme": "",
  "introChinese": "",
  "sections": [
    {
      "id": "global-news",
      "heading": "Global News｜全球新闻",
      "items": [
        {
          "title": "",
          "summaryChinese": "",
          "englishExpressions": [
            { "expression": "", "meaningChinese": "", "example": "" }
          ]
        }
      ]
    },
    { "id": "gender-culture", "heading": "Gender & Culture｜性别与文化", "items": [] },
    { "id": "art-media", "heading": "Art, Fashion & Media｜艺术、时尚与媒介", "items": [] },
    { "id": "ai-tech", "heading": "AI & Tech｜AI 与科技", "items": [] }
  ],
  "englishParagraph": { "english": "", "chinese": "" },
  "keywords": [
    { "word": "", "meaning": "", "example": "" }
  ],
  "sentenceLab": { "sentence": "", "analysisChinese": "" },
  "reflection": { "english": "", "chinese": "" },
  "tags": [],
  "sources": []
}

Content constraints:
- introChinese: 2-4 warm Chinese sentences.
- Each of the 4 sections should contain 1-2 items.
- Each item should have 2-4 useful English expressions.
- englishParagraph.english: 80-130 words, natural English.
- englishParagraph.chinese: faithful Chinese translation.
- keywords: 6 items, with Chinese meaning in "meaning".
- sentenceLab.sentence must be taken from englishParagraph.english or a section expression example.
- reflection should include one short English reflective sentence and one Chinese translation/reflection.
- sources should list source names and URLs used. If material was limited, include a source note.

Source material:
${sourceMaterialForPrompt(material)}
`;
}

async function callOpenAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is required. Add it as a GitHub Actions secret or export it locally.");

  const response = await fetchWithTimeout(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.65,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You are an editorial assistant that writes strict JSON bilingual learning briefings. Return only valid JSON.",
          },
          { role: "user", content: prompt },
        ],
      }),
    },
    60000,
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI API returned no message content.");
  return JSON.parse(content);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeBriefing(candidate, date, sourceItems) {
  const briefing = {
    date,
    title: SITE_TITLE,
    subtitle: SITE_SUBTITLE,
    theme: String(candidate.theme || "").trim(),
    introChinese: String(candidate.introChinese || "").trim(),
    sections: SECTION_SKELETON.map((section) => {
      const generated = asArray(candidate.sections).find((item) => item.id === section.id || item.heading === section.heading) || {};
      return {
        id: section.id,
        heading: section.heading,
        items: asArray(generated.items).slice(0, 3).map((item) => ({
          title: String(item.title || "").trim(),
          summaryChinese: String(item.summaryChinese || item.summary || "").trim(),
          englishExpressions: asArray(item.englishExpressions).slice(0, 5).map((expression) => ({
            expression: String(expression.expression || expression.word || "").trim(),
            meaningChinese: String(expression.meaningChinese || expression.meaning || "").trim(),
            example: String(expression.example || "").trim(),
          })),
        })),
      };
    }),
    englishParagraph: {
      english: String(candidate.englishParagraph?.english || "").trim(),
      chinese: String(candidate.englishParagraph?.chinese || "").trim(),
    },
    keywords: asArray(candidate.keywords).slice(0, 10).map((keyword) => ({
      word: String(keyword.word || "").trim(),
      meaning: String(keyword.meaning || keyword.meaningChinese || "").trim(),
      example: String(keyword.example || "").trim(),
    })),
    sentenceLab: {
      sentence: String(candidate.sentenceLab?.sentence || candidate.sentenceAnalysis?.sentence || "").trim(),
      analysisChinese: String(candidate.sentenceLab?.analysisChinese || candidate.sentenceAnalysis?.notesChinese || "").trim(),
    },
    reflection: {
      english: String(candidate.reflection?.english || "").trim(),
      chinese: String(candidate.reflection?.chinese || candidate.closing || "").trim(),
    },
    tags: asArray(candidate.tags).map((tag) => String(tag).trim()).filter(Boolean).slice(0, 10),
    sources: asArray(candidate.sources).length
      ? asArray(candidate.sources).map((source) => ({
          name: String(source.name || source.source || "").trim(),
          url: String(source.url || source.sourceUrl || "").trim(),
          note: source.note ? String(source.note).trim() : undefined,
        }))
      : sourceItems.map((item) => ({ name: item.source, url: item.url })),
  };

  validateBriefing(briefing);
  return briefing;
}

function validateBriefing(briefing) {
  const problems = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(briefing.date)) problems.push("date must be YYYY-MM-DD");
  if (briefing.title !== SITE_TITLE) problems.push("title must match site brand");
  if (!briefing.theme) problems.push("theme is required");
  if (!briefing.introChinese) problems.push("introChinese is required");
  if (briefing.sections.length !== 4) problems.push("exactly four sections are required");
  for (const section of briefing.sections) {
    if (!section.id || !section.heading) problems.push(`section missing id or heading: ${JSON.stringify(section)}`);
    if (!section.items.length) problems.push(`section ${section.id} needs at least one item`);
  }
  if (!briefing.englishParagraph.english || !briefing.englishParagraph.chinese) problems.push("englishParagraph requires english and chinese");
  if (!briefing.keywords.length) problems.push("keywords are required");
  if (!briefing.sentenceLab.sentence || !briefing.sentenceLab.analysisChinese) problems.push("sentenceLab requires sentence and analysisChinese");
  if (!briefing.reflection.english || !briefing.reflection.chinese) problems.push("reflection requires english and chinese");
  if (!briefing.sources.length) problems.push("sources are required");
  if (problems.length) throw new Error(`Generated briefing failed validation:\n- ${problems.join("\n- ")}`);
}

async function readJsonFile(url, fallback) {
  try {
    return JSON.parse(await fs.readFile(url, "utf8"));
  } catch {
    return fallback;
  }
}

async function main() {
  const date = todayInShanghai();
  const outputFile = new URL(`../data/briefings/${date}.json`, import.meta.url);
  await fs.mkdir(BRIEFING_DIR, { recursive: true });

  if (!FORCE) {
    try {
      await fs.access(outputFile);
      console.log(`Briefing already exists for ${date}. Use FORCE=1 to overwrite.`);
      return;
    } catch {}
  }

  const sourceItems = await collectSourceMaterial();
  const prompt = buildPrompt({ date, items: sourceItems });
  const generated = await callOpenAI(prompt);
  const briefing = normalizeBriefing(generated, date, sourceItems.length ? sourceItems : fallbackSourceNotes());

  await fs.writeFile(outputFile, `${JSON.stringify(briefing, null, 2)}\n`);

  const index = await readJsonFile(INDEX_FILE, []);
  const nextEntry = {
    date: briefing.date,
    title: briefing.title,
    theme: briefing.theme,
    file: `${briefing.date}.json`,
    tags: briefing.tags,
  };
  const nextIndex = [nextEntry, ...index.filter((entry) => entry.date !== briefing.date)].sort((a, b) => new Date(b.date) - new Date(a.date));
  await fs.writeFile(INDEX_FILE, `${JSON.stringify(nextIndex, null, 2)}\n`);
  console.log(`Generated daily briefing for ${date} with ${briefing.sources.length} sources.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
