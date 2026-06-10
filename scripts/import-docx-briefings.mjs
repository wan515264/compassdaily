import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const DOCX_FILE = new URL("../imports/morning-mini-newspaper.docx", import.meta.url);
const BRIEFING_DIR = new URL("../data/briefings/", import.meta.url);
const INDEX_FILE = new URL("../data/briefings/index.json", import.meta.url);
const TITLE = "The Daily Compass｜每日罗盘";
const SUBTITLE = "A bilingual daily briefing for navigating global news, culture, AI, and social change.";

const STANDARD_SECTIONS = {
  "global-news": "全球新闻 / Global News",
  "gender-culture": "性别与文化 / Gender & Culture",
  "art-media": "艺术、时尚与媒介 / Art, Fashion & Media",
  "ai-tech": "AI 与科技 / AI & Tech",
};

function normalizeText(text = "") {
  return text
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/<\/?w:[^>]*>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/([。.!?！？])\s*(English key expressions?[:：]?|English expressions?[:：]?|Key expressions?[:：]?|Useful sentence[:：]?|Useful phrase[:：]?|Mini note[:：]?|Study note[:：]?|Why it matters｜为什么值得读)/gi, "$1\n$2")
    .replace(/([A-Za-z])\s*(中文翻译|中文[:：]|Chinese translation[:：]?)/g, "$1\n$2")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeXml(text = "") {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

async function extractTextWithMammoth() {
  try {
    const mammoth = require("mammoth");
    const result = await mammoth.extractRawText({ path: DOCX_FILE.pathname });
    return normalizeText(result.value);
  } catch {
    return "";
  }
}

function extractTextWithUnzip() {
  const xml = execFileSync("unzip", ["-p", DOCX_FILE.pathname, "word/document.xml"], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
  const paragraphs = [...xml.matchAll(/<w:p[\s\S]*?<\/w:p>/g)]
    .map((paragraph) => {
      const runs = [...paragraph[0].matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((match) => decodeXml(match[1]));
      return runs.join("");
    })
    .map((line) => line.trim())
    .filter(Boolean);
  return normalizeText(paragraphs.join("\n"));
}

async function extractText() {
  const mammothText = await extractTextWithMammoth();
  if (mammothText) return mammothText;
  return extractTextWithUnzip();
}

function toIsoDate(rawDate) {
  const match = rawDate.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (!match) return "";
  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function splitBriefings(text) {
  const dateRegex = /(?:推送日期\s*｜\s*)?(\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日)/g;
  const matches = [...text.matchAll(dateRegex)];
  return matches.map((match, index) => {
    const start = match.index;
    const next = matches[index + 1]?.index ?? text.length;
    return {
      date: toIsoDate(match[1]),
      rawText: normalizeText(text.slice(start, next)),
    };
  });
}

function cleanLine(line = "") {
  return line
    .replace(/[￼]/g, "")
    .replace(/^[\s⭐★✦🌟•·]+/, "")
    .replace(/^\d+\s*[).）｜|、-]?\s*/, "")
    .trim();
}

function contentLines(text = "") {
  return text
    .split("\n")
    .map((line) => cleanLine(line))
    .filter((line) => line && !/^[-—⸻]+$/.test(line));
}

function sectionMeta(line = "") {
  const cleaned = cleanLine(line).replace(/\s+/g, " ");
  const lower = cleaned.toLowerCase();
  if (cleaned.length > 58) return null;
  if (/global news|全球新闻/.test(lower)) return { kind: "section", id: "global-news", heading: STANDARD_SECTIONS["global-news"] };
  if (/gender\s*(\/|&|and)?\s*culture|性别与文化/.test(lower)) return { kind: "section", id: "gender-culture", heading: STANDARD_SECTIONS["gender-culture"] };
  if (/art.*fashion.*media|艺术[、／/\s]*(时尚|媒介|媒体)|艺术、时尚与媒介|艺术、时尚与媒体/.test(lower)) {
    return { kind: "section", id: "art-media", heading: STANDARD_SECTIONS["art-media"] };
  }
  if (/\bai\s*(\/|&|and)?\s*tech\b|ai 与科技|ai与科技/i.test(cleaned)) return { kind: "section", id: "ai-tech", heading: STANDARD_SECTIONS["ai-tech"] };
  if (/one english paragraph|今日英文(阅读|段落)|一段英文精读/.test(lower)) return { kind: "englishParagraph" };
  if (/today.?s keywords|今日关键词/.test(lower)) return { kind: "keywords" };
  if (/reflective closing|closing reflection|gentle closing|morning reflection|a soft closing|今日思考|晨间小结|今日小结|晨间一句|晨间小记|今日收束/.test(lower)) {
    return { kind: "reflection" };
  }
  return null;
}

function splitByHeadings(rawText) {
  const blocks = [];
  let current = null;
  for (const line of rawText.split("\n")) {
    const meta = sectionMeta(line);
    if (meta) {
      if (current) blocks.push({ ...current, text: normalizeText(current.lines.join("\n")) });
      current = { ...meta, lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) blocks.push({ ...current, text: normalizeText(current.lines.join("\n")) });
  return blocks;
}

function extractTheme(rawText) {
  const patterns = [
    /主题是[:：]?[“"]?([^”"\n。]+)[”"]?/,
    /关键词是[:：]?\s*([^。\n]+)/,
    /今天这份小报的关键词是[:：]?\s*([^。\n]+)/,
    /今天的小报关键词是[:：]\s*([^。\n]+)/,
  ];
  for (const pattern of patterns) {
    const match = rawText.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function extractIntro(rawText) {
  const lines = rawText.split("\n");
  const firstHeadingIndex = lines.findIndex((line) => sectionMeta(line)?.kind === "section");
  return contentLines(lines.slice(1, firstHeadingIndex > 0 ? firstHeadingIndex : 7).join("\n"))
    .filter((line) => !/^\d{4}\s*年/.test(line) && !/^Morning Daily Brief|晨间双语小报/i.test(line))
    .join("\n");
}

function isEnglishLine(line = "") {
  return /[A-Za-z]/.test(line) && !/[\u4e00-\u9fff]/.test(line);
}

function hasChinese(line = "") {
  return /[\u4e00-\u9fff]/.test(line);
}

function isExpressionHeading(line = "") {
  return /^(English key expressions?|English expressions?|Key expressions?)[:：]?$/i.test(cleanLine(line));
}

function isExpressionHeader(line = "") {
  return /^(Expression|Expressions|English|中文理解|中文解释|中文|Meaning|Example|Example sentence|例句|Keyword|Keywords)[:：]?$/i.test(cleanLine(line));
}

function isNoteHeading(line = "") {
  return /^(Study note|Study note｜学习角度|Mini note|Mini thought|Mini reflection|Cultural lens|Media observation|Fashion note|Why it matters｜为什么值得读|Mini sentence|Useful sentence|Useful phrase)[:：]?$/i.test(cleanLine(line));
}

function isMajorStop(line = "") {
  return sectionMeta(line) || isExpressionHeading(line) || isNoteHeading(line);
}

function titleCandidate(line = "", nextLine = "", currentItem = null) {
  const cleaned = cleanLine(line);
  if (!cleaned || isMajorStop(cleaned) || isExpressionHeader(cleaned)) return false;
  if (/^[A-Za-z]/.test(cleaned)) return false;
  if (!hasChinese(cleaned)) return false;
  if (cleaned.length > 62) return false;
  if (/[。！？；：:]$/.test(cleaned)) return false;
  if (!currentItem) return true;
  if (!currentItem.summaryChinese && !currentItem.englishExpressions.length && !currentItem.studyNote) return false;
  return !nextLine || hasChinese(nextLine) || isExpressionHeading(nextLine);
}

function splitMixedExpressionLine(line) {
  const cleaned = cleanLine(line);
  const colon = cleaned.match(/^(.+?)\s*[：:]\s*(.+)$/);
  if (colon && /[A-Za-z]/.test(colon[1]) && hasChinese(colon[2])) {
    return { expression: colon[1].trim(), meaningChinese: colon[2].trim(), example: "" };
  }
  const mixed = cleaned.match(/^([A-Za-z][A-Za-z0-9\s/'’&().-]+?)\s+([\u4e00-\u9fff].+)$/);
  if (mixed) return { expression: mixed[1].trim(), meaningChinese: mixed[2].trim(), example: "" };
  return null;
}

function parseExpressionBlock(lines, startIndex) {
  const expressions = [];
  let exampleNote = "";
  let index = startIndex;

  while (index < lines.length) {
    const line = cleanLine(lines[index]);
    const next = cleanLine(lines[index + 1] || "");
    if (!line || isExpressionHeader(line)) {
      index += 1;
      continue;
    }
    if (isNoteHeading(line) || isExpressionHeading(line)) break;
    if (titleCandidate(line, next, { summaryChinese: "x", englishExpressions: expressions, studyNote: "" }) && expressions.length) break;

    if (/^Example sentence[:：]?$/i.test(line)) {
      const english = cleanLine(lines[index + 1] || "");
      const chinese = cleanLine(lines[index + 2] || "");
      exampleNote = [english, chinese].filter(Boolean).join("\n");
      if (expressions.length && english) expressions[expressions.length - 1].example = english;
      index += chinese ? 3 : 2;
      continue;
    }

    const mixed = splitMixedExpressionLine(line);
    if (mixed) {
      expressions.push(mixed);
      index += 1;
      continue;
    }

    if (isEnglishLine(line) && hasChinese(next)) {
      expressions.push({ expression: line, meaningChinese: next, example: "" });
      index += 2;
      continue;
    }

    break;
  }

  return { expressions, exampleNote, nextIndex: index };
}

function parseNoteBlock(lines, startIndex) {
  const heading = cleanLine(lines[startIndex]);
  const collected = [];
  let index = startIndex + 1;

  while (index < lines.length) {
    const line = cleanLine(lines[index]);
    const next = cleanLine(lines[index + 1] || "");
    if (!line) {
      index += 1;
      continue;
    }
    if (isExpressionHeading(line) || isNoteHeading(line) || titleCandidate(line, next, { summaryChinese: "x", englishExpressions: [{ expression: "x" }], studyNote: "x" })) break;
    collected.push(line);
    index += 1;
  }

  return {
    note: [heading, ...collected].join("\n"),
    nextIndex: index,
  };
}

function finishItem(item) {
  if (!item) return null;
  return {
    title: item.title.trim(),
    summaryChinese: normalizeText(item.summaryLines.join("\n")),
    englishExpressions: item.englishExpressions,
    studyNote: normalizeText(item.studyNoteLines.join("\n")),
    ...(item.exampleNote ? { exampleNote: item.exampleNote } : {}),
  };
}

function parseContentSection(block) {
  const lines = contentLines(block.text);
  const items = [];
  let item = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = cleanLine(lines[index]);
    const next = cleanLine(lines[index + 1] || "");
    if (!line || isExpressionHeader(line)) continue;

    if (titleCandidate(line, next, item)) {
      const finished = finishItem(item);
      if (finished?.title || finished?.summaryChinese) items.push(finished);
      item = { title: line, summaryLines: [], englishExpressions: [], studyNoteLines: [], exampleNote: "" };
      continue;
    }

    if (!item) item = { title: "Briefing item", summaryLines: [], englishExpressions: [], studyNoteLines: [], exampleNote: "" };

    if (isExpressionHeading(line)) {
      const parsed = parseExpressionBlock(lines, index + 1);
      item.englishExpressions.push(...parsed.expressions);
      if (parsed.exampleNote) item.exampleNote = parsed.exampleNote;
      index = parsed.nextIndex - 1;
      continue;
    }

    if (isNoteHeading(line)) {
      const parsed = parseNoteBlock(lines, index);
      item.studyNoteLines.push(parsed.note);
      index = parsed.nextIndex - 1;
      continue;
    }

    item.summaryLines.push(line);
  }

  const finished = finishItem(item);
  if (finished?.title || finished?.summaryChinese) items.push(finished);

  return {
    id: block.id,
    heading: block.heading,
    items,
  };
}

function splitEnglishAndChinese(text) {
  const cleaned = normalizeText(text).replace(/^English\s*\n?/i, "").trim();
  const markerMatch = cleaned.match(/([\s\S]*?)(?:中文翻译|中文[:：]|Chinese translation[:：]?)([\s\S]*)/i);
  if (markerMatch) {
    return {
      english: normalizeText(markerMatch[1]).replace(/^English\s*\n?/i, "").trim(),
      chinese: normalizeText(markerMatch[2]),
    };
  }
  const lines = contentLines(cleaned);
  const englishLines = lines.filter((line) => isEnglishLine(line));
  const chineseLines = lines.filter((line) => !isEnglishLine(line));
  return {
    english: normalizeText(englishLines.join("\n")).replace(/^English\s*\n?/i, "").trim(),
    chinese: normalizeText(chineseLines.join("\n")),
  };
}

function parseKeywords(text) {
  const lines = contentLines(text).filter((line) => !/^(Keyword|Keywords|中文解释|中文理解|Example sentence|Example)$/i.test(line));
  const keywords = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = cleanLine(lines[index]);
    const next = cleanLine(lines[index + 1] || "");
    const third = cleanLine(lines[index + 2] || "");
    const mixed = splitMixedExpressionLine(line);
    if (mixed) {
      keywords.push({ word: mixed.expression, meaning: mixed.meaningChinese, example: "" });
      continue;
    }
    if (isEnglishLine(line) && hasChinese(next)) {
      const example = isEnglishLine(third) ? third : "";
      keywords.push({ word: line, meaning: next, example });
      index += example ? 2 : 1;
    }
  }

  return keywords.slice(0, 24);
}

function parseReflection(text) {
  const lines = contentLines(text);
  const english = [];
  const chinese = [];
  for (const line of lines) {
    if (isEnglishLine(line)) english.push(line);
    else chinese.push(line);
  }
  return {
    english: normalizeText(english.join("\n")),
    chinese: normalizeText(chinese.join("\n")),
  };
}

function inferTags(text) {
  const tagRules = [
    ["AI", /\bAI\b|人工智能|Gemini|agentic|算法|数据中心/i],
    ["technology", /technology|tech|科技|数字|芯片|infrastructure|Qwant|平台/i],
    ["gender", /gender|women|女性|feminism|性别|女权|LGBTQ/i],
    ["culture", /culture|文化|media|媒介|媒体|艺术|fashion|时尚/i],
    ["global", /global|全球|外交|war|ceasefire|migration|移民|欧盟|欧洲/i],
    ["climate", /climate|气候|高温|能源|heat/i],
  ];
  return tagRules.filter(([, pattern]) => pattern.test(text)).map(([tag]) => tag);
}

function createBriefing({ date, rawText }) {
  const blocks = splitByHeadings(rawText);
  const contentBlocks = blocks.filter((block) => block.kind === "section");
  const englishBlock = blocks.find((block) => block.kind === "englishParagraph");
  const keywordBlock = blocks.find((block) => block.kind === "keywords");
  const reflectionBlock = blocks.find((block) => block.kind === "reflection");

  return {
    date,
    title: TITLE,
    subtitle: SUBTITLE,
    theme: extractTheme(rawText),
    introChinese: extractIntro(rawText),
    sections: contentBlocks.map(parseContentSection),
    englishParagraph: englishBlock ? splitEnglishAndChinese(englishBlock.text) : { english: "", chinese: "" },
    keywords: keywordBlock ? parseKeywords(keywordBlock.text) : [],
    sentenceLab: {
      sentence: "",
      analysisChinese: "",
    },
    reflection: reflectionBlock ? parseReflection(reflectionBlock.text) : { english: "", chinese: "" },
    tags: inferTags(rawText),
    sources: [],
    rawText,
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

const text = await extractText();
const briefings = splitBriefings(text).filter((briefing) => briefing.date);
if (!briefings.length) throw new Error("No date markers found in imports/morning-mini-newspaper.docx");

const generated = briefings.map(createBriefing);
for (const briefing of generated) {
  const outputFile = new URL(`../data/briefings/${briefing.date}.json`, import.meta.url);
  await fs.writeFile(outputFile, `${JSON.stringify(briefing, null, 2)}\n`);
}

const existingIndex = await readIndex();
const generatedIndex = generated.map((briefing) => ({
  date: briefing.date,
  title: briefing.title,
  theme: briefing.theme,
  file: `${briefing.date}.json`,
  tags: briefing.tags,
}));

const mergedIndex = [...generatedIndex, ...existingIndex.filter((item) => !generatedIndex.some((generatedItem) => generatedItem.date === item.date))]
  .sort((a, b) => new Date(b.date) - new Date(a.date));

await fs.writeFile(INDEX_FILE, `${JSON.stringify(mergedIndex, null, 2)}\n`);

console.log(`Imported ${generated.length} briefings: ${generated.map((briefing) => briefing.date).join(", ")}`);
