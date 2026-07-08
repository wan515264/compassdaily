const SITE_TITLE = "The Daily Compass｜每日罗盘";
const SITE_SUBTITLE = "A bilingual daily briefing for navigating global news, culture, AI, and social change.";
const THEME_KEY = "daily-compass-theme";
const LEGACY_THEME_KEYS = ["daily-compass.home-theme", "daily-compass.theme"];

const SECTION_LABELS = {
  "opening-news": "News Hook｜新闻开头",
  "what-happened": "What Happened｜回顾整件事",
  "one-and-proactive-service": "DingTalk ONE｜从“人找事”到“事找人”",
  "organization-and-power": "Organization & Power｜组织与权力",
  "from-one-person-to-organization": "From Individual to Organization｜从个体到组织",
  "burnout-market-feminism": "Theory Lens｜Burnout Market Feminism",
  "special-report": "Special Report｜特别报道",
  "news-focus": "News Focus｜新闻聚焦",
  "global-news": "Global News｜全球新闻",
  "finance-markets": "Finance & Markets｜金融与市场",
  "gender-culture": "Gender & Culture｜性别与文化",
  "books-literature-art-fashion-media": "★ 4. Books / Literature / Art / Fashion / Media｜书籍文学艺术时尚媒体",
  "books-culture-arts": "★ 4. Books / Literature / Art / Fashion / Media｜书籍文学艺术时尚媒体",
  "art-fashion-media": "★ 4. Books / Literature / Art / Fashion / Media｜书籍文学艺术时尚媒体",
  "art-media": "★ 4. Books / Literature / Art / Fashion / Media｜书籍文学艺术时尚媒体",
  "ai-tech": "AI & Tech｜AI 与科技",
  "Global News｜全球新闻": "Global News｜全球新闻",
  "Finance & Markets｜金融与市场": "Finance & Markets｜金融与市场",
  "Finance / Markets｜金融与市场": "Finance & Markets｜金融与市场",
  "Gender & Culture｜性别与文化": "Gender & Culture｜性别与文化",
  "Gender / Culture｜性别与文化": "Gender & Culture｜性别与文化",
  "Art, Fashion & Media｜艺术、时尚与媒介": "★ 4. Books / Literature / Art / Fashion / Media｜书籍文学艺术时尚媒体",
  "Art / Fashion / Media｜艺术、时尚与媒介": "★ 4. Books / Literature / Art / Fashion / Media｜书籍文学艺术时尚媒体",
  "Art / Fashion / Media｜艺术、时尚与媒体": "★ 4. Books / Literature / Art / Fashion / Media｜书籍文学艺术时尚媒体",
  "Books, Culture & Arts｜书籍、文化与艺术": "★ 4. Books / Literature / Art / Fashion / Media｜书籍文学艺术时尚媒体",
  "Books / Culture / Arts｜书籍、文化与艺术": "★ 4. Books / Literature / Art / Fashion / Media｜书籍文学艺术时尚媒体",
  "Books / Literature / Art / Fashion / Media｜书籍文学艺术时尚媒体": "★ 4. Books / Literature / Art / Fashion / Media｜书籍文学艺术时尚媒体",
  "★ 4. Books / Literature / Art / Fashion / Media｜书籍文学艺术时尚媒体": "★ 4. Books / Literature / Art / Fashion / Media｜书籍文学艺术时尚媒体",
  "AI & Tech｜AI 与科技": "AI & Tech｜AI 与科技",
  "AI / Tech｜AI 与科技": "AI & Tech｜AI 与科技",
};

const SECTION_ORDER = ["opening-news", "what-happened", "one-and-proactive-service", "organization-and-power", "from-one-person-to-organization", "burnout-market-feminism", "special-report", "news-focus", "global-news", "finance-markets", "gender-culture", "books-literature-art-fashion-media", "ai-tech"];
const topicFallback = [
  "Global News｜全球新闻",
  "Finance & Markets｜金融与市场",
  "Gender & Culture｜性别与文化",
  "★ 4. Books / Literature / Art / Fashion / Media｜书籍文学艺术时尚媒体",
  "AI & Tech｜AI 与科技",
];
const signalIcons = ["◎", "◇", "☾", "◉", "✶"];
const signalFallbackText = [
  "采集地缘政治、战争、气候与公共安全的最新动态",
  "观察全球市场、通胀、央行、油价、商业、科技资本与经济不平等",
  "观察性别议题、社会文化与群体声音",
  "收录新书、文学奖、作家访谈、出版业新闻、文学文化评论、美术馆、展览、艺术市场、时装周、品牌文化、身体与审美、电影、纪录片、播客与媒体行业变化。",
  "追踪技术发展、AI 应用、基础设施与数字社会议题",
];
const todayBriefing = document.querySelector("#todayBriefing");
const archiveList = document.querySelector("#archiveList");
const archiveSearch = document.querySelector("#archiveSearch");
const readTodayLink = document.querySelector("#readTodayLink");
const themeSwitch = document.querySelector("#themeSwitch");
const themeIcon = themeSwitch?.querySelector(".theme-icon");
const archiveToggle = document.querySelector("#archiveToggle");
const updateLogList = document.querySelector("#update-log-list");
const updateLogToggle = document.querySelector("#updateLogToggle");
const siteNotesToggle = document.querySelector("#siteNotesToggle");
const siteNotesContent = document.querySelector("#site-notes-content");
const siteNotesCount = document.querySelector("#siteNotesCount");

let archiveEntries = [];
let showFullArchive = false;
let showAllUpdates = false;
let allUpdateNotes = [];
const ARCHIVE_PREVIEW_LIMIT = 16;
const UPDATE_PREVIEW_LIMIT = 5;
const archiveSymbols = ["✦", "☾", "✶", "∙"];

function getStoredTheme() {
  return localStorage.getItem(THEME_KEY) || LEGACY_THEME_KEYS.map((key) => localStorage.getItem(key)).find(Boolean) || "dark";
}

function applySiteTheme(theme) {
  const normalizedTheme = theme === "light" ? "light" : "dark";
  document.documentElement.classList.toggle("theme-light", normalizedTheme === "light");
  document.documentElement.classList.toggle("theme-dark", normalizedTheme === "dark");
  localStorage.setItem(THEME_KEY, normalizedTheme);
  if (!themeSwitch || !themeIcon) return;
  const isLight = normalizedTheme === "light";
  themeSwitch.setAttribute("aria-pressed", String(isLight));
  themeSwitch.setAttribute("aria-label", "Toggle light and dark theme");
  themeSwitch.title = isLight ? "Night mode / 夜间模式" : "Day mode / 日间模式";
  themeIcon.textContent = isLight ? "☼" : "☾";
}

function transitionHomeTheme(theme) {
  document.documentElement.classList.add("theme-transitioning");
  applySiteTheme(theme);
  window.clearTimeout(transitionHomeTheme.timer);
  transitionHomeTheme.timer = window.setTimeout(() => {
    document.documentElement.classList.remove("theme-transitioning");
  }, 720);
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

function sortByNewest(entries) {
  return [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
}

async function loadBriefingIndex() {
  const index = await fetchJson("data/briefings/index.json");
  return sortByNewest(index);
}

async function loadBriefing(entry) {
  return fetchJson(`data/briefings/${entry.file || `${entry.date}.json`}`);
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

function displaySectionLabel(section, index) {
  const normalizedId = normalizeSectionId(section);
  return SECTION_LABELS[section.id] || SECTION_LABELS[section.heading] || SECTION_LABELS[normalizedId] || topicFallback[index] || section.heading || "Briefing";
}

function trimText(text = "", maxLength = 360) {
  const clean = String(text).replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength).trim()}...`;
}

function escapeAttribute(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHTML(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sectionPreview(section, fallback = "") {
  if (section.summaryChinese) return section.summaryChinese;
  if (section.body || section.text) return section.body || section.text;
  if (Array.isArray(section.items) && section.items.length) {
    return section.items
      .map((item) => [item.title, item.summaryChinese].filter(Boolean).join("："))
      .filter(Boolean)
      .join(" ");
  }
  return fallback;
}

function sectionPlainText(section) {
  return sectionPreview(section, "");
}

function formatDateParts(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return { year: "", monthDay: dateString, weekday: "" };
  return {
    year: String(date.getFullYear()),
    monthDay: new Intl.DateTimeFormat("en-US", { month: "2-digit", day: "2-digit" }).format(date).replace("/", " / "),
    weekday: new Intl.DateTimeFormat("zh-CN", { weekday: "long" }).format(date),
  };
}

function renderTags(tags = []) {
  if (!tags.length) return "";
  return `<div class="tag-row">${tags.map((tag) => `<span>${tag}</span>`).join("")}</div>`;
}

function renderTodayBriefing(briefing) {
  const sections = orderedSections(briefing.sections || []).slice(0, 5);
  const themeText = briefing.theme || briefing.subtitle || briefing.title || SITE_TITLE;
  const introText = briefing.introChinese || briefing.intro?.body || "今天的小报还在整理中，请稍后回来阅读。";
  const topicTags = briefing.tags || briefing.topics || [];
  const signalRows = (sections.length ? sections : topicFallback.map((heading) => ({ heading }))).slice(0, 5)
    .map((section, index) => {
      const [english, chinese = ""] = displaySectionLabel(section, index).split("｜");
      const preview = sectionPreview(section, [
        ...signalFallbackText,
      ][index] || "");
      return `
        <div class="signal-row">
          <span class="signal-icon">${signalIcons[index] || "✦"}</span>
          <div>
            <strong>${english}${chinese ? ` / ${chinese}` : ""}</strong>
            <small>${trimText(preview, 58)}</small>
          </div>
        </div>
      `;
    })
    .join("");
  const englishPreview = briefing.englishParagraph?.english || briefing.sentenceAnalysis?.sentence || briefing.sentenceLab?.sentence || sectionPlainText(sections[0]) || "";
  const href = `briefing.html?date=${briefing.date}`;
  const dateParts = formatDateParts(briefing.date);

  if (readTodayLink) {
    readTodayLink.href = href;
  }
  todayBriefing.innerHTML = `
    <div class="today-main">
      <div class="date-card" aria-label="${briefing.date}">
        <span>${dateParts.year}</span>
        <strong>${dateParts.monthDay}</strong>
        <small>${dateParts.weekday}</small>
      </div>
      <div class="today-copy">
        <p class="dateline">今日主题 / Today’s Theme</p>
        <h3>${themeText}</h3>
        <p class="today-intro">${trimText(introText, 360)}</p>
        <a class="primary-button" href="${href}">阅读全文 / Read this briefing</a>
      </div>
    </div>
    <aside class="today-signals" aria-label="Today’s Signals">
      <p class="signal-title">今日信号 / Today’s Signals</p>
      <div class="signal-list">${signalRows}</div>
      ${topicTags.length ? renderTags(topicTags) : ""}
      ${
        englishPreview
          ? `<div class="english-preview"><span>One English Paragraph</span><p>${trimText(englishPreview, 320)}</p></div>`
          : ""
      }
    </aside>
  `;
}

function archiveMatches(entry, query) {
  if (!query) return true;
  const dateParts = formatDateParts(entry.date);
  const compactDate = dateParts.monthDay.replace(/\s/g, "");
  const haystack = [entry.date, compactDate, dateParts.monthDay, entry.title, entry.subtitle, entry.theme, entry.type, ...(entry.tags || []), ...(entry.topics || [])].join(" ").toLowerCase();
  const normalizedQuery = query.toLowerCase();
  const aliases = {
    finance: ["finance", "markets", "market", "economy", "business", "inflation", "central bank", "oil", "capital", "inequality"],
    markets: ["finance", "markets", "market", "economy", "business", "inflation", "central bank", "oil", "capital", "inequality"],
    economy: ["finance", "markets", "market", "economy", "business", "inflation", "central bank", "oil", "capital", "inequality"],
    books: ["books", "literature", "authors", "publishing", "culture", "art", "arts", "fashion", "media", "film"],
    literature: ["books", "literature", "authors", "publishing", "culture", "art", "arts", "fashion", "media", "film"],
    arts: ["books", "literature", "authors", "publishing", "culture", "art", "arts", "fashion", "media", "film"],
  };
  const searchTerms = aliases[normalizedQuery] || [normalizedQuery];
  return searchTerms.some((term) => haystack.includes(term));
}

function monthKey(dateString) {
  return dateString.slice(0, 7);
}

function monthLabel(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString.slice(0, 7);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

function groupByMonth(entries) {
  return entries.reduce((groups, entry) => {
    const key = monthKey(entry.date);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
    return groups;
  }, new Map());
}

function renderArchive(entries, query = "") {
  const cleanQuery = query.trim();
  const matched = entries.filter((entry) => archiveMatches(entry, cleanQuery));
  const visible = cleanQuery || showFullArchive ? matched : matched.slice(0, ARCHIVE_PREVIEW_LIMIT);

  if (archiveToggle) {
    const canExpand = !cleanQuery && matched.length > ARCHIVE_PREVIEW_LIMIT;
    archiveToggle.hidden = !canExpand;
    archiveToggle.textContent = showFullArchive ? "收起星历 / Collapse archive" : "查看全部星历 / View full archive";
  }

  if (!visible.length) {
    archiveList.innerHTML = `<div class="empty-state">No briefings match this search yet.</div>`;
    return;
  }

  archiveList.innerHTML = [...groupByMonth(visible).entries()]
    .map(([key, monthEntries]) => {
      const tokens = monthEntries
        .map((entry, index) => {
          const dateParts = formatDateParts(entry.date);
          const symbol = archiveSymbols[index % archiveSymbols.length];
          const previewText = entry.theme || entry.subtitle || entry.title || SITE_SUBTITLE;
          const label = escapeAttribute(`${entry.date} ${previewText}`);
          return `
            <a class="archive-date-token" href="briefing.html?date=${entry.date}" title="${label}" aria-label="${label}">
              <span class="archive-date-symbol" aria-hidden="true">${symbol}</span>
              <span class="archive-date-main">${dateParts.monthDay.replace(/\s/g, "")}</span>
              <span class="archive-date-weekday">${dateParts.weekday || "Briefing"}</span>
              <span class="archive-date-preview">${previewText}</span>
            </a>
          `;
        })
        .join("");
      return `
        <section class="archive-month" aria-label="${monthLabel(`${key}-01`)}">
          <h3>${monthLabel(`${key}-01`)}</h3>
          <div class="archive-token-grid">${tokens}</div>
        </section>
      `;
    })
    .join("");
}

function renderUpdateLogItem(update) {
  const date = escapeHTML(update.date || "");
  const title = escapeHTML(update.title || "Untitled update");
  const description = escapeHTML(update.description || "");
  const type = escapeHTML(update.type || "update");
  const relatedDate = escapeHTML(update.relatedDate || "");
  const link = update.link ? escapeAttribute(update.link) : "";
  const titleHTML = link
    ? `<a class="site-notes-link" href="${link}">${title}</a>`
    : `<span class="site-notes-title">${title}</span>`;

  return `
    <li class="site-notes-item">
      <div class="site-notes-date">${date}</div>
      <div class="site-notes-main">
        ${titleHTML}
        ${description ? `<p class="site-notes-description">${description}</p>` : ""}
        ${relatedDate ? `<span class="site-notes-related">Related: ${relatedDate}</span>` : ""}
        <span class="site-notes-type">${type}</span>
      </div>
    </li>
  `;
}

function renderUpdateLogError() {
  if (siteNotesCount) siteNotesCount.textContent = "0 updates";
  if (updateLogToggle) updateLogToggle.hidden = true;
  if (updateLogList) updateLogList.innerHTML = `<p class="site-notes-empty">暂无更新记录 / No updates yet.</p>`;
}

function renderUpdateLog() {
  if (!updateLogList) return;

  if (!Array.isArray(allUpdateNotes) || !allUpdateNotes.length) {
    renderUpdateLogError();
    return;
  }

  const visibleUpdates = showAllUpdates ? allUpdateNotes : allUpdateNotes.slice(0, UPDATE_PREVIEW_LIMIT);
  const visibleCount = Math.min(UPDATE_PREVIEW_LIMIT, allUpdateNotes.length);

  if (siteNotesCount) {
    siteNotesCount.textContent = showAllUpdates
      ? `${allUpdateNotes.length} updates`
      : `Latest ${visibleCount} / ${allUpdateNotes.length}`;
  }

  updateLogList.innerHTML = `
    <ol class="site-notes-list">
      ${visibleUpdates.map(renderUpdateLogItem).join("")}
    </ol>
  `;

  if (updateLogToggle) {
    updateLogToggle.hidden = allUpdateNotes.length <= UPDATE_PREVIEW_LIMIT;
    updateLogToggle.textContent = showAllUpdates
      ? "收起 / Collapse"
      : `查看全部更新 / Show all updates (${allUpdateNotes.length})`;
    updateLogToggle.setAttribute("aria-expanded", String(showAllUpdates));
  }
}

async function loadUpdateLog() {
  if (!updateLogList) return;

  try {
    const response = await fetch("data/update-log.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Update log not found: ${response.status}`);
    const updates = await response.json();

    if (!Array.isArray(updates) || !updates.length) {
      allUpdateNotes = [];
      renderUpdateLogError();
      return;
    }

    allUpdateNotes = [...updates].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    renderUpdateLog();
  } catch (error) {
    console.warn("Could not load update log:", error);
    renderUpdateLogError();
  }
}

function renderEmptyState(message) {
  todayBriefing.innerHTML = `<div class="empty-state">${message}</div>`;
  archiveList.innerHTML = `<div class="empty-state">Archive is empty.</div>`;
}

archiveSearch.addEventListener("input", (event) => {
  showFullArchive = false;
  renderArchive(archiveEntries, event.currentTarget.value.trim());
});

archiveToggle?.addEventListener("click", () => {
  showFullArchive = !showFullArchive;
  renderArchive(archiveEntries, archiveSearch.value.trim());
});

themeSwitch?.addEventListener("click", () => {
  const nextTheme = document.documentElement.classList.contains("theme-light") ? "dark" : "light";
  transitionHomeTheme(nextTheme);
});

siteNotesToggle?.addEventListener("click", () => {
  const isExpanded = siteNotesToggle.getAttribute("aria-expanded") === "true";
  siteNotesToggle.setAttribute("aria-expanded", String(!isExpanded));
  if (siteNotesContent) siteNotesContent.hidden = isExpanded;
});

updateLogToggle?.addEventListener("click", () => {
  showAllUpdates = !showAllUpdates;
  renderUpdateLog();
});

async function init() {
  applySiteTheme(getStoredTheme());
  loadUpdateLog();
  archiveEntries = await loadBriefingIndex();
  if (!archiveEntries.length) {
    renderEmptyState("No daily briefings have been added yet.");
    return;
  }
  const newest = archiveEntries[0];
  const briefing = await loadBriefing(newest);
  renderTodayBriefing(briefing);
  renderArchive(archiveEntries);
}

init().catch((error) => {
  renderEmptyState(`Could not load briefings: ${error.message}`);
});
