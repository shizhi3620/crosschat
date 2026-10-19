/**
 * 营销合规引擎（plan 交付项 6，L0 规则层）：对「将要发给买家」的草稿做发送前扫描。
 * 两级：block（禁止填入/必须改）、warn（可发送但提示风险）。
 * 覆盖：外链、联系方式、索评利诱（中英文）、站外支付导流、Amazon 主动消息规则。
 */
import { PHONE_REGEXES } from './pii.js';

export const SEVERITY = { BLOCK: 'block', WARN: 'warn' };

/** 平台官方域名白名单：命中不判外链违规 */
const MARKETPLACE_DOMAINS = [
  'shopee', 'tiktok.com', 'tiktokglobalshop', 'amazon', 'lazada', 'ebay',
  'temu', 'aliexpress', 'alibaba', 'mercadolibre', 'walmart', 'etsy',
  'noon', 'coupang', 'rakuten',
];

/** 短链 / 引流站（绕过正常链接识别时也要拦） */
const OFFSITE_LINK_DOMAINS = [
  'bit.ly', 'tinyurl', 't.co', 'reurl.cc', 'cutt.ly', 'shorturl', 'rb.gy',
  'wa.me', 't.me', 'm.me', 'messenger.com', 'facebook.com', 'instagram.com',
  'line.me', 'zalo.me', 'viber', 'kakao', 'discord.gg', 'chatwith',
  'docs.google.com', 'forms.gle',
];

const URL_RE = /(?:https?:\/\/|www\.)[^\s<>()（）\[\]{}，。；、]+|\b[a-z0-9-]+\.(?:com|net|org|io|co|me|cn|shop|xyz|link|top|cc|info)\b(?:\/[^\s<>()（）]*)?/gi;

function domainOf(token) {
  return token.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/^m\./, '');
}

function isMarketplaceDomain(d) {
  return MARKETPLACE_DOMAINS.some((m) => d === m || d.endsWith(`.${m}`) || d.startsWith(`${m}.`));
}

// 每条规则返回命中片段数组（空数组 = 未命中）
const RULES = [
  {
    id: 'offsite_link',
    severity: SEVERITY.BLOCK,
    message: '检测到站外链接/短链，平台禁止交易导流，请移除后再发送。',
    test(text) {
      const hits = [];
      for (const m of text.matchAll(URL_RE)) {
        const token = m[0];
        const d = domainOf(token);
        if (OFFSITE_LINK_DOMAINS.some((o) => d.includes(o))) {
          hits.push(token);
        } else if (!isMarketplaceDomain(d.split('/')[0])) {
          hits.push(token);
        }
      }
      return hits;
    },
  },
  {
    id: 'offsite_contact_channel',
    severity: SEVERITY.BLOCK,
    message: '检测到站外联系方式（IM/社交账号），引导脱离平台沟通违反平台规则。',
    test(text) {
      const patterns = [
        /\bwhats?\s?app\b/gi, /\bwa\s*me\b/gi, /\btelegram\b/gi, /\bt\s?\.?\s?me\s*[:：]?/gi,
        /\bviber\b/gi, /\bsignal\b/gi, /\bskype\b/gi, /\bzalo\b/gi, /\bkakao(?:talk)?\b/gi,
        /\bline\s*(?:id|号)\b/gi, /\bline\s*[:：]\s*[a-z0-9_.-]{4,}/gi,
        /\bwechat\b/gi, /\bweixin\b/gi, /微信|薇信|威信|加微|薇?信\s*号|vx\s*[:：]?\s*[a-z0-9_-]{5,}|v\s*信\s*号?/gi,
        /\bqq\s*(?:号|id)?\s*[:：]?\s*\d{5,}/gi,
        /\b(?:facebook|instagram|discord)\s*(?:id|account)?\b/gi,
      ];
      const hits = new Set();
      for (const re of patterns) {
        for (const m of text.matchAll(re)) hits.add(m[0]);
      }
      return [...hits];
    },
  },
  {
    id: 'contact_phone_email',
    severity: SEVERITY.BLOCK,
    message: '草稿中包含电话/邮箱，平台消息内禁止留下直接联系方式。',
    // 与 pii.js 同形：邮箱 + 各国电话号码（正则集合复用，含 VN/BR/TH/ID，P1-3）
    test(text) {
      const hits = new Set();
      for (const m of text.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)) hits.add(m[0]);
      for (const re of PHONE_REGEXES) {
        for (const m of text.matchAll(re)) hits.add(m[0]);
      }
      return [...hits];
    },
  },
  {
    id: 'review_incentive',
    severity: SEVERITY.BLOCK,
    message: '检测到「好评返现/利诱索评」，属于平台明令禁止的操纵评论行为。',
    test(text) {
      const patterns = [
        // 中文：好评/五星 + 返现、折扣、礼品等，或以返现诱导改评
        /(?:好评|五星|5星|全五星)[^。！!？?\n]{0,24}(?:返现?|返利|红包|优惠券?|折扣|减|礼品?卡?|礼物|免费送|奖励|补偿|送你)/g,
        /(?:返现?|红包|礼品?卡?|优惠券?|退款|补偿|奖励)[^。！!？?\n]{0,16}(?:好评|五星|5星|改评|删评|撤评)/g,
        /改\s*(?:好?评|差评)|删\s*(?:差评|评价)|撤\s*回?\s*(?:差评|投诉)/g,
        // English: review + reward / reward + review
        /\b(?:leave|give|write|post|change|update|remove|delete)\b[^.?!\n]{0,30}\b(?:5[- ]?star|positive|good)\s*review[^.?!\n]{0,40}\b(?:refund|rebate|reward|discount|coupon|free|gift|money back|incentive)\b/gi,
        /\b(?:refund|rebate|reward|discount|coupon|gift card|free|incentive)\b[^.?!\n]{0,40}\b(?:5[- ]?star|positive|good)?\s*review/gi,
        /\bin exchange for\b[^.?!\n]{0,20}\breview\b/gi,
      ];
      const hits = new Set();
      for (const re of patterns) for (const m of text.matchAll(re)) hits.add(m[0]);
      return [...hits];
    },
  },
  {
    id: 'offsite_payment',
    severity: SEVERITY.BLOCK,
    message: '检测到站外支付导流（PayPal/支付宝/西联/ZaloPay/Pix 等本地钱包），绕开平台支付违反规则并有欺诈风险。',
    test(text) {
      const patterns = [
        /\bpay\s?pal\b/gi, /\bpaypal\.me\b/gi, /支付宝|支\s*付\s*宝|alipay/gi,
        /\bvenmo\b/gi, /\bcash\s?app\b/gi, /\bzelle\b/gi, /\bwise(?:\.com)?\b/gi,
        /western\s*union|西联(?:汇款)?/gi, /微信支付|wechat\s*pay/gi,
        /bank\s*transfer|wire\s*transfer|tt\s*(?:payment|transfer)|银行转账|线下转账|汇款到(?:账?户)?/gi,
        // 评审 P1-4：东南亚/南美本地钱包与转账（卖家母语草稿，平台同样禁止绕支付）
        /\bzalo\s*pay\b/gi, // 注意：联系渠道规则里的 \bzalo\b 匹配不到 zalopay，必须单列
        /\b(?:vi\s*)?momo\b/gi, /chuyển\s*khoản|chuyen\s*khoan/gi,
        /\bgo[-\s]?pay\b/gi, /\btrue[-\s]?money\b/gi, /\bprompt[-\s]?pay\b/gi,
        // OVO/DANA 过于普通（葡萄牙语 ovo=鸡蛋、Dana 可作人名），要求支付语境
        /\b(?:pagar|bayar|pay(?:ment)?|via|pakai|lewat)\s+(?:com|no|pelo)?\s*ovo\b/gi,
        /\bovo\s+wallet\b/gi,
        /\b(?:via|pakai|lewat|bayar(?:\s+lewat)?)\s+dana\b/gi,
        /\bdana\s+(?:wallet|id)\b/gi,
        // 巴西 Pix：裸 pix 太宽，要求支付语境或键类型词
        /\b(?:chave\s+)?pix\b\s*(?:cpf|email|e-mail|telefone|celular|chave|key|copia|copia)/gi,
        /\b(?:pagar|pagamento|pague|via|pelo|fazer\s+um|receber\s+pelo?)\s+pix\b/gi,
      ];
      const hits = new Set();
      for (const re of patterns) for (const m of text.matchAll(re)) hits.add(m[0]);
      return [...hits];
    },
  },
  {
    id: 'crypto_payment',
    severity: SEVERITY.WARN,
    message: '提及加密货币支付，平台普遍不支持且风险高，请确认是否必要。',
    test(text) {
      const patterns = [/\busdt\b/gi, /\busdc\b/gi, /\bbitcoin\b/gi, /比特币/gi, /加密货币|虚拟货币/gi];
      const hits = new Set();
      for (const re of patterns) for (const m of text.matchAll(re)) hits.add(m[0]);
      return [...hits];
    },
  },
  {
    id: 'amazon_proactive_message',
    severity: SEVERITY.WARN,
    message:
      'Amazon 主动消息仅限交易/客服必要内容：营销促销、引导关注、站外内容、索要评论均可能被判定违规，请确认内容必要性。',
    // 仅在 Amazon 店铺上下文触发
    platforms: ['amazon'],
    test(text) {
      const patterns = [
        /\b(?:discount|coupon|promo(?:tion)?|big sale|special offer|subscribe|follow us|check out our store)\b/gi,
        /折扣|优惠券?|促销|特惠|关注我们|进店(?:看看|选购)/g,
        /\b(?:leave|write)\s+(?:a\s+)?(?:seller\s+)?review\b/gi,
      ];
      const hits = new Set();
      for (const re of patterns) for (const m of text.matchAll(re)) hits.add(m[0]);
      return [...hits];
    },
  },
  {
    id: 'qr_code',
    severity: SEVERITY.WARN,
    message: '包含二维码/扫码引导，通常用于站外引流，请确认扫码落地页仍在平台内。',
    test(text) {
      const hits = new Set();
      for (const m of text.matchAll(/\bqr\s*code\b/gi)) hits.add(m[0]);
      for (const m of text.matchAll(/二维码|扫一?扫|扫码(?:添加|联系|领取)?/g)) hits.add(m[0]);
      return [...hits];
    },
  },
];

/**
 * @param {string} draft 即将发送的文案
 * @param {{platform?: string}} [ctx]
 * @returns {{verdict:'block'|'warn'|'pass', blocked:boolean, findings:Array<{ruleId:string,severity:string,message:string,snippets:string[]}>}}
 */
export function scan(draft, ctx = {}) {
  const text = String(draft ?? '');
  const platform = (ctx.platform || '').toLowerCase();
  const findings = [];
  for (const rule of RULES) {
    if (rule.platforms && !rule.platforms.includes(platform)) continue;
    const snippets = rule.test(text);
    if (snippets.length) findings.push({
      ruleId: rule.id,
      severity: rule.severity,
      message: rule.message,
      snippets: [...new Set(snippets)].slice(0, 5),
    });
  }
  const blocked = findings.some((f) => f.severity === SEVERITY.BLOCK);
  const warned = findings.some((f) => f.severity === SEVERITY.WARN);
  return { verdict: blocked ? 'block' : warned ? 'warn' : 'pass', blocked, findings };
}
