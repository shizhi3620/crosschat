/**
 * 遥测与留资配置（v1.0.0 隐私设计）。
 *
 * 打包前（C2d）由 board 提供真实值替换占位符：
 *  - measurementId：GA4 Measurement ID（G- 开头，非保密，可在 issue 评论传递）
 *  - apiSecret：Measurement Protocol API secret（保密，只进商店 ZIP，
 *    绝不进入公开 git 提交；公开仓库保留本 example 形态，真值文件 .gitignore）。
 *
 * 占位符未替换时遥测自动停发（见 telemetry.js isConfigured），开发与测试零外呼。
 */
export const TELEMETRY = {
  endpoint: 'https://www.google-analytics.com/mp/collect',
  measurementId: 'G-XXXXXXXXXX',
  apiSecret: '__SET_AT_PACKAGING__',
};

/**
 * 托管额度等待名单的表单 URL（可选项）。
 * board 后续挂 Google Form / 其他表单后在此填写；为空时 onboarding 退化为 mailto 收集。
 */
export const WAITLIST_FORM_URL = '';

/** onboarding/options 里的联系邮箱占位（board 可在落地页上线后替换） */
export const CONTACT_EMAIL = 'contact@example.com';
