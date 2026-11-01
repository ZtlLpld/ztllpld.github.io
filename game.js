'use strict';

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rand = (a, b) => a + Math.random() * (b - a);
const easeOutQuad  = t => 1 - (1 - t) * (1 - t);
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

let isAnnouncementOpen = true;
let announcementScrollY = 0;
let announcementMaxScroll = 0;
let announcementDragStartY = 0;
let announcementDragStartScroll = 0;
let isDraggingAnnouncement = false;
let announcementClickStartY = 0;

let isSettingsOpen = false;
let isWardrobeOpen = false;
let isHelpOpen = false;
let draggingSlider = null;
let touchEditMode = false;
// 触屏虚拟输入：摇杆/长短按复合键写入，inputP1 合并，不改动键盘与内部数值
const touchInp = { left: 0, right: 0, up: 0, guard: 0, punch: 0, kick: 0, dash: 0 };
let isDraggingScrollbar = false;
let settings = {
  masterVolume: 0.8, volume: 0.5, shake: 1.0, particles: 1.0,
  themeColor: '#4fc9ff', p1Name: 'P1',
  aspectRatio: 'default', sideBlackBar: 0, scrollY: 0,
  touchScaleLeft: 1.0, touchScaleRight: 1.0, touchOpacity: 1.0, fps: 60,
  touchOffset: { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } },
  bgmVolume: 0.45, bgmOn: true, bgmIndex: 0, bgmSrc: '',
  equippedP1: { body: 0, head: 0, face: 0, neck: 0, hands: 0, feet: 0 },
  equippedP2: { body: 0, head: 0, face: 0, neck: 0, hands: 0, feet: 0 }
};
let isDraggingSettings = false;
let settingsDragStartY = 0;
let settingsDragStartScroll = 0;
let settingsClickTarget = null;

try {
  const saved = localStorage.getItem('stickFightSettings');
  if (saved) {
    const parsed = JSON.parse(saved);
    settings.masterVolume = clamp(parsed.masterVolume !== undefined ? parsed.masterVolume : 0.8, 0, 1);
    settings.volume = clamp(parsed.volume !== undefined ? parsed.volume : 0.5, 0, 1);
    settings.shake = clamp(parsed.shake !== undefined ? parsed.shake : 1.0, 0, 2.0);
    settings.particles = clamp(parsed.particles !== undefined ? parsed.particles : 1.0, 0, 2.0);
    settings.themeColor = parsed.themeColor || '#4fc9ff';
    settings.p1Name = parsed.p1Name || 'P1';
    settings.aspectRatio = parsed.aspectRatio || 'default';
    settings.sideBlackBar = clamp(parsed.sideBlackBar || 0, 0, 30);
    const legacyScale = parsed.touchScale !== undefined ? parsed.touchScale : 1.0;
    settings.touchScaleLeft = clamp(parsed.touchScaleLeft !== undefined ? parsed.touchScaleLeft : legacyScale, 0.6, 1.6);
    settings.touchScaleRight = clamp(parsed.touchScaleRight !== undefined ? parsed.touchScaleRight : legacyScale, 0.6, 1.6);
    settings.touchOpacity = clamp(parsed.touchOpacity !== undefined ? parsed.touchOpacity : 1.0, 0.3, 1.0);
    settings.fps = [30, 60, 120].includes(parsed.fps) ? parsed.fps : 60;
    settings.bgmVolume = clamp(parsed.bgmVolume !== undefined ? parsed.bgmVolume : 0.45, 0, 1);
    settings.bgmOn = parsed.bgmOn !== false;
    settings.bgmIndex = clamp(parsed.bgmIndex | 0 || 0, 0, 999);
    settings.bgmSrc = typeof parsed.bgmSrc === 'string' ? parsed.bgmSrc : '';
    if (parsed.touchOffset) {
      settings.touchOffset.left = parsed.touchOffset.left || { x: 0, y: 0 };
      settings.touchOffset.right = parsed.touchOffset.right || { x: 0, y: 0 };
    }
    if (parsed.equippedP1) settings.equippedP1 = parsed.equippedP1;
    if (parsed.equippedP2) settings.equippedP2 = parsed.equippedP2;
    settings.scrollY = 0;
  }
} catch(e) {}

function saveSettings() {
  try { localStorage.setItem('stickFightSettings', JSON.stringify(settings)); } catch(e) {}
}

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const num = parseInt(hex, 16);
  return { r: num >> 16, g: (num >> 8) & 255, b: num & 255 };
}
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}
function getColorSet(baseHex, brightness) {
  const { r, g, b } = hexToRgb(baseHex);
  const nr = clamp(Math.round(r * brightness), 0, 255);
  const ng = clamp(Math.round(g * brightness), 0, 255);
  const nb = clamp(Math.round(b * brightness), 0, 255);
  const finalHex = rgbToHex(nr, ng, nb);
  const darkHex = rgbToHex(nr * 0.5, ng * 0.5, nb * 0.5);
  return { color: finalHex, dark: darkHex, rgb: `${nr},${ng},${nb}` };
}
const CLASSIC_COLORS = [
  '#ff3333', '#ff7f00', '#ffdb58', '#5eff8b',
  '#00e5ff', '#4fc9ff', '#b76aff', '#ff7bcf',
  '#ffffff', '#a0a0c8'
];

// 闯关失败结算随机颜文字
const GAME_OVER_EMOTES = [
  '(◣_◢)', '(¬_¬)', '(｡•́︿•̀｡)', '(ಥ_ಥ)', '(；⌣̀_⌣́)',
  '( •̀ ω •́ )', '( -_-)', '(￣▽￣)', '(・_・ヾ)', '(´・ω・`)'
];

let audioCtx = null;
let noiseBufferCache = null;
function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
function getNoiseBuffer() {
  if (noiseBufferCache) return noiseBufferCache;
  const sr = audioCtx.sampleRate;
  const buf = audioCtx.createBuffer(1, Math.floor(sr * 0.3), sr);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseBufferCache = buf;
  return buf;
}
function playNoiseBurst(t, dur, vol) {
  if (!audioCtx) return;
  const noise = audioCtx.createBufferSource();
  noise.buffer = getNoiseBuffer();
  const ng = audioCtx.createGain();
  noise.connect(ng); ng.connect(audioCtx.destination);
  ng.gain.setValueAtTime(vol, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + dur);
  noise.start(t); noise.stop(t + dur);
}
function playSound(type) {
  if (!audioCtx) return;
  if (gameState === 'menu' || gameState === 'entertainment_menu' || isSettingsOpen || isWardrobeOpen || isAnnouncementOpen) return;
  if (settings.volume <= 0) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  const baseVol = 0.3 * settings.volume * settings.masterVolume;
  if (type === 'swing') {
    osc.type = 'sine'; osc.frequency.setValueAtTime(400, t); osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
    gain.gain.setValueAtTime(baseVol * 0.3, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    osc.start(t); osc.stop(t + 0.1);
  } else if (type === 'hit') {
    osc.type = 'square'; osc.frequency.setValueAtTime(150, t); osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    gain.gain.setValueAtTime(baseVol * 1.0, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    osc.start(t); osc.stop(t + 0.15); playNoiseBurst(t, 0.12, baseVol * 0.45);
  } else if (type === 'crit') {
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, t); osc.frequency.exponentialRampToValueAtTime(50, t + 0.2);
    gain.gain.setValueAtTime(baseVol * 1.2, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    osc.start(t); osc.stop(t + 0.2); playNoiseBurst(t, 0.18, baseVol * 0.55);
  } else if (type === 'ko') {
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, t); osc.frequency.exponentialRampToValueAtTime(10, t + 0.5);
    gain.gain.setValueAtTime(baseVol * 1.5, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
    osc.start(t); osc.stop(t + 0.5); playNoiseBurst(t, 0.4, baseVol * 0.6);
  } else if (type === 'coin') {
    osc.type = 'sine'; osc.frequency.setValueAtTime(800, t); osc.frequency.setValueAtTime(1200, t + 0.05);
    gain.gain.setValueAtTime(baseVol * 0.6, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    osc.start(t); osc.stop(t + 0.15);
  } else if (type === 'deny') {
    // 攻击动作未结束时被卡键：短促低频闷响，提示“此刻按不动”
    osc.type = 'square'; osc.frequency.setValueAtTime(120, t); osc.frequency.exponentialRampToValueAtTime(70, t + 0.06);
    gain.gain.setValueAtTime(baseVol * 0.22, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.06);
    osc.start(t); osc.stop(t + 0.06);
  } else if (type === 'jump') {
    osc.type = 'sine'; osc.frequency.setValueAtTime(300, t); osc.frequency.exponentialRampToValueAtTime(540, t + 0.11);
    gain.gain.setValueAtTime(baseVol * 0.32, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.11);
    osc.start(t); osc.stop(t + 0.11);
  } else if (type === 'land') {
    osc.type = 'triangle'; osc.frequency.setValueAtTime(160, t); osc.frequency.exponentialRampToValueAtTime(70, t + 0.09);
    gain.gain.setValueAtTime(baseVol * 0.28, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.09);
    osc.start(t); osc.stop(t + 0.09);
  } else if (type === 'dash') {
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(520, t); osc.frequency.exponentialRampToValueAtTime(180, t + 0.14);
    gain.gain.setValueAtTime(baseVol * 0.26, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.14);
    osc.start(t); osc.stop(t + 0.14); playNoiseBurst(t, 0.1, baseVol * 0.2);
  } else if (type === 'parry') {
    osc.type = 'triangle'; osc.frequency.setValueAtTime(900, t); osc.frequency.exponentialRampToValueAtTime(1300, t + 0.07);
    gain.gain.setValueAtTime(baseVol * 0.34, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.09);
    osc.start(t); osc.stop(t + 0.09);
  }
}

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = 1000, H = 560;
const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
canvas.width = W * DPR; canvas.height = H * DPR;
ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

const nameModal = document.getElementById('nameModal');
const nameInput = document.getElementById('nameInput');
document.getElementById('nameOk').onclick = () => {
    let val = nameInput.value.trim();
    if (val !== '') {
        settings.p1Name = val;
        if (p1) p1.label = val;
        saveSettings();
    }
    nameModal.style.display = 'none';
};
document.getElementById('nameCancel').onclick = () => { nameModal.style.display = 'none'; };
nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('nameOk').click(); });

function applyAspectRatio(mode) {
    canvas.className = '';
    if (mode === 'fullscreen') {
        canvas.classList.add('canvas-fullscreen');
        if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    } else if (mode === '16:9') {
        canvas.classList.add('canvas-16-9');
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    } else if (mode === '4:3') {
        canvas.classList.add('canvas-4-3');
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    } else if (mode === '1:1') {
        canvas.classList.add('canvas-1-1');
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    } else if (mode === '1:2') {
        canvas.classList.add('canvas-1-2');
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    } else {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }
}
applyAspectRatio(settings.aspectRatio);

const GROUND = 470;
const GRAVITY = 0.95;
const MOVE_SPEED = 4.4;
const JUMP_V = -17;
const LAND_DUR = 10;
const JUMP_BUFFER = 6;
const ACTION_BUFFER = 6;

const HEAD_R = 11;
const TORSO_L = 40;
const UPPER_ARM_L = 19;
const FOREARM_L = 19;
const THIGH_L = 26;
const SHIN_L = 26;
const HIP_H = 50;

const RAGDOLL_FLOOR_HIP = -20;
const RAGDOLL_BOUNCE = 0.35;

const BASE_MAX_STAMINA = 100;
const STAMINA_COST_JUMP = 30;
const STAMINA_COST_DASH = 25;
const BASE_STAMINA_REGEN = 0.35;
const MAX_PARTICLES = 500;
const MAX_LEVEL = 10;

const HEADSHOT_MULT = 1.5;
const HEADSHOT_STUN_MULT = 1.2;
const HITSTOP_BASE = 4;
const HITSTOP_PER_DMG = 0.3;
const SHAKE_BASE = 6;
const SHAKE_PER_DMG = 0.4;

const PARRY_DMG_MULT = 0.25;
const PARRY_CHIP_KNOCK = 0.35;
const BREAK_KNOCK = 16;
const COUNTER_DUR = 46;
const COUNTER_DMG = 26;
const COUNTER_THROW_VY = -13;
const COUNTER_THROW_VX = 11;

// 攻击疲劳：连续第 4 次起按相同攻击键会逐次变慢
const FATIGUE_THRESHOLD = 4;   // 连续达到此次数后开始衰减（前 3 次正常）
const FATIGUE_STEP = 0.12;     // 每多连续 1 次，动作时长 / 冷却 +12%
const FATIGUE_MAX = 0.50;      // 衰减上限 +50%
const FATIGUE_DMG_STEP = 0.03; // 疲劳连击每层命中伤害 -3%
const FATIGUE_DMG_MAX = 0.15;  // 伤害递减封顶 -15%

const MOVES = {
  punch:       { dur: 20, hitStart: 6,  hitEnd: 11, dmg: 7,  knock: 5,  stun: 15 },
  kick:        { dur: 30, hitStart: 11, hitEnd: 17, dmg: 12, knock: 9,  stun: 24 },
  airkick:     { dur: 26, hitStart: 7,  hitEnd: 15, dmg: 11, knock: 10, stun: 22 }
};
function isKick(type) { return type === 'kick' || type === 'airkick'; }
function isHeavyAttack(type) { return type === 'airkick'; }

let currentMapIndex = 0;
let mapTime = 0;
let bgTime = 0;
let bgScrollPx = 0;
let mapParticles = [];

// 服装与饰品数据已拆分到 clothes-data.js（先于本文件加载）

function seg(a, b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
function pol(o, len, ang) { return { x: o.x + Math.sin(ang) * len, y: o.y + Math.cos(ang) * len }; }
function roundRect(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function basePose() {
  return {
    thighF: -0.18, shinF: 0.22, thighB:  0.32, shinB: -0.22,
    uArmF:  0.75, fArmF: 2.15, uArmB: -0.28, fArmB: 0.55,
    lean: 0, hipY: -HIP_H, hipX: 0
  };
}

const POSES = {
  idle: { poseSpeed: 0.20, compute(f) {
    const p = basePose(); const b = Math.sin(f.animTime * 0.07);
    p.hipY += b * 1.6; p.uArmF += b * 0.06; p.uArmB -= b * 0.06; p.lean += b * 0.008; return p;
  }},
  walk: { poseSpeed: 0.50, compute(f) {
    const p = basePose(); const w = Math.sin(f.animTime * 0.24);
    p.thighF = w * 0.62; p.thighB = -w * 0.62;
    p.shinF = Math.min(0, w) * 0.85 - 0.05; p.shinB = Math.min(0, -w) * 0.85 - 0.05;
    p.hipY += Math.abs(w) * 2.0; p.uArmF -= w * 0.26; p.uArmB += w * 0.26; p.lean += 0.04; return p;
  }},
  run: { poseSpeed: 0.72, compute(f) {
    const p = basePose();
    const w = Math.sin(f.animTime * 0.45);
    const wAbs = Math.abs(w);

    p.lean = 0.30;
    p.hipY = -HIP_H - 4 + (1 - wAbs) * 3.5;

    p.thighF = w * 0.75;
    p.shinF = -0.15 - (1 - w) * 0.65;

    p.thighB = -w * 0.75;
    p.shinB = -0.15 - (1 + w) * 0.65;

    p.uArmF = 0.50 - w * 0.70;
    p.fArmF = 1.95 - w * 0.40;
    p.uArmB = 0.10 + w * 0.70;
    p.fArmB = 0.75 + w * 0.40;

    return p;
  }},
  jump: { poseSpeed: 0.55, compute(f) {
    const p = basePose(); const rising = f.vy < 0;
    if (rising) {
      p.thighF = 0.80; p.shinF = -1.40; p.thighB = 0.35; p.shinB = -0.75;
      p.uArmF = 2.45; p.fArmF = 2.85; p.uArmB = -1.65; p.fArmB = -2.15; p.lean = 0.18;
    } else {
      // 下落姿态：屈膝收拢、手臂后张、身体略后仰，准备落地
      p.thighF = 0.42; p.shinF = -0.55; p.thighB = 0.46; p.shinB = -0.62;
      p.uArmF = -0.95; p.fArmF = -1.35; p.uArmB = 0.75; p.fArmB = 1.05; p.lean = -0.16;
    }
    if (f.flipAngle > 0) {
      p.thighF = 1.50; p.shinF = -1.95; p.thighB = 1.50; p.shinB = -1.95;
      p.uArmF = 1.60; p.fArmF = 1.60; p.uArmB = 1.60; p.fArmB = 1.60; p.lean = 0.25; p.hipY = -40;
    }
    return p;
  }},
  dash: { poseSpeed: 0.65, compute(f) {
    const p = basePose(); const isBack = f.dashDir !== f.facing;
    if (!f.onGround) {
      p.lean = isBack ? -0.35 : 0.50;
      p.thighF = isBack ? 0.70 : -0.30; p.shinF = isBack ? -1.00 : 0.40;
      p.thighB = isBack ? 0.30 : -0.50; p.shinB = isBack ? -0.50 : 0.80;
      p.uArmF = 1.20; p.fArmF = 1.60; p.uArmB = -0.80; p.fArmB = -1.20; p.hipY = -45;
    } else {
      if (!isBack) {
        p.lean = 0.75; p.thighF = 1.10; p.shinF = -1.30; p.thighB = -0.40; p.shinB = 0.50;
        p.uArmF = -0.50; p.fArmF = -0.80; p.uArmB = -0.50; p.fArmB = -0.80; p.hipY = -40;
      } else {
        p.lean = -0.50; p.thighF = 0.60; p.shinF = -0.80; p.thighB = 0.20; p.shinB = -0.40;
        p.uArmF = 2.20; p.fArmF = 2.50; p.uArmB = 1.80; p.fArmB = 2.20; p.hipY = -45;
      }
    }
    return p;
  }},
  punch: { poseSpeed: 0.75, compute(f) {
    const p = basePose(); const st = f.stateTime; const sc = f.fatigueScale || 1; let ext;
    if (st < 6*sc) ext = easeOutQuad(st/(6*sc)) * 0.35;
    else if (st < 11*sc) ext = 0.35 + easeOutQuad((st - 6*sc)/(5*sc)) * 0.65;
    else ext = Math.max(0, 1 - easeOutQuad((st - 11*sc)/(9*sc)));
    p.lean = lerp(0, 0.55, ext); p.hipX = lerp(0, 25, ext); p.hipY = lerp(-HIP_H, -HIP_H + 10, ext);
    p.thighF = lerp(-0.18, 1.25, ext); p.shinF = lerp(0.22, -0.50, ext); p.thighB = lerp(0.32, -0.85, ext); p.shinB = lerp(-0.22, 0.10, ext);
    p.uArmF = lerp(0.75, 1.57, ext); p.fArmF = lerp(2.15, 1.57, ext); p.uArmB = lerp(-0.28, -1.00, ext); p.fArmB = lerp(0.55, 1.60, ext); return p;
  }},
  kick: { poseSpeed: 0.72, compute(f) {
    const p = basePose(); const st = f.stateTime; const sc = f.fatigueScale || 1; let ext;
    if (st < 10*sc) ext = easeOutQuad(st/(10*sc)) * 0.30;
    else if (st < 17*sc) ext = 0.30 + easeOutQuad((st - 10*sc)/(7*sc)) * 0.70;
    else ext = Math.max(0, 1 - easeOutQuad((st - 17*sc)/(13*sc)));
    p.thighF = lerp(-0.18, 1.50, ext); p.shinF = lerp(0.22, 0.02, ext); p.thighB = lerp(0.32, 0.06, ext); p.shinB = lerp(-0.22, -0.05, ext);
    p.lean = -ext * 0.30; p.hipY = -HIP_H + ext * 3; p.hipX = -ext * 4;
    p.uArmF = lerp(0.75, -0.25, ext); p.fArmF = lerp(2.15, 1.20, ext); p.uArmB = lerp(-0.28, -1.50, ext); p.fArmB = lerp(0.55, -2.30, ext); return p;
  }},
  airkick: { poseSpeed: 0.75, compute(f) {
    const p = basePose(); const st = f.stateTime; const sc = f.fatigueScale || 1; let ext;
    if (st < 7*sc) ext = easeOutQuad(st/(7*sc)) * 0.35;
    else if (st < 14*sc) ext = 0.35 + easeOutQuad((st - 7*sc)/(7*sc)) * 0.65;
    else ext = Math.max(0, 1 - easeOutQuad((st - 14*sc)/(12*sc)));
    const rising = f.vy < 0; const baseThighF = rising ? 0.80 : 0.15; const baseShinF = rising ? -1.40 : -0.10;
    p.thighF = lerp(baseThighF, 1.55, ext); p.shinF = lerp(baseShinF, 0.05, ext);
    p.thighB = lerp(rising ? 0.35 : 0.20, -0.15, ext); p.shinB = lerp(rising ? -0.75 : -0.15, -0.30, ext);
    p.uArmF = lerp(rising ? 2.45 : 1.20, 0.55, ext); p.fArmF = lerp(rising ? 2.85 : 2.30, 2.10, ext);
    p.uArmB = lerp(rising ? -1.65 : -0.30, -1.10, ext); p.fArmB = lerp(rising ? -2.15 : 0.45, -1.80, ext);
    p.lean = lerp(rising ? 0.18 : -0.05, -0.22, ext); return p;
  }},
  parry: { poseSpeed: 0.66, compute(f) {
    const p = basePose(); p.hipY = -34; p.lean = 0.26; p.hipX = -5;
    p.thighF = 0.92; p.shinF = -1.05; p.thighB = 0.46; p.shinB = -0.78;
    p.uArmF = 1.20; p.fArmF = 2.30; p.uArmB = 0.95; p.fArmB = 2.05;
    const raise = Math.min(1, f.stateTime / 4); const lift = (1 - raise);
    p.uArmF -= lift * 0.45; p.uArmB -= lift * 0.45; p.fArmF -= lift * 0.40; p.fArmB -= lift * 0.40; p.hipY += lift * 7;
    const b = Math.sin(f.animTime * 0.11) * 0.4; p.hipY += b * 0.4; p.uArmF += b * 0.012; p.uArmB += b * 0.012; return p;
  }},
  parryCounter: { poseSpeed: 0.55, compute(f) {
    const p = basePose(); const st = f.stateTime;
    const grab = Math.min(1, st / 12); const turn = st > 12 ? Math.min(1, (st - 12) / 8) : 0; const throwPhase = st > 18 ? Math.min(1, (st - 18) / 14) : 0;
    p.hipY = -HIP_H + grab * 8 + turn * 4 + throwPhase * 24; p.lean = grab * 0.14 - turn * 0.42 + throwPhase * 1.25; p.hipX = -grab * 8 - turn * 6 + throwPhase * 12;
    p.thighF = lerp(0.92, 0.62, grab) + turn * 0.30 - throwPhase * 0.20; p.shinF = lerp(-1.05, -0.62, grab) - turn * 0.25 + throwPhase * 0.25;
    p.thighB = lerp(0.46, 0.88, grab) + turn * 0.10 + throwPhase * 0.20; p.shinB = lerp(-0.78, -1.10, grab) - turn * 0.12 - throwPhase * 0.18;
    p.uArmF = lerp(1.20, 2.55, grab) - turn * 0.18 - throwPhase * 1.30; p.fArmF = lerp(2.30, 2.80, grab) - turn * 0.10 - throwPhase * 1.45;
    p.uArmB = lerp(0.95, 2.30, grab) - turn * 0.12 - throwPhase * 1.15; p.fArmB = lerp(2.05, 2.58, grab) - turn * 0.08 - throwPhase * 1.30; return p;
  }},
  hurt: { poseSpeed: 0.50, compute(f) {
    const p = basePose(); const k = 1 - Math.min(1, f.stateTime / 20);
    p.lean = -0.42 * k; p.hipY += 3; p.hipX = -4; p.thighF = -0.45; p.shinF = 0.30; p.thighB = 0.55; p.shinB = -0.10;
    p.uArmF = 2.00; p.fArmF = 2.80; p.uArmB = -1.80; p.fArmB = -2.50; return p;
  }},
  thrown: { poseSpeed: 0.4, compute() {
    const p = basePose(); p.hipY = -50; p.lean = 1.35; p.thighF = -0.85; p.shinF = -0.55; p.thighB = -0.55; p.shinB = -0.75;
    p.uArmF = 2.30; p.fArmF = 2.10; p.uArmB = -1.20; p.fArmB = -1.90; return p;
  }},
  ko: { poseSpeed: 0.0, compute() {
    const p = basePose(); p.hipY = RAGDOLL_FLOOR_HIP; p.lean = 1.57; p.thighF = -1.50; p.shinF = -0.05; p.thighB = -1.55; p.shinB = -0.10;
    p.uArmF = 1.50; p.fArmF = 1.45; p.uArmB = 1.55; p.fArmB = 1.40; return p;
  }}
};

function applyLandingOverride(f, pose) {
  if (f.landTimer <= 0) return pose;
  const k = Math.pow(f.landTimer / LAND_DUR, 2);
  pose.hipY += 10 * k; pose.thighF -= 0.30 * k; pose.shinF += 0.55 * k;
  pose.thighB -= 0.30 * k; pose.shinB += 0.55 * k; pose.lean += 0.12 * k; return pose;
}
function clampPose(p) {
  const A = Math.PI * 1.05; const armLegKeys = ['thighF', 'thighB', 'uArmF', 'uArmB', 'fArmF', 'fArmB'];
  for (let i = 0; i < armLegKeys.length; i++) { const k = armLegKeys[i]; p[k] = clamp(p[k], -A, A); }
  p.shinF = clamp(p.shinF, -1.8, 2.4); p.shinB = clamp(p.shinB, -1.8, 2.4); p.lean = clamp(p.lean, -0.8, 1.7);
  p.hipX = clamp(p.hipX, -30, 30); p.hipY = clamp(p.hipY, -HIP_H - 20, -HIP_H + 30); return p;
}
function poseToJoints(f) {
  const p = f.pose; const hip = { x: p.hipX, y: p.hipY };
  const torsoAngle = Math.PI - p.lean;
  const shoulder = { x: hip.x + Math.sin(torsoAngle) * TORSO_L, y: hip.y + Math.cos(torsoAngle) * TORSO_L };
  let headAngle = torsoAngle - p.lean * 0.25; if (f.state === 'ko') headAngle = torsoAngle;
  const head = { x: shoulder.x + Math.sin(headAngle) * (HEAD_R + 3), y: shoulder.y + Math.cos(headAngle) * (HEAD_R + 3) };
  const kneeF = pol(hip, THIGH_L, p.thighF); const footF = pol(kneeF, SHIN_L, p.thighF + p.shinF);
  const kneeB = pol(hip, THIGH_L, p.thighB); const footB = pol(kneeB, SHIN_L, p.thighB + p.shinB);
  const elbowF = pol(shoulder, UPPER_ARM_L, p.uArmF); const handF = pol(elbowF, FOREARM_L, p.fArmF);
  const elbowB = pol(shoulder, UPPER_ARM_L, p.uArmB); const handB = pol(elbowB, FOREARM_L, p.fArmB);
  return { hip, shoulder, head, kneeF, footF, kneeB, footB, elbowF, handF, elbowB, handB };
}
function getHurtBoxes(f) {
  const guarding = (f.state === 'parry' || f.state === 'parryCounter');
  if (guarding) return { head: { x: f.x - 16, y: f.y - 70, w: 32, h: 28 }, body: { x: f.x - 20, y: f.y - 50, w: 40, h: 50 } };
  return { head: { x: f.x - 18, y: f.y - 125, w: 36, h: 30 }, body: { x: f.x - 20, y: f.y - 85, w: 40, h: 85 } };
}
function getAttackBox(f) {
  const j = f.getJoints(); const kick = isKick(f.attackType); const p = kick ? j.footF : j.handF;
  const cx = f.x + p.x * f.facing; const cy = f.y + p.y;
  const r = f.attackType === 'airkick' ? 24 : (kick ? 22 : 14);
  return { x: cx - r, y: cy - r, w: r * 2, h: r * 2, cx, cy, r };
}
function aabbOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

class Fighter {
  constructor(cfg) {
    this.color = cfg.color; this.dark = cfg.dark; this.rgb = cfg.rgb; this.label = cfg.label;
    this.startX = cfg.x; this.startFacing = cfg.facing;
    this.maxHp = cfg.maxHp || 100; this.maxStamina = cfg.maxStamina || BASE_MAX_STAMINA;
    this.staminaRegen = cfg.staminaRegen || BASE_STAMINA_REGEN;
    this.aiSpeedFactor = cfg.aiSpeedFactor || 1.0; this.attackMultiplier = cfg.attackMultiplier || 1.0;
    this.moveSpeedMultiplier = cfg.moveSpeedMultiplier || 1.0; this.stunResistance = cfg.stunResistance || 0;
    this.isP1 = cfg.isP1 || false;
    this.reset();
  }
  reset() {
    this.x = this.startX; this.y = GROUND; this.vx = 0; this.vy = 0; this.facing = this.startFacing;
    this.hp = this.maxHp; this.hpShow = this.maxHp; this.stamina = this.maxStamina;
    this.jumpCount = 0; this.hasAirDashed = false; this.dashDir = 1; this.flipAngle = 0; this.flipDir = 1;
    this.state = 'idle'; this.stateTime = 0; this.stateDur = 1; this.animTime = Math.random() * 200;
    this.onGround = true; this.attack = null; this.attackType = null; this.hasHit = false; this.flash = 0;
    this.attackCd = 0; this.landTimer = 0; this.jumpBufferTimer = 0; this.actionBuffer = null; this.actionBufferTimer = 0;
    this.think = 0; this.plan = null; this.trail = []; this._aiDashCd = 0; this._guardHold = 0;
    this.pose = basePose(); this.poseOverlays = []; this.ragdoll = null;
    this.counterVictim = null; this.thrower = null; this._throwReleased = false; this.justParried = false;
    this._joints = null;
    this.dropThroughCount = 0;
    this.invincibleTimer = 0;
    this.lastAtkType = null; this.repeatAtkCount = 0; this.fatigueScale = 1;
  }
  setState(s, dur, force = false) {
    if (this.state === s && !force) return;
    this.state = s; this.stateTime = 0; this.stateDur = dur || 1; this._joints = null;
  }
  clearCombat() {
    this.attack = null; this.attackType = null; this.hasHit = false; this.attackCd = 0;
    this.vx = 0; this.vy = 0; this.flash = 0; this.landTimer = 0; this.trail.length = 0;
    this.jumpCount = 0; this.hasAirDashed = false; this.flipAngle = 0; this.actionBuffer = null;
    this.counterVictim = null; this.thrower = null; this._throwReleased = false; this.justParried = false; this._joints = null;
    this.dropThroughCount = 0;
    this.invincibleTimer = 0;
    this._resetAttackFatigue();
  }
  _resetAttackFatigue() {
    this.lastAtkType = null; this.repeatAtkCount = 0; this.fatigueScale = 1;
  }
  startAttack(type) {
    const mv = MOVES[type];
    // 按按键归并：空中踢(airkick)与地面踢(kick)同属 K 键
    const keyType = type === 'airkick' ? 'kick' : type;
    this.repeatAtkCount = (this.lastAtkType === keyType) ? this.repeatAtkCount + 1 : 1;
    this.lastAtkType = keyType;
    const penalty = Math.min(FATIGUE_MAX, Math.max(0, this.repeatAtkCount - FATIGUE_THRESHOLD + 1) * FATIGUE_STEP);
    this.fatigueScale = 1 + penalty;
    this.attack = mv; this.attackType = type; this.hasHit = false;
    if (this.onGround) this.vx = 0;
    this.state = type; this.stateTime = 0; this.stateDur = mv.dur * this.fatigueScale; this._joints = null; playSound('swing');
  }
  getJoints() { if (!this._joints) this._joints = poseToJoints(this); return this._joints; }
  canEnter(nextState) {
    if (this.state === 'ko' || this.state === 'hurt' || this.state === 'parryCounter') return false;
    const grounded = this.onGround; const free = !this.attack;
    switch (nextState) {
      case 'punch': case 'kick': return grounded && free && this.attackCd <= 0 && (this.state === 'idle' || this.state === 'walk' || this.state === 'run');
      case 'jump': return grounded && free && (this.state === 'idle' || this.state === 'walk' || this.state === 'run');
      case 'airkick': return !grounded && free && this.state === 'jump' && this.attackCd <= 0;
      case 'parry': return grounded && free && (this.state === 'idle' || this.state === 'walk' || this.state === 'run');
      case 'dash':
        if (this.stamina < STAMINA_COST_DASH) return false;
        if (grounded) return free && (this.state === 'idle' || this.state === 'walk' || this.state === 'run');
        else return !this.hasAirDashed && (this.state === 'jump' || this.state === 'airkick');
      default: return false;
    }
  }
  smoothPose() {
    const cfg = POSES[this.state] || POSES.idle;
    let target = applyLandingOverride(this, cfg.compute(this));
    for (let i = 0; i < this.poseOverlays.length; i++) this.poseOverlays[i](this, target);
    target = clampPose(target);
    let speed = cfg.poseSpeed; if (this.landTimer > 0) speed = Math.max(speed, 0.45);
    for (const k in target) this.pose[k] = lerp(this.pose[k], target[k], speed); this._joints = null;
  }
  startRagdoll(dir) {
    this.ragdoll = {
      hipY: this.pose.hipY, hipYVel: 0, hipX: this.pose.hipX, hipXVel: 0, lean: this.pose.lean, leanVel: dir * 0.08,
      angles: { thighF: this.pose.thighF, thighB: this.pose.thighB, shinF: this.pose.shinF, shinB: this.pose.shinB, uArmF: this.pose.uArmF, uArmB: this.pose.uArmB, fArmF: this.pose.fArmF, fArmB: this.pose.fArmB },
      vels: { thighF: rand(-0.03, 0.03), thighB: rand(-0.03, 0.03), shinF: rand(-0.03, 0.03), shinB: rand(-0.03, 0.03), uArmF: rand(-0.06, 0.06), uArmB: rand(-0.06, 0.06), fArmF: rand(-0.06, 0.06), fArmB: rand(-0.06, 0.06) },
      bounced: false
    };
    this._joints = null;
  }
  startCounter(foe) {
    this.counterVictim = foe; this._throwReleased = false; this.facing = foe.x >= this.x ? 1 : -1;
    this.setState('parryCounter', COUNTER_DUR); this.stateDur = COUNTER_DUR; this.vx = 0; this.vy = 0;
    this.attack = null; this.attackType = null;
    foe.state = 'thrown'; foe.stateTime = 0; foe.attack = null; foe.attackType = null;
    foe.vx = 0; foe.vy = 0; foe.thrower = this; foe.facing = -this.facing;
    if (gameState === 'playing') playSound('crit');
    shake = Math.max(shake, 8 * settings.shake); hitstop = 6;
  }
  _applyCounterDamage(foe) {
    if (foe.state === 'ko') return;
    if (gameState === 'menu' || gameState === 'entertainment_menu') {
        foe.hp = 100; foe.hpShow = 100; foe.setState('hurt', 34, true);
        foe.vx = this.facing * 5; foe.vy = -5; foe.onGround = false;
        return;
    }
    const dmg = Math.round(COUNTER_DMG * this.attackMultiplier);
    foe.hp = Math.max(0, foe.hp - dmg); foe.hpShow = Math.max(foe.hpShow, foe.hp);
    if (comboOwner === this && comboTimer > 0) comboCount++; else { comboOwner = this; comboCount = 1; }
    comboTimer = 90;
    if (foe.hp <= 0) {
      foe.setState('ko', 999, true); foe.vx = this.facing * 14; foe.vy = -14; foe.onGround = false; foe.startRagdoll(this.facing);
      shake = 20 * settings.shake; hitstop = 10;
      if (gameState !== 'menu') screenFlash = 0.65; playSound('ko');
      if (gameState === 'playing') { gameState = 'ko'; winner = this; koTimer = 0; }
    }
  }
  updateRagdoll() {
    const r = this.ragdoll; if (!r) return;
    if (this.onGround) {
      r.hipYVel += GRAVITY * 0.85; r.hipY += r.hipYVel;
      if (r.hipY >= RAGDOLL_FLOOR_HIP) {
        r.hipY = RAGDOLL_FLOOR_HIP;
        if (r.hipYVel > 0.4) {
          r.hipYVel = -r.hipYVel * RAGDOLL_BOUNCE;
          if (!r.bounced) { r.bounced = true; r.leanVel += rand(-0.06, 0.06); for (const k in r.vels) r.vels[k] += rand(-0.05, 0.05); shake = Math.max(shake, 5 * settings.shake); }
        } else r.hipYVel = 0;
      }
    }
    r.hipXVel *= 0.93; r.hipX = clamp(r.hipX + r.hipXVel, -12, 12);
    const targetLean = 1.57; const leanForce = this.onGround ? 0.05 : 0.12;
    r.leanVel += (targetLean - r.lean) * leanForce - r.leanVel * 0.18; r.lean = clamp(r.lean + r.leanVel, -0.3, 1.7);
    let targetAngles = { thighF: -1.50, shinF: -0.05, thighB: -1.55, shinB: -0.10, uArmF: 1.50, fArmF: 1.45, uArmB: 1.55, fArmB: 1.40 };
    if (!this.onGround) { targetAngles.thighF = -0.6; targetAngles.shinF = 0.4; targetAngles.thighB = -0.8; targetAngles.shinB = 0.5; targetAngles.uArmF = 2.4; targetAngles.fArmF = 2.6; targetAngles.uArmB = 2.6; targetAngles.fArmB = 2.8; }
    for (const k in r.angles) { const t = targetAngles[k]; r.vels[k] += (t - r.angles[k]) * 0.07 - r.vels[k] * 0.16; r.angles[k] += r.vels[k]; }
    this.pose.hipY = r.hipY; this.pose.hipX = r.hipX; this.pose.lean = r.lean; for (const k in r.angles) this.pose[k] = r.angles[k];
    clampPose(this.pose); this._joints = null;
  }
  updateTrail() {
    if (this.attack || this.state === 'dash' || this.flipAngle > 0) {
      const j = this.getJoints(); let p = j.handF;
      if (this.attack && isKick(this.attackType)) p = j.footF;
      if (this.state === 'dash' || this.flipAngle > 0) p = j.hip;
      this.trail.push({ x: this.x + p.x * this.facing, y: this.y + p.y, age: 0 });
    }
    for (const tp of this.trail) tp.age++;
    while (this.trail.length && this.trail[0].age > 12) this.trail.shift();
    if (this.trail.length > 24) this.trail.splice(0, this.trail.length - 24);
  }
  update(inp, foe) {
    if (this.state === 'thrown' && this.thrower) { this.animTime++; this.stateTime++; this.vx = 0; this.vy = 0; if (this.flash > 0) this.flash--; return; }
    this.animTime++; this.stateTime++;
    if (this.flash > 0) this.flash--;
    if (this.attackCd > 0) this.attackCd--;
    if (this.landTimer > 0) this.landTimer--;
    // 攻击动作未播完（this.attack 非空）时丢弃重复攻击键并给出“按不动”反馈，不再进入动作缓冲
    if (inp.punch) {
      if (!this.attack) { this.actionBuffer = 'punch'; this.actionBufferTimer = ACTION_BUFFER; }
      else { playSound('deny'); shake = Math.max(shake, 1.2 * settings.shake); }
    }
    if (inp.kick) {
      if (!this.attack) { this.actionBuffer = 'kick'; this.actionBufferTimer = ACTION_BUFFER; }
      else { playSound('deny'); shake = Math.max(shake, 1.2 * settings.shake); }
    }
    if (this.actionBufferTimer > 0) this.actionBufferTimer--; else this.actionBuffer = null;
    if (this.state !== 'dash' && this.state !== 'hurt' && this.state !== 'ko') this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegen);
    if (inp.up) this.jumpBufferTimer = JUMP_BUFFER; if (this.jumpBufferTimer > 0) this.jumpBufferTimer--;
    if (this.state === 'ko') {
      if (this.onGround) this.vx *= 0.85; else this.vx *= 0.99;
      this.vy += GRAVITY; this.x += this.vx; this.y += this.vy; this.x = clamp(this.x, 55, W - 55);
      if (this.y >= GROUND) {
        this.y = GROUND;
        if (this.vy > 5) { this.vy = -this.vy * 0.4; this.vx *= 0.7; this.onGround = false; shake = Math.max(shake, 12 * settings.shake); }
        else { this.vy = 0; this.onGround = true; }
      } else this.onGround = false;
      this.updateRagdoll(); this.updateTrail(); return;
    }
    if (this.state === 'parryCounter') {
      this.vx = 0; this.vy = 0; this.x += this.vx; this.y = GROUND; this.onGround = true;
      const foe = this.counterVictim;
      if (foe && foe.state === 'thrown' && foe.thrower === this) {
        const st = this.stateTime;
        if (st < 20) { const k = Math.min(1, st / 18); foe.x = lerp(foe.x, this.x + this.facing * (22 - k * 40), 0.42); foe.y = lerp(foe.y, GROUND - 70 * k, 0.4); foe.facing = -this.facing; foe.smoothPose(); }
        else if (!this._throwReleased) {
          this._throwReleased = true; foe.x = this.x - this.facing * 30; foe.y = GROUND - 74; foe.thrower = null;
          foe.state = 'hurt'; foe.stateTime = 0; foe.stateDur = 34; foe._joints = null;
          foe.vx = -this.facing * COUNTER_THROW_VX; foe.vy = COUNTER_THROW_VY; foe.onGround = false; foe.flash = 0;
          this._applyCounterDamage(foe); shake = Math.max(shake, 16 * settings.shake); hitstop = 8;
          if (gameState === 'playing') playSound('crit');
        }
      }
      if (this.stateTime >= COUNTER_DUR) { this.counterVictim = null; this._throwReleased = false; this.setState('idle'); this.attackCd = 12; }
      this.smoothPose(); this.updateTrail(); return;
    }
    if (!this.attack && this.state !== 'dash') this.facing = foe.x >= this.x ? 1 : -1;
    if (this.state === 'dash' && this.stateTime >= 16) { if (this.onGround) { this.setState('idle'); this.vx = 0; } else { this.setState('jump'); this.vx *= 0.5; } }
    if (this.attack && this.stateTime >= this.attack.dur * this.fatigueScale) {
      const wasAirKick = this.attackType === 'airkick'; this.attack = null; this.attackType = null; this.attackCd = Math.round(rand(6, 16) * this.fatigueScale);
      if (wasAirKick && !this.onGround) this.setState('jump'); else this.setState('idle');
    }
    if (this.state === 'hurt') this._resetAttackFatigue();
    if (this.state === 'hurt' && this.stateTime >= this.stateDur) this.setState('idle');
    if (this.jumpBufferTimer > 0) {
      if (this.canEnter('jump')) {
        this.jumpBufferTimer = 0; this.landTimer = 0; this.vy = JUMP_V; this.onGround = false; this.jumpCount = 1; this.setState('jump'); this.stateDur = 999; this._resetAttackFatigue(); playSound('jump');
      } else if (!this.onGround && this.state === 'jump' && this.jumpCount < 2 && this.stamina >= STAMINA_COST_JUMP) {
        this.jumpBufferTimer = 0; this.stamina -= STAMINA_COST_JUMP; this.vy = JUMP_V * 0.95; this.jumpCount = 2; this.stateTime = 0; playSound('jump');
        if (inp.left || inp.right) { this.vx = (inp.left ? -1 : 1) * MOVE_SPEED * 2.0 * this.moveSpeedMultiplier; this.flipDir = inp.left ? -1 : 1; this.flipAngle = TAU; } else this.vx *= 0.5;
      }
    }
    if (inp.dash && this.canEnter('dash')) {
      this.stamina -= STAMINA_COST_DASH; let dir = 0; if (inp.left) dir = -1; if (inp.right) dir = 1;
      this.dashDir = dir === 0 ? this.facing : dir;
      if (!this.onGround) { this.hasAirDashed = true; this.attack = null; this.attackType = null; this.vy = 0; }
      this.setState('dash'); this.stateTime = 0; this.vx = this.dashDir * (this.onGround ? 24 : 18) * this.moveSpeedMultiplier; this._resetAttackFatigue(); playSound('dash');
    }
    if (inp.guard && this.canEnter('parry')) { this.setState('parry', 999); this.stateDur = 999; this.vx = 0; this.justParried = true; this._resetAttackFatigue(); playSound('parry'); }
    if (this.state === 'parry' && (!inp.guard || !this.onGround)) this.setState('idle');
    if (this.actionBuffer) {
      if (this.actionBuffer === 'punch' && this.canEnter('punch')) { this.startAttack('punch'); this.actionBuffer = null; }
      else if (this.actionBuffer === 'kick' && this.canEnter('kick')) { this.startAttack('kick'); this.actionBuffer = null; }
      else if (this.actionBuffer === 'kick' && this.canEnter('airkick')) { this.startAttack('airkick'); this.actionBuffer = null; }
    }
    if (this.onGround && (this.state === 'idle' || this.state === 'walk' || this.state === 'run')) {
      let mv = 0; if (inp.left) mv -= 1; if (inp.right) mv += 1;
      this.vx = mv * MOVE_SPEED * this.moveSpeedMultiplier;
      if (mv !== 0) { if (this.state !== 'walk' && this.state !== 'run') { this.state = 'walk'; this.stateTime = 0; this._joints = null; } }
      else { if (this.state !== 'idle') { this.state = 'idle'; this.stateTime = 0; this._joints = null; } }
    } else if (this.state === 'hurt' || this.state === 'parry') this.vx *= 0.82;
    else if (this.state === 'dash' && this.onGround) this.vx *= 0.91;
    if (this.state === 'jump' || this.state === 'airkick') {
      let mv = 0; if (inp.left) mv -= 1; if (inp.right) mv += 1;
      if (mv !== 0) this.vx = lerp(this.vx, mv * MOVE_SPEED * this.moveSpeedMultiplier, this.flipAngle > 0 ? 0.1 : 0.3); else this.vx *= 0.99;
    }
    this.x += this.vx; if (this.state === 'dash' && !this.onGround) this.vy += GRAVITY * 0.15; else this.vy += GRAVITY; this.y += this.vy;
    if (this.flipAngle > 0) { this.flipAngle -= 0.35; if (this.flipAngle < 0) this.flipAngle = 0; }
    if (this.y >= GROUND) {
      this.y = GROUND; this.vy = 0;
      if (!this.onGround) {
        this.onGround = true; this.jumpCount = 0; this.hasAirDashed = false; this.flipAngle = 0;
        if (this.state === 'jump') { this.state = 'idle'; playSound('land'); } else if (this.state === 'airkick') { this.attack = null; this.attackType = null; this.attackCd = Math.round(rand(8, 18) * this.fatigueScale); this.state = 'idle'; }
        else if (this.state === 'dash') { this.state = 'idle'; this.vx = 0; }
      }
    } else this.onGround = false;
    this.x = clamp(this.x, 55, W - 55); this.smoothPose(); this.updateTrail();
  }
}

let p1, p2;
let mode = 'ai';
let menuSelection = 0;
let entMenuSelection = 0;
let gameState = 'menu';
let introTimer = 0;
let winner = null;
let koTimer = 0;
let shake = 0;
let hitstop = 0;
let screenFlash = 0;
let particles = [];
let rings = [];
let floatingTexts = [];

let comboCount = 0;
let comboTimer = 0;
let comboOwner = null;

let p1ColorData = { baseHex: CLASSIC_COLORS[0], brightness: 1.0 };
let p2ColorData = { baseHex: CLASSIC_COLORS[1], brightness: 1.0 };
let p1Ready = false;
let p2Ready = false;
let selectTimer = 60;
let selectReturnState = 'menu';
let aiSelectTimer = 0;
let aiSelectLockTimer = 0;

let currentLevel = 1;
let playerLives = 3;
let gameOverText = '';
let specialGameOverWord = null;

let isDraggingP1Brightness = false;

// 跑酷状态/数据表与逻辑、绘制函数已拆分到 parkour.js（game.js 之后加载）

const keys = {};
const prevKeys = {};

function snapshotKeys() { for (const k in keys) prevKeys[k] = keys[k]; }
function pushParticle(p) { if (particles.length >= MAX_PARTICLES) particles.shift(); particles.push(p); }
function addFloatingText(x, y, text, color) { floatingTexts.push({ x, y, text, color, life: 40, maxLife: 40, vy: -1.5 }); }
function resetCombo() { comboCount = 0; comboTimer = 0; comboOwner = null; }

function getBossStats(level) {
  let maxHp = 100 + (level - 1) * 15; let attackMultiplier = 1.0 + level * 0.10; let moveSpeedMultiplier = 1.0; let aiSpeedFactor = 1.0; let stunResistance = 0; let staminaRegen = BASE_STAMINA_REGEN; let maxStamina = BASE_MAX_STAMINA;
  if (level >= 6) { let extra = level - 5; maxStamina = 100 + extra * 40; aiSpeedFactor = 1.0 + extra * 0.20; moveSpeedMultiplier = 1.0 + extra * 0.08; staminaRegen = BASE_STAMINA_REGEN + extra * 0.15; }
  return { maxHp, attackMultiplier, moveSpeedMultiplier, aiSpeedFactor, stunResistance, staminaRegen, maxStamina };
}
function getBossUpgradeText(nextLevel) {
  if (nextLevel <= 1) return '无加成';
  const prevStats = getBossStats(nextLevel - 1); const nextStats = getBossStats(nextLevel); const parts = [];
  if (nextStats.maxHp > prevStats.maxHp) parts.push(`血量 ${nextStats.maxHp}`);
  if (nextStats.attackMultiplier > prevStats.attackMultiplier) parts.push(`攻击力 ×${nextStats.attackMultiplier.toFixed(2)}`);
  if (nextStats.moveSpeedMultiplier > prevStats.moveSpeedMultiplier) parts.push(`移速 +${Math.round((nextStats.moveSpeedMultiplier - prevStats.moveSpeedMultiplier)*100)}%`);
  if (nextStats.aiSpeedFactor > prevStats.aiSpeedFactor) parts.push(`反应提升`);
  if (nextStats.maxStamina > prevStats.maxStamina) parts.push(`体力 ${nextStats.maxStamina}`);
  return parts.length === 0 ? '无特殊加成' : parts.join(' · ');
}

function initMenu() {
  const theme1 = getColorSet(CLASSIC_COLORS[0], 1.0); const theme2 = getColorSet(CLASSIC_COLORS[1], 1.0);
  p1 = new Fighter({ x: 340, facing: 1, color: theme1.color, dark: theme1.dark, rgb: theme1.rgb, label: settings.p1Name || 'P1', isP1: true });
  p2 = new Fighter({ x: 660, facing: -1, color: theme2.color, dark: theme2.dark, rgb: theme2.rgb, label: 'CPU', isP1: false });
  gameState = 'menu'; introTimer = 0; winner = null; koTimer = 0; shake = 0; hitstop = 0; screenFlash = 0;
  particles = []; rings = []; floatingTexts = []; mapParticles = [];
  resetCombo(); currentLevel = 1; playerLives = 3; gameOverText = ''; specialGameOverWord = null;
  isSettingsOpen = false; isWardrobeOpen = false; menuSelection = 0; entMenuSelection = 0;
  parkourPaused = false; bgScrollPx = 0;
  parkourMapFade = 0; parkourMapFrom = 0; parkourMapTo = 0;
  currentMapIndex = parkourPrevMap; // 退出跑酷恢复进入前的背景地图
}

// 本局结算：累计金币入库 + 成就检测

function enterSelect() {
  if (gameState !== 'menu' && gameState !== 'ko' && gameState !== 'entertainment_menu') return;
  if (gameState === 'menu' || gameState === 'entertainment_menu') selectReturnState = gameState;
  if (gameState === 'entertainment_menu') {
    // 模式由娱乐二级菜单点击处直接指定，此处不被 menuSelection 覆盖
  } else if (menuSelection === 0) mode = 'ai';
  else if (menuSelection === 1) mode = 'pvp';
  else if (menuSelection === 3) mode = 'parkour';
  else { mode = 'campaign'; playerLives = 3; }
  winner = null; koTimer = 0; shake = 0; hitstop = 0; screenFlash = 0; particles = []; rings = []; floatingTexts = []; resetCombo();
  gameOverText = ''; specialGameOverWord = null;
  p1ColorData = { baseHex: CLASSIC_COLORS[0], brightness: 1.0 }; p2ColorData = { baseHex: CLASSIC_COLORS[1], brightness: 1.0 };
  p1Ready = false; p2Ready = false; selectTimer = 60; aiSelectTimer = 10; aiSelectLockTimer = 0;
  p1.clearCombat(); p2.clearCombat();
  p1.x = 340; p1.facing = 1; p1.hp = p1.maxHp; p1.stamina = p1.maxStamina;
  p2.x = 660; p2.facing = -1; p2.hp = p2.maxHp; p2.stamina = p2.maxStamina;
  p1.y = GROUND; p2.y = GROUND; p1.setState('idle'); p2.setState('idle');
  gameState = 'select';
}

function enterIntro(isRetry = false) {
  p1.clearCombat(); p2.clearCombat();
  const t1 = getColorSet(p1ColorData.baseHex, p1ColorData.brightness); p1.color = t1.color; p1.dark = t1.dark; p1.rgb = t1.rgb;
  const t2 = getColorSet(p2ColorData.baseHex, p2ColorData.brightness); p2.color = t2.color; p2.dark = t2.dark; p2.rgb = t2.rgb;
  if (mode === 'campaign') {
    const stats = getBossStats(currentLevel);
    p1.maxHp = 100; p1.maxStamina = BASE_MAX_STAMINA; p1.staminaRegen = BASE_STAMINA_REGEN; p1.attackMultiplier = 1.0; p1.moveSpeedMultiplier = 1.0; p1.stunResistance = 0; p1.hp = p1.maxHp; p1.hpShow = p1.maxHp; p1.stamina = p1.maxStamina;
    p2.maxHp = stats.maxHp; p2.maxStamina = stats.maxStamina; p2.staminaRegen = stats.staminaRegen; p2.aiSpeedFactor = stats.aiSpeedFactor; p2.attackMultiplier = stats.attackMultiplier; p2.moveSpeedMultiplier = stats.moveSpeedMultiplier; p2.stunResistance = stats.stunResistance; p2.label = `BOSS Lv.${currentLevel}`;
    if (!isRetry) { p2.hp = p2.maxHp; p2.hpShow = p2.maxHp; } else p2.hpShow = p2.hp;
    p2.stamina = p2.maxStamina;
  } else {
    p1.maxHp = 100; p1.maxStamina = BASE_MAX_STAMINA; p1.staminaRegen = BASE_STAMINA_REGEN; p1.attackMultiplier = 1.0; p1.moveSpeedMultiplier = 1.0; p1.stunResistance = 0;
    p2.maxHp = 100; p2.maxStamina = BASE_MAX_STAMINA; p2.staminaRegen = BASE_STAMINA_REGEN; p2.aiSpeedFactor = 1.0; p2.attackMultiplier = 1.0; p2.moveSpeedMultiplier = 1.0; p2.stunResistance = 0; p2.label = mode === 'ai' ? 'CPU' : 'P2';
    p1.hp = p1.maxHp; p1.hpShow = p1.maxHp; p1.stamina = p1.maxStamina; p2.hp = p2.maxHp; p2.hpShow = p2.maxHp; p2.stamina = p2.maxStamina;
  }
  p1.x = -40; p2.x = W + 40; p1.y = GROUND; p2.y = GROUND; p1.facing = 1; p2.facing = -1;
  p1.setState('walk'); p2.setState('walk');
  gameState = 'intro'; introTimer = 0; particles = []; rings = []; floatingTexts = []; resetCombo();
}

function inputP1() {
  const r = {
    left: !!keys['KeyA'] || touchInp.left,
    right: !!keys['KeyD'] || touchInp.right,
    guard: !!keys['KeyS'] || touchInp.guard,
    up: (!!keys['KeyW'] && !prevKeys['KeyW']) || touchInp.up,
    punch: (!!keys['KeyJ'] && !prevKeys['KeyJ']) || touchInp.punch,
    kick: (!!keys['KeyK'] && !prevKeys['KeyK']) || touchInp.kick,
    dash: (!!keys['Space'] && !prevKeys['Space']) || touchInp.dash
  };
  // 消费单次脉冲（事件在两帧间写入，读到后即清零，避免被下一轮 tickTouch 提前清掉）
  touchInp.up = 0; touchInp.punch = 0; touchInp.kick = 0; touchInp.dash = 0;
  return r;
}
function inputP2() {
  return { left: !!keys['ArrowLeft'], right: !!keys['ArrowRight'], guard: !!keys['ArrowDown'], up: !!keys['ArrowUp'] && !prevKeys['ArrowUp'], punch: (!!keys['Digit1'] || !!keys['Numpad1']) && !(prevKeys['Digit1'] || prevKeys['Numpad1']), kick: (!!keys['Digit2'] || !!keys['Numpad2']) && !(prevKeys['Digit2'] || prevKeys['Numpad2']), dash: !!keys['ShiftRight'] && !prevKeys['ShiftRight'] };
}

function aiInput(ai, foe) {
  const inp = { left: false, right: false, up: false, guard: false, punch: false, kick: false, dash: false };
  if ((gameState !== 'playing' && gameState !== 'menu' && gameState !== 'entertainment_menu') || ai.state === 'ko' || ai.state === 'hurt') return inp;
  if (ai._aiDashCd > 0) ai._aiDashCd--; const dx = foe.x - ai.x; const dist = Math.abs(dx); const dir = dx > 0 ? 1 : -1;
  if (foe.attack && dist < 120 && ai.plan !== 'retreat' && Math.random() < 0.035) { ai.plan = Math.random() < 0.6 ? 'retreat' : 'jump'; ai.think = 10 + Math.random() * 10; }
  const ag = ai.aiSpeedFactor || 1.0; ai.think--;
  if (ai.think <= 0) {
    const r = Math.random();
    if (dist > 150) { ai.plan = r < 0.70 ? 'approach' : (r < 0.85 ? 'jump' : 'dash'); ai.think = (16 + Math.random() * 20) / ag; }
    else if (dist > 88) { const midAtk = 0.50 + (ag - 1) * 0.10; if (r < midAtk) ai.plan = 'attack'; else if (r < 0.85) ai.plan = 'approach'; else ai.plan = 'retreat'; ai.think = (10 + Math.random() * 16) / ag; }
    else {
      const atkP = Math.min(0.84, 0.62 + (ag - 1) * 0.22);
      const retP = atkP + (0.86 - 0.62) * Math.max(0.4, 1 - (ag - 1) * 0.5);
      if (r < atkP) ai.plan = 'attack'; else if (r < retP) ai.plan = 'retreat'; else ai.plan = 'jump';
      ai.think = (12 + Math.random() * 16) / ag;
    }
  }
  if (ai.plan === 'approach') { if (dir > 0) inp.right = true; else inp.left = true; }
  else if (ai.plan === 'retreat') { if (dir > 0) inp.left = true; else inp.right = true; }
  else if (ai.plan === 'jump') { if (ai.onGround) inp.up = true; if (dir > 0) inp.right = true; else inp.left = true; if (!ai.onGround && dist > 100 && ai.stamina > 30 && !ai.hasAirDashed && Math.random() < 0.05 * ag) inp.dash = true; }
  else if (ai.plan === 'dash') { if (ai.stamina > 30 && ai._aiDashCd <= 0) { inp.dash = true; ai._aiDashCd = 40; if (dir > 0) inp.right = true; else inp.left = true; } else { if (dir > 0) inp.right = true; else inp.left = true; } }
  else if (ai.plan === 'attack') { if (dist > 95) { if (dir > 0) inp.right = true; else inp.left = true; } else if (ai.attackCd <= 0) { const r2 = Math.random(); if (r2 < 0.62) inp.punch = true; else inp.kick = true; } }
  if (ai._guardHold > 0) { ai._guardHold--; inp.guard = true; }
  else if (foe.attack && dist < 110 && ai.state !== 'parry' && ai.state !== 'parryCounter' && ai.state !== 'hurt' && ai.onGround && !ai.attack) {
      const guardP = 0.05 + (ag - 1) * 0.05;
      if (Math.random() < guardP) { inp.guard = true; ai._guardHold = 18 + Math.random() * 22; }
  }
  if (!ai.onGround && ai.state === 'jump' && dist < 130 && ai.attackCd <= 0 && Math.random() < 0.04 * ag) inp.kick = true;
  if (!ai.onGround && ai.state === 'jump' && ai.jumpCount < 2 && ai.stamina >= STAMINA_COST_JUMP) {
    const wantJump = (ai.plan === 'approach' && dist > 120) || (ai.plan === 'jump' && dist > 140);
    if (wantJump && Math.random() < 0.08 * ag) inp.up = true;
  }
  return inp;
}

function checkAttack(a, d) {
  if (!a.attack || a.hasHit) return; const mv = a.attack; const st = a.stateTime; const sc = a.fatigueScale || 1;
  if (st < mv.hitStart * sc || st > mv.hitEnd * sc || d.state === 'ko') return;
  const atk = getAttackBox(a); const boxes = getHurtBoxes(d); const canHeadshot = isKick(a.attackType);
  if (canHeadshot && aabbOverlap(atk, boxes.head)) applyHit(a, d, mv, atk.cx, atk.cy, true);
  else if (aabbOverlap(atk, boxes.body)) applyHit(a, d, mv, atk.cx, atk.cy, false);
  else if (aabbOverlap(atk, boxes.head)) applyHit(a, d, mv, atk.cx, atk.cy, false);
}

function applyHit(a, d, mv, hx, hy, isHeadshot) {
  a.hasHit = true;
  if (gameState === 'menu' || gameState === 'entertainment_menu') {
    d.flash = 8; d.attack = null; d.attackType = null;
    d.setState('hurt', 10, true);
    d.vx = a.facing * mv.knock; d.vy = -2.6; d.onGround = false;
    d.hp = 100; d.hpShow = 100;
    shake = Math.max(shake, 3.5 * settings.shake);
    spawnHitParticles(hx, hy, d.color, 8, a.facing);
    return;
  }
  if (d.state === 'parry') {
    if (isHeavyAttack(a.attackType)) { d.startCounter(a); a.attack = null; a.attackType = null; a.vx = 0; a.vy = 0; return; }
    if (a.attackType === 'kick') {
      d.setState('hurt', Math.round(mv.stun * 1.3), true); d.vx = a.facing * BREAK_KNOCK; d.vy = -5.5; d.onGround = false;
      d.hp = Math.max(0, d.hp - Math.round(mv.dmg * a.attackMultiplier)); d.flash = 8;
      hitstop = HITSTOP_BASE + 4; shake = Math.max(shake, 11 * settings.shake);
      if (gameState !== 'menu') playSound('crit');
      if (d.hp <= 0) { d.setState('ko', 999, true); d.vx = a.facing * 13; d.vy = -13; d.onGround = false; d.startRagdoll(a.facing); shake = 18 * settings.shake; hitstop = 10; playSound('ko'); if (gameState === 'playing') { gameState = 'ko'; winner = a; koTimer = 0; } }
      return;
    }
    const chipDmg = Math.max(1, Math.round(mv.dmg * a.attackMultiplier * PARRY_DMG_MULT));
    d.hp = Math.max(0, d.hp - chipDmg); d.flash = 6; d.vx = a.facing * mv.knock * PARRY_CHIP_KNOCK;
    hitstop = 3; shake = Math.max(shake, 3 * settings.shake);
    if (gameState !== 'menu') playSound('swing');
    if (d.hp <= 0) { d.setState('ko', 999, true); d.vx = a.facing * 12; d.vy = -13; d.onGround = false; d.startRagdoll(a.facing); shake = 18 * settings.shake; hitstop = 10; playSound('ko'); if (gameState === 'playing') { gameState = 'ko'; winner = a; koTimer = 0; } }
    return;
  }
  let finalDmg = mv.dmg * a.attackMultiplier; let finalStun = Math.round(mv.stun * (1 - d.stunResistance));
  // 连续同键疲劳越重，命中伤害轻微递减（封顶 -15%），避免靠狂按磨血
  const dmgFatigue = Math.max(1 - FATIGUE_DMG_MAX, 1 - Math.max(0, a.repeatAtkCount - FATIGUE_THRESHOLD + 1) * FATIGUE_DMG_STEP);
  finalDmg *= dmgFatigue;
  if (isHeadshot) {
    finalDmg *= HEADSHOT_MULT; finalStun = Math.round(finalStun * HEADSHOT_STUN_MULT);
    if (gameState !== 'menu') { screenFlash = Math.max(screenFlash, 0.35); addFloatingText(d.x, d.y - 130, '暴击！HEADSHOT', '#ff3366'); playSound('crit'); }
  } else { if (gameState !== 'menu') playSound('hit'); }
  finalDmg = Math.round(finalDmg); d.hp = Math.max(0, d.hp - finalDmg); d.flash = 8; d.attack = null; d.attackType = null;
  hitstop = HITSTOP_BASE + Math.round(finalDmg * HITSTOP_PER_DMG);
  shake = Math.max(shake, (SHAKE_BASE + finalDmg * SHAKE_PER_DMG) * settings.shake);
  if (comboOwner === a && comboTimer > 0) comboCount++; else { comboOwner = a; comboCount = 1; }
  comboTimer = 90;
  const dirX = a.facing; spawnHitParticles(hx, hy, d.color, 10 + finalDmg, dirX);
  if (gameState === 'menu' || gameState === 'entertainment_menu') { if (d.hp <= 10) { d.hp = 100; d.hpShow = 100; } d.setState('hurt', finalStun, true); d.vx = a.facing * mv.knock; d.vy = -2.6; d.onGround = false; return; }
  if (d.hp <= 0) {
    d.setState('ko', 999, true); d.vx = a.facing * 14; d.vy = -14; d.onGround = false; d.startRagdoll(a.facing);
    shake = 20 * settings.shake; hitstop = 10;
    if (gameState !== 'menu') screenFlash = 0.65;
    playSound('ko');
    if (gameState === 'playing') {
      gameState = 'ko'; winner = a; koTimer = 0;
      if (mode === 'campaign' && d === p1) { playerLives--; if (playerLives === 0) { gameOverText = '菜就多练 ' + GAME_OVER_EMOTES[Math.floor(Math.random() * GAME_OVER_EMOTES.length)]; const _eggRoll = Math.random(); specialGameOverWord = _eggRoll < 0.10 ? '菜' : (_eggRoll < 0.20 ? '寄' : null); } }
    }
  } else { d.setState('hurt', finalStun, true); d.vx = a.facing * mv.knock; d.vy = -2.6; d.onGround = false; }
}

function spawnParticles(x, y, color, count, spread) {
  let finalCount = Math.floor(count * settings.particles);
  for (let i = 0; i < finalCount; i++) { const ang = Math.random() * TAU; const sp = rand(1, spread); pushParticle({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 1.2, life: rand(14, 30), maxLife: 30, size: rand(2, 4.5), color }); }
}
function spawnHitParticles(x, y, color, count, dirX) {
  let finalCount = Math.floor(count * settings.particles); const baseAng = dirX >= 0 ? 0 : Math.PI;
  for (let i = 0; i < finalCount; i++) { const ang = baseAng + rand(-1.0, 1.0); const sp = rand(2, 9); pushParticle({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 1.0, life: rand(12, 28), maxLife: 28, size: rand(2, 4.5), color }); }
}
function updateParticles() { for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.35; p.vx *= 0.97; p.life--; if (p.life <= 0) particles.splice(i, 1); } }
function updateRings() { for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.life--; const t = 1 - r.life / r.maxLife; r.r = 4 + (r.maxR - 4) * easeOutCubic(t); if (r.life <= 0) rings.splice(i, 1); } }
function updateFloatingTexts() { for (let i = floatingTexts.length - 1; i >= 0; i--) { const t = floatingTexts[i]; t.y += t.vy; t.life--; if (t.life <= 0) floatingTexts.splice(i, 1); } }

function resolveCollision(a, b) {
  if (a.state === 'ko' || b.state === 'ko' || a.state === 'dash' || b.state === 'dash' || a.state === 'parryCounter' || b.state === 'parryCounter' || a.state === 'thrown' || b.state === 'thrown') return;
  const aCanPass = a.flipAngle > 0; const bCanPass = b.flipAngle > 0; if ((aCanPass || bCanPass) && Math.abs(a.y - b.y) > 30) return;
  const dx = b.x - a.x; const minDist = 54;
  if (Math.abs(dx) < minDist) { const push = (minDist - Math.abs(dx)) / 2; const dir = dx >= 0 ? 1 : -1; a.x = clamp(a.x - dir * push, 55, W - 55); b.x = clamp(b.x + dir * push, 55, W - 55); }
}

function update() {
  if (gameState === 'parkour_countdown') {
    parkourCountdown -= 1/60;
    p1.animTime++; p1.stateTime++; p1.smoothPose();
    if (parkourCountdown <= 0) {
        gameState = 'parkour';
        p1.setState('run');
        parkourSpeed = PARKOUR_DIFFS[parkourDifficulty].base;
    }
    snapshotKeys(); return;
  }
  if (gameState === 'parkour' && parkourPaused) { snapshotKeys(); return; }
  if (gameState === 'parkour') {
    mapTime++;
    // 按距离轮换背景场景（每 1000 米切换一张地图，带淡入淡出过渡）
    const targetMap = Math.floor(parkourScrollX / (1000 * PX_PER_METER)) % MAPS.length;
    if (parkourMapFade === 0 && targetMap !== currentMapIndex) {
        parkourMapFrom = currentMapIndex; parkourMapTo = targetMap; parkourMapFade = 1;
    }
    if (parkourMapFade > 0) {
        parkourMapFade++;
        if (parkourMapFade === Math.floor(MAP_FADE_STEPS / 2)) { currentMapIndex = parkourMapTo; mapParticles = []; }
        if (parkourMapFade > MAP_FADE_STEPS) parkourMapFade = 0;
    }
    const df = PARKOUR_DIFFS[parkourDifficulty];
    parkourSpeed = Math.min(15, df.base + parkourScrollX * df.grow);
    // 空中跳跃时横向推进缓动降速、落地恢复，让落点更好判断（跳跃手感）
    const airTarget = p1.onGround ? parkourSpeed : parkourSpeed * 0.82;
    parkourEffSpeed += (airTarget - parkourEffSpeed) * 0.18;
    parkourScrollX += parkourEffSpeed;
    bgScrollPx += parkourEffSpeed;
    if (p1.invincibleTimer > 0) p1.invincibleTimer--;
    if (parkourNextSpawnX < parkourScrollX + W + 800) parkourNextSpawnX = generateParkourChunk(parkourNextSpawnX);
    // 移动平台往返平移
    for (const p of parkourPlatforms) if (p.moveAmp) p.x = p.baseX + Math.sin(mapTime * 0.03 + p.phase) * p.moveAmp;
    // 本局用时 + 难度阶段切换提示横幅
    parkourTimeFrames++;
    const nowTier = parkourTier();
    if (nowTier !== parkourPrevTier) {
        parkourPrevTier = nowTier;
        parkourBannerText = nowTier === 1 ? '进入常规段' : '危机来临 · 注意节奏';
        parkourBannerTimer = 90;
    }
    if (parkourBannerTimer > 0) parkourBannerTimer--;
    const i1 = inputP1();
    // 跳跃缓冲（提前按跳也会在落地瞬间触发）+ 土狼时间（离地短窗口内仍可起跳）
    if (i1.up) parkourJumpBuf = JUMP_BUFFER;
    else if (parkourJumpBuf > 0) parkourJumpBuf--;
    if (p1.onGround) parkourCoyote = COYOTE_FRAMES;
    else if (parkourCoyote > 0) parkourCoyote--;
    if (parkourJumpBuf > 0) {
      if ((p1.onGround || parkourCoyote > 0) && p1.jumpCount === 0) {
        p1.vy = JUMP_V; p1.onGround = false; p1.jumpCount = 1; p1.setState('jump'); playSound('jump');
        parkourJumpBuf = 0; parkourCoyote = 0;
      } else if (!p1.onGround && p1.jumpCount < 2) {
        p1.vy = JUMP_V * 0.9; p1.jumpCount = 2; p1.setState('jump'); playSound('jump');
        parkourJumpBuf = 0;
      }
    }
    if (keys['KeyS']) {
      parkourSDownFrames++;
      if (p1.onGround && p1.y < GROUND) {
        // 刚按下：短按只向下穿一层平台
        if (parkourSDownFrames === 1) {
          p1.dropThroughCount = 1;
          p1.onGround = false;
          p1.vy = 12;
          p1.jumpCount = 0;
          p1.setState('jump');
          playSound('swing');
        }
        // 持续按住超过阈值：转为快速落地到底
        if (parkourSDownFrames >= SDOWN_HOLD) {
          p1.dropThroughCount = 99;
          p1.vy = Math.max(p1.vy, 18);
        }
      } else if (!p1.onGround && parkourSDownFrames >= SDOWN_HOLD) {
        p1.dropThroughCount = 99;
        p1.vy = Math.max(p1.vy, 18);
      }
    } else {
      parkourSDownFrames = 0;
    }
    p1.animTime++; p1.stateTime++;
    // A/D 小范围左右微调站位（平滑趋近，不影响自动前进）；同时合并触屏摇杆持续量
    const wantOff = clamp(
      (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0)
      + (touchInp.right ? 1 : 0) - (touchInp.left ? 1 : 0), -1, 1);
    parkourXOffset = clamp(parkourXOffset + wantOff * 1.6, -46, 46);
    p1.x = 250 + parkourXOffset;
    p1.vy += GRAVITY; p1.y += p1.vy; p1.onGround = false;
    for (let p of parkourPlatforms) {
        let sx = p.x - parkourScrollX;
        if (p1.x + 20 > sx && p1.x - 20 < sx + p.w && p1.vy >= 0 && p1.y - p1.vy <= p.y && p1.y >= p.y) {
            if (p1.dropThroughCount > 0) { p1.dropThroughCount--; continue; }
            p1.y = p.y; p1.vy = 0; p1.onGround = true; p1.jumpCount = 0;
            if (p1.state === 'jump') { p1.setState('run'); p1.landTimer = LAND_DUR; playSound('land'); spawnParticles(p1.x, p.y, '#8a8a96', 5, 1.5); }
        }
    }
    if (p1.y >= GROUND) {
        p1.y = GROUND; p1.vy = 0; p1.onGround = true; p1.jumpCount = 0;
        if (p1.state === 'jump') { p1.setState('run'); p1.landTimer = LAND_DUR; playSound('land'); spawnParticles(p1.x, GROUND - 2, '#8a8a96', 6, 1.5); }
        p1.dropThroughCount = 0;
    }
    if (p1.landTimer > 0) p1.landTimer--;
    for (let o of parkourObstacles) {
        let sx = o.x - parkourScrollX;
        const hw = 15 * PARKOUR_SCALE;
        if (sx + o.w > p1.x - hw && sx < p1.x + hw) {
            let py = p1.y - 80 * PARKOUR_SCALE;
            let ph = 80 * PARKOUR_SCALE;
            if (py + ph > o.y && py < o.y + o.h) {
                if (p1.invincibleTimer <= 0 && !o.hit) {
                    o.hit = true; parkourLives--; p1.invincibleTimer = 120;
                    shake = 15 * settings.shake; screenFlash = 0.5;
                    // 反馈区分：尖刺→暴击音效+亮红粒子；高墙/矮墙→撞击音效+统一红色粒子
                    if (o.type === 'spike') { playSound('crit'); spawnParticles(p1.x, p1.y - 36, '#ff6b6b', 16, 3); }
                    else { playSound('hit'); spawnParticles(p1.x, p1.y - 36, '#d92b2b', 14, 2); }
                    if (parkourLives <= 0) {
                        gameState = 'parkour_dead'; parkourDeadTimer = 0;
                        hitstop = 14;                                   // 死亡瞬间慢动作
                        p1.setState('ko', 999, true); p1.vy = -7; p1.onGround = false;
                        playSound('ko');
                        const d = parkourDistance();
                        parkourNewBest = d > parkourBest;
                        if (parkourNewBest) { parkourBest = d; try { localStorage.setItem('stickFightParkourBest', String(d)); } catch(e) {} }
                        finalizeParkourRun(d);
                    }
                }
            }
        }
    }
    for (let i = parkourCoinsList.length - 1; i >= 0; i--) {
        let c = parkourCoinsList[i]; let sx = c.x - parkourScrollX;
        if (sx > p1.x - 35 && sx < p1.x + 35 && c.y > p1.y - 105 && c.y < p1.y + 10) {
            parkourCoins++; playSound('coin'); spawnParticles(sx, c.y, '#ffd700', 5, 3); parkourCoinsList.splice(i, 1);
        }
    }
    // 出屏即清理；已命中障碍一并回收。反向就地删除，避免每帧 filter 重建数组造成 GC 抖动（高速段卡顿优化）
    for (let i = parkourPlatforms.length - 1; i >= 0; i--) { const p = parkourPlatforms[i]; if ((p.baseX || p.x) + p.w - parkourScrollX <= -100) parkourPlatforms.splice(i, 1); }
    for (let i = parkourObstacles.length - 1; i >= 0; i--) { const o = parkourObstacles[i]; if (o.hit || o.x + o.w - parkourScrollX <= -100) parkourObstacles.splice(i, 1); }
    for (let i = parkourCoinsList.length - 1; i >= 0; i--) { const c = parkourCoinsList[i]; if (c.x - parkourScrollX <= -100) parkourCoinsList.splice(i, 1); }
    if (shake > 0.2) shake *= 0.88; else shake = 0;
    if (screenFlash > 0) screenFlash -= 0.05;
    // 跑酷尾迹推进（配色按累计金币解锁）
    const tj = p1.getJoints();
    p1.trail.push({ x: p1.x + tj.hip.x * p1.facing, y: p1.y + tj.hip.y, age: 0 });
    for (const tp of p1.trail) tp.age++;
    while (p1.trail.length && p1.trail[0].age > 14) p1.trail.shift();
    // BGM 节拍：步长随速度加快
    parkourBgmFrame++;
    const stepFrames = clamp(Math.round(16 - (parkourSpeed - 6) * 1.1), 8, 16);
    if (parkourBgmFrame >= stepFrames) {
      parkourBgmFrame = 0; parkourBgmStep = (parkourBgmStep + 1) % 8;
      playParkourBgmNote(parkourBgmStep);
    }
    p1.smoothPose(); updateParticles(); updateRings(); snapshotKeys(); return;
  }
  if (gameState === 'parkour_dead') {
    if (hitstop > 0) { hitstop--; updateParticles(); updateRings(); snapshotKeys(); return; }
    parkourDeadTimer++;
    if (!p1.onGround) { p1.vy += GRAVITY; p1.y += p1.vy; if (p1.y >= GROUND) { p1.y = GROUND; p1.vy = 0; p1.onGround = true; } }
    p1.animTime++;
    // 死亡倒地：从当前姿态平滑躺平到地面（不使用会锁死插值的 ko pose）
    const k = Math.min(1, parkourDeadTimer / 18);
    const dp = { hipY: RAGDOLL_FLOOR_HIP, lean: 1.57, thighF: -1.5, shinF: -0.05, thighB: -1.55, shinB: -0.10, uArmF: 1.5, fArmF: 1.45, uArmB: 1.55, fArmB: 1.4 };
    for (const key in dp) p1.pose[key] = lerp(p1.pose[key], dp[key], 0.28 + k * 0.5);
    p1._joints = null;
    if (shake > 0.2) shake *= 0.88; else shake = 0;
    if (screenFlash > 0) screenFlash -= 0.05;
    updateParticles(); updateRings(); snapshotKeys(); return;
  }
  if (hitstop > 0 && gameState !== 'menu' && gameState !== 'entertainment_menu') {
    hitstop--; updateParticles(); updateRings(); updateFloatingTexts();
    if (shake > 0.2) shake *= 0.88; else shake = 0; if (screenFlash > 0) screenFlash -= 0.05;
    snapshotKeys(); return;
  }
  mapTime++;
  if (gameState !== 'select' && MAPS[currentMapIndex].id === 'bamboo') {
    if (Math.random() < 0.05 * settings.particles) mapParticles.push({ x: rand(0, W), y: -20, vx: rand(-1, 2), vy: rand(1, 3), rot: rand(0, TAU), vr: rand(-0.05, 0.05), life: 600, maxLife: 600, type: 'bamboo_leaf' });
  }
  for (let i = mapParticles.length - 1; i >= 0; i--) {
    const p = mapParticles[i]; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
    if (p.type === 'bamboo_leaf') p.x += Math.sin(mapTime * 0.05 + p.y * 0.02) * 1.5;
    p.life--; if (p.life <= 0 || p.y > GROUND) mapParticles.splice(i, 1);
  }
  if (screenFlash > 0) screenFlash -= 0.05; if (comboTimer > 0) { comboTimer--; if (comboTimer === 0) comboCount = 0; }
  if (gameState === 'select') {
    p1.animTime++; p1.stateTime++; p1.smoothPose(); p2.animTime++; p2.stateTime++; p2.smoothPose();
    const c1 = getColorSet(p1ColorData.baseHex, p1ColorData.brightness); p1.color = c1.color; p1.dark = c1.dark; p1.rgb = c1.rgb;
    const c2 = getColorSet(p2ColorData.baseHex, p2ColorData.brightness); p2.color = c2.color; p2.dark = c2.dark; p2.rgb = c2.rgb;
    if (!p1Ready) {
      if (keys['KeyA'] && !prevKeys['KeyA']) { let idx = CLASSIC_COLORS.indexOf(p1ColorData.baseHex); if (idx === -1) idx = 0; idx = (idx + CLASSIC_COLORS.length - 1) % CLASSIC_COLORS.length; p1ColorData.baseHex = CLASSIC_COLORS[idx]; }
      if (keys['KeyD'] && !prevKeys['KeyD']) { let idx = CLASSIC_COLORS.indexOf(p1ColorData.baseHex); if (idx === -1) idx = 0; idx = (idx + 1) % CLASSIC_COLORS.length; p1ColorData.baseHex = CLASSIC_COLORS[idx]; }
      if (keys['KeyW']) p1ColorData.brightness = Math.min(1.5, p1ColorData.brightness + 0.05);
      if (keys['KeyS']) p1ColorData.brightness = Math.max(0.2, p1ColorData.brightness - 0.05);
      if (keys['KeyJ'] && !prevKeys['KeyJ']) p1Ready = true;
    } else if (keys['KeyK'] && !prevKeys['KeyK']) p1Ready = false;
    if (mode === 'parkour') {
      if (!p1Ready) {
        if (keys['Digit1'] && !prevKeys['Digit1']) { parkourDifficulty = 0; try { localStorage.setItem('stickFightParkourDiff', '0'); } catch(e) {} }
        if (keys['Digit2'] && !prevKeys['Digit2']) { parkourDifficulty = 1; try { localStorage.setItem('stickFightParkourDiff', '1'); } catch(e) {} }
        if (keys['Digit3'] && !prevKeys['Digit3']) { parkourDifficulty = 2; try { localStorage.setItem('stickFightParkourDiff', '2'); } catch(e) {} }
      }
      if (p1Ready) startParkour(); snapshotKeys(); return;
    }
    if (mode === 'pvp') {
      if (!p2Ready) {
        if (keys['ArrowLeft'] && !prevKeys['ArrowLeft']) { let idx = CLASSIC_COLORS.indexOf(p2ColorData.baseHex); if (idx === -1) idx = 0; idx = (idx + CLASSIC_COLORS.length - 1) % CLASSIC_COLORS.length; p2ColorData.baseHex = CLASSIC_COLORS[idx]; }
        if (keys['ArrowRight'] && !prevKeys['ArrowRight']) { let idx = CLASSIC_COLORS.indexOf(p2ColorData.baseHex); if (idx === -1) idx = 0; idx = (idx + 1) % CLASSIC_COLORS.length; p2ColorData.baseHex = CLASSIC_COLORS[idx]; }
        if (keys['ArrowUp']) p2ColorData.brightness = Math.min(1.5, p2ColorData.brightness + 0.05);
        if (keys['ArrowDown']) p2ColorData.brightness = Math.max(0.2, p2ColorData.brightness - 0.05);
        if ((keys['Digit1'] || keys['Numpad1']) && !(prevKeys['Digit1'] || prevKeys['Numpad1'])) p2Ready = true;
      } else if ((keys['Digit2'] || keys['Numpad2']) && !(prevKeys['Digit2'] || prevKeys['Numpad2'])) p2Ready = false;
    } else {
      if (!p2Ready) {
        aiSelectTimer--;
        if (aiSelectTimer <= 0) { p2ColorData.baseHex = CLASSIC_COLORS[Math.floor(Math.random() * CLASSIC_COLORS.length)]; p2ColorData.brightness = 0.8 + Math.random() * 0.5; aiSelectTimer = 5 + Math.random() * 10; }
        if (p1Ready) { aiSelectLockTimer--; if (aiSelectLockTimer <= 0) { p2Ready = true; if (p2ColorData.baseHex === p1ColorData.baseHex) { let idx = CLASSIC_COLORS.indexOf(p2ColorData.baseHex); p2ColorData.baseHex = CLASSIC_COLORS[(idx + 1) % CLASSIC_COLORS.length]; } } }
        else aiSelectLockTimer = 30;
      }
    }
    if (p1Ready && p2Ready) { selectTimer--; if (selectTimer <= 0) enterIntro(); } else selectTimer = 60;
    updateFloatingTexts();
    snapshotKeys(); return;
  }
  if (gameState === 'menu' || gameState === 'entertainment_menu') {
    if (p1.state === 'ko') p1.setState('idle');
    if (p2.state === 'ko') p2.setState('idle');
    p1.hp = 100; p1.hpShow = 100;
    p2.hp = 100; p2.hpShow = 100;
    const i1 = aiInput(p1, p2); const i2 = aiInput(p2, p1);
    p1.update(i1, p2); p2.update(i2, p1);
    resolveCollision(p1, p2); checkAttack(p1, p2); checkAttack(p2, p1);
    if (shake > 0.2) shake *= 0.86; else shake = 0; hitstop = 0; screenFlash = 0;
    updateParticles(); updateRings(); updateFloatingTexts(); snapshotKeys(); return;
  }
  if (gameState === 'intro') {
    introTimer++; const spd = 3.5;
    if (p1.x < 340) { p1.x = Math.min(340, p1.x + spd); p1.animTime++; p1.stateTime++; if (p1.state !== 'walk') p1.setState('walk'); } else { p1.x = 340; if (p1.state !== 'idle') p1.setState('idle'); }
    if (p2.x > 660) { p2.x = Math.max(660, p2.x - spd); p2.animTime++; p2.stateTime++; if (p2.state !== 'walk') p2.setState('walk'); } else { p2.x = 660; if (p2.state !== 'idle') p2.setState('idle'); }
    p1.facing = 1; p2.facing = -1; p1.smoothPose(); p2.smoothPose();
    if (introTimer > 130) gameState = 'playing';
    updateParticles(); updateRings(); updateFloatingTexts(); snapshotKeys(); return;
  }
  const i1 = inputP1(); const i2 = (mode === 'pvp') ? inputP2() : aiInput(p2, p1);
  if (gameState === 'playing') {
    p1.update(i1, p2); p2.update(i2, p1); resolveCollision(p1, p2); checkAttack(p1, p2); checkAttack(p2, p1);
  } else {
    const none = { left: false, right: false, up: false, guard: false, punch: false, kick: false, dash: false };
    p1.update(none, p2); p2.update(none, p1); koTimer++;
  }
  p1.hpShow = lerp(p1.hpShow, p1.hp, 0.12); p2.hpShow = lerp(p2.hpShow, p2.hp, 0.12);
  if (shake > 0.2) shake *= 0.86; else shake = 0;
  updateParticles(); updateRings(); updateFloatingTexts(); snapshotKeys();
}

function drawShadow(f) {
  const k = clamp(1 - (GROUND - f.y) / 260, 0.25, 1);
  const guarding = (f.state === 'parry' || f.state === 'parryCounter');
  const ko = f.state === 'ko';
  const rx = (ko ? 40 : (guarding ? 26 : 24)) * k;
  const ry = (ko ? 6 : 4.5) * k;
  ctx.save();
  const mapId = MAPS[currentMapIndex].id;
  let alphaCenter = 0.35;
  if (mapId === 'mountain' || mapId === 'cityDay') alphaCenter = 0.12;
  else if (mapId === 'bamboo') alphaCenter = 0.22;
  const grad = ctx.createRadialGradient(f.x, GROUND + 3, 0, f.x, GROUND + 3, rx);
  grad.addColorStop(0, `rgba(0,0,0,${alphaCenter * k})`);
  grad.addColorStop(0.6, `rgba(0,0,0,${alphaCenter * 0.4 * k})`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.ellipse(f.x, GROUND + 3, rx, ry, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

function drawTrail(f) {
  if (f.trail.length < 2) return;
  ctx.save(); ctx.lineCap = 'round'; const maxAge = 12;
  for (let i = 1; i < f.trail.length; i++) {
    const a = f.trail[i - 1]; const b = f.trail[i];
    const alpha = (1 - b.age / maxAge) * 0.65; if (alpha <= 0) continue;
    ctx.strokeStyle = `rgba(${f.rgb},${alpha})`;
    ctx.lineWidth = 12 * (1 - b.age / maxAge);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.restore();
}

// 跑酷专属尾迹：配色随累计金币解锁，宽度适配缩小后的角色

// 高速速度线：速度超过阈值后拉出横向拖影，速度越快越明显

// 远景视差剪影：以 0.25 倍速度缓滚的远山，增加空间纵深

// 随距离缓慢循环的明暗呼吸（夜暗 / 昼亮），仅跑酷进行中叠加

function drawFighter(f, visScale = 1) {
  const j = f.getJoints(); const hit = f.flash > 0;
  ctx.save(); ctx.beginPath(); ctx.rect(-50, -1000, W + 100, 1000 + H + 100); ctx.clip();
  ctx.translate(f.x, f.y); ctx.scale(f.facing * visScale, visScale);
  if (f.flipAngle > 0) { ctx.translate(0, -70); const angle = f.flipAngle * (f.flipDir === 1 ? 1 : -1); ctx.rotate(angle); ctx.translate(0, 70); }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  if (f.invincibleTimer > 0) {
    if (Math.floor(f.invincibleTimer / 4) % 2 === 0) ctx.globalAlpha = 0.2;
  }

  const mainColor = hit ? '#ffffff' : f.color;
  const backColor = hit ? 'rgba(255,255,255,0.7)' : f.dark;
  const items = f.isP1 ? settings.equippedP1 : settings.equippedP2;
  const getIt = (slot) => ITEMS[slot][items[slot] || 0];

  // 1. 背层（披风、羽翼）
  ctx.shadowBlur = 0;
  for (const slot of ['body', 'head', 'face', 'neck', 'hands', 'feet']) {
    const it = getIt(slot);
    if (it && it.layer === 0) it.draw(f, j, f.animTime);
  }

  // 2. 后腿
  if (f.state === 'dash') { ctx.shadowColor = f.color; ctx.shadowBlur = 35; }
  else if (hit) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 25; }
  else { ctx.shadowColor = backColor; ctx.shadowBlur = 6; }
  ctx.strokeStyle = backColor; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(j.hip.x, j.hip.y); ctx.lineTo(j.kneeB.x, j.kneeB.y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(j.kneeB.x, j.kneeB.y); ctx.lineTo(j.footB.x, j.footB.y); ctx.stroke();

  // 3. 后脚饰
  ctx.shadowBlur = 0;
  const feetItem = getIt('feet');
  if (feetItem && feetItem.layer === 1) feetItem.draw(f, j, f.animTime, 'back');

  // 4. 后臂
  if (f.state === 'dash') { ctx.shadowColor = f.color; ctx.shadowBlur = 35; }
  else if (hit) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 25; }
  else { ctx.shadowColor = backColor; ctx.shadowBlur = 6; }
  ctx.strokeStyle = backColor; ctx.lineWidth = 4.5;
  ctx.beginPath(); ctx.moveTo(j.shoulder.x, j.shoulder.y); ctx.lineTo(j.elbowB.x, j.elbowB.y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(j.elbowB.x, j.elbowB.y); ctx.lineTo(j.handB.x, j.handB.y); ctx.stroke();

  // 5. 后手饰
  ctx.shadowBlur = 0;
  const handsItem = getIt('hands');
  if (handsItem && handsItem.layer === 4) handsItem.draw(f, j, f.animTime, 'back');

  // 6. 前腿
  if (f.state === 'dash') { ctx.shadowColor = f.color; ctx.shadowBlur = 35; }
  else if (hit) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 25; }
  else { ctx.shadowColor = mainColor; ctx.shadowBlur = 7; }
  ctx.strokeStyle = mainColor; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(j.hip.x, j.hip.y); ctx.lineTo(j.kneeF.x, j.kneeF.y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(j.kneeF.x, j.kneeF.y); ctx.lineTo(j.footF.x, j.footF.y); ctx.stroke();

  // 7. 前脚饰
  ctx.shadowBlur = 0;
  if (feetItem && feetItem.layer === 1) feetItem.draw(f, j, f.animTime, 'front');

  // 8. 躯干
  if (f.state === 'dash') { ctx.shadowColor = f.color; ctx.shadowBlur = 35; }
  else if (hit) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 25; }
  else { ctx.shadowColor = mainColor; ctx.shadowBlur = 7; }
  ctx.strokeStyle = mainColor; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(j.hip.x, j.hip.y); ctx.lineTo(j.shoulder.x, j.shoulder.y); ctx.stroke();

  // 9. 服装 (Layer 2)
  ctx.shadowBlur = 0;
  const bodyItem = getIt('body');
  if (bodyItem && bodyItem.layer === 2) bodyItem.draw(f, j, f.animTime);

  // 10. 头
  if (f.state === 'dash') { ctx.shadowColor = f.color; ctx.shadowBlur = 35; }
  else if (hit) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 25; }
  else { ctx.shadowColor = mainColor; ctx.shadowBlur = 7; }
  ctx.beginPath(); ctx.arc(j.head.x, j.head.y, HEAD_R, 0, TAU); ctx.lineWidth = 5; ctx.strokeStyle = mainColor; ctx.stroke();

  // 11. 前臂
  if (f.state === 'dash') { ctx.shadowColor = f.color; ctx.shadowBlur = 35; }
  else if (hit) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 25; }
  else { ctx.shadowColor = mainColor; ctx.shadowBlur = 7; }
  ctx.strokeStyle = mainColor; ctx.lineWidth = 5.5;
  ctx.beginPath(); ctx.moveTo(j.shoulder.x, j.shoulder.y); ctx.lineTo(j.elbowF.x, j.elbowF.y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(j.elbowF.x, j.elbowF.y); ctx.lineTo(j.handF.x, j.handF.y); ctx.stroke();

  // 12. 头部/面部/颈部 (Layer 3)
  ctx.shadowBlur = 0;
  for (const slot of ['head', 'face', 'neck']) {
    const it = getIt(slot);
    if (it && it.layer === 3) it.draw(f, j, f.animTime);
  }

  // 13. 前手饰
  if (handsItem && handsItem.layer === 4) handsItem.draw(f, j, f.animTime, 'front');

  // 攻击特效
  if (f.attack) {
    const st = f.stateTime; const mv = f.attack; const sc = f.fatigueScale || 1;
    if (st >= mv.hitStart * sc && st <= mv.hitEnd * sc) {
      ctx.shadowColor = f.color; ctx.shadowBlur = 20;
      ctx.fillStyle = hit ? '#fff' : f.color;
      if (isKick(f.attackType)) { ctx.beginPath(); ctx.arc(j.footF.x, j.footF.y, 8, 0, TAU); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(j.handF.x, j.handF.y, 5.5, 0, TAU); ctx.fill(); }
    }
  }
  ctx.restore();
}

function drawHealthBar(x, y, w, h, f, flip) {
  ctx.fillStyle = 'rgba(8,10,20,0.8)'; roundRect(x - 4, y - 4, w + 8, h + 8, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1.5; roundRect(x - 4, y - 4, w + 8, h + 8, 7); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x, y, w, h);
  const wShow = w * clamp(f.hpShow / f.maxHp, 0, 1);
  const wNow = w * clamp(f.hp / f.maxHp, 0, 1);
  // 掉血缓冲残影：跟随所选角色颜色（低透明度）
  ctx.fillStyle = `rgba(${f.rgb},0.35)`;
  if (flip) ctx.fillRect(x, y, wShow, h); else ctx.fillRect(x + w - wShow, y, wShow, h);
  // 当前血量：所选角色颜色的亮 -> 暗垂直渐变
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, f.color); g.addColorStop(1, f.dark);
  ctx.fillStyle = g;
  if (flip) ctx.fillRect(x, y, wNow, h); else ctx.fillRect(x + w - wNow, y, wNow, h);
  ctx.fillStyle = 'rgba(255,255,255,0.20)';
  if (flip) ctx.fillRect(x, y + 2, wNow, h * 0.38); else ctx.fillRect(x + w - wNow, y + 2, wNow, h * 0.38);
}

function drawStaminaBar(x, y, w, h, f, flip) {
  const staminaPct = clamp(f.stamina / f.maxStamina, 0, 1);
  ctx.fillStyle = 'rgba(8,10,20,0.8)'; roundRect(x - 2, y - 2, w + 4, h + 4, 3); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x, y, w, h);
  let color = '#ffd700';
  if (staminaPct < 0.3) { const blink = 0.5 + Math.sin(Date.now() * 0.02) * 0.5; color = `rgba(255, 80, 80, ${blink})`; }
  const wNow = w * staminaPct;
  ctx.fillStyle = color;
  if (flip) ctx.fillRect(x, y, wNow, h); else ctx.fillRect(x + w - wNow, y, wNow, h);
}

function drawHUD() {
  drawHealthBar(42, 32, 380, 22, p1, true);
  drawHealthBar(W - 42 - 380, 32, 380, 22, p2, false);
  drawStaminaBar(42, 60, 380, 6, p1, true);
  drawStaminaBar(W - 42 - 380, 60, 380, 6, p2, false);
  ctx.font = 'bold 15px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = p1.color;
  ctx.fillText(p1.label, 44, 92);
  if (mode === 'campaign') {
    ctx.font = 'bold 18px system-ui, sans-serif'; ctx.fillStyle = '#ff4b4b';
    let hearts = ''; for (let i = 0; i < 3; i++) hearts += i < playerLives ? '♥ ' : '♡ ';
    ctx.fillText(hearts, 44, 118);
  }
  ctx.textAlign = 'right'; ctx.fillStyle = p2.color; ctx.fillText(p2.label, W - 44, 92);
  ctx.textAlign = 'center'; ctx.font = '13px system-ui, sans-serif'; ctx.fillStyle = 'rgba(200,200,230,0.45)';
  let modeText = '';
  if (mode === 'ai') modeText = '人机对战';
  else if (mode === 'pvp') modeText = '双人对战';
  else modeText = `闯关模式 第 ${currentLevel} / ${MAX_LEVEL} 关`;
  ctx.fillText(modeText, W / 2, 52);
  if (comboCount >= 2 && comboTimer > 0 && gameState === 'playing') {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.globalAlpha = Math.min(1, comboTimer / 20);
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillStyle = comboOwner ? comboOwner.color : '#fff';
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 16;
    ctx.fillText(`${comboCount} COMBO`, W / 2, 140);
    ctx.restore();
  }
}

function drawAnnouncement() {
  if (!isAnnouncementOpen) return;
  ctx.save();
  ctx.fillStyle = 'rgba(8, 10, 20, 0.95)';
  ctx.fillRect(0, 0, W, H);

  const panelW = 800, panelH = 480;
  const panelX = W / 2 - panelW / 2;
  const panelY = H / 2 - panelH / 2;

  ctx.beginPath(); roundRect(panelX, panelY, panelW, panelH, 16);
  ctx.fillStyle = 'rgba(20, 25, 40, 0.98)'; ctx.fill();
  ctx.strokeStyle = settings.themeColor; ctx.lineWidth = 2; ctx.stroke();

  // 标题（固定不滑动）
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 36px system-ui, sans-serif'; ctx.fillStyle = '#ffffff';
  ctx.fillText('火柴人格斗 (Stick Fighter)', W / 2, panelY + 50);

  // 裁剪区域（用于滑动内容）
  const clipY = panelY + 90;
  const clipH = panelH - 160;
  ctx.save();
  ctx.beginPath();
  ctx.rect(panelX, clipY, panelW, clipH);
  ctx.clip();

  ctx.translate(0, -announcementScrollY);

  const startX = panelX + 60;
  let startY = clipY + 30;
  const lineGap = 34;

  // 1. 游戏内容
  ctx.textAlign = 'left'; ctx.font = 'bold 18px system-ui, sans-serif'; ctx.fillStyle = settings.themeColor;
  ctx.fillText('【游戏内容】', startX, startY);
  startY += lineGap;
  
  // 富文本绘制辅助函数（支持自动换行）
  const drawRichText = (parts, x, y, maxWidth) => {
    let currentX = x;
    for (const part of parts) {
      ctx.font = part.bold ? 'bold 16px system-ui, sans-serif' : '16px system-ui, sans-serif';
      ctx.fillStyle = part.bold ? '#ffffff' : '#a0a0c8';
      
      let text = part.text;
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const charWidth = ctx.measureText(char).width;
        if (currentX + charWidth > maxWidth) {
          currentX = x;
          y += 24; // 行间距
        }
        ctx.fillText(char, currentX, y);
        currentX += charWidth;
      }
    }
    return y;
  };

  const maxTextWidth = panelW - 120;

  startY = drawRichText([
    { text: '本游戏包含：', bold: true },
    { text: '人机对战，双人同屏对战，闯关模式，娱乐模式。', bold: false }
  ], startX, startY, maxTextWidth);
  startY += lineGap;

  startY = drawRichText([
    { text: '操作机制：', bold: true },
    { text: 'A, D移动、W跳跃、W W二段跳、S格挡、J拳击、K踢击、空格 冲刺及W 空格 空中冲刺。', bold: false }
  ], startX, startY, maxTextWidth);
  startY += lineGap;

  startY = drawRichText([
    { text: '系统设置：', bold: true },
    { text: '支持调节音效、震屏、特效密度、主题色及屏幕比例。', bold: false }
  ], startX, startY, maxTextWidth);
  startY += lineGap;

  startY = drawRichText([
    { text: '注意：', bold: true },
    { text: '部分模式以及效果还在测试当中，如“肉鸽模式”，“服装更换”都在测试当中。', bold: false }
  ], startX, startY, maxTextWidth);
  startY += lineGap * 1.5;

  // 2. 制作人员
  ctx.textAlign = 'left'; ctx.font = 'bold 18px system-ui, sans-serif'; ctx.fillStyle = settings.themeColor;
  ctx.fillText('【制作人员】', startX, startY);
  startY += lineGap;

  startY = drawRichText([
    { text: '倡导者：', bold: true },
    { text: '小拉LPLD', bold: false }
  ], startX, startY, maxTextWidth);
  startY += lineGap;

  startY = drawRichText([
    { text: '制作者：', bold: true },
    { text: 'DeepSeek', bold: false }
  ], startX, startY, maxTextWidth);
  startY += lineGap;

  startY = drawRichText([
    { text: '监督者：', bold: true },
    { text: '豆包', bold: false }
  ], startX, startY, maxTextWidth);
  startY += lineGap;

  // 小字备注
  ctx.font = '14px system-ui, sans-serif'; ctx.fillStyle = '#66667f';
  ctx.fillText('“在这里感谢DeepSeek辛勤的付出（每天和倡导者对拳搏击），才做出了这款游戏。（鼓掌）”', startX, startY);
  
  // 计算最大滑动距离
  const contentHeight = startY - clipY + 30;
  announcementMaxScroll = Math.max(0, contentHeight - clipH);
  announcementScrollY = clamp(announcementScrollY, 0, announcementMaxScroll);

  ctx.restore();

  // 绘制滚动条
  if (announcementMaxScroll > 0) {
    const sbW = 4;
    const sbX = panelX + panelW - 12;
    const sbH = clipH;
    const thumbH = Math.max(20, sbH * (clipH / contentHeight));
    const thumbY = clipY + (sbH - thumbH) * (announcementScrollY / announcementMaxScroll);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    roundRect(sbX, clipY, sbW, sbH, 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    roundRect(sbX, thumbY, sbW, thumbH, 2); ctx.fill();
  }

  // 底部按钮（固定不滑动）
  const btnY = panelY + panelH - 40;
  const blink = 0.6 + Math.sin(Date.now() * 0.005) * 0.4;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillStyle = settings.themeColor;
  ctx.globalAlpha = blink;
  ctx.fillText('点击任意处关闭', W / 2, btnY);
  ctx.globalAlpha = 1;

  ctx.restore();
  ctx.textBaseline = 'alphabetic';
}

function drawMenu() {
  if (gameState !== 'menu') return;
  ctx.save(); ctx.fillStyle = 'rgba(10, 10, 20, 0.65)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const time = Date.now() * 0.003; const scale = 1 + Math.sin(time) * 0.03;
  ctx.save(); ctx.translate(W / 2, 110); ctx.scale(scale, scale);
  ctx.font = 'bold 64px system-ui, sans-serif'; ctx.fillStyle = '#ffffff';
  ctx.shadowColor = settings.themeColor; ctx.shadowBlur = 30;
  ctx.fillText('STICK FIGHTER', 0, 0);
  ctx.font = 'bold 20px system-ui, sans-serif'; ctx.fillStyle = '#a0a0c8'; ctx.shadowBlur = 0;
  ctx.fillText('火柴人格斗', 0, 52);
  ctx.restore();
  const options = [
    { text: '人机对战', desc: '人机对抗，训练技术' },
    { text: '双人对战', desc: '同屏切磋，决出胜负' },
    { text: '闯关模式', desc: '10 关挑战，击败强化 BOSS' },
    { text: '娱乐模式', desc: '斗天斗人，其乐无穷！' }
  ];
  const startY = 250; const gap = 70;
  for (let i = 0; i < options.length; i++) {
    const y = startY + i * gap; const isSel = (menuSelection === i);
    if (isSel) {
      const boxW = 340; const boxH = 56; const boxX = W / 2 - boxW / 2; const boxY = y - boxH / 2;
      const rgb = hexToRgb(settings.themeColor);
      ctx.beginPath(); roundRect(boxX, boxY, boxW, boxH, 12);
      ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b}, 0.12)`; ctx.fill();
      ctx.strokeStyle = settings.themeColor; ctx.lineWidth = 2; ctx.stroke();
      const arrowX1 = boxX - 25; const arrowX2 = boxX + boxW + 25;
      ctx.fillStyle = settings.themeColor;
      ctx.beginPath(); ctx.moveTo(arrowX1, y); ctx.lineTo(arrowX1 + 12, y - 10); ctx.lineTo(arrowX1 + 12, y + 10); ctx.fill();
      ctx.beginPath(); ctx.moveTo(arrowX2, y); ctx.lineTo(arrowX2 - 12, y - 10); ctx.lineTo(arrowX2 - 12, y + 10); ctx.fill();
    }
    ctx.font = isSel ? 'bold 26px system-ui' : '22px system-ui';
    ctx.fillStyle = isSel ? '#ffffff' : '#8888a0';
    ctx.shadowColor = isSel ? settings.themeColor : 'transparent';
    ctx.shadowBlur = isSel ? 15 : 0;
    ctx.fillText(options[i].text, W / 2, y - 10);
    ctx.font = '14px system-ui';
    ctx.fillStyle = isSel ? 'rgba(200, 220, 255, 0.85)' : 'rgba(120, 120, 150, 0.5)';
    ctx.shadowBlur = 0;
    ctx.fillText(options[i].desc, W / 2, y + 15);
  }
  
  // 左上角设置
  ctx.textAlign = 'left'; ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillStyle = '#a0a0c8'; ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
  ctx.fillText('⚙ 设置', 40, 50);

  // 右下角：玩法说明（上）/ 服装更换（中）/ 音乐库（下，主题色高亮）
  const btnW = 120, btnH = 38, mGap = 10;
  const btnX = W - btnW - 40;
  const musicY = H - btnH - 40;
  const dressY = musicY - btnH - mGap;
  const helpY = dressY - btnH - mGap;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 18px system-ui, sans-serif';
  // 玩法说明
  ctx.beginPath(); roundRect(btnX, helpY, btnW, btnH, 8);
  ctx.fillStyle = 'rgba(40, 40, 64, 0.7)'; ctx.fill();
  ctx.strokeStyle = '#8ea2d8'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#b9c8f0';
  ctx.fillText('玩法说明', btnX + btnW / 2, helpY + btnH / 2);
  // 服装更换
  ctx.beginPath(); roundRect(btnX, dressY, btnW, btnH, 8);
  ctx.fillStyle = 'rgba(40, 40, 64, 0.7)'; ctx.fill();
  ctx.strokeStyle = settings.themeColor; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = settings.themeColor;
  ctx.fillText('服装更换', btnX + btnW / 2, dressY + btnH / 2);
  // 音乐库
  ctx.beginPath(); roundRect(btnX, musicY, btnW, btnH, 8);
  ctx.fillStyle = settings.themeColor; ctx.fill();
  ctx.strokeStyle = settings.themeColor; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#0a1420';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText('音乐库', btnX + btnW / 2, musicY + btnH / 2);
  ctx.font = 'bold 18px system-ui, sans-serif';

  ctx.textAlign = 'right'; ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(160, 160, 200, 0.7)';
  ctx.fillText(`地图：${MAPS[currentMapIndex].name} ⟳`, W - 40, 50);
  ctx.restore();
  ctx.textBaseline = 'alphabetic';
}

// 在面板内渲染角色预览
function drawCharacterPreview(x, y, facing, equipped, color, dark, animTime) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, 1);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  // 构造局部姿态数据
  const pose = basePose();
  const b = Math.sin(animTime * 0.07);
  pose.hipY += b * 1.6; pose.uArmF += b * 0.06; pose.uArmB -= b * 0.06; pose.lean += b * 0.008;
  const fakeF = { pose, state: 'idle' };
  const j = poseToJoints(fakeF);
  const items = equipped;

  const mainColor = color;
  const backColor = dark;
  const getIt = (slot) => ITEMS[slot][items[slot] || 0];

  // 1. 背层
  ctx.shadowBlur = 0;
  for (const slot of ['body', 'head', 'face', 'neck', 'hands', 'feet']) {
    const it = getIt(slot);
    if (it && it.layer === 0) it.draw(fakeF, j, animTime);
  }

  // 2. 后腿
  ctx.shadowColor = backColor; ctx.shadowBlur = 6;
  ctx.strokeStyle = backColor; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(j.hip.x, j.hip.y); ctx.lineTo(j.kneeB.x, j.kneeB.y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(j.kneeB.x, j.kneeB.y); ctx.lineTo(j.footB.x, j.footB.y); ctx.stroke();

  // 3. 后脚饰
  ctx.shadowBlur = 0;
  const feetItem = getIt('feet');
  if (feetItem && feetItem.layer === 1) feetItem.draw(fakeF, j, animTime, 'back');

  // 4. 后臂
  ctx.shadowColor = backColor; ctx.shadowBlur = 6;
  ctx.strokeStyle = backColor; ctx.lineWidth = 4.5;
  ctx.beginPath(); ctx.moveTo(j.shoulder.x, j.shoulder.y); ctx.lineTo(j.elbowB.x, j.elbowB.y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(j.elbowB.x, j.elbowB.y); ctx.lineTo(j.handB.x, j.handB.y); ctx.stroke();

  // 5. 后手饰
  ctx.shadowBlur = 0;
  const handsItem = getIt('hands');
  if (handsItem && handsItem.layer === 4) handsItem.draw(fakeF, j, animTime, 'back');

  // 6. 前腿
  ctx.shadowColor = mainColor; ctx.shadowBlur = 7;
  ctx.strokeStyle = mainColor; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(j.hip.x, j.hip.y); ctx.lineTo(j.kneeF.x, j.kneeF.y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(j.kneeF.x, j.kneeF.y); ctx.lineTo(j.footF.x, j.footF.y); ctx.stroke();

  // 7. 前脚饰
  ctx.shadowBlur = 0;
  if (feetItem && feetItem.layer === 1) feetItem.draw(fakeF, j, animTime, 'front');

  // 8. 躯干
  ctx.shadowColor = mainColor; ctx.shadowBlur = 7;
  ctx.strokeStyle = mainColor; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(j.hip.x, j.hip.y); ctx.lineTo(j.shoulder.x, j.shoulder.y); ctx.stroke();

  // 9. 服装
  ctx.shadowBlur = 0;
  const bodyItem = getIt('body');
  if (bodyItem && bodyItem.layer === 2) bodyItem.draw(fakeF, j, animTime);

  // 10. 头
  ctx.shadowColor = mainColor; ctx.shadowBlur = 7;
  ctx.beginPath(); ctx.arc(j.head.x, j.head.y, HEAD_R, 0, TAU); ctx.lineWidth = 5; ctx.strokeStyle = mainColor; ctx.stroke();

  // 11. 前臂
  ctx.shadowColor = mainColor; ctx.shadowBlur = 7;
  ctx.strokeStyle = mainColor; ctx.lineWidth = 5.5;
  ctx.beginPath(); ctx.moveTo(j.shoulder.x, j.shoulder.y); ctx.lineTo(j.elbowF.x, j.elbowF.y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(j.elbowF.x, j.elbowF.y); ctx.lineTo(j.handF.x, j.handF.y); ctx.stroke();

  // 12. 头部/面部/颈部
  ctx.shadowBlur = 0;
  for (const slot of ['head', 'face', 'neck']) {
    const it = getIt(slot);
    if (it && it.layer === 3) it.draw(fakeF, j, animTime);
  }

  // 13. 前手饰
  if (handsItem && handsItem.layer === 4) handsItem.draw(fakeF, j, animTime, 'front');

  ctx.restore();
}

function drawWardrobe() {
  if (!isWardrobeOpen) return;
  ctx.save(); ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'; ctx.fillRect(0, 0, W, H);
  const panelW = 860; const panelH = 530;
  const panelX = W / 2 - panelW / 2; const panelY = H / 2 - panelH / 2;
  ctx.beginPath(); roundRect(panelX, panelY, panelW, panelH, 16);
  ctx.fillStyle = 'rgba(20, 25, 40, 0.95)'; ctx.fill();
  ctx.strokeStyle = settings.themeColor; ctx.lineWidth = 2; ctx.stroke();

  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 32px system-ui, sans-serif'; ctx.fillStyle = '#ffffff';
  ctx.fillText('更 换 服 装', W / 2, panelY + 40);

  const drawUI = (baseX, eq, color) => {
    for (let i = 0; i < SLOT_LIST.length; i++) {
      const s = SLOT_LIST[i];
      const rowY = panelY + 140 + i * 45;
      ctx.textAlign = 'left'; ctx.fillStyle = '#a0a0c8'; ctx.font = '16px system-ui';
      ctx.fillText(s.label, baseX - 110, rowY);
      const arr = ITEMS[s.key];
      const current = arr[eq[s.key]] || arr[0];

      // left arrow
      const lx = baseX + 20;
      ctx.beginPath(); ctx.arc(lx, rowY, 14, 0, TAU);
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('◀', lx, rowY);

      // text
      ctx.fillStyle = color; ctx.font = 'bold 16px system-ui';
      ctx.fillText(current.name, baseX + 80, rowY);

      // right arrow
      const rx = baseX + 140;
      ctx.beginPath(); ctx.arc(rx, rowY, 14, 0, TAU);
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillText('▶', rx, rowY);
    }
  };
  
  const countEq = (eq) => SLOT_LIST.reduce((n, s) => { const v = ITEMS[s.key][eq[s.key]]; return (v && v.id !== 'none') ? n + 1 : n; }, 0);
  drawUI(panelX + 180, settings.equippedP1, '#4fc9ff');
  drawUI(panelX + panelW - 180, settings.equippedP2, '#ff6b6b');

  // 中间角色预览（含已装备件数）
  ctx.font = 'bold 17px system-ui'; ctx.fillStyle = '#4fc9ff';
  ctx.fillText(`P1 · 已装 ${countEq(settings.equippedP1)}/6`, W / 2 - 60, panelY + 70);
  ctx.fillStyle = '#ff6b6b';
  ctx.fillText(`P2 · 已装 ${countEq(settings.equippedP2)}/6`, W / 2 + 60, panelY + 70);

  // 绘制地面阴影 (角色靠拢)
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(W / 2 - 60, panelY + 390, 30, 5, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(W / 2 + 60, panelY + 390, 30, 5, 0, 0, TAU); ctx.fill();

  // 绘制预览模型 (向上移动 & 靠拢)
  drawCharacterPreview(W / 2 - 60, panelY + 380, 1, settings.equippedP1, p1.color, p1.dark, mapTime);
  drawCharacterPreview(W / 2 + 60, panelY + 380, -1, settings.equippedP2, p2.color, p2.dark, mapTime + 50);

  // 右上角关闭按钮
  const closeBtnX = panelX + panelW - 40;
  const closeBtnY = panelY + 40;
  ctx.beginPath(); ctx.arc(closeBtnX, closeBtnY, 15, 0, TAU);
  ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill();
  ctx.fillStyle = '#a0a0c8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 20px system-ui';
  ctx.fillText('✕', closeBtnX, closeBtnY);

  ctx.textAlign = 'center'; ctx.font = '16px system-ui'; ctx.fillStyle = '#a0a0c8';
  ctx.fillText('点击箭头切换 · 点击 ✕ 或外部关闭并保存', W / 2, panelY + panelH - 30);
  ctx.restore();
  ctx.textBaseline = 'alphabetic';
}

function drawEntertainmentMenu() {
  if (gameState !== 'entertainment_menu') return;
  ctx.save(); ctx.fillStyle = 'rgba(10, 10, 20, 0.75)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 46px system-ui, sans-serif'; ctx.fillStyle = '#ffffff';
  ctx.shadowColor = settings.themeColor; ctx.shadowBlur = 20;
  ctx.fillText('娱乐模式', W / 2, 120);
  ctx.font = 'bold 20px system-ui, sans-serif'; ctx.fillStyle = '#a0a0c8'; ctx.shadowBlur = 0;
  ctx.fillText('斗天斗人，其乐无穷！', W / 2, 165);
  const options = [
    { text: '火柴人肉鸽Roguelike', desc: '无尽成长，终成传奇。' },
    { text: '火柴人跑酷Endless Runner', desc: '让我们尽力活下去吧！' }
  ];
  const startY = 280; const gap = 100;
  for (let i = 0; i < options.length; i++) {
    const y = startY + i * gap; const isSel = (entMenuSelection === i);
    if (isSel) {
      const boxW = 380; const boxH = 80; const boxX = W / 2 - boxW / 2; const boxY = y - boxH / 2;
      const rgb = hexToRgb(settings.themeColor);
      ctx.beginPath(); roundRect(boxX, boxY, boxW, boxH, 12);
      ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b}, 0.12)`; ctx.fill();
      ctx.strokeStyle = settings.themeColor; ctx.lineWidth = 2; ctx.stroke();
      const arrowX1 = boxX - 25; const arrowX2 = boxX + boxW + 25;
      ctx.fillStyle = settings.themeColor;
      ctx.beginPath(); ctx.moveTo(arrowX1, y); ctx.lineTo(arrowX1 + 12, y - 10); ctx.lineTo(arrowX1 + 12, y + 10); ctx.fill();
      ctx.beginPath(); ctx.moveTo(arrowX2, y); ctx.lineTo(arrowX2 - 12, y - 10); ctx.lineTo(arrowX2 - 12, y + 10); ctx.fill();
    }
    ctx.font = isSel ? 'bold 26px system-ui' : '22px system-ui';
    ctx.fillStyle = isSel ? '#ffffff' : '#8888a0';
    ctx.shadowColor = isSel ? settings.themeColor : 'transparent';
    ctx.shadowBlur = isSel ? 15 : 0;
    ctx.fillText(options[i].text, W / 2, y - 12);
    ctx.font = '15px system-ui';
    ctx.fillStyle = isSel ? 'rgba(200, 220, 255, 0.85)' : 'rgba(120, 120, 150, 0.5)';
    ctx.shadowBlur = 0;
    ctx.fillText(options[i].desc, W / 2, y + 20);
  }
  // 返回主菜单按钮（触屏可点）
  const backW = 180, backH = 36, backX = W / 2 - backW / 2, backY = 470;
  ctx.beginPath(); roundRect(backX, backY, backW, backH, 8);
  ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fill();
  ctx.strokeStyle = 'rgba(160,160,200,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.font = '16px system-ui'; ctx.fillStyle = '#cfcfe8';
  ctx.fillText('← 返回主菜单', W / 2, backY + backH / 2 + 1);
  ctx.restore();
}

function drawHelp() {
  if (!isHelpOpen) return;
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.72)'; ctx.fillRect(0, 0, W, H);
  const panelW = 580, panelH = 486;
  const panelX = W / 2 - panelW / 2, panelY = H / 2 - panelH / 2;
  ctx.beginPath(); roundRect(panelX, panelY, panelW, panelH, 16);
  ctx.fillStyle = 'rgba(20, 25, 40, 0.96)'; ctx.fill();
  ctx.strokeStyle = settings.themeColor; ctx.lineWidth = 2; ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 28px system-ui, sans-serif'; ctx.fillStyle = '#ffffff';
  ctx.fillText('玩法说明', W / 2, panelY + 36);

  const colX = [panelX + 28, panelX + panelW / 2 + 12];
  const heads = ['电脑端（键盘）', '手机端（触屏）'];
  const cols = [
    ['P1 对战：', 'A / D  左右移动', 'W  跳跃 / 二段跳', '按住 S  格挡', 'J  出拳', 'K  踢击', '空格  冲刺（空中可用）', 'P2（双人同屏）：', '←/→ 移动 · ↑ 跳跃', '按住 ↓ 格挡 · 1 拳 · 2 踢', '右 Shift 冲刺', '通用：R 重开 · Enter 确认', '跑酷：1 / 2 / 3 选难度'],
    ['左下摇杆  左右移动', '跳  跳跃 / 二段跳', '拳（红）：', '　短按 = 出拳', '　长按 = 格挡', '踢（棕）：', '　短按 = 踢击', '　长按 = 冲刺', '菜单 / 选色 / 结算：', '　直接点按对应选项', '设置内可调：', '　按键大小', '　按键位置拖拽']
  ];
  for (let c = 0; c < 2; c++) {
    ctx.textAlign = 'left';
    ctx.font = 'bold 17px system-ui, sans-serif'; ctx.fillStyle = settings.themeColor;
    ctx.fillText(heads[c], colX[c], panelY + 78);
    ctx.font = '14px system-ui, sans-serif'; ctx.fillStyle = '#b8c0dc';
    let yy = panelY + 106;
    for (const line of cols[c]) {
      const isHead = /：$/.test(line);
      ctx.font = isHead ? 'bold 14px system-ui' : '14px system-ui';
      ctx.fillStyle = isHead ? '#dfe6ff' : '#a6aecf';
      ctx.fillText(line, colX[c], yy);
      yy += 23;
    }
  }
  // 关闭按钮
  const cbW = 140, cbH = 34, cbX = W / 2 - cbW / 2, cbY = panelY + panelH - 46;
  ctx.beginPath(); roundRect(cbX, cbY, cbW, cbH, 8);
  ctx.fillStyle = 'rgba(80,140,255,0.18)'; ctx.fill();
  ctx.strokeStyle = '#7c9dff'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.textAlign = 'center'; ctx.font = 'bold 16px system-ui'; ctx.fillStyle = '#cfe0ff';
  ctx.fillText('关闭', W / 2, cbY + cbH / 2 + 1);
  ctx.restore();
  ctx.textBaseline = 'alphabetic';
}

function drawSettings() {
  if (!isSettingsOpen) return;
  ctx.save(); ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; ctx.fillRect(0, 0, W, H);
  const panelW = 500; const panelH = 480;
  const panelX = W / 2 - panelW / 2;
  const panelY = H / 2 - panelH / 2;
  ctx.beginPath(); roundRect(panelX, panelY, panelW, panelH, 16);
  ctx.fillStyle = 'rgba(20, 25, 40, 0.95)'; ctx.fill();
  ctx.strokeStyle = settings.themeColor; ctx.lineWidth = 2; ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 32px system-ui, sans-serif'; ctx.fillStyle = '#ffffff';
  ctx.fillText('系统设置', W / 2, panelY + 40);
  const clipY = panelY + 70;
  const clipH = panelH - 110;
  ctx.save();
  ctx.beginPath();
  ctx.rect(panelX, clipY, panelW, clipH);
  ctx.clip();
  ctx.translate(0, -settings.scrollY);
  ctx.textAlign = 'left'; ctx.font = '16px system-ui, sans-serif'; ctx.fillStyle = '#a0a0c8';
  ctx.fillText('玩家名字', panelX + 60, panelY + 100);
  ctx.textAlign = 'right'; ctx.fillStyle = settings.themeColor;
  ctx.fillText(`[ ${settings.p1Name} ] 点击修改`, panelX + panelW - 60, panelY + 100);
  ctx.textAlign = 'left'; ctx.fillStyle = '#a0a0c8';
  ctx.fillText('界面主题色', panelX + 60, panelY + 180);
  for (let i = 0; i < CLASSIC_COLORS.length; i++) {
    const row = i < 5 ? 0 : 1;
    const col = i % 5;
    const cx = panelX + 200 + col * 45;
    const cy = panelY + 160 + row * 35;
    ctx.beginPath(); ctx.arc(cx, cy, 12, 0, TAU); ctx.fillStyle = CLASSIC_COLORS[i]; ctx.fill();
    if (settings.themeColor === CLASSIC_COLORS[i]) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke(); }
  }
  ctx.textAlign = 'left'; ctx.fillStyle = '#a0a0c8';
  ctx.fillText('屏幕比例', panelX + 60, panelY + 260);
  const ratioOptions = [
    { id: 'default', text: '默认' }, { id: 'fullscreen', text: '全屏' },
    { id: '16:9', text: '16:9' }, { id: '4:3', text: '4:3' },
    { id: '1:1', text: '1:1' }, { id: '1:2', text: '1:2' }
  ];
  const btnW = 38; const btnH = 24; const btnGap = 4;
  const totalW = ratioOptions.length * btnW + (ratioOptions.length - 1) * btnGap;
  let btnX = panelX + panelW - 60 - totalW;
  for (let i = 0; i < ratioOptions.length; i++) {
    const isSel = settings.aspectRatio === ratioOptions[i].id;
    ctx.beginPath(); roundRect(btnX, panelY + 248, btnW, btnH, 4);
    ctx.fillStyle = isSel ? settings.themeColor : 'rgba(255,255,255,0.1)'; ctx.fill();
    ctx.font = '12px system-ui'; ctx.textAlign = 'center';
    ctx.fillStyle = isSel ? '#000000' : '#a0a0c8';
    ctx.fillText(ratioOptions[i].text, btnX + btnW/2, panelY + 248 + btnH/2);
    btnX += btnW + btnGap;
  }
  function drawSettingSlider(y, label, valKey, min, max, formatFn) {
    const sliderW = 360; const sliderX = W / 2 - sliderW / 2; const sliderH = 10;
    ctx.textAlign = 'left'; ctx.font = '16px system-ui, sans-serif'; ctx.fillStyle = '#a0a0c8';
    ctx.fillText(label, sliderX, y - 20);
    ctx.textAlign = 'right'; ctx.fillStyle = settings.themeColor;
    ctx.fillText(formatFn(settings[valKey]), sliderX + sliderW, y - 20);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    roundRect(sliderX, y - sliderH/2, sliderW, sliderH, 5); ctx.fill();
    const pct = (settings[valKey] - min) / (max - min);
    const handleX = sliderX + pct * sliderW;
    ctx.fillStyle = settings.themeColor;
    roundRect(sliderX, y - sliderH/2, handleX - sliderX, sliderH, 5); ctx.fill();
    ctx.beginPath(); ctx.arc(handleX, y, 12, 0, TAU);
    ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.strokeStyle = '#000000'; ctx.lineWidth = 2; ctx.stroke();
  }
  drawSettingSlider(panelY + 330, '总音量', 'masterVolume', 0, 1, v => `${Math.round(v * 100)}%`);
  drawSettingSlider(panelY + 400, '音效音量', 'volume', 0, 1, v => `${Math.round(v * 100)}%`);
  drawSettingSlider(panelY + 470, '震屏强度', 'shake', 0, 2, v => `${Math.round(v * 100)}%`);
  drawSettingSlider(panelY + 540, '特效密度', 'particles', 0, 2, v => `${Math.round(v * 100)}%`);
  drawSettingSlider(panelY + 610, '左按键大小', 'touchScaleLeft', 0.6, 1.6, v => `${Math.round(v * 100)}%`);
  drawSettingSlider(panelY + 660, '右按键大小', 'touchScaleRight', 0.6, 1.6, v => `${Math.round(v * 100)}%`);
  drawSettingSlider(panelY + 710, '按钮透明度', 'touchOpacity', 0.3, 1.0, v => `${Math.round(v * 100)}%`);
  // 帧率选择
  ctx.textAlign = 'left'; ctx.fillStyle = '#a0a0c8'; ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('帧率', panelX + 60, panelY + 770);
  const fpsOptions = [30, 60, 120];
  const fBtnW = 50, fBtnH = 24, fGap = 6;
  let fBtnX = panelX + panelW - 60 - fpsOptions.length * fBtnW - (fpsOptions.length - 1) * fGap;
  for (let i = 0; i < fpsOptions.length; i++) {
    const isSel = settings.fps === fpsOptions[i];
    ctx.beginPath(); roundRect(fBtnX, panelY + 758, fBtnW, fBtnH, 4);
    ctx.fillStyle = isSel ? settings.themeColor : 'rgba(255,255,255,0.1)'; ctx.fill();
    ctx.font = '12px system-ui'; ctx.textAlign = 'center';
    ctx.fillStyle = isSel ? '#000000' : '#a0a0c8';
    ctx.fillText(fpsOptions[i] + '', fBtnX + fBtnW / 2, panelY + 758 + fBtnH / 2);
    fBtnX += fBtnW + fGap;
  }
  // 按键位置调整按钮
  const posBtnW = 230, posBtnH = 34, posX = W / 2 - posBtnW / 2, posY = panelY + 810;
  roundRect(posX, posY, posBtnW, posBtnH, 8);
  ctx.fillStyle = touchEditMode ? settings.themeColor : 'rgba(255,255,255,0.12)'; ctx.fill();
  ctx.font = '14px system-ui'; ctx.textAlign = 'center';
  ctx.fillStyle = touchEditMode ? '#000000' : '#cfcfe8';
  ctx.fillText(touchEditMode ? '退出位置调整（拖动左右按键组）' : '调整按键位置', W / 2, posY + posBtnH / 2);

  // 背景音乐控制已统一移入「音乐库」DOM 面板，此处不再绘制 BGM 控件。
  // 可滚动底边：按键位置调整按钮 panelY+810 高 34，再加 30 余量
  settings.maxScroll = Math.max(0, (panelY + 874) - (clipY + clipH));
  ctx.restore();
  ctx.textAlign = 'center'; ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(160, 160, 200, 0.5)';
  ctx.fillText('制作人：小拉LPLD（倡导者） DeepSeek(制作者) 豆包（监督者）', W / 2, panelY + panelH - 15);
  if (settings.maxScroll > 0) {
    const sbW = 4; const sbX = panelX + panelW - 12;
    const sbH = clipH;
    const thumbH = Math.max(20, sbH * (clipH / (clipH + settings.maxScroll)));
    const thumbY = clipY + (sbH - thumbH) * (settings.scrollY / settings.maxScroll);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    roundRect(sbX, clipY, sbW, sbH, 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    roundRect(sbX, thumbY, sbW, thumbH, 2); ctx.fill();
  }
  ctx.restore();
  ctx.textBaseline = 'alphabetic';
}

function drawSelect() {
  if (gameState !== 'select') return;
  ctx.save(); ctx.fillStyle = 'rgba(10, 10, 20, 0.80)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 50px system-ui, sans-serif'; ctx.fillStyle = '#ffffff';
  ctx.shadowColor = settings.themeColor; ctx.shadowBlur = 20;
  ctx.fillText('选择喜欢的颜色', W / 2, H / 2 - 180);
  ctx.shadowBlur = 0;
  // 返回按钮（触屏/鼠标可点）
  const rbW = 116, rbH = 34, rbX = 24, rbY = 24;
  ctx.beginPath(); roundRect(rbX, rbY, rbW, rbH, 8);
  ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fill();
  ctx.strokeStyle = 'rgba(160,160,200,0.45)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.font = '16px system-ui'; ctx.fillStyle = '#cfcfe8';
  ctx.fillText('← 返回', rbX + rbW / 2, rbY + rbH / 2 + 1);
  function drawColorUI(cx, data, ready, isP1) {
    const yStart = H / 2 - 60; const spacing = 42;
    const startX = cx - (CLASSIC_COLORS.length - 1) * spacing / 2;
    for (let i = 0; i < CLASSIC_COLORS.length; i++) {
      const x = startX + i * spacing; const isSel = (data.baseHex === CLASSIC_COLORS[i]);
      ctx.beginPath(); ctx.arc(x, yStart, 16, 0, TAU);
      ctx.fillStyle = CLASSIC_COLORS[i]; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.stroke();
      if (isSel) { ctx.beginPath(); ctx.arc(x, yStart, 22, 0, TAU); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke(); }
    }
    const sliderW = 300; const sliderH = 12;
    const sliderX = cx - sliderW / 2; const sliderY = H / 2 + 10;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    roundRect(sliderX, sliderY - sliderH/2, sliderW, sliderH, 6); ctx.fill();
    const grad = ctx.createLinearGradient(sliderX, 0, sliderX + sliderW, 0);
    grad.addColorStop(0, '#000000'); grad.addColorStop(0.2, data.baseHex); grad.addColorStop(1, '#ffffff');
    ctx.fillStyle = grad;
    roundRect(sliderX, sliderY - sliderH/2, sliderW, sliderH, 6); ctx.fill();
    const handleX = sliderX + (data.brightness - 0.2) / 1.3 * sliderW;
    ctx.beginPath(); ctx.arc(handleX, sliderY, 10, 0, TAU);
    ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.strokeStyle = '#000000'; ctx.lineWidth = 2; ctx.stroke();
    const btnW = 132; const btnH = 38;
    const btnX = cx - btnW/2; const btnY = H / 2 + 65;
    const rgb = hexToRgb(settings.themeColor);
    ctx.beginPath(); roundRect(btnX, btnY, btnW, btnH, 8);
    ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b}, 0.2)`; ctx.fill();
    ctx.strokeStyle = settings.themeColor; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = settings.themeColor; ctx.font = 'bold 16px system-ui';
    ctx.fillText('随机颜色', cx, btnY + btnH / 2 + 1);
    if (isP1) {
      // 触屏/鼠标点按确认按钮：切换 P1 就绪
      const cbX = cx - btnW / 2, cbY = H / 2 + 116;
      ctx.beginPath(); roundRect(cbX, cbY, btnW, btnH, 8);
      ctx.fillStyle = ready ? 'rgba(255,107,107,.22)' : 'rgba(90,160,110,.26)'; ctx.fill();
      ctx.strokeStyle = ready ? '#ff8a8a' : '#6fd39a'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.fillStyle = ready ? '#ffd0d0' : '#b6f2cf'; ctx.font = 'bold 16px system-ui';
      ctx.fillText(ready ? '已就绪 √ 点按取消' : '确认开始', cx, cbY + btnH / 2 + 1);
    } else if (ready) {
      ctx.fillStyle = '#ff6b6b';
      ctx.font = 'bold 24px system-ui';
      ctx.fillText('已就绪 √', cx, btnY + 70);
    } else {
      ctx.fillStyle = '#8888a0';
      ctx.font = '18px system-ui';
      ctx.fillText('等待确认...', cx, btnY + 70);
    }
  }
  if (mode === 'parkour') {
    drawColorUI(W / 2, p1ColorData, p1Ready, true);
    // 难度选择面板：1 轻松 / 2 普通 / 3 困难
    const dlabels = ['1 轻松', '2 普通', '3 困难'];
    const ddesc = ['慢速 · 稀疏', '标准节奏', '快速 · 密集'];
    ctx.textAlign = 'center';
    for (let k = 0; k < 3; k++) {
      const bx = W / 2 + (k - 1) * 150, by = H - 98;
      const sel = parkourDifficulty === k;
      ctx.fillStyle = sel ? 'rgba(80,140,255,0.25)' : 'rgba(255,255,255,0.06)';
      ctx.strokeStyle = sel ? '#7c9dff' : 'rgba(255,255,255,0.2)'; ctx.lineWidth = sel ? 2 : 1;
      roundRect(bx - 66, by - 24, 132, 50, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = sel ? '#cfe0ff' : '#8888a0'; ctx.font = 'bold 17px system-ui, sans-serif';
      ctx.fillText(dlabels[k], bx, by - 2);
      ctx.fillStyle = 'rgba(180,180,210,0.7)'; ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(ddesc[k], bx, by + 18);
    }
  } else if (mode === 'pvp') {
    drawColorUI(W / 4, p1ColorData, p1Ready, true);
    drawColorUI(W * 3 / 4, p2ColorData, p2Ready, false);
  } else {
    // 人机 / 闯关：CPU 后台随机配色，界面只显示玩家 P1 一列
    drawColorUI(W / 2, p1ColorData, p1Ready, true);
  }
  if (mode === 'pvp' && isTouchDevice) {
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillStyle = '#ffc078';
    ctx.fillText('⚠ 触屏设备下双人对战仍需键盘操作 P2', W / 2, H - 100);
  }
  ctx.font = 'bold 20px system-ui, sans-serif';
  if (p1Ready && p2Ready) {
    const blink = 0.5 + Math.sin(Date.now() * 0.01) * 0.5;
    const sec = Math.max(1, Math.ceil(selectTimer / 20));
    ctx.globalAlpha = blink; ctx.fillStyle = settings.themeColor;
    ctx.shadowColor = settings.themeColor; ctx.shadowBlur = 20;
    ctx.fillText(`准备就绪！ ${sec}`, W / 2, H - 60);
  }
  ctx.restore();
  ctx.textBaseline = 'alphabetic';
}

function drawIntro() {
  if (gameState !== 'intro') return;
  const t = introTimer;
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (t > 40 && t < 90) {
    const a = Math.min(1, (t - 40) / 15) * Math.min(1, (90 - t) / 10);
    ctx.globalAlpha = a; ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 60px system-ui, sans-serif';
    ctx.shadowColor = settings.themeColor; ctx.shadowBlur = 20;
    if (mode === 'campaign') ctx.fillText(`LEVEL ${currentLevel}`, W / 2, H / 2 - 40);
    else ctx.fillText('ROUND 1', W / 2, H / 2 - 40);
  } else if (t >= 90) {
    const a = Math.min(1, (t - 90) / 10);
    ctx.globalAlpha = a;
    ctx.fillStyle = settings.themeColor;
    ctx.font = 'bold 75px system-ui, sans-serif';
    ctx.shadowColor = settings.themeColor; ctx.shadowBlur = 30;
    const s = 1 + Math.sin((t - 90) * 0.25) * 0.08;
    ctx.translate(W / 2, H / 2 - 40); ctx.scale(s, s);
    ctx.fillText('FIGHT!', 0, 0);
  }
  ctx.restore();
  ctx.textBaseline = 'alphabetic';
}

function drawOverlay() {
  if (gameState !== 'ko') return;
  const a = Math.min(1, koTimer / 28);
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, H);
  if (specialGameOverWord) {
    const appearProgress = Math.min(1, Math.max(0, (koTimer - 20) / 45));
    const easeAppear = easeOutCubic(appearProgress);
    const scale = lerp(0.9, 1.0, easeAppear);
    ctx.save();
    ctx.translate(W / 2, H / 2 - 20); ctx.scale(scale, scale);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 260px "KaiTi", "STKaiti", "SimSun", serif';
    ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 40 + Math.sin(Date.now() * 0.005) * 10;
    ctx.fillStyle = '#8b0000';
    ctx.globalAlpha = a * easeAppear;
    ctx.fillText(specialGameOverWord, 0, 0);
    ctx.restore();
  } else {
    const scale = 1 + Math.max(0, (28 - koTimer) / 28) * 0.35;
    ctx.save();
    ctx.translate(W / 2, H / 2 - 20); ctx.scale(scale, scale);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 96px system-ui, sans-serif';
    ctx.fillStyle = winner ? winner.color : '#ffffff';
    ctx.shadowColor = winner ? winner.color : '#fff'; ctx.shadowBlur = 45;
    ctx.fillText('K.O.', 0, 0);
    ctx.restore();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowBlur = 0;
    ctx.font = 'bold 27px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    let resultText = winner ? `${winner.label} 获胜！` : '平局！';
    if (mode === 'campaign') {
      if (winner === p1) {
        if (currentLevel < MAX_LEVEL) resultText = `击败 BOSS！准备进入 Lv.${currentLevel + 1}`;
        else resultText = '恭喜！你已通关全部关卡！';
      } else if (winner === p2) {
        if (playerLives > 0) {
          const hpPct = Math.round((p2.hp / p2.maxHp) * 100);
          resultText = `挑战失败！剩余生命：${playerLives} · BOSS 保留 ${hpPct}% 血量`;
        } else { resultText = gameOverText; ctx.fillStyle = '#ff4b4b'; }
      }
    }
    ctx.fillText(resultText, W / 2, H / 2 + 52);
  }
  if (mode === 'campaign' && winner === p1 && currentLevel < MAX_LEVEL) {
    const upgradeText = getBossUpgradeText(currentLevel + 1);
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillStyle = '#ffc078';
    ctx.shadowColor = '#ffc078'; ctx.shadowBlur = 10;
    ctx.fillText(`下一关敌方强化：${upgradeText}`, W / 2, H / 2 + 90);
    ctx.shadowBlur = 0;
  }
  if (koTimer > 50) {
    const blink = 0.55 + Math.sin(koTimer * 0.1) * 0.35;
    ctx.globalAlpha = a * blink;
    const by = H / 2 + 112, bw = 132, bh = 38, gap = 22;
    const canNext = mode === 'campaign' && ((winner === p1 && currentLevel < MAX_LEVEL) || (winner === p2 && playerLives > 0));
    const canRematch = (mode === 'ai' || mode === 'pvp');
    const showLeft = canNext || canRematch;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (showLeft) {
      const lx = W / 2 - bw - gap / 2;
      ctx.beginPath(); roundRect(lx, by, bw, bh, 8);
      ctx.fillStyle = 'rgba(90,160,110,.28)'; ctx.fill();
      ctx.strokeStyle = '#6fd39a'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.font = 'bold 16px system-ui'; ctx.fillStyle = '#b6f2cf';
      const leftLabel = canNext ? (winner === p1 ? '下一关' : '重试') : '再来一局';
      ctx.fillText(leftLabel, lx + bw / 2, by + bh / 2 + 1);
    }
    const rx = showLeft ? W / 2 + gap / 2 : W / 2 - bw / 2;
    ctx.beginPath(); roundRect(rx, by, bw, bh, 8);
    ctx.fillStyle = 'rgba(120,130,170,.22)'; ctx.fill();
    ctx.strokeStyle = '#9aa6cc'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#d5dcf2'; ctx.font = 'bold 16px system-ui';
    ctx.fillText('返回菜单', rx + bw / 2, by + bh / 2 + 1);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  ctx.textBaseline = 'alphabetic';
}

function drawFloatingTexts() {
  if (gameState === 'menu' || gameState === 'entertainment_menu' || gameState.startsWith('parkour')) return;
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 22px system-ui, sans-serif';
  for (const t of floatingTexts) {
    const alpha = Math.min(1, t.life / 10);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = t.color;
    ctx.shadowColor = t.color; ctx.shadowBlur = 10;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, W, H);
  bgTime = mapTime;
  drawBackground();
  drawParallaxFar();
  ctx.save();
  if (shake > 0.4) ctx.translate(rand(-shake, shake), rand(-shake, shake));
  if (!p1) { ctx.restore(); return; } // 首帧初始化未完成时跳过角色绘制，避免空引用
  const inParkour = gameState === 'parkour' || gameState === 'parkour_dead' || gameState === 'parkour_countdown';
  if (inParkour) {
    drawParkourWorld();
    drawParkourTrail();
    drawShadow(p1);
    drawFighter(p1, PARKOUR_SCALE);
    drawSpeedLines();
    drawParkourUI();
    if (gameState === 'parkour_countdown') {
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 100px system-ui, sans-serif';
        ctx.fillText(Math.ceil(parkourCountdown), W/2, H/2);
        ctx.textBaseline = 'alphabetic';
    } else if (gameState === 'parkour_dead') drawParkourDead();
    else if (gameState === 'parkour' && parkourPaused) drawParkourPaused();
  } else {
    drawShadow(p1); drawTrail(p1);
    const hideP2 = gameState === 'select' && mode !== 'pvp';
    if (!hideP2) { drawShadow(p2); drawTrail(p2); }
    if (hideP2) drawFighter(p1);
    else if (p1.state === 'ko') { drawFighter(p1); drawFighter(p2); } else { drawFighter(p2); drawFighter(p1); }
  }
  drawDayNightTint();
  for (const p of particles) {
    ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const r of rings) {
    const alpha = r.life / r.maxLife;
    ctx.globalAlpha = alpha * 0.85;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 3 * alpha + 0.5;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  if (screenFlash > 0 && gameState !== 'menu' && gameState !== 'entertainment_menu') {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(0.5, screenFlash * 0.35)})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (gameState !== 'menu' && gameState !== 'select' && gameState !== 'intro' && gameState !== 'entertainment_menu' && !gameState.startsWith('parkour')) drawHUD();
  drawMenu(); drawEntertainmentMenu(); drawSelect(); drawOverlay(); drawIntro(); drawFloatingTexts(); drawSettings(); drawWardrobe(); drawHelp(); drawAnnouncement();
  if (settings.sideBlackBar > 0) {
      const bw = (settings.sideBlackBar / 100) * W;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, bw, H);
      ctx.fillRect(W - bw, 0, bw, H);
  }
}

const STEP = 1000 / 60;
let lastTime = performance.now(); let acc = 0; let renderAcc = 1000 / 60;
function loop(now) {
  requestAnimationFrame(loop);
  let dt = now - lastTime; lastTime = now; if (dt > 120) dt = 120; acc += dt;
  if (typeof window.tickTouch === 'function') window.tickTouch();
  let guard = 0;
  while (acc >= STEP && guard < 4) { update(); acc -= STEP; guard++; }
  if (guard >= 4) acc = 0;
  // 渲染节流：仅控制画面刷新频率，不改变游戏逻辑速度
  renderAcc += dt;
  const target = 1000 / (settings.fps || 60);
  if (renderAcc >= target) { renderAcc -= target; render(); }
}

function getCanvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  const src = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
  return { x: (src.clientX - rect.left) / rect.width * W, y: (src.clientY - rect.top) / rect.height * H };
}

function handleMouseDown(e) {
  if (nameModal.style.display === 'flex') { nameModal.style.display = 'none'; }
  if (musicPanel && musicPanel.classList.contains('show')) return;
  const { x, y } = getCanvasCoords(e);

  if (isAnnouncementOpen) {
    isDraggingAnnouncement = true;
    announcementDragStartY = y;
    announcementDragStartScroll = announcementScrollY;
    announcementClickStartY = y;
    return;
  }

  if (isHelpOpen) {
    const panelW = 580, panelH = 486, panelX = W / 2 - panelW / 2, panelY = H / 2 - panelH / 2;
    const cbW = 140, cbH = 34, cbX = W / 2 - cbW / 2, cbY = panelY + panelH - 46;
    const onClose = x >= cbX && x <= cbX + cbW && y >= cbY && y <= cbY + cbH;
    const outside = y < panelY || y > panelY + panelH || x < panelX || x > panelX + panelW;
    if (onClose || outside) isHelpOpen = false;
    return;
  }

  if (isSettingsOpen) {
    const panelW = 500; const panelH = 480;
    const panelX = W / 2 - panelW / 2; const panelY = H / 2 - panelH / 2;
    if (y < panelY || y > panelY + panelH || x < panelX || x > panelX + panelW) {
        isSettingsOpen = false; saveSettings(); return;
    }
    const clipY = panelY + 70;
    const clipH = panelH - 110;
    if (settings.maxScroll > 0) {
        const sbX = panelX + panelW - 12;
        const sbW = 4;
        const thumbH = Math.max(20, clipH * (clipH / (clipH + settings.maxScroll)));
        const thumbY = clipY + (clipH - thumbH) * (settings.scrollY / settings.maxScroll);
        if (x >= sbX - 8 && x <= sbX + sbW + 8 && y >= clipY && y <= clipY + clipH) {
            if (y >= thumbY && y <= thumbY + thumbH) {
                isDraggingScrollbar = true;
                settingsDragStartY = y;
                settingsDragStartScroll = settings.scrollY;
            } else {
                const page = clipH * 0.8;
                settings.scrollY = clamp(settings.scrollY + (y < thumbY ? -page : page), 0, settings.maxScroll);
            }
            return;
        }
    }
    if (y > clipY && y < clipY + clipH) {
        const localY = y - panelY + settings.scrollY;
        settingsDragStartY = y;
        settingsDragStartScroll = settings.scrollY;
        settingsClickTarget = null;
        isDraggingSettings = true;
        if (localY > 80 && localY < 120) settingsClickTarget = { type: 'name' };
        for (let i = 0; i < CLASSIC_COLORS.length; i++) {
            const row = i < 5 ? 0 : 1; const col = i % 5;
            const cx = panelX + 200 + col * 45;
            const cy = panelY + 160 + row * 35 - settings.scrollY;
            if (Math.hypot(x - cx, y - cy) < 20) {
                settingsClickTarget = { type: 'color', val: CLASSIC_COLORS[i] };
            }
        }
        const ratioOptions = ['default', 'fullscreen', '16:9', '4:3', '1:1', '1:2'];
        const btnW = 38; const btnH = 24; const btnGap = 4;
        const totalW = ratioOptions.length * btnW + (ratioOptions.length - 1) * btnGap;
        let btnX = panelX + panelW - 60 - totalW;
        for (let i = 0; i < ratioOptions.length; i++) {
            if (x > btnX && x < btnX + btnW && localY > 248 && localY < 248 + btnH) {
                settingsClickTarget = { type: 'ratio', val: ratioOptions[i] };
            }
            btnX += btnW + btnGap;
        }
        const fpsOpts = [30, 60, 120], fBtnW = 50, fGap = 6;
        let fbx = panelX + panelW - 60 - 3 * fBtnW - 2 * fGap;
        for (let i = 0; i < fpsOpts.length; i++) {
            if (x > fbx && x < fbx + fBtnW && localY > 758 && localY < 758 + 24) {
                settingsClickTarget = { type: 'fps', val: fpsOpts[i] };
            }
            fbx += fBtnW + fGap;
        }
        const posBtnW = 230, posBtnH = 34, posX = W / 2 - posBtnW / 2;
        if (localY > 810 && localY < 810 + posBtnH && x > posX && x < posX + posBtnW) {
            settingsClickTarget = { type: 'touchPos' };
        }
        const sliderW = 360; const sliderX = W / 2 - sliderW / 2;
        if (Math.abs(localY - 330) < 20 && x >= sliderX && x <= sliderX + sliderW) draggingSlider = 'masterVolume';
        if (Math.abs(localY - 400) < 20 && x >= sliderX && x <= sliderX + sliderW) draggingSlider = 'volume';
        if (Math.abs(localY - 470) < 20 && x >= sliderX && x <= sliderX + sliderW) draggingSlider = 'shake';
        if (Math.abs(localY - 540) < 20 && x >= sliderX && x <= sliderX + sliderW) draggingSlider = 'particles';
        if (Math.abs(localY - 610) < 20 && x >= sliderX && x <= sliderX + sliderW) draggingSlider = 'touchScaleLeft';
        if (Math.abs(localY - 660) < 20 && x >= sliderX && x <= sliderX + sliderW) draggingSlider = 'touchScaleRight';
        if (Math.abs(localY - 710) < 20 && x >= sliderX && x <= sliderX + sliderW) draggingSlider = 'touchOpacity';
        if (draggingSlider) {
            isDraggingSettings = false;
            settingsClickTarget = null;
        }
    }
    return;
  }

  if (isWardrobeOpen) {
    const panelW = 860; const panelH = 530;
    const panelX = W / 2 - panelW / 2; const panelY = H / 2 - panelH / 2;
    if (y < panelY || y > panelY + panelH || x < panelX || x > panelX + panelW) {
        isWardrobeOpen = false; saveSettings(); return;
    }
    // 关闭按钮点击检测
    const closeBtnX = panelX + panelW - 40;
    const closeBtnY = panelY + 40;
    if (Math.hypot(x - closeBtnX, y - closeBtnY) < 20) {
        isWardrobeOpen = false; saveSettings(); return;
    }
    
    const checkClick = (baseX, eq) => {
      for (let i = 0; i < SLOT_LIST.length; i++) {
        const s = SLOT_LIST[i];
        const rowY = panelY + 140 + i * 45;
        const lx = baseX + 20;
        const rx = baseX + 140;
        if (Math.hypot(x - lx, y - rowY) < 20) {
          const arr = ITEMS[s.key];
          eq[s.key] = (eq[s.key] + arr.length - 1) % arr.length;
        }
        if (Math.hypot(x - rx, y - rowY) < 20) {
          const arr = ITEMS[s.key];
          eq[s.key] = (eq[s.key] + 1) % arr.length;
        }
      }
    };
    checkClick(panelX + 180, settings.equippedP1);
    checkClick(panelX + panelW - 180, settings.equippedP2);
    return;
  }

  if (gameState === 'menu') {
    if (x < 120 && y < 70) { isSettingsOpen = true; return; }
    if (x > W - 260 && y < 70) { currentMapIndex = (currentMapIndex + 1) % MAPS.length; mapParticles = []; return; }
    const btnW = 120, btnH = 38, mGap = 10;
    const btnX = W - btnW - 40;
    const musicY = H - btnH - 40;
    const dressY = musicY - btnH - mGap;
    const helpY = dressY - btnH - mGap;
    if (x >= btnX && x <= btnX + btnW && y >= musicY && y <= musicY + btnH) {
      if (typeof openMusicPanel === 'function') openMusicPanel();
      else if (typeof addFloatingText === 'function') addFloatingText(W/2, 200, '缺少 music.js，请把它和 index.html 放同一文件夹', '#ff7b7b');
      return;
    }
    if (x >= btnX && x <= btnX + btnW && y >= dressY && y <= dressY + btnH) { isWardrobeOpen = true; return; }
    if (x >= btnX && x <= btnX + btnW && y >= helpY && y <= helpY + btnH) { isHelpOpen = true; return; }

    const optY = [250, 320, 390, 460];
    for (let i = 0; i < optY.length; i++) {
      if (y > optY[i] - 30 && y < optY[i] + 30 && x > W/2 - 170 && x < W/2 + 170) {
        if (i === 3) { gameState = 'entertainment_menu'; entMenuSelection = 0; }
        else { menuSelection = i; enterSelect(); }
        return;
      }
    }
  }
  if (gameState === 'entertainment_menu') {
    // 返回主菜单按钮
    if (x > W/2 - 90 && x < W/2 + 90 && y > 470 && y < 506) { gameState = 'menu'; return; }
    const optY2 = [280, 380];
    for (let i = 0; i < 2; i++) {
      if (y > optY2[i] - 40 && y < optY2[i] + 40 && x > W/2 - 190 && x < W/2 + 190) {
        entMenuSelection = i;
        if (i === 1) { mode = 'parkour'; enterSelect(); }
        else addFloatingText(W / 2, 230, '肉鸽模式开发中，敬请期待', '#ffd27a');
        return;
      }
    }
    if (x < W/2 - 190 || x > W/2 + 190 || y < 240 || (y > 320 && y < 340) || y > 420) gameState = 'menu';
    return;
  }
  // 触屏点按：闯关结算（左半继续/重试，右半返回菜单）
  if (gameState === 'ko' && koTimer > 50) {
    const by = H / 2 + 112, bw = 132, bh = 38, gap = 22;
    const canNext = mode === 'campaign' && ((winner === p1 && currentLevel < MAX_LEVEL) || (winner === p2 && playerLives > 0));
    const canRematch = (mode === 'ai' || mode === 'pvp');
    const showLeft = canNext || canRematch;
    const inRect = (bx) => x >= bx && x <= bx + bw && y >= by && y <= by + bh;
    if (showLeft) {
      const lx = W / 2 - bw - gap / 2;
      if (inRect(lx)) {
        if (canNext) {
          if (winner === p1 && currentLevel < MAX_LEVEL) { currentLevel++; enterIntro(); }
          else if (winner === p2 && playerLives > 0) enterIntro(true);
        } else { enterSelect(); }
      }
    }
    const rx = showLeft ? W / 2 + gap / 2 : W / 2 - bw / 2;
    if (inRect(rx)) initMenu();
    return;
  }
  // 触屏点按：跑酷死亡（复活 / 返回菜单 按钮）
  if (gameState === 'parkour_dead') {
    const tipY = H / 2 + 92, bw = 150, bh = 40, gap = 22;
    const inRect = (bx) => x >= bx && x <= bx + bw && y >= tipY && y <= tipY + bh;
    const canRevive = parkourCoins >= 50 && !parkourHasRevived;
    if (canRevive && inRect(W / 2 - bw - gap / 2)) {
      parkourCoins -= 50; parkourHasRevived = true; parkourLives = 2; gameState = 'parkour';
      p1.y = GROUND; p1.vy = 0; p1.onGround = true; p1.dropThroughCount = 0;
      p1.pose = basePose(); p1._joints = null; p1.trail.length = 0; p1.invincibleTimer = 90;
      p1.setState('run');
      parkourObstacles.forEach(o => { if (o.x - parkourScrollX < W + 300) o.hit = true; });
    } else if (inRect(canRevive ? W / 2 + gap / 2 : W / 2 - bw / 2)) initMenu();
    return;
  }
  // 触屏点按：跑酷暂停（继续 / 返回菜单 按钮）
  if (gameState === 'parkour' && parkourPaused) {
    const by = H / 2 + 34, bw = 150, bh = 40, gap = 22;
    const inRect = (bx) => x >= bx && x <= bx + bw && y >= by && y <= by + bh;
    if (inRect(W / 2 - bw - gap / 2)) parkourPaused = false;
    else if (inRect(W / 2 + gap / 2)) initMenu();
    return;
  }
  if (gameState !== 'select') return;
  // 返回按钮：回到进入前的菜单
  if (x >= 24 && x <= 140 && y >= 24 && y <= 58) {
    p1Ready = false; p2Ready = false;
    gameState = selectReturnState;
    p1.setState('idle'); p2.setState('idle');
    return;
  }
  const cx = mode === 'pvp' ? W / 4 : W / 2;
  const yStart = H / 2 - 60; const spacing = 42;
  const startX1 = cx - (CLASSIC_COLORS.length - 1) * spacing / 2;
  if (!p1Ready) {
    for (let i = 0; i < CLASSIC_COLORS.length; i++) {
      const cx2 = startX1 + i * spacing;
      if (Math.hypot(x - cx2, y - yStart) < 20) { p1ColorData.baseHex = CLASSIC_COLORS[i]; return; }
    }
  }
  const btnW = 132; const btnH = 38; const btnY = H / 2 + 65;
  if (x >= cx - btnW/2 && x <= cx + btnW/2 && y >= btnY && y <= btnY + btnH) {
    if (!p1Ready) p1ColorData.baseHex = CLASSIC_COLORS[Math.floor(Math.random() * CLASSIC_COLORS.length)];
    return;
  }
  const sliderW = 300; const sliderY = H / 2 + 10; const sliderX1 = cx - sliderW / 2;
  if (!p1Ready && Math.abs(y - sliderY) < 20 && x >= sliderX1 && x <= sliderX1 + sliderW) isDraggingP1Brightness = true;
  // 触屏点按：P1 确认开始 / 取消就绪
  const cbY = H / 2 + 116;
  if (x >= cx - btnW/2 && x <= cx + btnW/2 && y >= cbY && y <= cbY + btnH) { p1Ready = !p1Ready; return; }
  // 触屏点按：跑酷难度三档
  if (mode === 'parkour') {
    for (let k = 0; k < 3; k++) {
      const bx = W / 2 + (k - 1) * 150, by = H - 98;
      if (Math.abs(x - bx) < 66 && y >= by - 24 && y <= by + 26) {
        parkourDifficulty = k;
        try { localStorage.setItem('stickFightParkourDiff', String(k)); } catch (e) {}
        return;
      }
    }
  }
}

function handleMouseMove(e) {
  const { x, y } = getCanvasCoords(e);

  if (isAnnouncementOpen) {
    if (isDraggingAnnouncement) {
      const dy = y - announcementDragStartY;
      announcementScrollY = clamp(announcementDragStartScroll - dy, 0, announcementMaxScroll);
    }
    return;
  }

  if (isSettingsOpen) {
    if (isDraggingScrollbar) {
        const panelH = 480;
        const clipY = H / 2 - panelH / 2 + 70;
        const clipH = panelH - 110;
        const thumbH = Math.max(20, clipH * (clipH / (clipH + settings.maxScroll)));
        const trackSpace = clipH - thumbH;
        if (trackSpace > 0) {
            const dy = y - settingsDragStartY;
            settings.scrollY = clamp(settingsDragStartScroll + (dy / trackSpace) * settings.maxScroll, 0, settings.maxScroll);
        }
        return;
    }
    if (draggingSlider) {
        const sliderW = 360; const sliderX = W / 2 - sliderW / 2;
        let pct = clamp((x - sliderX) / sliderW, 0, 1);
        if (draggingSlider === 'masterVolume') { settings.masterVolume = pct; applyBgmVolume(); }
        else if (draggingSlider === 'volume') settings.volume = pct;
        else if (draggingSlider === 'shake') settings.shake = pct * 2;
        else if (draggingSlider === 'particles') settings.particles = pct * 2;
        else if (draggingSlider === 'touchScaleLeft') { settings.touchScaleLeft = 0.6 + pct * 1.0; applyTouchScale(); }
        else if (draggingSlider === 'touchScaleRight') { settings.touchScaleRight = 0.6 + pct * 1.0; applyTouchScale(); }
        else if (draggingSlider === 'touchOpacity') { settings.touchOpacity = 0.3 + pct * 0.7; applyTouchScale(); }
    } else if (isDraggingSettings) {
        const dy = y - settingsDragStartY;
        if (Math.abs(dy) > 5) settingsClickTarget = null;
        settings.scrollY = clamp(settingsDragStartScroll - dy, 0, settings.maxScroll);
    }
    return;
  }
  if (gameState !== 'select') return;
  if (!isDraggingP1Brightness) return;
  const sliderW = 300;
  const cx = mode === 'pvp' ? W / 4 : W / 2;
  if (isDraggingP1Brightness) {
    const sliderX = cx - sliderW / 2;
    let pct = (x - sliderX) / sliderW;
    p1ColorData.brightness = clamp(0.2 + pct * 1.3, 0.2, 1.5);
  }
}

function handleMouseUp(e) {
  if (isAnnouncementOpen) {
    if (isDraggingAnnouncement) {
      isDraggingAnnouncement = false;
      const { y } = getCanvasCoords(e);
      if (Math.abs(y - announcementClickStartY) < 10) {
        isAnnouncementOpen = false;
      }
    }
    return;
  }

  if (isSettingsOpen) {
    if (draggingSlider) { draggingSlider = null; saveSettings(); return; }
    if (isDraggingScrollbar) { isDraggingScrollbar = false; return; }
    if (isDraggingSettings) {
        isDraggingSettings = false;
        if (settingsClickTarget) {
            if (settingsClickTarget.type === 'name') {
                nameInput.value = settings.p1Name;
                nameModal.style.display = 'flex';
                nameInput.focus();
            } else if (settingsClickTarget.type === 'color') {
                settings.themeColor = settingsClickTarget.val;
                saveSettings();
                if (typeof applyThemeToDom === 'function') applyThemeToDom();
            } else if (settingsClickTarget.type === 'ratio') {
                settings.aspectRatio = settingsClickTarget.val;
                applyAspectRatio(settings.aspectRatio);
                saveSettings();
            } else if (settingsClickTarget.type === 'fps') {
                settings.fps = settingsClickTarget.val;
                saveSettings();
            } else if (settingsClickTarget.type === 'touchPos') {
                touchEditMode = !touchEditMode;
                document.body.classList.toggle('touch-edit', touchEditMode);
                if (touchEditMode) document.body.classList.add('touch-on');
                saveSettings();
            }
            settingsClickTarget = null;
        }
    }
    if (draggingSlider) {
        draggingSlider = null;
        saveSettings();
    }
    return;
  }
  isDraggingP1Brightness = false;
}

canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mousemove', handleMouseMove);
window.addEventListener('mouseup', handleMouseUp);
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleMouseDown(e); }, { passive: false });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handleMouseMove(e); }, { passive: false });
window.addEventListener('touchend', handleMouseUp);

window.addEventListener('wheel', (e) => {
  if (isAnnouncementOpen) {
    announcementScrollY = clamp(announcementScrollY + e.deltaY, 0, announcementMaxScroll);
    return;
  }
  if (isSettingsOpen) {
      settings.scrollY = clamp(settings.scrollY + e.deltaY, 0, settings.maxScroll);
  }
});

window.addEventListener('keydown', (e) => {
  if (document.activeElement === nameInput || document.activeElement === mpUrl) {
      if (e.code === 'Enter') {
        if (document.activeElement === nameInput) document.getElementById('nameOk').click();
        else document.getElementById('mpSave').click();
      }
      return;
  }
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
  
  if (isAnnouncementOpen) {
    isAnnouncementOpen = false;
    return;
  }

  if (e.code === 'Escape') {
    if (isSettingsOpen) { isSettingsOpen = false; saveSettings(); return; }
    if (isWardrobeOpen) { isWardrobeOpen = false; saveSettings(); return; }
    if (gameState === 'select') {
      p1Ready = false; p2Ready = false;
      gameState = selectReturnState;
      p1.setState('idle'); p2.setState('idle');
      return;
    }
  }
  if (gameState === 'parkour' && (e.code === 'KeyP' || e.code === 'Escape')) {
      parkourPaused = !parkourPaused;
      return;
  }
  keys[e.code] = true;
  if (e.repeat) return;
  if (isSettingsOpen || isWardrobeOpen) return;
  if (gameState === 'parkour_dead') {
      if ((e.code === 'Space' || e.code === 'Enter') && parkourCoins >= 50 && !parkourHasRevived) {
          parkourCoins -= 50; parkourHasRevived = true; parkourLives = 2; gameState = 'parkour';
          p1.y = GROUND; p1.vy = 0; p1.onGround = true; p1.dropThroughCount = 0;
          p1.pose = basePose(); p1._joints = null; p1.trail.length = 0; p1.invincibleTimer = 90;
          p1.setState('run');
          parkourObstacles.forEach(o => { if (o.x - parkourScrollX < W + 300) o.hit = true; });
      }
      if (e.code === 'KeyR') initMenu();
      return;
  }
  if (gameState === 'menu') {
    if (e.code === 'KeyW' || e.code === 'ArrowUp') menuSelection = (menuSelection + 3) % 4;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') menuSelection = (menuSelection + 1) % 4;
    if (e.code === 'KeyM') { currentMapIndex = (currentMapIndex + 1) % MAPS.length; mapParticles = []; }
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyJ') {
      if (menuSelection === 3) { gameState = 'entertainment_menu'; entMenuSelection = 0; }
      else enterSelect();
    }
    if (e.code === 'KeyC') { isWardrobeOpen = true; }
    return;
  }
  if (gameState === 'entertainment_menu') {
    if (e.code === 'KeyW' || e.code === 'ArrowUp') entMenuSelection = (entMenuSelection + 1) % 2;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') entMenuSelection = (entMenuSelection + 1) % 2;
    if (e.code === 'Enter' || e.code === 'Space') { if (entMenuSelection === 1) { mode = 'parkour'; enterSelect(); } }
    if (e.code === 'KeyR' || e.code === 'Escape' || e.code === 'Backspace') gameState = 'menu';
    return;
  }
  if (e.code === 'Enter') {
    if (gameState === 'ko' && mode === 'campaign') {
      if (winner === p1 && currentLevel < MAX_LEVEL) { currentLevel++; enterIntro(); }
      else if (winner === p2 && playerLives > 0) enterIntro(true);
    }
  }
  if (e.code === 'KeyR') {
    if (gameState === 'playing' || gameState === 'ko' || gameState === 'select' || gameState.startsWith('parkour')) initMenu();
  }
});

window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

const forceTouch = /[?&]touch=1/.test(location.search);
function applyTouchScale(){
  document.documentElement.style.setProperty('--tsl', settings.touchScaleLeft);
  document.documentElement.style.setProperty('--tsr', settings.touchScaleRight);
  document.documentElement.style.setProperty('--to', settings.touchOpacity);
}
function applyTouchOffset(){
  const L = document.querySelector('.touch .cluster.left');
  const R = document.querySelector('.touch .cluster.right');
  if (L) L.style.transform = `translate(${settings.touchOffset.left.x}px, ${settings.touchOffset.left.y}px)`;
  if (R) R.style.transform = `translate(${settings.touchOffset.right.x}px, ${settings.touchOffset.right.y}px)`;
}
if ('ontouchstart' in window || forceTouch) {
  document.body.classList.add('touch-on');
  applyTouchScale(); applyTouchOffset();

  // —— 整簇位置拖拽（编辑模式）——
  let dragCluster = null, startPX = 0, startPY = 0, origX = 0, origY = 0;
  const ptOf = (e) => (e.touches && e.touches[0]) ? e.touches[0] : e;
  function beginClusterDrag(cluster, e) {
    const p = ptOf(e);
    const side = cluster.classList.contains('right') ? 'right' : 'left';
    dragCluster = cluster; startPX = p.clientX; startPY = p.clientY;
    origX = settings.touchOffset[side].x; origY = settings.touchOffset[side].y;
  }
  const onMove = (e) => {
    if (!dragCluster) return;
    e.preventDefault();
    const p = ptOf(e);
    const side = dragCluster.classList.contains('right') ? 'right' : 'left';
    const o = settings.touchOffset[side];
    o.x = clamp(origX + (p.clientX - startPX), -220, 220);
    o.y = clamp(origY + (p.clientY - startPY), -240, 140);
    applyTouchOffset();
  };
  const onUp = () => { if (dragCluster) { dragCluster = null; saveSettings(); } };
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchend', onUp);
  window.addEventListener('mouseup', onUp);

  // —— 跳：仅触发跳跃脉冲，不派发全局 KeyW（避免菜单/选色页误触）——
  const jumpBtn = document.querySelector('.btn-jump');
  if (jumpBtn) {
    const jDown = (e) => {
      if (touchEditMode) { e.preventDefault(); beginClusterDrag(jumpBtn.closest('.cluster'), e); return; }
      e.preventDefault(); touchInp.up = 1; jumpBtn.classList.add('on');
    };
    const jUp = (e) => {
      if (touchEditMode) { dragCluster = null; return; }
      e.preventDefault(); jumpBtn.classList.remove('on');
    };
    jumpBtn.addEventListener('touchstart', jDown, { passive: false });
    jumpBtn.addEventListener('touchend', jUp, { passive: false });
    jumpBtn.addEventListener('touchcancel', jUp, { passive: false });
    jumpBtn.addEventListener('mousedown', jDown);
    jumpBtn.addEventListener('mouseup', jUp);
    jumpBtn.addEventListener('mouseleave', jUp);
  }

  // —— 拳：短按攻击 / 长按格挡 ——
  const HOLD_MS = 200;
  const punchBtn = document.getElementById('btnPunch');
  let punchHold = false, punchTimer = null;
  if (punchBtn) {
    const pDown = (e) => {
      if (touchEditMode) { e.preventDefault(); beginClusterDrag(punchBtn.closest('.cluster'), e); return; }
      e.preventDefault(); punchHold = false; punchBtn.classList.add('on');
      touchInp.punch = 1;
      punchTimer = setTimeout(() => { punchHold = true; touchInp.guard = 1; }, HOLD_MS);
    };
    const pUp = (e) => {
      if (touchEditMode) { dragCluster = null; return; }
      clearTimeout(punchTimer); punchBtn.classList.remove('on');
      if (punchHold) { touchInp.guard = 0; punchHold = false; }
    };
    punchBtn.addEventListener('touchstart', pDown, { passive: false });
    punchBtn.addEventListener('touchend', pUp, { passive: false });
    punchBtn.addEventListener('touchcancel', pUp, { passive: false });
    punchBtn.addEventListener('mousedown', pDown);
    punchBtn.addEventListener('mouseup', pUp);
    punchBtn.addEventListener('mouseleave', pUp);
  }

  // —— 踢：短按踢击 / 长按冲刺 ——
  const kickBtn = document.getElementById('btnKick');
  let kickHold = false, kickTimer = null;
  if (kickBtn) {
    const kDown = (e) => {
      if (touchEditMode) { e.preventDefault(); beginClusterDrag(kickBtn.closest('.cluster'), e); return; }
      e.preventDefault(); kickHold = false; kickBtn.classList.add('on');
      touchInp.kick = 1;
      kickTimer = setTimeout(() => { kickHold = true; touchInp.dash = 1; }, HOLD_MS);
    };
    const kUp = (e) => {
      if (touchEditMode) { dragCluster = null; return; }
      clearTimeout(kickTimer); kickBtn.classList.remove('on');
      kickHold = false;
    };
    kickBtn.addEventListener('touchstart', kDown, { passive: false });
    kickBtn.addEventListener('touchend', kUp, { passive: false });
    kickBtn.addEventListener('touchcancel', kUp, { passive: false });
    kickBtn.addEventListener('mousedown', kDown);
    kickBtn.addEventListener('mouseup', kUp);
    kickBtn.addEventListener('mouseleave', kUp);
  }

  // —— 左侧摇杆：水平轴控制左右移动 ——
  const joy = document.getElementById('joyBase');
  const stick = document.getElementById('joyStick');
  if (joy && stick) {
    let joyActive = false, joyId = null, joyCx = 0, joyCy = 0;
    const R = 38;
    const moveJoy = (e) => {
      let dx = clamp(e.clientX - joyCx, -R, R);
      stick.style.transform = `translate(calc(-50% + ${dx}px), -50%)`;
      touchInp.left = dx < -12 ? 1 : 0;
      touchInp.right = dx > 12 ? 1 : 0;
    };
    joy.addEventListener('pointerdown', (e) => {
      if (touchEditMode) { e.preventDefault(); beginClusterDrag(joy.closest('.cluster'), e); return; }
      e.preventDefault();
      const r = joy.getBoundingClientRect();
      joyCx = r.left + r.width / 2; joyCy = r.top + r.height / 2;
      joyActive = true; joyId = e.pointerId;
      try { joy.setPointerCapture(e.pointerId); } catch (_) {}
      moveJoy(e);
    });
    joy.addEventListener('pointermove', (e) => { if (joyActive && e.pointerId === joyId) moveJoy(e); });
    const joyEnd = (e) => {
      if (e.pointerId !== joyId) return;
      joyActive = false; joyId = null;
      touchInp.left = 0; touchInp.right = 0;
      stick.style.transform = 'translate(-50%, -50%)';
    };
    joy.addEventListener('pointerup', joyEnd);
    joy.addEventListener('pointercancel', joyEnd);
  }

  // —— 每帧：踢长按冲刺连发；非战斗时清掉残留脉冲（单次脉冲由 inputP1 读取时消费）——
  let dashTick = 0;
  window.tickTouch = function () {
    const inBattle = gameState === 'playing' || gameState === 'parkour';
    if (!inBattle) { touchInp.up = 0; touchInp.punch = 0; touchInp.kick = 0; touchInp.dash = 0; return; }
    if (kickHold) { if (++dashTick % 10 === 0) touchInp.dash = 1; } else dashTick = 0;
  };

  const done = document.getElementById('touchDone');
  if (done) done.addEventListener('click', () => {
    touchEditMode = false;
    document.body.classList.remove('touch-edit');
    saveSettings();
  });
}

// 延后到全部脚本（music/scene/parkour）加载完成后再初始化菜单，避免跨文件顶层变量时序缺失
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initMenu);
else initMenu();
requestAnimationFrame(loop);
//（注：内容由AI生成）
