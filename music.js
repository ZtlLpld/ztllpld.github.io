// 背景音乐播放器 + 音乐库面板（方案A第二刀拆分；在 game.js 之后加载）
// 共享全局：settings / clamp / saveSettings / audioCtx / playNoiseBurst；被主程序按原名调用。

// ======================== 背景音乐播放器（本地文件 + 在线歌曲队列，独立音量通道）=========================
// 1) 本地文件：mp3/m4a/ogg 放进同级 music/ 文件夹，并在 MUSIC_TRACKS 逐首登记；
// 2) 在线队列：音乐库输入网易云歌曲号/歌曲页链接/音频直链即追加进本次运行歌单，当前曲播完自动接下一首；
//    队列仅本次运行有效（刷新清空），不写本地、不设人为条数上限。仅限个人本地欣赏。
const MUSIC_TRACKS = [
  // 示例：{ title: '歌名示例', src: 'music/example.mp3' },
];
let netQueue = [];         // 本次运行的在线歌单：{kind,id,src,label,title}
let bgmAudio = null;       // HTMLAudioElement（裸 volume 控制，兼容跨域在线音频）
let bgmCurrent = 0;        // 当前曲目在合并列表中的索引
let bgmStarted = false;    // 是否已由用户手势触发过启动
let bgmStallCount = 0;     // 连续加载失败计数，避免坏链接导致死循环
let previewMode = false;   // 单条立即试听模式（失败时不跳进队列下一首）

// 合并歌单：本地文件在前，在线队列在后，统一结构
function allTracks() {
  const local = MUSIC_TRACKS.map(t => ({ title: t.title, src: t.src, kind: 'file' }));
  const queue = netQueue.map(t => ({ title: t.title || t.label, src: t.src, kind: t.kind }));
  return local.concat(queue);
}
function hasAnyMusic() { return MUSIC_TRACKS.length > 0 || netQueue.length > 0; }

function ensureBgmAudio() {
  if (bgmAudio) return;
  try {
    bgmAudio = new Audio();
    bgmAudio.preload = 'auto';
    bgmAudio.addEventListener('ended', () => {
      // 立即试听模式：试听曲播完不触碰正式队列，恢复到队列当前曲继续播
      if (previewMode) {
        previewMode = false;
        if (settings.bgmOn && hasAnyMusic()) playBgmTrack(bgmCurrent);
        return;
      }
      if (!settings.bgmOn) return;
      advanceBgm(true);
    });
    bgmAudio.addEventListener('error', () => {
      if (previewMode) { previewMode = false; if (typeof setMpMsg === 'function') setMpMsg('该链接无法播放（非音频直链 / 跨域受限 / 已失效）', true); return; }
      // 坏在线项一并移除并推进；计数为硬上限，防止连续坏曲空转死循环
      advanceBgm(true);
      if (allTracks().length && ++bgmStallCount > allTracks().length + 3) {
        bgmStallCount = 0;
        try { bgmAudio.pause(); } catch(e) {}
        if (typeof setMpMsg === 'function') setMpMsg('多首曲目加载失败，已暂停，请检查网络或歌曲号', true);
      }
    });
    // 能正常开始播放即重置失败计数；曲尾（最后 0.8 秒）自动轻淡出，衔接更自然
    bgmAudio.addEventListener('canplay', () => { bgmStallCount = 0; });
    bgmAudio.addEventListener('timeupdate', () => {
      if (previewMode || !bgmAudio || bgmFadeTimer) return;
      const d = bgmAudio.duration, c = bgmAudio.currentTime;
      if (isFinite(d) && d > 3 && (d - c) < 0.8) {
        bgmAudio.volume = bgmTargetVolume() * Math.max(0, (d - c) / 0.8);
      }
    });
    // 说明：不接入 WebAudio MediaElementSource，也不设 crossOrigin——普通 Audio 裸播放跨域公开音频
    // 不受 CORS 限制；一旦设 crossOrigin=anonymous 反而会触发跨域校验导致公开音频加载失败静音。
    // 游戏打击音效走独立 WebAudio 通道，与 BGM 互不影响。
  } catch(e) { bgmAudio = null; }
}
let bgmFadeTimer = null;
function bgmTargetVolume() { return (settings.bgmOn ? settings.bgmVolume : 0) * settings.masterVolume; }
function applyBgmVolume() {
  if (!bgmAudio) return;
  if (bgmFadeTimer) { clearInterval(bgmFadeTimer); bgmFadeTimer = null; }
  bgmAudio.volume = bgmTargetVolume();
}
// 曲目切换淡入：从 0 平滑升到目标音量，消除两首之间的生硬爆音
function fadeBgmIn() {
  if (!bgmAudio) return;
  if (bgmFadeTimer) { clearInterval(bgmFadeTimer); bgmFadeTimer = null; }
  const target = bgmTargetVolume();
  bgmAudio.volume = 0;
  const dur = 600, start = performance.now();
  bgmFadeTimer = setInterval(() => {
    if (!bgmAudio) { clearInterval(bgmFadeTimer); bgmFadeTimer = null; return; }
    const t = Math.min(1, (performance.now() - start) / dur);
    bgmAudio.volume = target * t;
    if (t >= 1) { clearInterval(bgmFadeTimer); bgmFadeTimer = null; }
  }, 40);
}
function playBgmTrack(i) {
  const list = allTracks();
  if (!list.length) return;
  ensureBgmAudio();
  if (!bgmAudio) return;
  bgmCurrent = ((i % list.length) + list.length) % list.length;
  const track = list[bgmCurrent];
  try {
    bgmAudio.src = track.src;
    bgmAudio.loop = false;
    bgmAudio.load();
    const p = bgmAudio.play();
    if (p && p.catch) p.catch(() => {});
    previewMode = false;
    // 仅本地文件持久化曲目；在线队列本次有效，刷新清空，不写入本地存储
    if (track.kind === 'file') settings.bgmSrc = track.src;
    fadeBgmIn();
    if (typeof syncMpControls === 'function') syncMpControls();
  } catch(e) {}
}
// 统一推进：removeCurrentOnline 为真时移除当前在线项再播下一首；本地文件保留并循环整单
function advanceBgm(removeCurrentOnline) {
  const before = allTracks();
  const cur = before[bgmCurrent];
  let next;
  if (removeCurrentOnline && cur && cur.kind !== 'file') {
    const qi = bgmCurrent - MUSIC_TRACKS.length;
    if (qi >= 0 && qi < netQueue.length) netQueue.splice(qi, 1);
    if (typeof refreshMusicPanelList === 'function') refreshMusicPanelList();
    next = Math.min(qi, allTracks().length - 1);
  } else {
    next = bgmCurrent + 1;
  }
  const rest = allTracks();
  if (!rest.length) { try { bgmAudio.pause(); } catch(e) {} if (typeof syncMpControls === 'function') syncMpControls(); return; }
  playBgmTrack(((next % rest.length) + rest.length) % rest.length);
}
function playNextBGM() { playBgmTrack(bgmCurrent + 1); }
function playPrevBGM() { playBgmTrack(bgmCurrent - 1); }
function toggleBgm() {
  settings.bgmOn = !settings.bgmOn;
  ensureBgmAudio();
  if (settings.bgmOn) {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    if (!bgmAudio || !bgmAudio.src) playBgmTrack(bgmCurrent);
    else { try { const p = bgmAudio.play(); if (p && p.catch) p.catch(()=>{}); } catch(e) {} }
  } else if (bgmAudio) {
    try { bgmAudio.pause(); } catch(e) {}
  }
  applyBgmVolume();
  saveSettings();
}
// 浏览器自动播放策略：首次手势（键盘/鼠标/触屏）后才启动
function startBgmOnGesture() {
  if (bgmStarted) { applyBgmVolume(); return; }
  if (!hasAnyMusic()) return;
  bgmStarted = true;
  ensureBgmAudio();
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  const list = allTracks();
  let idx = list.findIndex(t => t.src === settings.bgmSrc && t.kind === 'file');
  if (idx < 0) idx = settings.bgmIndex || 0;
  if (settings.bgmOn) playBgmTrack(idx);
}
function getBgmTrackName() {
  if (!hasAnyMusic()) return '暂无音乐：点右下角「音乐库」输入歌曲号添加';
  return '歌曲' + (bgmCurrent + 1);
}
// 试听在线直链（仅播放，不入库）
// 解析用户输入：①网易云歌曲号(纯数字) ②网易云歌曲页链接(提取 id) ③普通音频直链
function resolveTrackInput(raw) {
  const text = (raw || '').trim();
  if (!text) return { ok: false, msg: '请先输入网易云歌曲号（纯数字）或音频直链' };
  let m = text.match(/[?#&]id=(\d{5,})/);
  if (m) return { ok: true, kind: 'net', id: m[1], src: `https://music.163.com/song/media/outer/url?id=${m[1]}.mp3`, label: `网易云 #${m[1]}` };
  if (/^\d{5,}$/.test(text)) return { ok: true, kind: 'net', id: text, src: `https://music.163.com/song/media/outer/url?id=${text}.mp3`, label: `网易云 #${text}` };
  if (/^https?:\/\//i.test(text)) {
    if (/\.(mp3|m4a|ogg|wav|aac|flac)(\?.*)?$/i.test(text)) return { ok: true, kind: 'url', src: text, label: text.split('/').pop() };
    return { ok: false, msg: '网页链接无法直接播：可直接粘贴其中的歌曲号（纯数字），或换 .mp3/.m4a 结尾的直链' };
  }
  return { ok: false, msg: '无法识别：请输入网易云歌曲号（如 3342981041）或音频直链' };
}
function previewBgmUrl(url) {
  ensureBgmAudio();
  if (!bgmAudio || !url) return false;
  try {
    settings.bgmOn = true;
    previewMode = true;
    bgmAudio.src = url;
    const p = bgmAudio.play();
    if (p && p.catch) p.catch(err => {
      if (typeof setMpMsg !== 'function') return;
      previewMode = false;
      const blocked = err && err.name === 'NotAllowedError';
      setMpMsg(blocked ? '浏览器拦截了自动播放：请直接再点一次「播放/试听」' : '播放失败：该曲目可能为 VIP / 版权限制或网络不可达', true);
    });
    applyBgmVolume();
    return true;
  } catch(e) { previewMode = false; return false; }
}
// 把解析结果追加进本次运行的在线歌单；autoPlay 为真或当前空闲时立即播，否则排队等当前曲播完自动接上
function enqueueNetTrack(r, autoPlay) {
  const item = { kind: r.kind, id: r.id || null, src: r.src, label: r.label };
  netQueue.push(item);
  if (typeof refreshMusicPanelList === 'function') refreshMusicPanelList();
  // 显示名统一为「歌曲N」，不做在线原名回填
  const idle = !bgmAudio || !bgmAudio.src || bgmAudio.ended || bgmAudio.paused || !settings.bgmOn;
  if (autoPlay || idle) {
    settings.bgmOn = true;
    const list = allTracks();
    const hit = list.findIndex(t => t.src === r.src && t.kind === r.kind);
    if (hit >= 0) playBgmTrack(hit);
  }
}
// 移除队列第 queueIndex 项；若删掉的是当前正在播的在线曲，自动切到下一首
function removeQueueItem(queueIndex) {
  if (queueIndex < 0 || queueIndex >= netQueue.length) return;
  // 用队列索引判断是否为当前播放项（不依赖可能重复的音源地址，更严谨）
  const curQi = bgmCurrent - MUSIC_TRACKS.length;
  const playingNow = queueIndex === curQi && curQi >= 0 && curQi < netQueue.length;
  netQueue.splice(queueIndex, 1);
  refreshMusicPanelList();
  if (playingNow) {
    const list = allTracks();
    if (list.length) playNextBGM();
    else if (bgmAudio) { try { bgmAudio.pause(); } catch(e) {} }
  }
}

// 跑酷程序化循环 BGM：8 步低音序列，步长随速度加快，偶数步带轻踩镲
function playParkourBgmNote(step) {
  if (hasAnyMusic()) return; // 已有本地文件或在线队列曲目时，停用程序化琶音，避免两层背景音叠加
  if (!audioCtx || settings.volume <= 0) return;
  const t = audioCtx.currentTime;
  const bass = [55, 55, 65.41, 55, 82.41, 55, 65.41, 49];
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = 'triangle'; o.frequency.value = bass[step];
  o.connect(g); g.connect(audioCtx.destination);
  const v = 0.09 * settings.volume * settings.masterVolume;
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  o.start(t); o.stop(t + 0.23);
  if (step % 2 === 0) playNoiseBurst(t, 0.03, 0.025 * settings.volume * settings.masterVolume);
}
window.addEventListener('keydown', initAudio, { once: true });
window.addEventListener('touchstart', initAudio, { once: true });
window.addEventListener('mousedown', initAudio, { once: true });
// 首次任意手势后启动本地 BGM（内部有 bgmStarted 守卫，重复调用无害）
window.addEventListener('keydown', startBgmOnGesture);
window.addEventListener('touchstart', startBgmOnGesture, { passive: true });
window.addEventListener('mousedown', startBgmOnGesture);


/* ================= 音乐库 DOM 面板 ================= */

// ===== 音乐库面板：播放控制 + 音乐音量 + 歌单排序 + 在线队列连播 =====
const musicPanel = document.getElementById('musicPanel');
const mpUrl = document.getElementById('mpUrl');
const mpMsg = document.getElementById('mpMsg');
const mpList = document.getElementById('mpList');
const mpNow = document.getElementById('mpNow');
const mpPlay = document.getElementById('mpPlay');
const mpPrev = document.getElementById('mpPrev');
const mpNext = document.getElementById('mpNext');
const mpToggle = document.getElementById('mpToggle');
const mpVol = document.getElementById('mpVol');
const mpVolVal = document.getElementById('mpVolVal');

function setMpMsg(text, err) {
  mpMsg.textContent = text;
  mpMsg.classList.toggle('err', !!err);
}
function openMusicPanel() {
  if (!musicPanel) return;
  applyThemeToDom();
  musicPanel.classList.add('show');
  refreshMusicPanelList();
  setTimeout(() => mpUrl.focus(), 60);
}
function closeMusicPanel() { if (musicPanel) musicPanel.classList.remove('show'); }
// 把当前主题色同步到音乐库 DOM 面板（CSS 变量 --mp-theme），使其跟随系统主题切换
function applyThemeToDom() {
  const c = settings.themeColor || '#4fc9ff';
  if (musicPanel) musicPanel.style.setProperty('--mp-theme', c);
  document.body.style.setProperty('--theme', c);
}

// 控制区状态同步：播放/暂停文案、开关、当前曲名、音量滑杆
function syncMpControls() {
  const playing = !!(settings.bgmOn && bgmAudio && !bgmAudio.paused && !bgmAudio.ended);
  if (mpPlay) mpPlay.textContent = playing ? '暂停' : '播放';
  if (mpToggle) mpToggle.textContent = settings.bgmOn ? '音乐：开' : '音乐：关';
  if (mpNow) mpNow.textContent = hasAnyMusic() ? '▶ ' + getBgmTrackName() : '暂无音乐：在下方输入歌曲号加入';
  if (mpVol) mpVol.value = Math.round(settings.bgmVolume * 100);
  if (mpVolVal) mpVolVal.textContent = Math.round(settings.bgmVolume * 100) + '%';
}

// 歌单排序列表：本地文件在前、在线队列在后，序号连续；仅在线条目可移除
function refreshMusicPanelList() {
  if (mpList) mpList.innerHTML = '';
  const list = allTracks();
  if (!list.length) {
    const empty = document.createElement('div');
    empty.className = 'mp-empty';
    empty.textContent = '歌单为空：输入歌曲号点「加入歌单」，当前曲播完自动接下一首';
    mpList.appendChild(empty);
  } else {
    list.forEach((t, idx) => {
      const row = document.createElement('div'); row.className = 'mp-item';
      const name = document.createElement('span'); name.className = 'mp-name';
      name.textContent = '歌曲' + (idx + 1);
      name.title = t.src;
      const tag = document.createElement('span'); tag.className = 'mp-tag';
      tag.textContent = t.kind === 'file' ? '本地' : '在线';
      const playBtn = document.createElement('button'); playBtn.textContent = '播放';
      playBtn.onclick = () => { settings.bgmOn = true; playBgmTrack(idx); syncMpControls(); };
      row.append(name, tag, playBtn);
      if (t.kind !== 'file') {
        const delBtn = document.createElement('button'); delBtn.className = 'mp-del'; delBtn.textContent = '移除';
        delBtn.onclick = () => removeQueueItem(idx - MUSIC_TRACKS.length);
        row.appendChild(delBtn);
      }
      mpList.appendChild(row);
    });
  }
  syncMpControls();
}

// 播放控制
mpPrev.onclick = () => { playPrevBGM(); syncMpControls(); };
mpNext.onclick = () => { playNextBGM(); syncMpControls(); };
mpPlay.onclick = () => { toggleBgm(); syncMpControls(); };
mpToggle.onclick = () => { toggleBgm(); syncMpControls(); };
mpVol.addEventListener('input', () => {
  settings.bgmVolume = clamp(mpVol.value / 100, 0, 1);
  applyBgmVolume(); saveSettings();
  if (mpVolVal) mpVolVal.textContent = mpVol.value + '%';
});

// 立即试听：只播放当前输入，不进入歌单
document.getElementById('mpPreview').onclick = () => {
  const r = resolveTrackInput(mpUrl.value);
  if (!r.ok) { setMpMsg(r.msg, true); return; }
  const ok = previewBgmUrl(r.src);
  setMpMsg(ok ? `正在试听 ${r.label}（未加入歌单）` : '播放失败：该曲目可能为 VIP / 版权限制或已失效', !ok);
  syncMpControls();
};
// 加入歌单：追加到队列末尾；当前空闲则立即播，否则排队等播完自动接上
document.getElementById('mpSave').onclick = () => {
  const r = resolveTrackInput(mpUrl.value);
  if (!r.ok) { setMpMsg(r.msg, true); return; }
  enqueueNetTrack(r, false);
  setMpMsg(`已加入歌单（在线队列共 ${netQueue.length} 首）；当前曲播完自动播放下一首`, false);
  mpUrl.value = '';
};
document.getElementById('mpClose').onclick = closeMusicPanel;
// 回车 = 加入歌单（主操作）
mpUrl.addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('mpSave').click(); });
applyThemeToDom();   // 启动即把主题色同步到 DOM 面板（含名字弹窗）
//（注：内容由AI生成）
