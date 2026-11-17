// Acceptance sandbox: the real Harness server (apps/server/main.mjs) on an isolated data directory,
// so client verification never writes into the project's var/ store.
//
//   node scripts/harness-sandbox.mjs [--port 4790] [--dir <data dir>] [--fresh]
//
// It publishes two Solution versions into the sandbox registry:
//   • szh-selftest@0.1.0 — acceptance self-test. Its executor really computes word statistics from
//     the submitted text and writes JSON / CSV / PNG / log artifacts. Not a scientific capability.
//   • aic-inference@0.1.0 — the real AIC manifest. It executes only when SZH_AIC_PYTHON and
//     SZH_AIC_PACKAGE point to a working PyTorch environment; otherwise the Run fails with that reason.
//
// The DSH runner still uses the usual model configuration. Its session state lives under this sandbox directory.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { deflateSync } from 'node:zlib';
import { createTaskServer } from '../../server/main.mjs';
import { TaskService } from '../../server/tasks.mjs';
import { SolutionRegistry, ProtocolError } from '../../server/solution-registry.mjs';
import { aicExecutor } from '../../server/solution-runs.mjs';

const projectRoot = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const argv = process.argv.slice(2);
const opt = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : fallback; };
const port = Number(opt('port', process.env.SZH_SANDBOX_PORT || 4790));
const directory = resolve(opt('dir', join(tmpdir(), 'szh-harness-sandbox')));
if (argv.includes('--fresh')) await rm(directory, { recursive: true, force: true });
await mkdir(directory, { recursive: true });

const selftest = {
  schema_version: '0.1', id: 'szh-selftest', version: '0.1.0',
  name: 'Text word frequency', domain: 'Acceptance test', tags: ['self-test'],
  description: 'Counts word frequency in the submitted text and writes JSON, CSV, PNG, and an execution log. This is a local self-test, not a research capability.',
  input_schema: {
    type: 'object', required: ['text'], additionalProperties: false,
    properties: {
      text: { type: 'string', title: 'Text to analyze', description: 'Any text, at least 5 characters.', minLength: 5, maxLength: 20000, default: 'ShenZhi Harness is for solution research. Word frequency counts the words in this text, and higher frequency ranks first. Harness Harness text text text.' },
      top_k: { type: 'integer', title: 'Words to keep', minimum: 1, maximum: 50, default: 10 },
      step_seconds: { type: 'number', title: 'Seconds per step', description: 'Slows execution so you can watch status and cancellation.', minimum: 0, maximum: 10, default: 1.5 },
      simulate_failure: { type: 'boolean', title: 'Simulate failure', description: 'Throws during execution so you can check failure handling.', default: false },
    },
  },
  output_schema: { type: 'object' },
  runtime: { adapter: 'szh-selftest', entrypoint: 'apps/szh-app/scripts/harness-sandbox.mjs' },
  assets: [{ name: 'Self-test executor source', kind: 'code', description: 'apps/szh-app/scripts/harness-sandbox.mjs' }],
  validation: { scope: 'Checks the client and Harness run, log, cancel, and artifact path. Not a research capability.' },
  delivery: { summary: true, table: true, figure: true },
};

const registry = new SolutionRegistry(join(directory, 'solution-versions'));
const aicManifest = JSON.parse(await readFile(join(projectRoot, 'solutions/aic-flowproxy/manifest-v01.json'), 'utf8'));
for (const manifest of [selftest, aicManifest]) {
  try { await registry.publish(manifest); console.log(`[sandbox] 已发布 ${manifest.id}@${manifest.version}`); }
  catch (error) { if (error.code !== 'version_conflict') throw error; }
}

/* ---------- executors ---------- */

const sleep = (ms, signal) => delay(ms, undefined, { signal });

async function runSelftest(run, output, signal) {
  const log = [];
  const note = async (line) => { log.push(`[${new Date().toISOString()}] ${line}`); await writeFile(join(output, 'execution.log'), log.join('\n') + '\n'); };
  const step = Number(run.input.step_seconds ?? 1.5) * 1000;
  const text = String(run.input.text).toLowerCase();
  await note(`Read input: ${text.length} characters`); await sleep(step, signal);
  const words = text.match(/[\p{L}\p{N}]+/gu) ?? [];
  await note(`Tokenized: ${words.length} words`); await sleep(step, signal);
  if (run.input.simulate_failure) { await note('Simulating failure as requested'); throw new Error('Self-test failed because simulate_failure is true.'); }
  const counts = new Map();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, Number(run.input.top_k ?? 10));
  await note(`Counted ${counts.size} distinct words`); await sleep(step, signal);
  await writeFile(join(output, 'summary.json'), JSON.stringify({ characters: text.length, words: words.length, unique_words: counts.size, top }, null, 2));
  await writeFile(join(output, 'word_counts.csv'), 'word,count\n' + top.map(([w, c]) => `${w},${c}`).join('\n') + '\n');
  await writeFile(join(output, 'word_counts.png'), barChartPng(top.map(([, c]) => c)));
  await note('Wrote summary.json, word_counts.csv, word_counts.png');
}

const aic = process.env.SZH_AIC_PYTHON && process.env.SZH_AIC_PACKAGE
  ? aicExecutor({ python: process.env.SZH_AIC_PYTHON, packageRoot: process.env.SZH_AIC_PACKAGE, script: join(projectRoot, 'scripts/aic/run_solution.py') })
  : null;

async function execute(run, output, signal) {
  if (run.manifest.runtime.adapter === 'szh-selftest') return runSelftest(run, output, signal);
  if (run.manifest.runtime.adapter === 'aic-packaged-inference') {
    if (!aic) throw new Error('AIC runtime is not configured. Set SZH_AIC_PYTHON and SZH_AIC_PACKAGE, and install PyTorch.');
    return aic(run, output, signal);
  }
  throw new ProtocolError('unsupported_adapter', 'This execution adapter is not installed.');
}

/* ---------- minimal PNG bar chart (no dependencies) ---------- */

function barChartPng(values) {
  const W = 640, H = 320, pad = 32, px = Buffer.alloc(W * H * 4, 255);
  const fill = (x0, y0, x1, y1, [r, g, b]) => {
    for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) {
      const i = (y * W + x) * 4; px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
    }
  };
  fill(pad, H - pad, W - pad, H - pad + 1, [201, 206, 214]);
  const max = Math.max(1, ...values), slot = (W - 2 * pad) / Math.max(1, values.length);
  values.forEach((v, i) => {
    const h = Math.round(((H - 2 * pad) * v) / max), x = Math.round(pad + i * slot + slot * 0.18);
    fill(x, H - pad - h, Math.round(x + slot * 0.64), H - pad, [45, 97, 200]);
  });
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) px.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4);
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(W, 0); header.writeUInt32BE(H, 4); header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

/* ---------- start ---------- */

const service = await TaskService.open({ directory });
const app = await createTaskServer({ service, registry, executeSolution: execute });
app.server.listen(port, '127.0.0.1', () => {
  console.log(`[sandbox] Harness：http://127.0.0.1:${port}/api/health`);
  console.log(`[sandbox] 数据目录：${directory}`);
  console.log(`[sandbox] AIC 推理：${aic ? '已配置' : '未配置（运行会如实失败）'}`);
});
const close = async () => { await app.close(); process.exit(0); };
process.on('SIGINT', close);
process.on('SIGTERM', close);
