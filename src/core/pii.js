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
  // 中国大陆手机号（避免被订单号误伤：必须以 1[3-9] 开头）
  { type: PII_TYPES.PHONE, regex: /(?<!\d)1[3-9]\d{9}(?!\d)/g },
  // 美式电话 (234) 567-8900 / 234-567-8900 / +1 234 567 8900
  {
    type: PII_TYPES.PHONE,
    regex: /(?:\+?1[-.\s])?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}(?![\d-])/g,
  },
  // 带 + 国家码的国际号码（分组允许 2–4 位，兼容 2 位区号）
  { type: PII_TYPES.PHONE, regex: /\+\d{1,3}[-.\s]?\d{2,4}[-.\s]?\d{2,4}[-.\s]?\d{2,4}/g },
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
