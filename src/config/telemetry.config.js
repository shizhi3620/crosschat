/**
 * 遥测配置（v1.0.1 安全修订，对应评审 P1-6）。
 *
 * v1.0.0 曾把 GA4 Measurement Protocol 的 apiSecret 打进公开安装包：
 * MP 调用必须在 URL 里带 secret，而安装包任何人都能解包——密钥等于公开，
 * 任何人都可向该 GA 资源伪造命中。因此 v1.0.1 起：
 *  - 客户端不再保存任何 GA apiSecret，也不直连 google-analytics.com；
 *  - endpoint 留空期间遥测完全停发（零外呼，国内/海外网络环境一致），
 *    isConfigured() 返回 false，track* 全部静默跳过；
 *  - 将来恢复统计时，endpoint 必须指向 board 自建的匿名中转：客户端只 POST
 *    白名单事件 JSON，由中转在服务端持有 GA measurement id + apiSecret；
 *  - measurementId 本身不是保密信息（网页版 GA 本来就公开），此处保留仅为记录归属。
 *
 * 必须由 board 手动完成、代码无法替代的动作：
 *  1) 立即在 GA4 管理后台吊销 v1.0.0 随包泄露的那串 api_secret（事件级别作废）；
 *  2) 部署匿名中转后把 endpoint 改成中转 https 地址，并在 manifest.json 的
 *     host_permissions 中登记该 origin（SW 跨域 fetch 需要）；
 *  3) 中转侧只接受 telemetry.js 白名单事件与参数，拒绝任何正文/PII/URL 字段并限流。
 */
export const TELEMETRY = {
  /** 匿名中转地址；为空字符串 = 遥测停发。禁止直接填 google-analytics.com。 */
  endpoint: '',
  /** 非保密标识，仅记录归属；无 endpoint 时不会产生任何网络请求。 */
  measurementId: 'G-Y1ZP2M0BX6',
};

/** onboarding/隐私页里的联系邮箱（board 可替换） */
export const CONTACT_EMAIL = 'crosschat.app@gmail.com';
