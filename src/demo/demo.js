/**
 * 演示页脚本：直接以 module 形式引入 content-main（扩展页可用 chrome.* API），
 * 注入与真实站点完全相同的浮动部件，验证「捕获 → 处理 → 合规标记 → 填入发送框」端到端链路。
 */
import { bootstrap } from '../content/content-main.js';

bootstrap();

const SCENARIOS = {
  1: {
    text: 'Hi, how long does shipping take? When will my order arrive?',
    hint: '物流 FAQ，期望路由 L0（零 Token，直接引用知识库）',
  },
  2: {
    text: 'This is TERRIBLE!!! I want my refund NOW. Email me at emma8821@example.com or I will open an A-to-Z claim!!!',
    hint: 'A-to-Z 纠纷 + 强负面 + 邮箱，期望 L2，PII 入模前脱敏、填入时还原',
  },
  3: {
    text: '你好，请问有大一号的尺码吗？这个会不会偏小？',
    hint: '常规售前咨询，期望 L1',
  },
  4: {
    text: 'Hi, where is my order? It has been 10 days and I have not received anything.',
    hint: '翻译任务：在部件里点「翻译」（翻译永远走 L1）',
  },
};

function addMessage(text, who) {
  const log = document.getElementById('chatLog');
  const wrap = document.createElement('div');
  wrap.className = who === 'buyer' ? 'buyer-wrap' : '';
  wrap.innerHTML = `<div class="meta">${who === 'buyer' ? 'emma_b_8821' : '我方（人工客服）'}</div>`;
  const div = document.createElement('div');
  div.className = `msg ${who === 'buyer' ? 'buyer' : 'me'}`;
  div.textContent = text;
  wrap.appendChild(div);
  log.appendChild(wrap);
  log.scrollTop = log.scrollHeight;
}

document.querySelectorAll('button.s').forEach((btn) => {
  btn.addEventListener('click', () => {
    const sc = SCENARIOS[btn.dataset.n];
    addMessage(sc.text, 'buyer');
    window.__crosschat?.setInput(sc.text);
  });
});

// 模拟平台发送按钮：仅把文本展示在会话里（证明扩展没有代发）
document.getElementById('shopSend').addEventListener('click', () => {
  const ta = document.getElementById('shopInput');
  if (!ta.value.trim()) return;
  addMessage(ta.value, 'me');
  ta.value = '';
});
