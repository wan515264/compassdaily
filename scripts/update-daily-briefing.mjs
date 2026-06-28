import fs from "node:fs/promises";

const RESET_BRIEFING = process.env.RESET_BRIEFING === "1";
const BRIEFING_DIR = new URL("../data/briefings/", import.meta.url);
const INDEX_FILE = new URL("../data/briefings/index.json", import.meta.url);
const BRIEFING_TITLE = "The Daily Compass｜每日罗盘";
const BRIEFING_SUBTITLE = "A bilingual daily briefing for navigating global news, culture, AI, and social change.";

const SOURCE_FEEDS = [
  { name: "NPR", siteUrl: "https://www.npr.org/", feedUrl: "https://feeds.npr.org/1001/rss.xml" },
  { name: "Aeon", siteUrl: "https://aeon.co/", feedUrl: "https://aeon.co/feed.rss" },
  { name: "The Conversation AU", siteUrl: "https://theconversation.com/au", feedUrl: "https://theconversation.com/au/home-page/articles.atom" },
  { name: "The Pudding", siteUrl: "https://pudding.cool/", feedUrl: "https://pudding.cool/rss.xml" },
  { name: "ABC News", siteUrl: "https://abcnews.com/", feedUrl: "https://feeds.abcnews.com/abcnews/topstories" },
];

const STOP_WORDS = new Set(["the", "and", "that", "with", "from", "this", "have", "are", "for", "you", "not", "but", "they", "about", "into", "when", "their", "will", "more", "what", "your"]);

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function decodeEntities(text = "") {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function readTag(item, tag) {
  const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return decodeEntities(match?.[1] || "");
}

function readAtomLink(item) {
  const match = item.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);
  return decodeEntities(match?.[1] || "");
}

function extractItems(feedSource) {
  const rssItems = [...feedSource.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => match[0]);
  if (rssItems.length) return rssItems;
  return [...feedSource.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map((match) => match[0]);
}

function extractFeedItems(feedSource, source) {
  return extractItems(feedSource)
    .map((item) => ({
      source: source.name,
      sourceUrl: readTag(item, "link") || readAtomLink(item) || source.siteUrl,
      title: readTag(item, "title"),
      summary: readTag(item, "description") || readTag(item, "summary") || readTag(item, "content"),
    }))
    .filter((item) => item.title && item.summary)
    .slice(0, 4);
}

async function fetchFeed(source) {
  try {
    const response = await fetch(source.feedUrl, { headers: { "User-Agent": "The-Daily-Compass/1.0" } });
    if (!response.ok) return [];
    return extractFeedItems(await response.text(), source);
  } catch {
    return [];
  }
}

function extractVocabulary(items) {
  const counts = new Map();
  for (const item of items) {
    const words = `${item.title} ${item.summary}`.toLowerCase().match(/\b[a-z]{6,}\b/g) || [];
    for (const word of words) {
      if (!STOP_WORDS.has(word)) counts.set(word, (counts.get(word) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word]) => ({
      word,
      meaningChinese: "请点击单词查看释义",
      example: items.find((item) => `${item.title} ${item.summary}`.toLowerCase().includes(word))?.summary || "",
    }));
}

function createBriefing(items) {
  const date = todayKey();
  const selected = items.slice(0, 5);
  const sectionHeadings = [
    { id: "global-news", heading: "全球新闻 / Global News" },
    { id: "finance-markets", heading: "金融与市场 / Finance & Markets" },
    { id: "gender-culture", heading: "性别与文化 / Gender & Culture" },
    { id: "books-literature-art-fashion-media", heading: "★ 4. Books / Literature / Art / Fashion / Media｜书籍文学艺术时尚媒体" },
    { id: "ai-tech", heading: "AI 与科技 / AI & Tech" },
  ];
  const firstSentence = selected[0]?.summary?.match(/[^.!?]+[.!?]+|[^.!?]+$/)?.[0] || "Today's briefing connects global headlines with useful English reading practice.";
  return {
    date,
    title: BRIEFING_TITLE,
    subtitle: BRIEFING_SUBTITLE,
    theme: "Global headlines, culture, and public life",
    introChinese: "今天的小报从多个英文资源中抽取热点摘要，帮助你用英文快速进入全球议题，并积累可复用的表达。",
    sections: selected.slice(0, 5).map((item, index) => ({
      id: sectionHeadings[index]?.id || "global-news",
      heading: sectionHeadings[index]?.heading || item.title,
      summaryChinese: `来源：${item.source}`,
      body: item.summary,
    })),
    vocabulary: extractVocabulary(selected),
    sentenceAnalysis: {
      sentence: firstSentence,
      translationChinese: "这是一句来自今日摘要的重点句，可用于练习信息压缩和长句理解。",
      notesChinese: "先找主语和谓语，再观察介词短语、从句或并列结构如何补充背景信息。",
    },
    writingPrompt: {
      prompt: "Summarize one story from today's briefing and explain why it matters.",
      hintChinese: "建议写 80-120 个英文词，尽量使用今天保存的 2-3 个新词。",
    },
    sources: selected.map((item) => ({ name: item.source, url: item.sourceUrl })),
  };
}

async function readIndex() {
  try {
    return JSON.parse(await fs.readFile(INDEX_FILE, "utf8"));
  } catch {
    return [];
  }
}

await fs.mkdir(BRIEFING_DIR, { recursive: true });
const date = todayKey();
const outputFile = new URL(`../data/briefings/${date}.json`, import.meta.url);

if (!RESET_BRIEFING) {
  try {
    await fs.access(outputFile);
    console.log(`Briefing already exists for ${date}. Use RESET_BRIEFING=1 to overwrite.`);
    process.exit(0);
  } catch {}
}

const items = [];
for (const source of SOURCE_FEEDS) items.push(...(await fetchFeed(source)));
if (!items.length) throw new Error("No source items available to create briefing.");

const briefing = createBriefing(items);
await fs.writeFile(outputFile, `${JSON.stringify(briefing, null, 2)}\n`);

const index = await readIndex();
const nextIndex = [
  { date: briefing.date, title: briefing.title, theme: briefing.theme, file: `${briefing.date}.json`, tags: ["global", "culture", "AI", "social change"] },
  ...index.filter((item) => item.date !== briefing.date),
].sort((a, b) => new Date(b.date) - new Date(a.date));
await fs.writeFile(INDEX_FILE, `${JSON.stringify(nextIndex, null, 2)}\n`);

console.log(`Created briefing ${briefing.date}`);
