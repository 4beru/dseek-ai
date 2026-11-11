#!/usr/bin/env node
// Local fixture only. Never import the production DSH adapter.
import { chmod, mkdir, mkdtemp, readFile, writeFile, unlink, rmdir, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = join(root, 'runtime/demo');
const activeFile = join(directory, 'active.json');
const startLock = join(directory, 'start.lock');
const packageName = 'dev.dshmobile.app';
const help = `Local Android demo (foreground, no paid APIs)
  node tools/android-demo.mjs start [--simple]
  node tools/android-demo.mjs install --serial SERIAL
  node tools/android-demo.mjs cleanup --serial SERIAL
Build first. start defaults to the existing multi-project synthetic fixture.
Use Ctrl+C to stop. Keep the laptop and USB connected while browsing.
No arguments or --help only prints this help. No device is selected automatically.`;
const fail = message => { throw new Error(message); };
const json = async path => JSON.parse(await readFile(path, 'utf8'));
const save = (path, value) => writeFile(path, JSON.stringify(value), { flag: 'wx', mode: 0o600 });
async function privateDirectory() {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
}
async function exclusive(path, task) {
  try { await mkdir(path, { mode: 0o700 }); }
  catch { fail('Another demo operation owns the local lock. Do not remove locks while a helper is running.'); }
  try { return await task(); } finally { await rmdir(path); }
}
function alive(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}
async function active() {
  let value;
  try { value = await json(activeFile); } catch { fail('No readable active demo. Start the foreground demo first.'); }
  if (!alive(value.pid) || !Number.isFinite(value.expiresAt) || typeof value.owner !== 'string' || !Number.isInteger(value.port) || value.port < 1 || value.port > 65535 || !/^run-[\w-]+$/.test(value.run)) {
    fail('Demo metadata is stale or invalid. Stop any old helper, then inspect runtime/demo before restarting.');
  }
  if (Date.now() >= value.expiresAt) fail('Invitation expired (default five minutes). Stop with Ctrl+C and restart the demo before installing.');
  return value;
}
async function start(simple) {
  await privateDirectory();
  await exclusive(startLock, async () => {
    try { await stat(activeFile); fail('An active demo record already exists. Stop its foreground helper first. Stale records require local inspection.'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const runPath = await mkdtemp(join(directory, 'run-'));
    await chmod(runPath, 0o700);
    const owner = randomUUID();
    let running;
    let stopping = false;
    let finish;
    const stopped = new Promise(resolve => { finish = resolve; });
    const stop = () => { stopping = true; finish(); };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    process.once('SIGHUP', stop);
    try {
      let runDemo;
      try { ({ runDemo } = await import('../host/dist/demo.js')); }
      catch { fail('Compiled demo unavailable. Run dseek-build first with Node 24.'); }
      const createdAt = Date.now();
      running = await runDemo({ stateDirectory: resolve(runPath), port: 0, multiProject: !simple });
      const port = Number(new URL(running.invitation.baseUrl).port);
      await save(join(runPath, 'invitation.json'), running.invitation);
      await save(activeFile, { owner, pid: process.pid, run: runPath.slice(directory.length + 1), port, expiresAt: createdAt + 300_000 });
      console.log(`Local demo listening on 127.0.0.1:${port}. Invitation expires within five minutes.`);
      console.log('Next: node tools/android-demo.mjs install --serial SERIAL');
      console.log('Keep this terminal, laptop and USB connected. Ctrl+C stops the server.');
      if (!stopping) await stopped;
    } finally {
      process.removeListener('SIGINT', stop);
      process.removeListener('SIGTERM', stop);
      process.removeListener('SIGHUP', stop);
      try { if (running) await running.close(); }
      finally {
        await unlink(join(runPath, 'invitation.json')).catch(() => {});
        try { if ((await json(activeFile)).owner === owner) await unlink(activeFile); } catch {}
      }
    }
  });
}
function adb(serial, args) {
  const result = spawnSync('adb', ['-s', serial, ...args], { encoding: 'utf8', timeout: 120_000, maxBuffer: 1024 * 1024 });
  // Never echo command output: an invitation must not reach console logs.
  if (result.error || result.status !== 0) fail(`adb ${args[0]} failed. Check USB authorization, tools and package/signature compatibility. Never uninstall or clear app data to resolve this automatically.`);
  return result.stdout.trim();
}
function device(serial) {
  if (adb(serial, ['get-state']) !== 'device') fail('Selected device is not authorized and online. Authorize USB debugging on that device.');
  const sdk = Number(adb(serial, ['shell', 'getprop', 'ro.build.version.sdk']));
  if (!Number.isInteger(sdk) || sdk < 26) fail('Android API 26 or newer is required.');
}
function mappings(serial) {
  return adb(serial, ['reverse', '--list']).split('\n').filter(Boolean).map(line => {
    const fields = line.trim().split(/\s+/);
    return { remote: fields.at(-2), local: fields.at(-1) };
  });
}
async function withDevice(serial, install) {
  await privateDirectory();
  await exclusive(join(directory, 'device.lock'), async () => {
    device(serial);
    const receiptPath = join(directory, `device-${createHash('sha256').update(serial).digest('hex')}.json`);
    let receipt;
    try { receipt = await json(receiptPath); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (!install) {
      if (!receipt) { console.log('No owned device resources recorded. Nothing removed.'); return; }
      if (!/^tcp:\d+$/.test(receipt.tunnel) || !/^\/sdcard\/Download\/dseek-demo-[a-f0-9-]+\.json$/.test(receipt.remote)) fail('Invalid cleanup receipt. No resources removed.');
      const mapping = mappings(serial).find(item => item.remote === receipt.tunnel);
      if (receipt.ownsTunnel && mapping?.local === receipt.tunnel) adb(serial, ['reverse', '--remove', receipt.tunnel]);
      adb(serial, ['shell', 'rm', '-f', receipt.remote]);
      await unlink(receiptPath);
      console.log('Owned invitation and matching owned tunnel cleaned. App data untouched.');
      return;
    }
    const demo = await active(); // Expiry is checked before any installation.
    if (receipt) fail('This device has demo resources recorded. Run cleanup --serial SERIAL first.');
    const apk = join(root, 'android/app/build/outputs/apk/debug/app-debug.apk');
    try { await stat(apk); } catch { fail('Debug APK missing. Run dseek-build first.'); }
    const tunnel = `tcp:${demo.port}`;
    if (mappings(serial).some(item => item.remote === tunnel)) fail('Reverse mapping already exists. Refusing to overwrite or claim an unrelated mapping.');
    const invitationPath = join(directory, demo.run, 'invitation.json');
    await stat(invitationPath);
    await active();
    adb(serial, ['install', '-r', apk]); // No uninstall or data clearing fallback, including signature mismatch.
    const current = await active();
    if (current.owner !== demo.owner) fail('Demo changed. Restart this command with the current demo.');
    receipt = { tunnel, remote: `/sdcard/Download/dseek-demo-${randomUUID()}.json`, ownsTunnel: false };
    await save(receiptPath, receipt);
    adb(serial, ['reverse', '--no-rebind', tunnel, tunnel]);
    receipt.ownsTunnel = true;
    await writeFile(receiptPath, JSON.stringify(receipt), { mode: 0o600 });
    adb(serial, ['push', invitationPath, receipt.remote]);
    adb(serial, ['shell', 'am', 'start', '-n', `${packageName}/.MainActivity`]);
    console.log(`In the existing UI choose Import invitation file, then Downloads/${receipt.remote.split('/').at(-1)}.`);
    console.log('Import within the default five-minute window from demo startup. This file is a temporary secret.');
    console.log('Keep USB and laptop connected while browsing. Afterwards run cleanup --serial SERIAL, then Ctrl+C in the demo terminal.');
  });
}
async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command || (command === '--help' && !args.length)) { console.log(help); return; }
  if (command === 'start' && (!args.length || (args.length === 1 && args[0] === '--simple'))) return start(args.length === 1);
  if (['install', 'cleanup'].includes(command) && args.length === 2 && args[0] === '--serial' && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(args[1])) return withDevice(args[1], command === 'install');
  fail('Invalid arguments. Use --help. An explicit --serial SERIAL is required for device operations.');
}
main().catch(error => { console.error(error instanceof Error && !error.code ? error.message : 'Local demo operation failed. Check local tools and private runtime permissions.'); process.exitCode = 1; });
