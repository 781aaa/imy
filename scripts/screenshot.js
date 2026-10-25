'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const CHROME = process.env.CHROME_PATH
  || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.APP_BASE || 'http://localhost:3000';
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9223);

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function login(username, password) {
  const response = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const body = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(body.message || '登录失败');
  }
  return body.data.token;
}

async function waitForChrome() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      if (response.ok) return response.json();
    } catch (error) {
      // Chrome 还没启动完成
    }
    await wait(250);
  }
  throw new Error('Chrome 调试端口未就绪');
}

function createClient(ws) {
  let sequence = 0;
  const pending = new Map();

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  };

  return function send(method, params = {}) {
    return new Promise((resolve) => {
      sequence += 1;
      pending.set(sequence, resolve);
      ws.send(JSON.stringify({ id: sequence, method, params }));
    });
  };
}

async function main() {
  const route = process.argv[2] || 'questions';
  const output = process.argv[3]
    || path.resolve(__dirname, '../docs', `${route}.png`);
  const username = process.env.APP_USER || 'teacher1';
  const password = process.env.APP_PASSWORD || 'Teach@123';

  const token = await login(username, password);
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'exam-shot-'));

  const chrome = spawn(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${userDataDir}`,
    '--window-size=1440,960',
    'about:blank',
  ], { stdio: 'ignore' });

  try {
    await waitForChrome();

    const targetResponse = await fetch(
      `http://127.0.0.1:${DEBUG_PORT}/json/new?about:blank`,
      { method: 'PUT' },
    );
    const target = await targetResponse.json();

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = () => reject(new Error('无法连接 Chrome DevTools'));
    });

    const send = createClient(ws);

    await send('Page.enable');
    await send('Runtime.enable');

    await send('Page.navigate', { url: `${BASE}/#/login` });
    await wait(1000);

    await send('Runtime.evaluate', {
      expression: `localStorage.setItem('exam_token', ${JSON.stringify(token)});`,
    });

    // 先整页刷新，让 Pinia 从 localStorage 初始化登录态；
    // 再切换 hash，避免登录守卫把目标路由重定向掉。
    await send('Page.reload', { ignoreCache: true });
    await wait(1800);

    await send('Runtime.evaluate', {
      expression: `location.hash = '#/${route}';`,
    });
    await wait(2200);

    const screenshot = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    });

    if (!screenshot.result || !screenshot.result.data) {
      throw new Error('截图失败: ' + JSON.stringify(screenshot.error || {}));
    }

    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, Buffer.from(screenshot.result.data, 'base64'));
    console.log(`已保存截图: ${output}`);

    ws.close();
  } finally {
    chrome.kill();
    await wait(300);
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch (error) {
      // 临时目录清不掉不影响结果
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
