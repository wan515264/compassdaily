const WORD_TRANSLATIONS = {
  attention: "注意力；关注",
  climate: "气候",
  community: "社区",
  complex: "复杂的",
  culture: "文化",
  debate: "辩论；讨论",
  economy: "经济",
  education: "教育",
  evidence: "证据",
  global: "全球的",
  headline: "标题；头条",
  health: "健康",
  institution: "机构；制度",
  migration: "迁移；移民流动",
  policy: "政策",
  pressure: "压力",
  public: "公共的",
  research: "研究",
  resilience: "韧性；恢复力",
  society: "社会",
  source: "来源",
  technology: "技术",
  trust: "信任",
  visual: "视觉的",
  world: "世界",
};

function escapeHtml(text = "") {
  return String(text).replace(/[&<>"']/g, (char) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return entities[char];
  });
}

function escapeAttribute(text = "") {
  return escapeHtml(text).replace(/\n/g, " ");
}

function renderClickableWords(text, savedWords = []) {
  const savedSet = new Set(savedWords.map((item) => item.word));
  const sentenceParts = String(text || "").match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [String(text || "")];
  return sentenceParts
    .map((sentence) => {
      const cleanSentence = sentence.trim();
      return escapeHtml(sentence).replace(/\b[A-Za-z]+(?:'[A-Za-z]+)?\b/g, (match) => {
        const word = match.toLowerCase();
        const savedClass = savedSet.has(word) ? " saved" : "";
        return `<span class="inline-word${savedClass}" role="button" tabindex="0" data-word="${word}" data-sentence="${escapeAttribute(cleanSentence)}" onclick="window.handleInlineWordClick && window.handleInlineWordClick(event, '${word}')" title="点击查看释义和原句">${match}</span>`;
      });
    })
    .join("");
}

function localChineseMeaning(word) {
  return WORD_TRANSLATIONS[word.toLowerCase()] || "公共词典查询中";
}

function publicDictionaryUrl(word) {
  return `https://dict.youdao.com/result?word=${encodeURIComponent(word)}&lang=en`;
}

async function lookupPublicDictionary(word) {
  const cleanWord = word.toLowerCase();
  const result = {
    word: cleanWord,
    chinese: localChineseMeaning(cleanWord),
    english: "No English definition found yet.",
    phonetic: "",
    sourceUrl: publicDictionaryUrl(cleanWord),
  };
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`);
    if (response.ok) {
      const entry = (await response.json())[0];
      const meaning = entry?.meanings?.[0];
      result.phonetic = entry?.phonetic || entry?.phonetics?.find((item) => item.text)?.text || "";
      result.english = meaning?.definitions?.[0]?.definition || result.english;
    }
  } catch {
    result.english = "Public English dictionary is temporarily unavailable.";
  }
  return result;
}
