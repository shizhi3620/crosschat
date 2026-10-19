/**
 * PII 脱敏（隐私设计）：入模前把邮箱/电话/地址/卡号替换为占位符，
 * 模型输出在填入发送框前可用 restoreDraft 还原。纯字符串处理，零依赖。
 */

export const PII_TYPES = {
  EMAIL: 'EMAIL',
  PHONE: 'PHONE',
  ADDRESS: 'ADDRESS',
  CARD: 'CARD',
};

/**
 * 电话号码正则集合（评审 P1-3：补齐越南/巴西/泰国/印尼本地格式）。
 * compliance.js 直接复用本数组，保证「脱敏」与「发送前合规扫描」同形，不允许两边漂移。
 * 全部带数字边界，避免把连续的订单号切成电话（但 09xxxxxxxx 这类电话形数字本身
 * 无法与订单号区分——按 PII 从严处理）。
 */
export const PHONE_REGEXES = [
  // 中国大陆手机号（必须以 1[3-9] 开头）
  /(?<!\d)1[3-9]\d{9}(?!\d)/g,
  // 美式电话 (234) 567-8900 / 234-567-8900 / +1 234 567 8900
  /(?:\+?1[-.\s])?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}(?![\d-])/g,
  // 越南手机 0901 234 567 / 0901234567（10 位，0[3-9] 开头）
  /(?<!\d)0[3-9]\d{2}[ .-]?\d{3}[ .-]?\d{3}(?!\d)/g,
  // 巴西手机 (11) 98765-4321 / 11 98765-4321（9 位号码，第 9 位为 9）
  /(?<!\d)(?:\(?\d{2}\)?[ .]?)?9\d{4}[ .-]?\d{4}(?!\d)/g,
  // 泰国 081-234-5678 / 02-345-6789（手机号 10 位 / 曼谷固话）
  /(?<!\d)0\d{1,2}[ .-]?\d{3}[ .-]?\d{4}(?!\d)/g,
  // 印尼 0812-3456-7890 / 081 234 5678（长短号写法不一）
  /(?<!\d)08\d{1,3}[ .-]?\d{3,4}[ .-]?\d{2,4}(?!\d)/g,
  // 带 + 国家码的国际号码（分组允许 2–4 位，兼容 2 位区号）
  /\+\d{1,3}[-.\s]?\d{2,4}[-.\s]?\d{2,4}[-.\s]?\d{2,4}/g,
];

const PATTERNS = [
  // 银行卡 / 信用卡号（13–19 位，允许空格/连字符分段），前置简单 Luhn 校验
  {
    type: PII_TYPES.CARD,
    regex: /(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)/g,
    validate: (raw) => {
      const digits = raw.replace(/\D/g, '');
      if (digits.length < 13 || digits.length > 19) return false;
      let sum = 0;
      let alt = false;
      for (let i = digits.length - 1; i >= 0; i--) {
        let d = digits.charCodeAt(i) - 48;
        if (alt) {
          d *= 2;
          if (d > 9) d -= 9;
        }
        sum += d;
        alt = !alt;
      }
      return sum % 10 === 0;
    },
  },
  { type: PII_TYPES.EMAIL, regex: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  ...PHONE_REGEXES.map((regex) => ({ type: PII_TYPES.PHONE, regex })),
  // 英文街道地址
  {
    type: PII_TYPES.ADDRESS,
    regex:
      /\d{1,5}[A-Za-z]?\s+[A-Za-z][A-Za-z .'-]{2,30}?\s(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Apartment|Apt|Suite|Ste)\.?\s*(?:#?\s?[A-Za-z0-9-]{1,8})?/g,
  },
  // 中文地址：xx省/市 xx市/区/县/镇 + 4 字以上门牌号细节
  {
    type: PII_TYPES.ADDRESS,
    regex:
      /[一-龥]{2,8}?(?:省|自治区|特别行政区)[一-龥]{2,12}?(?:市|区|县|州|盟)[一-龥A-Za-z0-9#号楼栋室单元层路街道巷弄里区苑村组-]{4,40}/g,
  },
];

/**
 * @returns {{text: string, entities: Array<{type:string,value:string,placeholder:string}>}}
 */
export function redact(input) {
  let text = String(input ?? '');
  const entities = [];
  const seen = new Map(); // value+type -> placeholder

  for (const { type, regex, validate } of PATTERNS) {
    regex.lastIndex = 0;
    text = text.replace(regex, (match) => {
      if (validate && !validate(match)) return match;
      const key = `${type}:${match}`;
      if (seen.has(key)) return seen.get(key);
      const n = entities.filter((e) => e.type === type).length + 1;
      const placeholder = `[${type}_${n}]`;
      entities.push({ type, value: match, placeholder });
      seen.set(key, placeholder);
      return placeholder;
    });
  }
  return { text, entities };
}

/** 还原草稿中的占位符（发送前在卖家本机执行，占位符绝不出域后留在给买家的文案里） */
export function restoreDraft(draft, entities) {
  let out = String(draft ?? '');
  for (const e of entities || []) {
    out = out.split(e.placeholder).join(e.value);
  }
  return out;
}

export function detectPii(text) {
  return redact(text).entities;
}
