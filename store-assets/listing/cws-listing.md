# Chrome Web Store 上架文案包 · CrossChat v1.0.0

> 用途：C2d 提交时逐字段复制。默认 listing = English；另建 Chinese (Simplified) 本地化 listing（CWS 按商店语言自动展示）。
> 约束（plan rev.2 §8）：全文不出现任何电商平台名称/商标，不出现「自动回复 / auto-reply」措辞；只描述单一用途（草拟回复）。
> 占位符 `<...>` 在 C2c（GitHub Pages 落地页/隐私页）完成后回填。

---

## A. 商店元数据（两种 listing 通用）

| 字段 | 值 |
|---|---|
| Category（类别） | **Productivity** |
| 语言 | 商店 listing：English（默认）+ Chinese (Simplified)；扩展 UI 以中文为主、模型输出按买家语言 |
| 定价 | Free（无应用内购买、无广告、无订阅入口；验证期 0–90 天完全免费） |
| 分发 | Public（公开，全球区域；BYOK 需要用户自备火山方舟账号，离线演示全球可用） |
| 版本更新说明 / What's new | First public release.（首发） |
| 内容分级 | Everyone；不含用户生成内容社交/暴力/付费博彩等任何触发项 |
| 隐私政策 URL | `https://shizhi3620.github.io/crosschat/privacy.html` |
| 官网 | `https://shizhi3620.github.io/crosschat/` |
| 支持页 / 联系 | `https://shizhi3620.github.io/crosschat/support.html`；联系邮箱 `crosschat.app@gmail.com` |
| 单张用途（Single purpose） | 见 D 节，逐字粘贴 |
| 权限说明（Permission justifications） | 见 E 节，逐字段粘贴 |
| 素材 | icon 128×128、marquee promo 1400×560、截图 4 张（见 G 节） |

---

## B. English listing（默认）

### Item name（≤75 字符，当前 48）
```
CrossChat — AI Customer Reply Drafting Assistant
```

### Summary（≤132 字符，当前 116；与包内 `_locales/en` manifest description 逐字一致）
```
Multilingual AI reply drafts for seller chats: translation, KB citations, PII masking. Drafts only — you click send.
```

> ⚠️ **CWS 提交陷阱（2026-10-17 首包实测）**：上传 ZIP 后，商店会用包内 manifest 的英文 description **自动预填** Summary 字段。首包该串为 145 字符，提交时被拒（`The description translation in locale en is too long: 145. It exceeds maximum size limit of 132 characters.`）。已把 manifest description 改为上面这串（116）并重打包；重传新包后仍须肉眼复核 Summary = 本串。若不想重传包，也可直接在表单里把该字段手动改成上面这串再提交。

### Full description
```
CrossChat helps cross-border e-commerce sellers answer buyer messages in any language. It never sends a message for you.

You capture the buyer's message in the seller backend you already use. CrossChat classifies it, translates when needed, and drafts a reply grounded in your own knowledge base (shipping times, return policy, sizing, payment and more). You review, edit if you like, and click the platform's own send button yourself.

How replies are drafted
- Smart triage keeps cost and latency low: routine FAQ questions are served from an instant local cache, everyday questions use a fast model, and a stronger model is reserved for genuinely difficult cases such as disputes or strongly negative messages.
- Knowledge-base citations: drafts reference the exact KB entry used, so you can verify before sending.
- Translation and bilingual drafting for cross-border buyer conversations.
- Works in your existing seller center, CRM or webmail: the assistant is injected only on the sites you explicitly authorize, and any custom domain can be added.

Safety by design
- Drafts only. CrossChat never clicks send, never schedules messages, and never performs actions in buyer conversations. Every reply goes out manually, by you.
- Personal data (email addresses, phone numbers, card numbers, postal addresses) is detected and masked before any model request, and restored automatically when you adopt a draft.
- Compliance guardrails flag risky drafts — off-platform payment requests, exchanged contact details, review incentives, policy-violating promises — and prevent unsafe content from being filled into the reply box.

Privacy first
- No account and no sign-up. Conversations and settings stay on your device and are removed when you uninstall the extension.
- BYOK: optionally bring your own Volcengine Ark (Doubao) API key. The key is stored only in local browser storage, and model requests go directly from your browser to the provider — they do not pass through any server of ours.
- No key? A built-in offline demo (four sample scenarios, including a dispute case) runs the complete pipeline without any network access.
- Anonymous usage statistics (install, daily activity, draft/adopt counts, model tier, coarse platform class) contain no message text, personal information or full URLs, and can be switched off in one click on the settings page.

Cost
- Free during the launch validation period, with no feature limits.
- With BYOK, you pay the model provider directly according to your own usage.
- An optional small hosted trial quota may later be offered to waitlist members; joining requires only an email.

Requirements: Google Chrome 110 or newer (other Chromium browsers follow later). Support and privacy details are linked on this listing.
```

---

## C. Chinese (Simplified) listing

### 商品名称（≤75 字符，当前 27）
```
跨海聊 CrossChat — AI 客服回复草拟助手
```

### 一句话简介（≤132 字符，当前 52）
```
跨境客服 AI 草拟多语种回复：翻译、知识库引用、PII 脱敏与合规护栏。只草拟，每条回复由你亲自发送。
```

### 详细描述
```
跨海聊帮助跨境电商卖家用任何语言回复买家消息——但绝不会替你发送任何一条消息。

在你已经在使用的卖家后台里捕获买家消息，跨海聊会自动分级、按需翻译，并基于你自己的知识库（物流时效、退换货政策、尺码、支付方式等）草拟回复。你审核、随意修改，然后亲自点击平台自己的发送按钮。

回复是怎么草拟出来的
- 智能分级，兼顾成本与速度：常规 FAQ 走即时本地缓存，日常问题走快速模型，只有纠纷、强烈负面情绪等真正困难的场景才调用更强的模型。
- 知识库引用：草稿会标注引用了哪一条 KB，发送前可逐条核对。
- 翻译与双语草拟，覆盖跨境买家会话。
- 运行在你现有的卖家中心、CRM 或网页邮箱中：助手只在你明确授权的站点上注入，也可以添加任意自定义域名。

安全是设计出来的
- 只草拟，不代发。跨海聊不会点击发送、不会定时发消息、不会对买家会话执行任何操作。每条回复都由你本人手动发出。
- 个人信息（邮箱、电话、银行卡号、地址）在发送给模型之前先识别并脱敏，你采纳草稿时自动还原。
- 合规护栏会标记高风险草稿——站外支付、交换联系方式、索要/利诱好评、违反平台政策的承诺——并阻止不安全内容被填入回复框。

隐私优先
- 无需账号、无需注册。会话与配置只存在你的设备本地，卸载扩展即清除。
- BYOK：可填入你自己的火山方舟（豆包）API Key。Key 只保存在浏览器本地存储，模型请求从你的浏览器直发服务商，不经过我们的任何服务器。
- 暂时没有 Key？内置离线演示（四个示例场景，含一个纠纷场景）无需联网即可跑通完整流程。
- 匿名使用统计（安装、每日活跃、草拟/采纳计数、模型级别、平台大类）不含消息正文、个人信息或完整网址，并可在设置页一键关闭。

费用
- 上线验证期内完全免费，无功能限制。
- 使用 BYOK 时，模型调用费用由你直接与服务商按实际用量结算。
- 未来可能向等候名单用户开放少量托管体验额度，加入名单只需留下邮箱。

环境要求：Google Chrome 110 或更高版本（其他 Chromium 浏览器随后支持）。支持方式与隐私政策见本页链接。
```

---

## D. Single purpose（CWS 隐私实践表，英文，≤200 词）

```
CrossChat has one single purpose: help a cross-border seller draft replies to incoming buyer messages inside the seller's own customer-service web pages.

With the seller's explicit action, the extension captures the selected buyer message, optionally translates it, processes it through either a built-in offline demo engine or the seller's own model provider under bring-your-own-key (BYOK), and displays a draft reply together with knowledge-base citations, personal-information masking results and compliance findings. On the seller's explicit click it fills the draft into the page's existing reply box for human review. The seller then clicks the platform's own send button; the extension never sends.

Secondary capabilities all serve this purpose: a local usage/cost dashboard computed from the seller's own activity, per-site on/off controls, an onboarding page with an offline demo, and anonymous opt-out usage counts that contain no message content.

The extension does not send messages, schedule messages, click platform buttons, collect message content on a server, build advertising profiles, or take any autonomous action in a user's accounts. Site access is granted per domain by the user and can be revoked at any time.
```

---

## E. 权限与数据实践（Privacy practices 表单逐字段）

### E1. 权限用途说明（permission justification）

| 申请项 | 粘贴说明（英文） |
|---|---|
| `storage` | `Stores the user's settings, optional BYOK API key, knowledge base, conversation history and local usage metrics. All data remains in chrome.storage local areas; nothing is uploaded by the extension except the direct model request described below and anonymous opt-out counts.` |
| `scripting` | `Dynamically registers and unregisters the assistant content script only on domains the user has explicitly added and granted at runtime (via optional_host_permissions). No content script is injected before the user authorizes a site; removing a site unregisters it immediately.` |
| host `https://ark.cn-beijing.volces.com/*` | `Required only when the user configures BYOK with their own Volcengine Ark (Doubao) API key: model requests are sent directly from the browser to this provider using the user's key. The built-in offline demo mode never contacts this host.` |
| host `https://www.google-analytics.com/*` | `Receives anonymous, whitelisted usage statistics (install, daily-active, draft/adapt events carrying only coarse enum fields: model tier L0/L1/L2, platform class, demo/BYOK mode). No message text, personal data, page titles or full URLs are ever sent. Telemetry is enabled by default and can be disabled with one toggle in the options page; no requests are made after opt-out.` |
| optional hosts `https://*/*` / `http://*/*` | `Requested at runtime, one domain at a time, only after the user adds a seller site in settings (marketplace seller centers, webmail, or self-hosted/internal CRM systems, some of which are served over HTTP on intranets). The extension ships with no default broad site access; grants are listed and revocable on the options page.` |

### E2. 数据收集证明（certification 勾选项）

- **不销售数据**：勾选；**不用于单一用途之外的任何目的**：勾选；**不用于广告个性化**：勾选（扩展本身不展示任何广告）。
- **Collected data 行**：
  - Web history：**不勾选**（不采集 URL/浏览历史；遥测仅含平台大类枚举，不是网址）。
  - Personal communications / Website content：**不勾选**——买家消息正文仅在用户主动操作时从浏览器直发用户自选的模型服务商（BYOK，用户与服务商之间的关系），扩展开发者不接收、不存储；离线演示完全不联网。
  - Personal info：仅在用户**自愿**加入托管额度等候名单时通过表单收集邮箱（用途：额度开放通知；不扩展用途）。表单为托管页，非扩展采集。
  - 技术性遥测（GA4，可一键关闭）：随机匿名客户端 ID（安装时生成，不关联身份）+ 事件枚举：`install` / `daily_active` / `draft_generated` / `draft_adopted`，字段仅 `level`(L0/L1/L2)、`platform_class`、`mode`(demo/byok) 及聚合计数。不与任何身份关联。
- **Cookie 使用声明**：扩展自身不设置 Cookie；GA 通过 Measurement Protocol 收数，不依赖页面 Cookie。
- **第三方服务商披露**（隐私页同步写明）：
  1. **火山方舟 Volcengine Ark**——仅 BYOK 模式，用户自有 Key，浏览器直发；
  2. **Google Analytics 4**——匿名枚举遥测，可关闭。
- **数据保留/删除**：本地数据卸载即清除；GA4 按最短保留配置；邮箱等候名单可随时来信删除（C2c 隐私页给出邮箱与 30 天承诺）。
- 儿童：不面向 13 岁以下儿童，无定向收集。
- 合规法规：非金融/医疗类；无健康、精确位置、生物识别等敏感类别。

### E3. CWS 审核员可能提问的预案（C2d checklist 引用，不在表单里粘贴）

- 为何要 `http://*/*`：仅用于用户自行添加的内网/自建 CRM；权限为 optional，运行时逐域弹窗申请，默认零站点访问。
- 为何默认含两个 host：Ark = BYOK 用户主动配置后才用；GA = 可关闭的匿名计数。两者均不传消息正文。
- 是否自动化操作卖家账号：否。hard boundary——扩展没有调用任何平台发送/消息 API，唯一动作是把草稿写进页面 textarea，且需要用户两次主动点击（草拟、采纳填入），发送动作 100% 在平台原生控件上由人完成。
- WAR 中为何列大量域名：那些是用户可能授权的候选站点；动态 `chrome.scripting` 注册，未授权不注入；商店素材与文案不使用任何平台商标。

---

## F. 商店文案禁用词自查（plan rev.2 §8 + CWS 规则）

- [x] 无任何平台名称/商标（TikTok / Shopee / Amazon / Gmail 等），中英文均无
- [x] 无「自动回复 / auto-reply / automatically respond / bot sends」类措辞；统一为「draft / 草拟，you click send / 由你亲自发送」
- [x] 无关键词堆砌、无「最/best/#1」、无效果保证
- [x] 描述中不放外链（支持/隐私走商店专用字段）
- [x] 不承诺平台政策合规结果，只描述「flag/block risky drafts」
- [x] 免费表述真实：验证期全功能免费；BYOK 费用是用户与服务商之间的直付，已明示

---

## G. 素材清单（与本包一起归档）

| 用途 | 文件 | 规格 | 状态 |
|---|---|---|---|
| Store icon | 扩展根目录 `assets/icons/icon-128.png`（manifest `icons` 已声明 16/32/48/128） | 128×128 PNG | ✅ |
| Marquee promo | `../promo-1400x560.png` | 1400×560 PNG（源 `promo-1400x560.svg`） | ✅ |
| Screenshot 1 | `../screenshots/ss-1-inbox-assistant.png` | 1280×800，真实收件箱场景：L2 纠纷升级 + KB 引用 + PII 脱敏 + 人工发送 | ✅ |
| Screenshot 2 | `../screenshots/ss-2-demo-l2-pii.png` | 1280×800，离线演示页跑纠纷+PII 全流程 | ✅ |
| Screenshot 3 | `../screenshots/ss-3-dashboard.png` | 1280×800，本地用量/成本看板 | ✅ |
| Screenshot 4 | `../screenshots/ss-4-onboarding.png` | 1280×800，三步引导 + 隐私三原则 | ✅ |
| Small promo 440×280 | — | 可选，不提交（C2d 如需再补，从 SVG 裁切） | ⏸️ |
| Global promo 920×680 | — | 可选，暂不提交 | ⏸️ |

截图全部为 Chrome for Testing 155 加载真实扩展代码的实拍（非设计稿），演示数据标注「演示模式」，无平台商标、无真实 PII，详见 `../screenshots/README.md`。

---

## H. 与代码的对应关系（提交前核对）

- manifest `name`/`description` 已改为 `__MSG_app_name__` / `__MSG_app_description__`：安装后英文 UI 用户看到 B 节名称，中文 UI 用户看到 C 节名称。
- **英文 description（Summary 同源）**：首包 `_locales/en` 为 145 字符，被 CWS 以 132 上限拒绝；2026-10-17（commit `8e0991c`）起改为与 §B Summary **逐字一致的 116 字符串**。`zh_CN` description 86 字符，与 §C 简介同义（商店中文 Summary 仍按 §C 粘贴）。
- CWS 上传 ZIP 时会以包内 default locale 的 description 自动预填 Summary 字段——重传包后必须打开 Store listing 页复核该字段长度与内容。
- 安装后 chrome://extensions 显示名来源：`_locales/en/messages.json`（default_locale=en）与 `_locales/zh_CN/messages.json`。
- 截图中 contact@example.com 仅为占位；正式联系邮箱 `crosschat.app@gmail.com` 已写入 `src/config/telemetry.config.js` 的 `CONTACT_EMAIL`（公开联系邮箱，非密钥）；商店包内页面运行时即显示真值。
