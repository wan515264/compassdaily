const STORAGE = {
  words: "daily-compass.words",
};
const THEME_KEY = "daily-compass-theme";
const LEGACY_THEME_KEYS = ["daily-compass.theme", "daily-compass.home-theme"];

const SITE_TITLE = "The Daily Compass｜每日罗盘";
const SECTION_LABELS = {
  "opening-news": "News Hook｜新闻开头",
  "what-happened": "What Happened｜回顾整件事",
  "one-and-proactive-service": "DingTalk ONE｜从“人找事”到“事找人”",
  "organization-and-power": "Organization & Power｜组织与权力",
  "from-one-person-to-organization": "From Individual to Organization｜从个体到组织",
  "burnout-market-feminism": "Theory Lens｜Burnout Market Feminism",
  "special-report": "★ Special Report｜特别报道",
  "news-focus": "新闻聚焦 / News Focus",
  "global-news": "全球新闻 / Global News",
  "finance-markets": "金融与市场 / Finance & Markets",
  "gender-culture": "性别与文化 / Gender & Culture",
  "books-literature-art-fashion-media": "★ 4. Books / Literature / Art / Fashion / Media｜书籍文学艺术时尚媒体",
  "books-culture-arts": "★ 4. Books / Literature / Art / Fashion / Media｜书籍文学艺术时尚媒体",
  "art-fashion-media": "★ 4. Books / Literature / Art / Fashion / Media｜书籍文学艺术时尚媒体",
  "art-media": "★ 4. Books / Literature / Art / Fashion / Media｜书籍文学艺术时尚媒体",
  "ai-tech": "AI 与科技 / AI & Tech",
  "Global News｜全球新闻": "全球新闻 / Global News",
  "Finance & Markets｜金融与市场": "金融与市场 / Finance & Markets",
  "Finance / Markets｜金融与市场": "金融与市场 / Finance & Markets",
  "Gender & Culture｜性别与文化": "性别与文化 / Gender & Culture",
  "Gender / Culture｜性别与文化": "性别与文化 / Gender & Culture",
  "Art, Fashion & Media｜艺术、时尚与媒介": "★ 4. Books / Literature / Art / Fashion / Media｜书籍文学艺术时尚媒体",
  "Art / Fashion / Media｜艺术、时尚与媒介": "★ 4. Books / Literature / Art / Fashion / Media｜书籍文学艺术时尚媒体",
  "Art / Fashion / Media｜艺术、时尚与媒体": "★ 4. Books / Literature / Art / Fashion / Media｜书籍文学艺术时尚媒体",
  "Books, Culture & Arts｜书籍、文化与艺术": "★ 4. Books / Literature / Art / Fashion / Media｜书籍文学艺术时尚媒体",
  "Books / Culture / Arts｜书籍、文化与艺术": "★ 4. Books / Literature / Art / Fashion / Media｜书籍文学艺术时尚媒体",
  "Books / Literature / Art / Fashion / Media｜书籍文学艺术时尚媒体": "★ 4. Books / Literature / Art / Fashion / Media｜书籍文学艺术时尚媒体",
  "★ 4. Books / Literature / Art / Fashion / Media｜书籍文学艺术时尚媒体": "★ 4. Books / Literature / Art / Fashion / Media｜书籍文学艺术时尚媒体",
  "AI & Tech｜AI 与科技": "AI 与科技 / AI & Tech",
  "AI / Tech｜AI 与科技": "AI 与科技 / AI & Tech",
};
const SECTION_ORDER = ["opening-news", "what-happened", "one-and-proactive-service", "organization-and-power", "from-one-person-to-organization", "burnout-market-feminism", "special-report", "news-focus", "global-news", "finance-markets", "gender-culture", "books-literature-art-fashion-media", "ai-tech"];

const briefingDetail = document.querySelector("#briefingDetail");
const wordbook = document.querySelector("#wordbook");
const toast = document.querySelector("#toast");
const exportWordbookTxtButton = document.querySelector("#export-wordbook-txt");
const clearWordbookButton = document.querySelector("#clear-wordbook");
const themeToggleButtons = document.querySelectorAll("[data-theme-toggle]");

let savedWords = readJson(STORAGE.words, []);
let preferredEnglishVoice = null;
let currentBriefing = null;

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function currentBriefingDate() {
  const params = new URLSearchParams(window.location.search);
  return params.get("date") || currentBriefing?.date || todayKey();
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

async function loadBriefing() {
  const params = new URLSearchParams(window.location.search);
  const date = params.get("date");
  if (date) return fetchJson(`data/briefings/${date}.json`);
  const index = await fetchJson("data/briefings/index.json");
  const sortedIndex = [...index].sort((a, b) => new Date(b.date) - new Date(a.date));
  return fetchJson(`data/briefings/${sortedIndex[0].file || `${sortedIndex[0].date}.json`}`);
}

function normalizeSectionId(section = {}) {
  const raw = `${section.id || ""} ${section.heading || ""}`.toLowerCase();
  if (section.id && SECTION_ORDER.includes(section.id)) return section.id;
  if (raw.includes("news hook") || raw.includes("新闻开头")) return "opening-news";
  if (raw.includes("what happened") || raw.includes("回顾整件事")) return "what-happened";
  if (raw.includes("dingtalk one") || raw.includes("事找人")) return "one-and-proactive-service";
  if (raw.includes("organization") || raw.includes("组织与权力")) return "organization-and-power";
  if (raw.includes("from individual") || raw.includes("从个体到组织")) return "from-one-person-to-organization";
  if (raw.includes("theory lens") || raw.includes("burnout market feminism")) return "burnout-market-feminism";
  if (raw.includes("special-report") || raw.includes("special report") || raw.includes("特别报道")) return "special-report";
  if (raw.includes("news-focus") || raw.includes("news focus") || raw.includes("新闻聚焦")) return "news-focus";
  if (raw.includes("finance") || raw.includes("market") || raw.includes("金融") || raw.includes("市场")) return "finance-markets";
  if (raw.includes("gender") || raw.includes("性别")) return "gender-culture";
  if (raw.includes("book") || raw.includes("literature") || raw.includes("art-media") || raw.includes("art-fashion-media") || raw.includes("books-culture-arts") || raw.includes("art") || raw.includes("fashion") || raw.includes("media") || raw.includes("culture") || raw.includes("书籍") || raw.includes("文学") || raw.includes("艺术") || raw.includes("时尚") || raw.includes("媒介") || raw.includes("媒体") || raw.includes("出版") || raw.includes("作家") || raw.includes("美术馆") || raw.includes("电影") || raw.includes("播客") || raw.includes("文化")) return "books-literature-art-fashion-media";
  if (raw.includes("ai") || raw.includes("tech") || raw.includes("科技")) return "ai-tech";
  return "global-news";
}

function orderedSections(sections = []) {
  return [...sections].sort((a, b) => SECTION_ORDER.indexOf(normalizeSectionId(a)) - SECTION_ORDER.indexOf(normalizeSectionId(b)));
}

function displaySectionHeading(section = {}) {
  const normalizedId = normalizeSectionId(section);
  return cleanSectionHeading(SECTION_LABELS[section.id] || SECTION_LABELS[section.heading] || SECTION_LABELS[normalizedId] || section.heading || "Briefing");
}

function cleanSectionHeading(heading = "") {
  return String(heading).replace(/^\s*[★☆✦✧]\s*\d+[\.)]?\s*/, "").replace(/^\s*\d+[\.)]\s*/, "");
}

function renderExpressions(expressions = []) {
  if (!expressions.length) return "";
  const hasExamples = expressions.some((item) => item.example);
  return `
    <div class="expression-table-wrap">
      <table class="expression-table ${hasExamples ? "has-example" : "no-example"}">
        <thead>
          <tr>
            <th>English Expression</th>
            <th>中文理解</th>
            ${hasExamples ? `<th class="example-col">Example</th>` : ""}
          </tr>
        </thead>
        <tbody>
      ${expressions
        .map(
          (item) => `
            <tr>
              <td data-label="English Expression">
                <button class="expression-term" type="button" data-word="${escapeAttribute(item.expression || item.word || "")}" data-sentence="${escapeAttribute(item.example || "")}">
                  ${item.expression || item.word || ""}
                </button>
              </td>
              <td data-label="中文理解">${item.meaningChinese || item.meaning || ""}</td>
              ${hasExamples ? `<td class="expression-example" data-label="Example">${item.example || "—"}</td>` : ""}
            </tr>
          `,
        )
        .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderTags(tags = []) {
  if (!tags.length) return "";
  return `<div class="tag-row">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>`;
}

function renderStudyNote(note = "") {
  if (!note) return "";
  const lines = note.split("\n").map((line) => line.trim()).filter(Boolean);
  const labelPattern = /^(Study note|Study note｜学习角度|Mini note|Mini thought|Mini reflection|Cultural lens|Media observation|Fashion note|Why it matters｜为什么值得读|Mini sentence|Useful sentence|Useful phrase)$/i;
  const label = labelPattern.test(lines[0] || "") ? lines.shift() : "Study note";
  return `
    <aside class="study-note-card">
      <strong>✦ ${label}</strong>
      <p>${renderClickableWords(lines.join("\n"), savedWords)}</p>
    </aside>
  `;
}

function renderSourceLinks(sourceLinks = []) {
  if (!sourceLinks.length) return "";
  return `
    <div class="item-source-links">
      <span>来源 / Sources:</span>
      <div class="item-source-list">
        ${sourceLinks
          .map((source) => {
            const label = escapeHtml(source.label || source.name || source.title || "Source");
            if (!source.url) {
              return `<span class="item-source-pill item-source-pill-muted">${label}</span>`;
            }
            return `
              <a class="item-source-pill" href="${escapeAttribute(source.url)}" target="_blank" rel="noopener noreferrer">
                ${label} ↗
              </a>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function renderFurtherWatching(videos = []) {
  if (!Array.isArray(videos) || !videos.length) return "";
  return `
    <section class="briefing-subblock further-watching-card">
      <h3>Further Watching｜延伸观看</h3>
      <div class="item-source-list">
        ${videos
          .map((video, index) => {
            const label = escapeHtml(video.label || video.title || `Video ${index + 1}`);
            if (!video.url) return `<span class="item-source-pill item-source-pill-muted">${label}</span>`;
            return `
              <a class="item-source-pill" href="${escapeAttribute(video.url)}" target="_blank" rel="noopener noreferrer">
                ${label} ↗
              </a>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function renderLegacyParagraphs(text = "") {
  const hiddenLabels = /^(English key expressions?|English expressions?|Expression|Expressions|中文理解|中文解释|中文|Example sentence|Keyword|Keywords)$/i;
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !hiddenLabels.test(line))
    .map((line) => `<p>${renderClickableWords(line, savedWords)}</p>`)
    .join("");
}

function renderSection(section) {
  const legacyText = section.body || section.text || "";
  const items = Array.isArray(section.items) ? section.items : [];
  const itemMarkup = items
    .map((item) => {
      const summary = item.summaryChinese || item.summary || "";
      const englishTranslation = item.englishTranslation || "";
      const expressions = item.englishExpressions || item.expressions || [];
      const linkedKeywords = Array.isArray(item.linkedKeywords) && item.linkedKeywords.length
        ? `<div class="tag-row item-keyword-row">${item.linkedKeywords.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>`
        : "";
      const speakText = [item.title, summary, englishTranslation].filter(Boolean).join(". ");
      return `
        <article class="briefing-item">
          <h4>${item.title || "Briefing item"}</h4>
          ${item.dek ? `<p class="item-dek">${renderClickableWords(item.dek, savedWords)}</p>` : ""}
          ${summary ? `<p class="briefing-cn">${summary}</p>` : ""}
          ${
            englishTranslation
              ? `<div class="english-translation"><h4>Full English Translation｜完整英文翻译</h4><p>${renderClickableWords(englishTranslation, savedWords)}</p></div>`
              : ""
          }
          ${renderSourceLinks(item.sourceLinks || [])}
          ${renderExpressions(expressions)}
          ${item.exampleNote ? `<p class="expression-example-note">${renderClickableWords(item.exampleNote, savedWords)}</p>` : ""}
          ${renderStudyNote(item.studyNote || "")}
          ${linkedKeywords}
          ${speakText ? `<button class="text-button" type="button" data-sentence-speak="${escapeAttribute(speakText)}">朗读本条</button>` : ""}
        </article>
      `;
    })
    .join("");
  const legacyMarkup = !items.length && legacyText ? renderLegacyParagraphs(legacyText) : "";
  const speakText = items.length ? "" : legacyText;
  const sectionHeading = displaySectionHeading(section);
  const sectionHeadingMarkup = currentBriefing?.hideSectionHeadings ? "" : `<h3>${sectionHeading}</h3>`;
  return `
    <section class="detail-section">
      ${sectionHeadingMarkup}
      ${section.summaryChinese ? `<p class="briefing-cn">${section.summaryChinese}</p>` : ""}
      ${itemMarkup}
      ${legacyMarkup}
      ${speakText ? `<button class="text-button" type="button" data-sentence-speak="${escapeAttribute(speakText)}">朗读本段</button>` : ""}
    </section>
  `;
}

function renderBriefing(briefing) {
  document.title = `${SITE_TITLE} | ${briefing.date}`;
  const sections = orderedSections(briefing.sections || []).map(renderSection).join("");

  const topSources = renderSourceLinks(briefing.sourceLinks || briefing.sources || []);
  const englishHeading = briefing.englishParagraph?.heading || "今日英文阅读 / One English Paragraph";
  const englishParagraph = briefing.englishParagraph?.english
    ? `
      <section class="briefing-subblock">
        <h3>${englishHeading}</h3>
        <p>${renderClickableWords(briefing.englishParagraph.english, savedWords)}</p>
        ${briefing.englishParagraph.chinese ? `<p class="briefing-cn">${briefing.englishParagraph.chinese}</p>` : ""}
        <button class="text-button" type="button" data-sentence-speak="${escapeAttribute(briefing.englishParagraph.english)}">朗读英文段落</button>
      </section>
    `
    : "";
  const writingPrompt = briefing.writingPrompt?.prompt
    ? `
      <section class="briefing-subblock">
        <h3>今日写作 / Writing Prompt</h3>
        <p>${briefing.writingPrompt.prompt}</p>
        <p class="briefing-cn">${briefing.writingPrompt.hintChinese || ""}</p>
      </section>
    `
    : "";
  const metaParts = [briefing.date, briefing.type, briefing.theme || briefing.subtitle].filter(Boolean);
  const introHeading = briefing.intro?.heading || "中文导读 / Chinese Intro";
  const introText = briefing.introChinese || briefing.intro?.body || "";
  const topicTags = briefing.topics?.length ? renderTags(briefing.topics) : "";
  const studyNote = briefing.studyNote?.body
    ? `
      <section class="briefing-subblock study-note-card">
        <h3>${briefing.studyNote.heading || "Study Note｜学习笔记"}</h3>
        <p class="briefing-cn">${briefing.studyNote.body}</p>
      </section>
    `
    : "";
  const furtherWatching = renderFurtherWatching(briefing.furtherWatching || []);

  briefingDetail.innerHTML = `
    <span class="topic-pill">今日小报</span>
    <p class="meta">${metaParts.join(" · ")}</p>
    ${topicTags}
    ${topSources}
    ${
      introText
        ? `<section class="briefing-subblock">
            <h3>${introHeading}</h3>
            <p class="briefing-intro">${introText}</p>
          </section>`
        : ""
    }
    <section class="briefing-subblock">
      <div class="article-body detail-body">${sections}</div>
    </section>
    ${englishParagraph}
    ${writingPrompt}
    ${studyNote}
    ${furtherWatching}
  `;

}

function renderWordbook() {
  if (savedWords.length === 0) {
    wordbook.innerHTML = `
      <p class="hint wordbook-empty">
        还没有保存单词。点击小报里的表达或句子，把它们加入这里。<br />
        Click words or expressions in the briefing to add them here.
      </p>
    `;
    return;
  }
  wordbook.innerHTML = savedWords
    .map((item, index) => {
      const entry = normalizeWordbookEntry(item);
      const word = entry.word || "Untitled";
      const meaning = entry.meaning || localChineseMeaning(word);
      const example = entry.example || "";
      const type = entry.type || "单词";
      const identifier = entry.id || String(index);
      return `
        <article class="wordbook-item">
          <button class="wordbook-delete" type="button" data-wordbook-delete="${escapeAttribute(identifier)}" aria-label="删除 ${escapeAttribute(word)} / Remove ${escapeAttribute(word)}">×</button>
          <div class="wordbook-item-main">
            <strong>${word}</strong>
            ${meaning ? `<span>${meaning}</span>` : ""}
            ${example ? `<p class="word-sentence">${example}</p>` : ""}
          </div>
          <div class="word-actions">
            <span class="wordbook-type">${type}</span>
            <button class="word-chip" type="button" data-speak="${escapeAttribute(word)}">单词</button>
            ${example ? `<button class="word-chip" type="button" data-sentence-speak="${escapeAttribute(example)}">句子</button>` : ""}
          </div>
        </article>
      `;
    })
    .join("");
}

function normalizeWordbookEntry(entry = {}) {
  return {
    id: entry.id || "",
    word: entry.word || entry.term || entry.expression || "",
    meaning: entry.meaning || entry.meaningChinese || entry.translation || "",
    example: entry.example || entry.sentence || "",
    type: entry.type || entry.kind || "单词",
    sourceDate: entry.sourceDate || entry.date || entry.savedAt || entry.createdAt || "",
    sourceTitle: entry.sourceTitle || entry.briefingTitle || entry.theme || "",
    createdAt: entry.createdAt || entry.savedAt || "",
  };
}

function wordbookTxtContent(entries, exportDate) {
  const divider = "----------------------------------------";
  const body = entries
    .map((entry, index) => {
      const lines = [`${index + 1}. ${entry.word}`];
      if (entry.meaning) lines.push(`中文理解：${entry.meaning}`);
      if (entry.example) lines.push(`例句：${entry.example}`);
      if (entry.type) lines.push(`类型：${entry.type}`);
      if (entry.sourceDate) lines.push(`来源日期：${entry.sourceDate}`);
      if (entry.sourceTitle) lines.push(`来源小报：${entry.sourceTitle}`);
      return lines.join("\n");
    })
    .join(`\n\n${divider}\n\n`);

  return [
    SITE_TITLE,
    "我的单词本 / Wordbook",
    `Date: ${exportDate}`,
    "",
    divider,
    "",
    body,
    "",
    divider,
    "",
  ].join("\n");
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportWordbookTxt() {
  const entries = savedWords.map(normalizeWordbookEntry).filter((entry) => entry.word);
  if (!entries.length) {
    showToast("暂无可导出的单词。No saved words to export yet.");
    return;
  }
  const exportDate = currentBriefingDate();
  const filename = `daily-compass-wordbook-${exportDate}.txt`;
  downloadFile(filename, wordbookTxtContent(entries, exportDate), "text/plain;charset=utf-8");
  showToast("单词本 TXT 已导出");
}

function speak(text) {
  if (!("speechSynthesis" in window)) {
    showToast("当前浏览器不支持发音功能");
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = getPreferredEnglishVoice();
  utterance.lang = "en-US";
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang || "en-US";
  }
  utterance.rate = text.split(/\s+/).length > 3 ? 0.86 : 0.8;
  utterance.pitch = 1.12;
  window.speechSynthesis.speak(utterance);
}

function getPreferredEnglishVoice() {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  if (preferredEnglishVoice && voices.includes(preferredEnglishVoice)) return preferredEnglishVoice;

  const englishVoices = voices.filter((voice) => /^en[-_]/i.test(voice.lang || ""));
  const femaleVoiceHints = [
    "samantha",
    "victoria",
    "karen",
    "moira",
    "tessa",
    "serena",
    "zira",
    "susan",
    "allison",
    "ava",
    "joanna",
    "emma",
    "amy",
    "aria",
    "jenny",
    "olivia",
    "female",
    "woman",
    "google us english",
  ];

  preferredEnglishVoice =
    englishVoices.find((voice) => femaleVoiceHints.some((hint) => (voice.name || "").toLowerCase().includes(hint))) ||
    englishVoices.find((voice) => voice.lang === "en-US") ||
    englishVoices[0] ||
    null;

  return preferredEnglishVoice;
}

async function handleWordClick(word, sentence = "") {
  speak(word);
  const existingWord = savedWords.find((item) => normalizeWordbookEntry(item).word === word);
  if (!existingWord) {
    savedWords = [{ id: createWordbookId(), word, meaning: localChineseMeaning(word), sentence, type: "单词", savedAt: todayKey() }, ...savedWords];
  } else {
    savedWords = savedWords.map((item) => (normalizeWordbookEntry(item).word === word ? { ...item, sentence: item.sentence || item.example || sentence } : item));
  }
  writeJson(STORAGE.words, savedWords);
  renderWordbook();
  const entry = await lookupPublicDictionary(word);
  savedWords = savedWords.map((item) => (item.word === entry.word ? { ...item, meaning: entry.chinese } : item));
  writeJson(STORAGE.words, savedWords);
  renderWordbook();
  showToast(`${word} 已保存`);
}

function createWordbookId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function deleteWordbookItem(identifier) {
  savedWords = savedWords.filter((item, index) => {
    if (item.id) return item.id !== identifier;
    return String(index) !== String(identifier);
  });
  writeJson(STORAGE.words, savedWords);
  renderWordbook();
  showToast("已从单词本删除");
}

window.handleInlineWordClick = (event, word) => {
  event.preventDefault();
  handleWordClick(word, event.currentTarget.dataset.sentence || "");
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 1800);
}

function getStoredTheme() {
  return localStorage.getItem(THEME_KEY) || LEGACY_THEME_KEYS.map((key) => localStorage.getItem(key)).find(Boolean) || "dark";
}

function applyTheme(theme) {
  const normalizedTheme = theme === "light" ? "light" : "dark";
  const isLight = normalizedTheme === "light";
  document.documentElement.classList.toggle("theme-light", isLight);
  document.documentElement.classList.toggle("theme-dark", !isLight);
  localStorage.setItem(THEME_KEY, normalizedTheme);
  themeToggleButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(isLight));
    button.title = isLight ? "Night mode / 夜间模式" : "Day mode / 日间模式";
  });
}

briefingDetail.addEventListener("click", (event) => {
  if (event.defaultPrevented) return;
  const wordButton = event.target.closest("[data-word]");
  if (wordButton) handleWordClick(wordButton.dataset.word, wordButton.dataset.sentence || "");
  const sentence = event.target.dataset.sentenceSpeak;
  if (sentence) speak(sentence);
});

wordbook.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-wordbook-delete]");
  if (deleteButton) {
    deleteWordbookItem(deleteButton.getAttribute("data-wordbook-delete"));
    return;
  }
  const word = event.target.dataset.speak;
  if (word) speak(word);
  const sentence = event.target.dataset.sentenceSpeak;
  if (sentence) speak(sentence);
});

themeToggleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const nextTheme = document.documentElement.classList.contains("theme-light") ? "dark" : "light";
    applyTheme(nextTheme);
  });
});

exportWordbookTxtButton?.addEventListener("click", exportWordbookTxt);

clearWordbookButton?.addEventListener("click", () => {
  if (!savedWords.length) {
    showToast("单词本已经是空的");
    return;
  }
  if (!window.confirm("确定要清空单词本吗？")) return;
  savedWords = [];
  writeJson(STORAGE.words, savedWords);
  renderWordbook();
  showToast("单词本已清空");
});

if ("speechSynthesis" in window) {
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    preferredEnglishVoice = null;
    getPreferredEnglishVoice();
  });
  getPreferredEnglishVoice();
}

applyTheme(getStoredTheme());
loadBriefing()
  .then((briefing) => {
    currentBriefing = briefing;
    renderBriefing(briefing);
    renderWordbook();
  })
  .catch((error) => {
    briefingDetail.innerHTML = `<h2 class="detail-title">小报加载失败</h2><p>${error.message}</p>`;
  });
