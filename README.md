# The Daily Compass｜每日罗盘

**The Daily Compass｜每日罗盘** 是一个静态网页形式的双语每日小报归档站，用来理解全球资讯、文化、性别议题、AI 与社会变化。

副标题：

```text
A bilingual daily briefing for navigating global news, culture, AI, and social change.
一份用于理解全球资讯、文化、AI 与社会变化的双语每日小报。
```

网站只保留 **Daily Briefing / 每日小报** 系统，不展示旧文章 feed。

页面功能：

- 首页展示最新一期小报和往期归档
- 首页采用 editorial briefing 版式：神秘罗盘 hero、今日小报头版、更新记录、星历档案和 About 区块
- 每期小报包含日期、主题、中文导读、分区内容、今日英文段落、今日关键词和今日思考
- 点击英文单词查看中英释义、朗读并加入单词本
- 保存原句，导出 CSV 单词本
- 英文段落朗读、学习打卡、进度记录、明暗主题
- 手机和电脑响应式布局

## 本地运行

在项目根目录运行：

```bash
python3 -m http.server 8000
```

然后打开：

```text
http://localhost:8000
```

小报 JSON 通过 `fetch()` 加载，所以建议使用本地服务器预览，不要直接双击打开 HTML。

## 小报数据

每日小报文件放在：

```text
data/briefings/YYYY-MM-DD.json
```

归档索引放在：

```text
data/briefings/index.json
```

模板文件是：

```text
data/briefings/template.json
```

每份小报包含：

- `date`
- `title`
- `subtitle`
- `theme`
- `introChinese`
- `sections`
- `englishParagraph`
- `keywords`
- `closing`
- `tags`
- `rawText`

首页会优先加载当天小报；如果当天还没有文件，则加载归档里的最新一篇。归档按日期从新到旧排序，点击后进入：

```text
briefing.html?date=YYYY-MM-DD
```

## 手动添加旧的小报

如果你想把以前生成的每日小报加进网站：

1. 复制 `data/briefings/template.json` 的结构。
2. 新建一个日期文件，例如 `data/briefings/2026-06-11.json`。
3. 填入标题、副标题、主题、中文导读、分区内容、英文段落、关键词、今日思考和标签。
4. 打开 `data/briefings/index.json`，加入：

```json
{
  "date": "2026-06-11",
  "title": "The Daily Compass｜每日罗盘",
  "theme": "Your theme",
  "file": "2026-06-11.json",
  "tags": ["AI", "culture"]
}
```

5. 保存后刷新首页，新的小报会出现在往期归档里。

## Import old ChatGPT daily briefings from Word

把旧的 ChatGPT 每日双语小报 Word 文档放在：

```text
imports/morning-mini-newspaper.docx
```

如果你希望使用 `mammoth` 提取 Word 文本，可以先安装：

```bash
npm install mammoth
```

然后运行导入脚本：

```bash
node scripts/import-docx-briefings.mjs
```

脚本会：

- 读取 `imports/morning-mini-newspaper.docx`
- 按 `推送日期｜YYYY 年 M 月 D 日` 或 `YYYY 年 M 月 D 日` 拆分小报
- 生成 `data/briefings/YYYY-MM-DD.json`
- 更新 `data/briefings/index.json`
- 保留 `rawText`，避免 Word 解析不完美时丢内容

导入后本地预览：

```bash
python3 -m http.server 8000
```

打开：

```text
http://localhost:8000
```

## Update Log

首页底部 **Site Notes｜站点札记** 的更新记录存放在：

```text
data/update-log.json
```

添加新记录时，把新的对象放在数组最上方：

```json
{
  "date": "YYYY-MM-DD",
  "title": "Short update title",
  "description": "One sentence describing what changed.",
  "type": "content",
  "relatedDate": "YYYY-MM-DD",
  "link": "briefing.html?date=YYYY-MM-DD"
}
```

常用 `type`：

- `briefing`
- `content`
- `design`
- `archive`
- `bugfix`
- `source`

如果某条记录没有相关页面，可以把 `link` 留空。保存并提交 `data/update-log.json` 后，首页的站点札记会自动显示最新 5 条更新。

## 自动生成

GitHub Actions 使用：

```text
.github/workflows/daily-briefing.yml
```

它会运行：

```bash
node scripts/update-daily-briefing.mjs
```

脚本会从 RSS 来源读取最新摘要，生成当天的 `data/briefings/YYYY-MM-DD.json`，更新 `data/briefings/index.json`，并自动提交变更。它不会调用付费 API，也不会更新旧文章 feed。

如果当天小报已经存在，脚本默认不会覆盖。需要重新生成时可以运行：

```bash
RESET_BRIEFING=1 node scripts/update-daily-briefing.mjs
```

## GitHub Pages 部署

在 GitHub 仓库进入：

```text
Settings -> Pages
```

设置：

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/ (root)`

保存后，GitHub Pages 会部署整个静态站点。

## 当前资源来源

- NPR
- Aeon
- The Conversation AU
- The Pudding
- ABC News
