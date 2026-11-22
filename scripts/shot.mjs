#!/usr/bin/env node
// Screenshots a page with headless Chrome at the sizes the home page is checked at.
//
// Usage:
//   node scripts/shot.mjs <url> <outDir> [--no-js] [--reduced-motion] [--dark] [--anchors a,b,c]
//
// Writes <outDir>/<anchor>-<width>x<height>.png for every size and anchor, with
// the element whose id is <anchor> scrolled to the top of the viewport. Without
// --anchors it takes one shot of the top of the page, named "top".
//
// Drives Chrome over the DevTools protocol: Chrome's own --screenshot flag
// ignores #fragments and writes nothing when scripts are disabled.
// Uses Playwright's headless shell when it is cached, else Google Chrome;
// set CHROME to use another binary.
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { parseArgs } from 'node:util'

// No viewport taller than 1024: a tall window stretches svh sections.
const sizes = [
  [375, 667],
  [390, 844],
  [768, 1024],
  [1280, 800],
  [1440, 900],
]
const settleAfterLoadMs = 1200
const settleAfterScrollMs = 800
// Upper bound on any single wait on Chrome: launch, connect, a protocol call or a page load.
const chromeTimeoutMs = 30_000
// How long Chrome gets to exit after SIGTERM before it is sent SIGKILL.
const chromeStopTimeoutMs = 5_000

const headlessShell = join(
  homedir(),
  'Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell',
)
const chromePath = process.env.CHROME
  ?? (existsSync(headlessShell) ? headlessShell : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')

const usage = 'Usage: node scripts/shot.mjs <url> <outDir> [--no-js] [--reduced-motion] [--dark] [--anchors a,b,c]'
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    'no-js': { type: 'boolean', default: false },
    'reduced-motion': { type: 'boolean', default: false },
    dark: { type: 'boolean', default: false },
    anchors: { type: 'string' },
  },
})

const [url, outDir] = positionals
if (!url || !outDir) {
  console.error(usage)
  process.exit(2)
}
if (!URL.canParse(url)) {
  console.error(`Not a URL: ${url}\n${usage}`)
  process.exit(2)
}
// Navigating again to a URL with a fragment is a same-document navigation that
// never fires load, so anchors are only accepted through --anchors.
if (new URL(url).hash) {
  console.error(`Pass anchors with --anchors, not as a #fragment in the URL.\n${usage}`)
  process.exit(2)
}
const anchors = values.anchors?.split(',')

async function withTimeout(promise, what, timeoutMs = chromeTimeoutMs) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${what} timed out after ${timeoutMs / 1000} s`)), timeoutMs)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

function launchChrome(profileDir) {
  const chrome = spawn(chromePath, [
    '--headless',
    '--hide-scrollbars',
    '--no-first-run',
    '--remote-debugging-port=0',
    `--user-data-dir=${profileDir}`,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] })
  const devtoolsUrl = new Promise((resolveUrl, reject) => {
    let stderr = ''
    chrome.stderr.on('data', (chunk) => {
      stderr += chunk
      const listening = stderr.match(/DevTools listening on (ws:\/\/\S+)/)
      if (listening) resolveUrl(listening[1])
    })
    chrome.on('error', (error) => reject(new Error(`Could not start Chrome at ${chromePath}`, { cause: error })))
    chrome.on('exit', (code) => reject(new Error(`Chrome exited (code ${code}) before DevTools was ready:\n${stderr}`)))
  })
  return { chrome, devtoolsUrl: withTimeout(devtoolsUrl, 'Starting Chrome') }
}

async function connect(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl)
  const pending = new Map()
  const waiters = new Map()
  let lastId = 0
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    if (message.id) {
      const call = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) call.reject(new Error(`${call.method}: ${message.error.message}`))
      else call.resolve(message.result)
    } else {
      for (const waiter of waiters.get(message.method)?.splice(0) ?? []) waiter.resolve(message.params)
    }
  })
  socket.addEventListener('close', () => {
    for (const call of pending.values()) call.reject(new Error(`${call.method}: DevTools connection closed`))
    for (const [eventName, list] of waiters) {
      for (const waiter of list) waiter.reject(new Error(`Waiting for ${eventName}: DevTools connection closed`))
    }
    pending.clear()
    waiters.clear()
  })
  await withTimeout(new Promise((resolveOpen, reject) => {
    socket.addEventListener('open', resolveOpen)
    socket.addEventListener('error', () => reject(new Error(`Could not connect to Chrome at ${webSocketUrl}`)))
  }), 'Connecting to Chrome')
  return {
    send(method, params = {}) {
      return withTimeout(new Promise((resolveCall, reject) => {
        const id = ++lastId
        pending.set(id, { method, resolve: resolveCall, reject })
        socket.send(JSON.stringify({ id, method, params }))
      }), method)
    },
    next(eventName) {
      return withTimeout(new Promise((resolveEvent, reject) => {
        waiters.set(eventName, [...(waiters.get(eventName) ?? []), { resolve: resolveEvent, reject }])
      }), `Waiting for ${eventName}`)
    },
    close: () => socket.close(),
  }
}

async function openPage(devtoolsUrl) {
  const { host } = new URL(devtoolsUrl)
  const targets = await (await withTimeout(fetch(`http://${host}/json/list`), 'Listing Chrome pages')).json()
  const page = targets.find((target) => target.type === 'page')
  if (!page) throw new Error('Chrome has no page to drive')
  return connect(page.webSocketDebuggerUrl)
}

// Runtime.evaluate is DevTools' own evaluation, so it still runs with page
// scripts disabled.
async function scrollToAnchor(page, id) {
  const { result } = await page.send('Runtime.evaluate', {
    expression: `(() => {
      const anchor = document.getElementById(${JSON.stringify(id)})
      anchor?.scrollIntoView({ block: 'start', behavior: 'instant' })
      return Boolean(anchor)
    })()`,
    returnByValue: true,
  })
  if (!result.value) throw new Error(`${url} has no element with id "${id}"`)
}

async function shoot(page, width, height) {
  const mobile = width < 768
  await page.send('Emulation.setDeviceMetricsOverride', { width, height, mobile, deviceScaleFactor: mobile ? 2 : 1 })
  // Listen before navigating so the event can't be missed. If navigation fails
  // first, the waiter is left behind and rejects on close, so mark it handled
  // here; awaiting it below still throws.
  const loaded = page.next('Page.loadEventFired')
  loaded.catch(() => {})
  const { errorText } = await page.send('Page.navigate', { url })
  if (errorText) throw new Error(`Could not load ${url}: ${errorText}`)
  await loaded
  await sleep(settleAfterLoadMs)

  for (const anchor of anchors ?? ['top']) {
    if (anchors) {
      await scrollToAnchor(page, anchor)
      await sleep(settleAfterScrollMs)
    }
    const { data } = await page.send('Page.captureScreenshot', { format: 'png' })
    const file = resolve(join(outDir, `${anchor}-${width}x${height}.png`))
    writeFileSync(file, data, 'base64')
    console.log(file)
  }
}

mkdirSync(outDir, { recursive: true })
const profileDir = mkdtempSync(join(tmpdir(), 'shot-chrome-'))
const { chrome, devtoolsUrl } = launchChrome(profileDir)
let page
let stopping

// Runs once, whether the run finishes, fails or is interrupted.
function stopChrome() {
  stopping ??= (async () => {
    page?.close()
    const chromeRunning = chrome.pid !== undefined && chrome.exitCode === null && chrome.signalCode === null
    if (chromeRunning) {
      const exited = once(chrome, 'exit')
      chrome.kill()
      await withTimeout(exited, 'Stopping Chrome', chromeStopTimeoutMs).catch(() => {
        chrome.kill('SIGKILL')
        return exited
      })
    }
    rmSync(profileDir, { recursive: true, force: true })
  })()
  return stopping
}

for (const [signal, exitCode] of [['SIGINT', 130], ['SIGTERM', 143]]) {
  process.once(signal, () => stopChrome().finally(() => process.exit(exitCode)))
}

try {
  page = await openPage(await devtoolsUrl)
  await page.send('Page.enable')
  if (values['no-js']) await page.send('Emulation.setScriptExecutionDisabled', { value: true })
  await page.send('Emulation.setEmulatedMedia', {
    features: [
      ...(values['reduced-motion'] ? [{ name: 'prefers-reduced-motion', value: 'reduce' }] : []),
      ...(values.dark ? [{ name: 'prefers-color-scheme', value: 'dark' }] : []),
    ],
  })
  for (const [width, height] of sizes) await shoot(page, width, height)
} finally {
  await stopChrome()
}
