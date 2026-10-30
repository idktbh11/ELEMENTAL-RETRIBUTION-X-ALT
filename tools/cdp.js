/*
 * Minimal headless-browser driver over the Chrome DevTools Protocol.
 * Uses Microsoft Edge or Google Chrome (whichever is installed) and Node's
 * built-in WebSocket (Node 22+). No npm packages required.
 */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CANDIDATES = [
  process.env.BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const KEYS = {
  Enter: { key: 'Enter', vk: 13, text: '\r' },
  Escape: { key: 'Escape', vk: 27 },
  Space: { key: ' ', vk: 32, text: ' ' },
  ArrowUp: { key: 'ArrowUp', vk: 38 },
  ArrowDown: { key: 'ArrowDown', vk: 40 },
  ArrowLeft: { key: 'ArrowLeft', vk: 37 },
  ArrowRight: { key: 'ArrowRight', vk: 39 },
  Tab: { key: 'Tab', vk: 9 },
  Delete: { key: 'Delete', vk: 46 },
  Backspace: { key: 'Backspace', vk: 8 },
  ShiftLeft: { key: 'Shift', vk: 16 },
  PageDown: { key: 'PageDown', vk: 34 },
  End: { key: 'End', vk: 35 },
  Home: { key: 'Home', vk: 36 },
};

async function launch(opts = {}) {
  const exe = CANDIDATES.find((p) => fs.existsSync(p));
  if (!exe) throw new Error('No Chrome/Edge found. Set BROWSER=path/to/browser.');
  const port = 9300 + Math.floor(Math.random() * 500);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'erx-test-'));
  const w = opts.width || 1600, h = opts.height || 900;
  const proc = spawn(exe, [
    '--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + profile,
    '--window-size=' + w + ',' + h, '--autoplay-policy=no-user-gesture-required',
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--allow-file-access-from-files',
    'about:blank',
  ], { stdio: 'ignore' });

  let target;
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
      target = list.find((t) => t.type === 'page');
      if (target) break;
    } catch (e) { /* not up yet */ }
    await sleep(150);
  }
  if (!target) throw new Error('Browser did not start');

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map();
  const logs = [];
  const errors = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) rej(new Error(msg.error.message)); else res(msg.result);
      return;
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = msg.params.args.map((a) => a.value !== undefined ? a.value : a.description).join(' ');
      logs.push(msg.params.type + ': ' + text);
      if (msg.params.type === 'error') errors.push('console.error: ' + text);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      errors.push('exception: ' + ((d.exception && d.exception.description) || d.text) + ' @' + d.url + ':' + d.lineNumber);
    } else if (msg.method === 'Log.entryAdded') {
      const e = msg.params.entry;
      logs.push('log.' + e.level + ': ' + e.text + (e.url ? ' ' + e.url : ''));
      if (e.level === 'error') errors.push('log: ' + e.text + (e.url ? ' ' + e.url : ''));
    }
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const mid = ++id;
    pending.set(mid, { res, rej });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');

  const api = {
    logs, errors, send,
    async goto(url) {
      await send('Page.navigate', { url });
      await sleep(400);
    },
    async viewport(width, height, dpr = 1) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile: false });
      await sleep(150);
    },
    async eval(expr) {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error('eval failed: ' + (r.exceptionDetails.exception ? r.exceptionDetails.exception.description : r.exceptionDetails.text));
      return r.result.value;
    },
    async screenshot(file) {
      const r = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
    },
    async key(code, mods = {}) {
      const k = KEYS[code] || (/^Key[A-Z]$/.test(code) ? { key: code.slice(3).toLowerCase(), vk: code.charCodeAt(3), text: code.slice(3).toLowerCase() } : { key: code, vk: 0 });
      const modifiers = (mods.alt ? 1 : 0) | (mods.ctrl ? 2 : 0) | (mods.shift ? 8 : 0);
      await send('Input.dispatchKeyEvent', { type: k.text ? 'keyDown' : 'rawKeyDown', code, key: k.key, windowsVirtualKeyCode: k.vk, text: k.text, modifiers });
      await sleep(30);
      await send('Input.dispatchKeyEvent', { type: 'keyUp', code, key: k.key, windowsVirtualKeyCode: k.vk, modifiers });
      await sleep(mods.wait !== undefined ? mods.wait : 120);
    },
    /** Hold a key down for `ms` milliseconds (for walking, blocking, ...). */
    async hold(code, ms) {
      const k = KEYS[code] || (/^Key[A-Z]$/.test(code) ? { key: code.slice(3).toLowerCase(), vk: code.charCodeAt(3) } : { key: code, vk: 0 });
      await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', code, key: k.key, windowsVirtualKeyCode: k.vk });
      await sleep(ms);
      await send('Input.dispatchKeyEvent', { type: 'keyUp', code, key: k.key, windowsVirtualKeyCode: k.vk });
      await sleep(60);
    },
    async down(code) {
      const k = KEYS[code] || (/^Key[A-Z]$/.test(code) ? { key: code.slice(3).toLowerCase(), vk: code.charCodeAt(3) } : { key: code, vk: 0 });
      await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', code, key: k.key, windowsVirtualKeyCode: k.vk });
    },
    async up(code) {
      const k = KEYS[code] || (/^Key[A-Z]$/.test(code) ? { key: code.slice(3).toLowerCase(), vk: code.charCodeAt(3) } : { key: code, vk: 0 });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', code, key: k.key, windowsVirtualKeyCode: k.vk });
    },
    async type(str) {
      for (const ch of str) await api.key('Key' + ch.toUpperCase(), { wait: 40 });
    },
    async move(x, y) {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
      await sleep(60);
    },
    async click(x, y, button = 'left') {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
      await sleep(50);
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button, clickCount: 1 });
      await sleep(50);
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button, clickCount: 1 });
      await sleep(150);
    },
    async drag(x0, y0, x1, y1) {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x0, y: y0 });
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: x0, y: y0, button: 'left', clickCount: 1 });
      for (let i = 1; i <= 8; i++) {
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x0 + ((x1 - x0) * i) / 8, y: y0 + ((y1 - y0) * i) / 8, button: 'left', buttons: 1 });
        await sleep(30);
      }
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x1, y: y1, button: 'left', clickCount: 1 });
      await sleep(150);
    },
    /** Pretend to be a phone: a touch screen of width x height CSS pixels. */
    async phone(width, height, dpr = 3) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile: true, screenWidth: width, screenHeight: height });
      await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
      await sleep(250);
    },
    /** Touch points: [{ x, y, id }]. touchStart/touchMove send all fingers currently down. */
    async touch(type, points) {
      await send('Input.dispatchTouchEvent', { type, touchPoints: points.map((p) => ({ x: p.x, y: p.y, id: p.id || 0, radiusX: 4, radiusY: 4, force: 1 })) });
      await sleep(30);
    },
    async tap(x, y) {
      await api.touch('touchStart', [{ x, y }]);
      await sleep(60);
      await api.touch('touchEnd', []);
      await sleep(150);
    },
    async insertText(text) {
      await send('Input.insertText', { text });
      await sleep(80);
    },
    async wheel(x, y, deltaY) {
      await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY });
      await sleep(120);
    },
    sleep,
    async close() {
      try { ws.close(); } catch (e) { /* ignore */ }
      proc.kill();
      await sleep(300);
      try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* locked files are fine */ }
    },
  };
  return api;
}

module.exports = { launch, sleep };
