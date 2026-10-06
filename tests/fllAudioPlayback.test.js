import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('round reuses the gesture-authorized MP3 player for all ten bips and the end', async () => {
  let gesture = false;
  const played = [];
  const attached = [];
  class Audio {
    constructor() { this.authorized = false; this.currentTime = 0; }
    setAttribute() {}
    getAttribute(name) { return name === 'src' ? this.src : null; }
    load() {}
    pause() { this.paused = true; }
    addEventListener() {}
    play() {
      if (gesture) this.authorized = true;
      if (!this.authorized) return Promise.reject(new Error('NotAllowedError'));
      this.paused = false;
      played.push({ player: this, src: this.src, time: this.currentTime });
      return Promise.resolve();
    }
  }
  const context = vm.createContext({ Audio, window: {}, document: { body: { appendChild(a) { attached.push(a); } } }, console,
    getLocalActiveFllSeason: () => ({ theme: 'BIOGLOW', fll_audios: { countdown_beep: { fileId: 'admin-bip', sha256: 'uploaded-version' } } }) });
  const source = fs.readFileSync('src/lib/fllAudio.js', 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
  vm.runInContext(source, context);
  context.preloadFllAudio('BIOGLOW');
  gesture = true;
  assert.equal(await context.playStartRoundSound(), true);
  gesture = false;
  for (let second = 10; second > 0; second--) assert.equal(await context.playCountdownPip(), true);
  assert.equal(await context.playEndRoundSound(), true);
  assert.equal(attached.length, 1);
  assert.equal(played.length, 12);
  assert.ok(played.every(p => p.player === attached[0] && p.time === 0));
  assert.ok(played.slice(1, 11).every(p => p.src.includes('slot=countdown_beep') && p.src.includes('v=uploaded-version')));
  context.setSoundMuted(true);
  assert.equal(attached[0].paused, true);
  assert.equal(await context.playCountdownPip(), false);
  assert.equal(played.length, 12);
});

test('timer emits 10..1 once, final once, and has no side effects in React state updaters', () => {
  const source = fs.readFileSync('src/components/fll/BioglowScoreHeader.jsx', 'utf8');
  const body = source.match(/const handleTick = \(prev\) => \{([\s\S]*?)\n  \};/)[1];
  const beeps = [];
  let ends = 0;
  let previous = 150;
  const context = vm.createContext({ beepedSecondsRef: {current:new Set()}, hasPlayedEndSoundRef: {current:false},
    timerRef:{current:1}, playCountdownPip:()=>beeps.push(previous-1), playEndRoundSound:()=>ends++,
    setIsRunning(){}, clearInterval(){} });
  vm.runInContext(`function tick(prev) {${body}}`, context);
  for (let n = 0; n < 150; n++) previous = context.tick(previous);
  context.tick(0);
  assert.deepEqual(beeps, [10,9,8,7,6,5,4,3,2,1]);
  assert.equal(ends, 1);
  assert.equal(previous, 0);
  assert.ok(!source.includes('setSecondsLeft(handleTick)'));
});
