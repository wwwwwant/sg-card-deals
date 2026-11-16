# sg-card-deals

新加坡信用卡餐饮优惠的免费静态数据源：GitHub Actions 每天用无头浏览器读取官方优惠页面，生成 `docs/deals.json`，通过 GitHub Pages 公开发布。手机上的 Claude（`card-promo-dining` skill）可以直接读取这个文件。

## 本地运行

```bash
npm install
npx playwright install chromium
npm run scrape   # 抓取 → raw/
npm run build    # 解析 + 合并 → docs/deals.json
```

## 用 Claude Code 继续开发

```bash
cd sg-card-deals
claude
```

建议的第一句话：

> 读一下 CLAUDE.md，跑一遍 scrape，看看 raw/ocbc-buffets.txt 的内容，然后写 OCBC 的解析器。

## 上线

1. 推送到一个公开的 GitHub 仓库
2. 打开 Settings → Pages → Deploy from a branch → `main` / `/docs`
3. 在 Actions 里手动运行一次 `scrape` 工作流
4. 数据地址：`https://<你的用户名>.github.io/sg-card-deals/deals.json`，把它加进 skill，作为第一个数据来源

## 注意

- 只读公开页面，不登录，不绕过验证码；把一个网站加进 `sources.json` 之前，先看它的使用条款和 robots.txt
- 每条优惠都要带来源链接和核实时间；没有来源的优惠不写进数据
- 数据是公开的，任何人都能读取
