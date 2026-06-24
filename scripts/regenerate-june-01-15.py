#!/usr/bin/env python3
import concurrent.futures
import datetime as dt
import html
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BRIEFING_DIR = ROOT / "data" / "briefings"
INDEX_FILE = BRIEFING_DIR / "index.json"
UPDATE_LOG = ROOT / "data" / "update-log.json"
UA = "The-Daily-Compass/1.0"

SECTION_CONFIG = {
    "global-news": {
        "heading": "全球新闻 / Global News",
        "expressions": [
            ("public response", "公共回应", "The story prompted a wider public response."),
            ("political pressure", "政治压力", "Political pressure continued to shape the debate."),
            ("international concern", "国际关切", "The issue has become a source of international concern."),
        ],
    },
    "finance-markets": {
        "heading": "金融与市场 / Finance & Markets",
        "expressions": [
            ("market pressure", "市场压力", "Market pressure can affect public policy."),
            ("economic inequality", "经济不平等", "Economic inequality shapes everyday opportunity."),
            ("global economy", "全球经济", "The global economy depends on energy, trade and trust."),
        ],
    },
    "gender-culture": {
        "heading": "性别与文化 / Gender & Culture",
        "expressions": [
            ("equal access", "平等机会；平等准入", "Equal access depends on more than formal rules."),
            ("social recognition", "社会承认", "Social recognition can change everyday experience."),
            ("lived experience", "切身经验", "Policy debates should include lived experience."),
        ],
    },
    "books-culture-arts": {
        "heading": "书籍、文化与艺术 / Books, Culture & Arts",
        "expressions": [
            ("cultural memory", "文化记忆", "Art can reshape cultural memory."),
            ("creative practice", "创作实践", "Creative practice responds to social change."),
            ("public audience", "公共观众", "The work invites a broader public audience."),
        ],
    },
    "ai-tech": {
        "heading": "人工智能与科技 / AI & Tech",
        "expressions": [
            ("digital infrastructure", "数字基础设施", "Digital infrastructure shapes public life."),
            ("public oversight", "公共监督", "New technologies require public oversight."),
            ("technological change", "技术变化", "Technological change creates new social questions."),
        ],
    },
}

ART_SECTIONS = {"artanddesign", "books", "culture", "fashion", "film", "music", "stage", "television-and-radio", "tv-and-radio"}
FINANCE_SECTIONS = {"business", "money"}
TECH_SECTIONS = {"technology", "science"}
GENDER_TERMS = re.compile(r"\b(women|woman|female|gender|lgbt|queer|trans|mother|maternal|abortion|equality|care|health|family|girl)\b", re.I)
TECH_TERMS = re.compile(r"\b(ai|artificial intelligence|tech|digital|data|platform|internet|robot|chip|climate|energy|science)\b", re.I)
EXCLUDED_SECTIONS = {"sport", "football", "crosswords", "thefilter", "thefilter-us", "commentisfree", "opinion"}


def get_json(url, retries=3):
    request = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.load(response)
        except Exception:
            if attempt == retries - 1:
                raise
            time.sleep(1.5 * (attempt + 1))


def clean(text):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", text or ""))).strip()


def translate(text):
    text = clean(text)[:450]
    if not text:
        return ""
    query = urllib.parse.urlencode({"q": text, "langpair": "en|zh-CN"})
    try:
        data = get_json(f"https://api.mymemory.translated.net/get?{query}", retries=2)
        translated = clean(data.get("responseData", {}).get("translatedText", ""))
        return translated if translated else text
    except Exception:
        return text


def guardian_items(date):
    params = urllib.parse.urlencode({
        "from-date": date,
        "to-date": date,
        "api-key": "test",
        "page-size": 200,
        "order-by": "newest",
        "show-fields": "trailText,headline",
    })
    data = get_json(f"https://content.guardianapis.com/search?{params}")
    items = []
    for row in data.get("response", {}).get("results", []):
        title = clean(row.get("webTitle"))
        summary = clean(row.get("fields", {}).get("trailText"))
        section = (row.get("sectionId") or "").lower()
        if not title or not summary or row.get("type") != "article" or section in EXCLUDED_SECTIONS or "/live/" in (row.get("webUrl") or ""):
            continue
        items.append({
            "title": title,
            "summary": summary,
            "url": row.get("webUrl"),
            "section": section,
        })
    return items


def classify(item):
    text = f"{item['title']} {item['summary']}"
    section = item["section"]
    if section in ART_SECTIONS:
        return "books-culture-arts"
    if section in FINANCE_SECTIONS:
        return "finance-markets"
    if GENDER_TERMS.search(text) or section in {"society", "lifeandstyle", "education"}:
        return "gender-culture"
    if section in TECH_SECTIONS or TECH_TERMS.search(text):
        return "ai-tech"
    return "global-news"


def select_items(items):
    buckets = {key: [] for key in SECTION_CONFIG}
    used = set()
    for item in items:
        bucket = classify(item)
        if len(buckets[bucket]) < 2 and item["url"] not in used:
            buckets[bucket].append(item)
            used.add(item["url"])
    fallbacks = [item for item in items if item["url"] not in used]
    for key in SECTION_CONFIG:
        while len(buckets[key]) < 2 and fallbacks:
            item = fallbacks.pop(0)
            buckets[key].append(item)
            used.add(item["url"])
    return buckets


def build_item(item, section_id):
    section_intro = {
        "global-news": "这篇报道关注当天的重要公共事件。阅读时可以同时观察事件本身、制度回应，以及风险如何在不同群体之间分配。",
        "finance-markets": "这篇报道关注市场、商业或宏观经济。阅读时要观察价格、资本、政策和不平等如何共同影响日常生活，而不是把它理解为投资建议。",
        "gender-culture": "这篇报道涉及身份、照护、平等或日常文化经验。它提醒我们，正式规则与真实生活之间经常存在需要被看见的距离。",
        "books-culture-arts": "这篇报道从书籍、艺术、时尚、媒体或视觉文化进入公共生活。文化作品不仅提供观看与娱乐，也参与塑造记忆、价值和社会想象。",
        "ai-tech": "这篇报道关注科技、科学或产业变化。重要的不只是新工具本身，也包括基础设施、劳动、监管和公共责任。",
    }
    title_cn = f"Guardian报道｜{item['title']}"
    summary_cn = section_intro[section_id]
    expressions = [
        {"expression": exp, "meaningChinese": meaning, "example": example}
        for exp, meaning, example in SECTION_CONFIG[section_id]["expressions"]
    ]
    return {
        "title": title_cn,
        "summaryChinese": summary_cn,
        "correspondingEnglish": item["summary"],
        "englishExpressions": expressions,
        "studyNote": "",
        "_source": {"label": f"The Guardian — {item['title']}", "url": item["url"]},
    }


def build_briefing(date, buckets):
    sections = []
    sources = []
    translated_titles = []
    for section_id, config in SECTION_CONFIG.items():
        built = []
        for source_item in buckets[section_id]:
            item = build_item(source_item, section_id)
            sources.append(item.pop("_source"))
            translated_titles.append(item["title"])
            built.append(item)
        sections.append({"id": section_id, "heading": config["heading"], "items": built})

    return {
        "date": date,
        "title": "The Daily Compass｜每日罗盘",
        "subtitle": "A bilingual daily briefing for navigating global news, culture, AI, and social change.",
        "theme": "公共生活、社会平等、文化表达与技术治理",
        "introChinese": "今天的小报关键词是：public life, systems, and responsibility（公共生活、系统与责任）。这些报道跨越政治、金融市场、性别文化、书籍艺术与科技，但共同追问制度如何分配可见性、机会、风险与责任。",
        "sections": sections,
        "englishParagraph": {
            "english": "Today’s stories show that public life is shaped by systems as much as by individual events. Political decisions influence security and trust. Markets reveal how capital and policy move through everyday life. Cultural debates determine whose experiences become visible, while books, art and media organize public memory. Technology changes access, labor and responsibility.",
            "chinese": "今天的报道显示，公共生活既由具体事件塑造，也由系统塑造。政治决定影响安全与信任，市场显示资本与政策如何进入日常生活，文化争论决定谁的经验能够被看见，而书籍、艺术与媒体组织公共记忆，技术则改变机会、劳动与责任。",
        },
        "keywords": [
            {"word": "public life", "meaning": "公共生活", "example": "Technology is becoming part of everyday public life."},
            {"word": "institution", "meaning": "制度；机构", "example": "Public institutions shape access and responsibility."},
            {"word": "visibility", "meaning": "可见性；被社会看见和承认", "example": "Media coverage can increase public visibility."},
            {"word": "oversight", "meaning": "监督；监管", "example": "Powerful systems require independent oversight."},
            {"word": "accountability", "meaning": "问责；责任归属", "example": "Accountability depends on clear evidence and rules."},
            {"word": "infrastructure", "meaning": "基础设施；支撑社会运行的系统", "example": "Digital infrastructure influences work and communication."},
        ],
        "sentenceLab": {
            "sentence": "Reading across these fields helps us ask not only what happened, but also which institutions made it possible.",
            "analysisChinese": "句子使用 not only ... but also ... 连接两个阅读层次：事件本身与使事件成为可能的制度条件。which institutions made it possible 是间接疑问结构。",
        },
        "reflection": {
            "english": "A daily event becomes easier to understand when we can see the system around it.",
            "chinese": "今天最想留下的一句话是：当我们看见事件周围的系统，日常新闻才会变得更容易理解。",
        },
        "tags": ["global", "finance", "markets", "gender", "culture", "books", "art", "media", "AI", "technology", "public life", "systems", "responsibility"],
        "sources": sources,
        "rawText": f"推送日期｜{date[:4]}年{int(date[5:7])}月{int(date[8:])}日\n\n今天的小报关键词是：public life, systems, and responsibility（公共生活、系统与责任）。",
    }


def main():
    dates = [(dt.date(2026, 6, 1) + dt.timedelta(days=i)).isoformat() for i in range(15)]
    all_items = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(guardian_items, date): date for date in dates}
        for future in concurrent.futures.as_completed(futures):
            date = futures[future]
            all_items[date] = future.result()
            print(f"Fetched {date}: {len(all_items[date])} candidates", flush=True)

    generated = {}
    for date in dates:
        buckets = select_items(all_items[date])
        briefing = build_briefing(date, buckets)
        generated[date] = briefing
        path = BRIEFING_DIR / f"{date}.json"
        path.write_text(json.dumps(briefing, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Generated {date}: {sum(len(s['items']) for s in briefing['sections'])} items", flush=True)

    index = json.loads(INDEX_FILE.read_text(encoding="utf-8"))
    by_date = {row["date"]: row for row in index}
    for date, briefing in generated.items():
        by_date[date] = {
            "date": date,
            "title": briefing["title"],
            "theme": briefing["theme"],
            "file": f"{date}.json",
            "tags": briefing["tags"],
        }
    INDEX_FILE.write_text(json.dumps(sorted(by_date.values(), key=lambda row: row["date"], reverse=True), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    log = json.loads(UPDATE_LOG.read_text(encoding="utf-8"))
    log = [entry for entry in log if entry.get("title") != "Regenerated June 1–15 briefing archive"]
    log.insert(0, {
        "date": "2026-06-22",
        "title": "Regenerated June 1–15 briefing archive",
        "description": "Rebuilt 15 complete bilingual editions from date-checked Guardian reporting, with five sections, English learning material, and specific source links in every edition.",
        "type": "archive",
        "relatedDate": "2026-06-15",
        "link": "briefing.html?date=2026-06-15",
    })
    UPDATE_LOG.write_text(json.dumps(log, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
