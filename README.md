# 跨海聊 CrossChat

**English below.**

在你自己的客服后台里，用 AI 分级草拟多语种买家回复：翻译、知识库引用、合规与 PII 护栏。**只草拟、由你人工点发送——扩展绝不自动回复、不定时发消息、不执行任何账号操作。**

无服务器、数据默认不出本机：BYOK（自带火山方舟 API Key，浏览器直连服务商）+ 无需 Key 的内置离线演示双模式。

- 🌐 官网/安装：https://shizhi3620.github.io/crosschat/
- 📄 [隐私政策](docs/privacy.html) · [服务条款](docs/terms.html) · [支持与 FAQ](docs/support.html)
- 🧩 [Chrome Web Store 安装](https://chromewebstore.google.com/detail/crosschat-ai-customer-r/kglojbdkalmohpgcpobpknhdoidpclkh)（要求 Chrome 110+）

## 工作方式

1. 你在客服网页里选中买家消息，点工具栏部件；
2. 扩展做意图分级（L0 本地缓存 / L1 快速模型 / L2 旗舰模型，仅纠纷与强负面情绪升 L2）、按需翻译、匹配你自己的知识库并草拟回复；
3. 草稿附知识库引用、PII 脱敏说明与合规检查结果；
4. 你审核、修改，点「采纳并填入发送框」——草稿只被填进平台原生输入框，**发送按钮永远由你本人点击**。

## 安全与隐私（设计要点）

- **按需授权站点**：不申请「读取所有网站数据」。内容脚本通过 `optional_host_permissions` + `chrome.scripting` 动态注册，只在你明确添加的域上注入，移除即停。
- **Key 不出本机**：BYOK Key 仅存于 `chrome.storage.local`，请求从浏览器直连火山方舟，不经过任何中间服务器。
- **PII 入模前脱敏**：邮箱 / 电话 / 银行卡 / 地址在发给模型前替换为占位符，采纳时在本机还原。
- **合规护栏**：站外支付、交换联系方式、好评利诱、违规承诺等草稿会被警告或禁止填入。
- **匿名统计可一键关闭**：仅 4 个计数事件（install / daily_active / draft_generated / draft_adopted）+ 3 个枚举字段（模型级别、平台大类、模式），不含消息正文。详见[隐私政策](docs/privacy.html)。
- **无账号、无广告、不卖数据**；本地数据卸载即清除。

## 本地加载（开发者）

1. `chrome://extensions` → 开启「开发者模式」→「加载已解压的扩展程序」→ 选择本目录。
2. 默认演示模式：工具栏图标 → 打开演示页面（4 个场景，不联网）。
3. BYOK：设置页填入火山方舟 Base URL / API Key / L1、L2 接入点 ID；也可热切换到其他 OpenAI 兼容接入点。

```sh
npm test       # 70 个 node 单测
npm run check  # 全量 node --check + JSON 校验
```

无构建步骤：纯 ESM + 静态 HTML，`src/` 即运行时代码。

## 架构

```
manifest.json                        MV3：SW(module) + 动态内容脚本 + popup/options/dashboard
src/background/service-worker.js     消息总线、模型调用、配额判定、计量落盘
src/content/                         动态 loader + Shadow DOM 浮动部件 + 站点适配器（含通用手动兜底）
src/core/                            纯逻辑 ESM（node 与扩展共用、零 DOM）：
                                     默认配置/存储、PII、合规、知识库、分级路由、历史压缩、
                                     模型客户端、离线演示引擎、配额、计量、成本模型、遥测
src/data/knowledge-base.json         随包默认 FAQ（安装播种，设置页可编辑）
src/{popup,options,dashboard,onboarding,demo}/  各页面
docs/                                官网（GitHub Pages）：隐私政策、条款、支持/FAQ
test/                                node 单测与全量语法检查
```

数据流：`页面/演示页 → SW 消息 → PII 脱敏 → 意图/知识库 → 分级路由 →（BYOK 模型 / 离线引擎）→ 合规扫描 → 展示 → 人工采纳 → 还原 PII → 只填不发 → 采纳计量`。

## 路线图（非承诺）

- Edge（同 MV3 架构）版本；
- 可选付费托管额度（等候名单，仅自愿登记）；
- 真实站点选择器按用户反馈校准（通用手动兜底始终保留）。

## 许可证

[MIT](LICENSE)。你输入的知识库与会话内容权利归你所有。

---

# CrossChat (English)

AI-tiered multilingual reply drafting for cross-border seller chats, right inside your own customer-service pages: translation, knowledge-base citations, compliance and PII guardrails. **Drafts only — you click send. The extension never auto-replies, never schedules messages, and performs no actions in your accounts.**

No server; data stays local by default. BYOK (bring your own Volcengine Ark API key — browser-to-provider) plus a built-in offline demo that needs no key at all.

- 🌐 Site/install: https://shizhi3620.github.io/crosschat/
- 📄 [Privacy Policy](docs/privacy.html) · [Terms](docs/terms.html) · [Support & FAQ](docs/support.html)
- 🧩 [Install on the Chrome Web Store](https://chromewebstore.google.com/detail/crosschat-ai-customer-r/kglojbdkalmohpgcpobpknhdoidpclkh) (Chrome 110+).

## How it works

1. Select a buyer message on a customer-service page and open the widget.
2. It classifies the intent (L0 local cache / L1 fast model / L2 strong model — escalation only for disputes and strongly negative messages), translates when needed, matches your own knowledge base, and drafts a reply.
3. The draft shows KB citations, PII-masking results and compliance findings.
4. You review, edit, and adopt it into the page's native reply box — **you press the platform's send button yourself**.

## Security & privacy

- **Per-site authorization**, no "read all websites" permission: content scripts register dynamically only on domains you add, and unregister on removal.
- **Key never leaves your device**: stored in `chrome.storage.local`; model requests go straight from the browser to the provider.
- **PII masked before the model** (emails, phones, card numbers, addresses) and restored locally on adopt.
- **Compliance guardrails** flag or block off-platform payment, exchanged contacts, review incentives and policy-violating promises.
- **Opt-out anonymous counters only**: 4 events (install / daily_active / draft_generated / draft_adopted) with 3 enum fields (model tier, coarse platform class, mode), never message text. See the [Privacy Policy](docs/privacy.html).
- No account, no ads, no data sales; local data is removed on uninstall.

## Development

Load unpacked from `chrome://extensions` (Developer mode). Default mode is the offline demo; add your own Ark key in the options page for real drafts.

```sh
npm test       # 70 node unit tests
npm run check  # node --check across all JS + JSON validation
```

No build step: plain ESM and static HTML; `src/` is the runtime.

## License

[MIT](LICENSE). Your knowledge base and conversations remain yours.
