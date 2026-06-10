const STORAGE = {
  words: "daily-compass.words",
  theme: "daily-compass.theme",
};

const SITE_TITLE = "The Daily Compass｜每日罗盘";
const SECTION_LABELS = {
  "Global News｜全球新闻": "全球新闻 / Global News",
  "Gender & Culture｜性别与文化": "性别与文化 / Gender & Culture",
  "Gender / Culture｜性别与文化": "性别与文化 / Gender & Culture",
  "Art, Fashion & Media｜艺术、时尚与媒介": "艺术、时尚与媒介 / Art, Fashion & Media",
  "Art / Fashion / Media｜艺术、时尚与媒介": "艺术、时尚与媒介 / Art, Fashion & Media",
  "Art / Fashion / Media｜艺术、时尚与媒体": "艺术、时尚与媒体 / Art, Fashion & Media",
  "AI & Tech｜AI 与科技": "AI 与科技 / AI & Tech",
  "AI / Tech｜AI 与科技": "AI 与科技 / AI & Tech",
};

const briefingDetail = document.querySelector("#briefingDetail");
const briefingWords = document.querySelector("#briefingWords");
const wordbook = document.querySelector("#wordbook");
const themeToggle = document.querySelector("#themeToggle");
const toast = document.querySelector("#toast");

let savedWords = readJson(STORAGE.words, []);
let preferredEnglishVoice = null;

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

function displaySectionHeading(heading = "") {
  return SECTION_LABELS[heading] || heading;
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
    .map(
      (item) => `
        <article class="briefing-item">
          <h4>${item.title || "Briefing item"}</h4>
          ${item.summaryChinese ? `<p class="briefing-cn">${item.summaryChinese}</p>` : ""}
          ${renderExpressions(item.englishExpressions || [])}
          ${item.exampleNote ? `<p class="expression-example-note">${renderClickableWords(item.exampleNote, savedWords)}</p>` : ""}
          ${renderStudyNote(item.studyNote || "")}
        </article>
      `,
    )
    .join("");
  const legacyMarkup = !items.length && legacyText ? renderLegacyParagraphs(legacyText) : "";
  const speakText = items.length ? items.map((item) => [item.title, item.summaryChinese].filter(Boolean).join(". ")).join(" ") : legacyText;
  return `
    <section class="detail-section">
      <h3>${displaySectionHeading(section.heading)}</h3>
      ${section.summaryChinese ? `<p class="briefing-cn">${section.summaryChinese}</p>` : ""}
      ${itemMarkup}
      ${legacyMarkup}
      ${speakText ? `<button class="text-button" type="button" data-sentence-speak="${escapeAttribute(speakText)}">朗读本段</button>` : ""}
    </section>
  `;
}

function renderKeywordTable(keywords = []) {
  if (!keywords.length) return "";
  return `
    <section class="briefing-subblock keyword-table-card">
      <h3>今日关键词 / Today’s Keywords</h3>
      <div class="expression-table-wrap">
        <table class="expression-table keyword-table has-example">
          <thead>
            <tr>
              <th>Keyword</th>
              <th>中文解释</th>
              <th>Example sentence</th>
            </tr>
          </thead>
          <tbody>
            ${keywords
              .map(
                (item) => `
                  <tr>
                    <td data-label="Keyword">
                      <button class="expression-term" type="button" data-word="${escapeAttribute(item.word || "")}" data-sentence="${escapeAttribute(item.example || "")}">
                        ${item.word || ""}
                      </button>
                    </td>
                    <td data-label="中文解释">${item.meaningChinese || item.meaning || ""}</td>
                    <td data-label="Example sentence">${item.example || "—"}</td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderBriefing(briefing) {
  document.title = `${SITE_TITLE} | ${briefing.date}`;
  const sections = (briefing.sections || []).map(renderSection).join("");

  const sources = (briefing.sources || [])
    .map((source) => `<a class="source-link" href="${source.url}" target="_blank" rel="noreferrer">${source.name}</a>`)
    .join("");
  const vocabulary = briefing.vocabulary || briefing.keywords || [];
  const englishParagraph = briefing.englishParagraph?.english
    ? `
      <section class="briefing-subblock">
        <h3>今日英文阅读 / One English Paragraph</h3>
        <p>${renderClickableWords(briefing.englishParagraph.english, savedWords)}</p>
        ${briefing.englishParagraph.chinese ? `<p class="briefing-cn">${briefing.englishParagraph.chinese}</p>` : ""}
        <button class="text-button" type="button" data-sentence-speak="${escapeAttribute(briefing.englishParagraph.english)}">朗读英文段落</button>
      </section>
    `
    : "";
  const sentenceData = briefing.sentenceAnalysis?.sentence
    ? {
        sentence: briefing.sentenceAnalysis.sentence,
        translationChinese: briefing.sentenceAnalysis.translationChinese || "",
        notesChinese: briefing.sentenceAnalysis.notesChinese || "",
      }
    : briefing.sentenceLab?.sentence
      ? {
          sentence: briefing.sentenceLab.sentence,
          translationChinese: "",
          notesChinese: briefing.sentenceLab.analysisChinese || "",
        }
      : null;
  const sentenceLab = sentenceData
    ? `
      <section class="briefing-subblock">
        <h3>长句拆解 / Sentence Lab</h3>
        <p class="sentence-focus">${renderClickableWords(sentenceData.sentence, savedWords)}</p>
        ${sentenceData.translationChinese ? `<p class="briefing-cn">${sentenceData.translationChinese}</p>` : ""}
        <p>${sentenceData.notesChinese || ""}</p>
        <button class="text-button" type="button" data-sentence-speak="${escapeAttribute(sentenceData.sentence)}">朗读长句</button>
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
  const reflectionText = briefing.reflection
    ? [briefing.reflection.english, briefing.reflection.chinese].filter(Boolean).join("\n")
    : briefing.closing;
  const closing = reflectionText
    ? `
      <section class="briefing-subblock reflection-card">
        <h3>今日思考 / Reflection</h3>
        <p class="briefing-cn">${reflectionText}</p>
      </section>
    `
    : "";
  const keywordTable = renderKeywordTable(vocabulary);

  briefingDetail.innerHTML = `
    <span class="topic-pill">今日小报</span>
    <h2 class="detail-title">${SITE_TITLE}</h2>
    <p class="meta">${briefing.date} · ${briefing.theme}</p>
    <section class="briefing-subblock">
      <h3>中文导读 / Chinese Intro</h3>
      <p class="briefing-intro">${briefing.introChinese}</p>
    </section>
    <section class="briefing-subblock">
      <h3>今日版面 / Today's Sections</h3>
      <div class="article-body detail-body">${sections}</div>
    </section>
    ${englishParagraph}
    ${keywordTable}
    ${sentenceLab}
    ${writingPrompt}
    ${closing}
    ${sources ? `<div class="article-footer"><div class="link-group">${sources}</div></div>` : ""}
  `;

  briefingWords.innerHTML = vocabulary
    .map(
      (item) => `
        <button class="article-word" type="button" data-word="${item.word}" data-sentence="${escapeAttribute(item.example)}">
          ${item.word}<span>${item.meaningChinese || item.meaning || ""}</span>
        </button>
      `,
    )
    .join("");
}

function renderWordbook() {
  if (savedWords.length === 0) {
    wordbook.innerHTML = `<p class="hint">点击小报里的英文词，会自动加入这里。</p>`;
    return;
  }
  wordbook.innerHTML = savedWords
    .map(
      (item) => `
        <div class="word-row">
          <div>
            <strong>${item.word}</strong>
            <span>${item.meaning || localChineseMeaning(item.word)}</span>
            ${item.sentence ? `<p class="word-sentence">${item.sentence}</p>` : ""}
          </div>
          <div class="word-actions">
            <button class="word-chip" type="button" data-speak="${item.word}">单词</button>
            ${item.sentence ? `<button class="word-chip" type="button" data-sentence-speak="${escapeAttribute(item.sentence)}">句子</button>` : ""}
          </div>
        </div>
      `,
    )
    .join("");
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
  const existingWord = savedWords.find((item) => item.word === word);
  if (!existingWord) {
    savedWords = [{ word, meaning: localChineseMeaning(word), sentence, savedAt: todayKey() }, ...savedWords];
  } else {
    savedWords = savedWords.map((item) => (item.word === word ? { ...item, sentence: item.sentence || sentence } : item));
  }
  writeJson(STORAGE.words, savedWords);
  renderWordbook();
  const entry = await lookupPublicDictionary(word);
  savedWords = savedWords.map((item) => (item.word === entry.word ? { ...item, meaning: entry.chinese } : item));
  writeJson(STORAGE.words, savedWords);
  renderWordbook();
  showToast(`${word} 已保存`);
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

function applyTheme() {
  document.documentElement.classList.toggle("dark", localStorage.getItem(STORAGE.theme) === "dark");
}

briefingDetail.addEventListener("click", (event) => {
  if (event.defaultPrevented) return;
  const wordButton = event.target.closest("[data-word]");
  if (wordButton) handleWordClick(wordButton.dataset.word, wordButton.dataset.sentence || "");
  const sentence = event.target.dataset.sentenceSpeak;
  if (sentence) speak(sentence);
});

briefingWords.addEventListener("click", (event) => {
  const wordButton = event.target.closest("[data-word]");
  if (wordButton) handleWordClick(wordButton.dataset.word, wordButton.dataset.sentence || "");
});

wordbook.addEventListener("click", (event) => {
  const word = event.target.dataset.speak;
  if (word) speak(word);
  const sentence = event.target.dataset.sentenceSpeak;
  if (sentence) speak(sentence);
});

themeToggle.addEventListener("click", () => {
  const nextTheme = document.documentElement.classList.contains("dark") ? "light" : "dark";
  localStorage.setItem(STORAGE.theme, nextTheme);
  applyTheme();
});

if ("speechSynthesis" in window) {
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    preferredEnglishVoice = null;
    getPreferredEnglishVoice();
  });
  getPreferredEnglishVoice();
}

applyTheme();
loadBriefing()
  .then((briefing) => {
    renderBriefing(briefing);
    renderWordbook();
  })
  .catch((error) => {
    briefingDetail.innerHTML = `<h2 class="detail-title">小报加载失败</h2><p>${error.message}</p>`;
  });
