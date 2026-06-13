const SITE_TITLE = "The Daily Compass｜每日罗盘";
const SITE_SUBTITLE = "A bilingual daily briefing for navigating global news, culture, AI, and social change.";
const THEME_KEY = "daily-compass-theme";
const LEGACY_THEME_KEYS = ["daily-compass.home-theme", "daily-compass.theme"];

const SECTION_LABELS = {
  "Global News｜全球新闻": "Global News｜全球新闻",
  "Gender & Culture｜性别与文化": "Gender & Culture｜性别与文化",
  "Gender / Culture｜性别与文化": "Gender & Culture｜性别与文化",
  "Art, Fashion & Media｜艺术、时尚与媒介": "Art, Fashion & Media｜艺术、时尚与媒介",
  "Art / Fashion / Media｜艺术、时尚与媒介": "Art, Fashion & Media｜艺术、时尚与媒介",
  "Art / Fashion / Media｜艺术、时尚与媒体": "Art, Fashion & Media｜艺术、时尚与媒体",
  "AI & Tech｜AI 与科技": "AI & Tech｜AI 与科技",
  "AI / Tech｜AI 与科技": "AI & Tech｜AI 与科技",
};

const topicFallback = ["Global News｜全球新闻", "Gender & Culture｜性别与文化", "Art, Fashion & Media｜艺术、时尚与媒介", "AI & Tech｜AI 与科技"];
const signalIcons = ["◎", "☾", "◉", "✶"];
const todayBriefing = document.querySelector("#todayBriefing");
const archiveList = document.querySelector("#archiveList");
const archiveSearch = document.querySelector("#archiveSearch");
const readTodayLink = document.querySelector("#readTodayLink");
const themeSwitch = document.querySelector("#themeSwitch");
const themeIcon = themeSwitch?.querySelector(".theme-icon");
const archiveToggle = document.querySelector("#archiveToggle");
const updateLogList = document.querySelector("#update-log-list");
const siteNotesToggle = document.querySelector("#siteNotesToggle");
const siteNotesContent = document.querySelector("#site-notes-content");
const siteNotesCount = document.querySelector("#siteNotesCount");

let archiveEntries = [];
let showFullArchive = false;
const ARCHIVE_PREVIEW_LIMIT = 16;
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

function displaySectionLabel(section, index) {
  return SECTION_LABELS[section.heading] || topicFallback[index] || section.heading || "Briefing";
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
  const sections = (briefing.sections || []).slice(0, 4);
  const signalRows = (sections.length ? sections : topicFallback.map((heading) => ({ heading }))).slice(0, 4)
    .map((section, index) => {
      const [english, chinese = ""] = displaySectionLabel(section, index).split("｜");
      const preview = sectionPreview(section, [
        "采集地缘政治、经济与气候的最新动态",
        "观察性别议题、社会文化与群体声音",
        "从美学、时尚与媒介看世界的想象与表达",
        "追踪技术发展、AI 应用与数字社会议题",
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

  readTodayLink.href = href;
  todayBriefing.innerHTML = `
    <div class="today-main">
      <div class="date-card" aria-label="${briefing.date}">
        <span>${dateParts.year}</span>
        <strong>${dateParts.monthDay}</strong>
        <small>${dateParts.weekday}</small>
      </div>
      <div class="today-copy">
        <p class="dateline">今日主题 / Today’s Theme</p>
        <h3>${briefing.theme || SITE_TITLE}</h3>
        <p class="today-intro">${briefing.introChinese || "今天的小报还在整理中，请稍后回来阅读。"}</p>
        <a class="primary-button" href="${href}">阅读全文 / Read this briefing</a>
      </div>
    </div>
    <aside class="today-signals" aria-label="Today’s Signals">
      <p class="signal-title">今日信号 / Today’s Signals</p>
      <div class="signal-list">${signalRows}</div>
      ${briefing.tags?.length ? renderTags(briefing.tags) : ""}
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
  const haystack = [entry.date, compactDate, dateParts.monthDay, entry.title, entry.theme, ...(entry.tags || [])].join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
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
          const label = escapeAttribute(`${entry.date} ${entry.theme || SITE_SUBTITLE}`);
          return `
            <a class="archive-date-token" href="briefing.html?date=${entry.date}" title="${label}" aria-label="${label}">
              <span class="archive-date-symbol" aria-hidden="true">${symbol}</span>
              <span class="archive-date-main">${dateParts.monthDay.replace(/\s/g, "")}</span>
              <span class="archive-date-weekday">${dateParts.weekday || "Briefing"}</span>
              <span class="archive-date-preview">${entry.theme || SITE_SUBTITLE}</span>
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
        <span class="site-notes-type">${type}</span>
      </div>
    </li>
  `;
}

async function loadUpdateLog() {
  if (!updateLogList) return;

  try {
    const response = await fetch("data/update-log.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Update log not found: ${response.status}`);
    const updates = await response.json();

    if (!Array.isArray(updates) || !updates.length) {
      if (siteNotesCount) siteNotesCount.textContent = "0 updates";
      updateLogList.innerHTML = `<p class="site-notes-empty">暂无更新记录 / No updates yet.</p>`;
      return;
    }

    if (siteNotesCount) {
      const countLabel = updates.length === 1 ? "1 update" : `${updates.length} updates`;
      siteNotesCount.textContent = `Latest ${countLabel}`;
    }

    updateLogList.innerHTML = `
      <ol class="site-notes-list">
        ${updates.slice(0, 5).map(renderUpdateLogItem).join("")}
      </ol>
    `;
  } catch (error) {
    console.warn("Could not load update log:", error);
    if (siteNotesCount) siteNotesCount.textContent = "0 updates";
    updateLogList.innerHTML = `<p class="site-notes-empty">暂无更新记录 / No updates yet.</p>`;
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
