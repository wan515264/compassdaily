const THEME_KEY = "daily-compass-theme";
const article = document.querySelector("#reportArticle");
const themeSwitch = document.querySelector("#themeSwitch");
const themeIcon = themeSwitch?.querySelector(".theme-icon");

function escapeHTML(value = "") {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function applyTheme(theme) {
  const isLight = theme === "light";
  document.documentElement.classList.toggle("theme-light", isLight);
  document.documentElement.classList.toggle("theme-dark", !isLight);
  localStorage.setItem(THEME_KEY, isLight ? "light" : "dark");
  themeSwitch?.setAttribute("aria-pressed", String(isLight));
  if (themeIcon) themeIcon.textContent = isLight ? "☼" : "☾";
}

async function fetchJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(`${date}T00:00:00`));
}

function citationMap(report) {
  return Object.values(report.references || {}).flat().reduce((map, source) => map.set(source.id, source), new Map());
}

function citations(ids = [], sources) {
  if (!ids.length) return "";
  return `<span class="inline-citations">${ids.map((id) => {
    const source = sources.get(id);
    return source ? `<a href="${escapeHTML(source.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHTML(source.title)}">${escapeHTML(source.author)} (${escapeHTML(String(source.date).slice(0, 4))})</a>` : "";
  }).join("")}</span>`;
}

function renderBlocks(blocks, sources) {
  return blocks.map((block) => `<section class="report-subsection">
    <h3>${escapeHTML(block.heading_en)}<span>${escapeHTML(block.heading_zh)}</span></h3>
    <div class="bilingual-columns">
      <div lang="en">${block.paragraphs_en.map((paragraph, index) => `<p>${escapeHTML(paragraph)}${index === block.paragraphs_en.length - 1 ? citations(block.citations, sources) : ""}</p>`).join("")}</div>
      <div lang="zh-CN">${block.paragraphs_zh.map((paragraph) => `<p>${escapeHTML(paragraph)}</p>`).join("")}</div>
    </div>
  </section>`).join("");
}

function renderThemedBlocks(blocks, sources, configuredThemes = []) {
  const themes = configuredThemes?.length ? configuredThemes : [
    { id: "love", en: "Love", zh: "爱情" },
    { id: "marriage", en: "Marriage", zh: "婚姻" },
    { id: "body", en: "Body", zh: "身体" },
  ];
  return themes.map((theme, index) => {
    const themedBlocks = blocks.filter((block) => block.theme === theme.id);
    if (!themedBlocks.length) return "";
    return `<section class="report-theme" data-theme-part="${theme.id}"><header><span>${String(index + 1).padStart(2, "0")}</span><h3>${theme.en}<small>${theme.zh}</small></h3></header>${renderBlocks(themedBlocks, sources)}</section>`;
  }).join("");
}

function renderReferenceGroup(title, titleZh, entries = []) {
  if (!entries.length) return "";
  return `<section class="reference-group"><h3>${title}<span>${titleZh}</span></h3><ol>${entries.map((entry) => `<li><span>${escapeHTML(entry.author)}. “${escapeHTML(entry.title)}.” <em>${escapeHTML(entry.publication)}</em>, ${escapeHTML(entry.date)}.${entry.doi ? ` DOI: ${escapeHTML(entry.doi)}.` : ""}</span><a href="${escapeHTML(entry.url)}" target="_blank" rel="noopener noreferrer">Open source ↗</a></li>`).join("")}</ol></section>`;
}

function renderReport(report) {
  const sources = citationMap(report);
  document.title = `${report.title_en}｜The Daily Compass`;
  article.innerHTML = `
    <header class="report-header">
      <p class="report-type">Special Report｜特别报道</p>
      <h1>${escapeHTML(report.title_en)}<span>${escapeHTML(report.title_zh)}</span></h1>
      <p class="report-dek">${escapeHTML(report.dek_en)}<span>${escapeHTML(report.dek_zh)}</span></p>
      <dl class="report-metadata">
        <div><dt>Published</dt><dd>${formatDate(report.publication_date)}</dd></div>
        <div><dt>Status</dt><dd>${escapeHTML(report.status)}</dd></div>
        <div><dt>Region</dt><dd>${escapeHTML(report.primary_region)}</dd></div>
        <div><dt>Reading</dt><dd>${escapeHTML(report.reading_time)}</dd></div>
      </dl>
      <ul class="report-tags">${report.topics.map((topic) => `<li>${escapeHTML(topic)}</li>`).join("")}</ul>
    </header>

    <nav class="report-toc" aria-label="Report sections"><a href="#question"><span>01</span>Research Question<small>研究问题</small></a><a href="#news"><span>02</span>Research<small>研究</small></a><a href="#references"><span>↳</span>References<small>参考资料</small></a></nav>

    <section class="report-chapter question-chapter" id="question">
      <header><span>01</span><div><p>Research Question</p><h2>研究问题</h2></div></header>
      <blockquote><p lang="en">${escapeHTML(report.research_question.question_en)}</p><p lang="zh-CN">${escapeHTML(report.research_question.question_zh)}</p></blockquote>
      <div class="bilingual-columns"><div lang="en"><p>${escapeHTML(report.research_question.trigger_en)}</p><p>${escapeHTML(report.research_question.purpose_en)}</p></div><div lang="zh-CN"><p>${escapeHTML(report.research_question.trigger_zh)}</p><p>${escapeHTML(report.research_question.purpose_zh)}</p></div></div>
    </section>

    <section class="report-chapter" id="news">
      <header><span>02</span><div><p>Research</p><h2>研究</h2></div></header>
      <p class="chapter-purpose">${escapeHTML(report.news.heading_en)}<span>${escapeHTML(report.news.heading_zh)}</span></p>
      ${renderThemedBlocks(report.news.blocks, sources, report.news.themes)}
    </section>

    <section class="report-chapter references-chapter" id="references">
      <header><span>↳</span><div><p>References</p><h2>参考资料</h2></div></header>
      ${renderReferenceGroup("Journalism", "新闻报道", report.references.journalism)}
      ${renderReferenceGroup("Academic Research", "学术研究", report.references.academic_research)}
      ${renderReferenceGroup("Reports & Data", "报告与数据", report.references.reports_data)}
      ${renderReferenceGroup("Fiction / Cultural Text", "文学与文化文本", report.references.fiction_cultural_text)}
    </section>`;
}

async function init() {
  applyTheme(localStorage.getItem(THEME_KEY) || "dark");
  const slug = new URLSearchParams(window.location.search).get("slug") || "why-is-love-becoming-more-difficult";
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("Invalid report identifier.");
  const embeddedNode = document.querySelector("#embeddedReportData");
  const embeddedReport = embeddedNode ? JSON.parse(embeddedNode.textContent) : null;
  const report = embeddedReport?.slug === slug
    ? embeddedReport
    : await fetchJSON(`data/reports/${slug}.json`);
  renderReport(report);
}

themeSwitch?.addEventListener("click", () => applyTheme(document.documentElement.classList.contains("theme-light") ? "dark" : "light"));
init().catch((error) => { article.innerHTML = `<p class="empty-state">${escapeHTML(error.message)} / 专题加载失败。</p>`; });
