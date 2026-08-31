"""Convert the approved bilingual Markdown into the existing static report schema."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SLUG = 'when-pensions-meet-ageing'
DATE = '2026-08-31'
source = ROOT / 'data/special-reports/thailand-retirement-intimacy/special-report-draft-v1.md'
text = source.read_text()

def clean(value):
    return value.replace('**', '').strip()

def metadata(heading):
    section = text.split(heading + '\n', 1)[1].split('\n## ', 1)[0]
    return [clean(p) for p in section.strip().split('\n\n') if p.strip() != '---']

central = metadata('## Central Argument｜核心论点')
limits = metadata('## Evidence Limitations｜证据局限')
parts = re.split(r'\n## [一二三四五六]｜', text.split('\n## References｜')[0])[1:]
themes, blocks = [], []
for i, part in enumerate(parts, 1):
    zh, rest = part.split('\n', 1)
    paras = [p.strip() for p in rest.strip().split('\n\n') if p.strip() != '---']
    en = paras.pop(0).removeprefix('### ')
    assert len(paras) % 2 == 0
    pairs = [{'zh': clean(paras[j]), 'en': clean(paras[j+1])} for j in range(0, len(paras), 2)]
    assert all(re.search(r'[\u4e00-\u9fff]', p['zh']) and not re.search(r'[\u4e00-\u9fff]', p['en']) for p in pairs)
    themes.append({'id': f'part-{i}', 'en': en, 'zh': zh})
    blocks.append({'theme': f'part-{i}', 'pairs': pairs})

references = {'journalism': [], 'academic_research': []}
for line in text.split('\n## References｜参考资料', 1)[1].split('\n---', 1)[0].splitlines():
    match = re.match(r'- \*\*\[([NLU]\d+)\]\*\* (.+)', line)
    if not match:
        continue
    sid, citation = match.groups()
    url_match = re.search(r'https://\S+', citation)
    url = url_match.group(0) if url_match else ''
    author, year, remainder = re.match(r'(.+?)\. (\d{4})\. (.+)', citation).groups()
    title_match = re.search('“(.+?)”', remainder)
    title = title_match.group(1) if title_match else re.search(r'\*(.+?)\*', remainder).group(1)
    references['journalism' if sid.startswith('N') else 'academic_research'].append({
        'id': sid, 'author': author, 'title': title, 'date': year, 'url': url,
        'publication': '', 'citation_text': citation.replace(url, '').replace('*', '').strip(),
    })
all_ids = {r['id'] for group in references.values() for r in group}
assert set(re.findall(r'\[([NLU]\d+)\]', text.split('\n## References｜')[0])) <= all_ids
title_zh = '当养老金遇见衰老：泰国跨国婚姻中的权力与照护'
title_en = 'When Pensions Meet Ageing: Power and Care in Thai–Western Marriages'
report = {
    'title_en': title_en, 'title_zh': title_zh, 'slug': SLUG,
    'publication_date': DATE, 'last_updated': DATE, 'status': 'Published',
    'primary_region': 'Thailand｜泰国', 'topics': ['Gender｜性别', 'Society｜社会', 'Ageing｜老龄化'],
    'keywords': ['retirement migration', 'Thailand', 'care', 'ageing', 'intimacy', 'power'],
    'reading_time': '25 min', 'source_count': len(all_ids), 'academic_source_count': len(references['academic_research']),
    'dek_zh': '当经济特权与身体依赖并存，爱、金钱和照护如何在长期关系中被重新协商？',
    'dek_en': 'When economic privilege and bodily dependency coexist, how are love, money, and care renegotiated over time?',
    'research_question': {
        'question_zh': '当西方丈夫在泰国老去，跨国婚姻中的权力如何重新配置？',
        'question_en': 'How does power shift when Western husbands grow old in Thailand?',
        'trigger_zh': blocks[0]['pairs'][0]['zh'], 'trigger_en': blocks[0]['pairs'][0]['en'],
        'purpose_zh': central[0], 'purpose_en': central[1],
    },
    'evidence_limitations': {'zh': limits[0], 'en': limits[1]},
    'news': {'heading_zh': '退休、亲密关系与晚年照护', 'heading_en': 'Retirement, intimacy, and later-life care', 'themes': themes, 'blocks': blocks},
    'references': references,
}
briefing = {
    'date': DATE, 'title': title_zh, 'theme': title_zh, 'titleEnglish': title_en,
    'type': 'special-report', 'reportSlug': SLUG, 'introChinese': report['dek_zh'],
    'introParagraphsChinese': [
        {'text': report['research_question']['question_zh'], 'text_en': report['research_question']['question_en']},
        {'text': report['dek_zh'], 'text_en': report['dek_en']},
    ],
    'tags': report['keywords'],
    'sections': [{'id': 'special-report', 'heading': 'Research Question｜研究问题', 'summaryChinese': report['research_question']['question_zh']},
                 {'id': 'news-focus', 'heading': 'Research｜研究', 'summaryChinese': '退休生活、爱与金钱、返迁、身体依赖、照护成本与丧偶后的研究缺口。'}],
}
def dump(value):
    return json.dumps(value, ensure_ascii=False, indent=2) + '\n'

index_path = ROOT / 'data/briefings/index.json'
old_index = json.loads(index_path.read_text())
entry = {k: briefing[k] for k in ['date', 'title', 'theme', 'type', 'reportSlug', 'tags']}
entry['file'] = DATE + '.json'
index = [entry] + [e for e in old_index if e.get('reportSlug') != SLUG]
(ROOT / f'data/reports/{SLUG}.json').write_text(dump(report))
(ROOT / f'data/briefings/{DATE}.json').write_text(dump(briefing))
index_path.write_text(dump(index))
home_path = ROOT / 'index.html'
home = home_path.read_text()
for node_id, data in [('briefingIndexData', index), ('todayBriefingData', briefing)]:
    pattern = rf'(<script\b[^>]*\bid="{node_id}"[^>]*>).*?(</script>)'
    home, count = re.subn(pattern, lambda m: m[1] + '\n' + dump(data) + m[2], home, flags=re.S)
    assert count == 1, node_id
home_path.write_text(home)
print(f'Imported {len(blocks)} chapters, {sum(len(b["pairs"]) for b in blocks)} bilingual pairs, {len(all_ids)} references.')
