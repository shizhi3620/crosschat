/**
 * 纯逻辑模块单测入口：node test/run-tests.mjs
 * 仅覆盖不依赖 DOM / chrome.* 的 core 模块（plan 交付项 10）。
 */
import { runAll } from './harness.mjs';

import './pii.test.mjs';
import './compliance.test.mjs';
import './knowledge.test.mjs';
import './router.test.mjs';
import './cost-model.test.mjs';
import './quota.test.mjs';
import './history.test.mjs';
import './metering.test.mjs';
import './demo-engine.test.mjs';
import './ark-client.test.mjs';
import './pipeline.test.mjs';
import './telemetry.test.mjs';
import './sites.test.mjs';
import './bundle.test.mjs';

await runAll();
