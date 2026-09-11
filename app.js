'use strict';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const memories = window.NAVIT_MEMORIES || [];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let motionPaused = reducedMotion.matches;
window.navitMotionPaused = motionPaused;
let toastTimer;
function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4200);
}
function renderMotion() {
  window.navitMotionPaused = motionPaused;
  document.body.classList.toggle('motion-paused', motionPaused);
  $('#motionButton').textContent = motionPaused ? '▷' : 'Ⅱ';
  $('#motionButton').setAttribute('aria-label', motionPaused ? 'Resume animations' : 'Pause animations');
  $('#motionButton').setAttribute('aria-pressed', String(motionPaused));
  window.dispatchEvent(new Event('navit:motion'));
}
$('#motionButton').addEventListener('click', () => { motionPaused = !motionPaused; renderMotion(); });
reducedMotion.addEventListener('change', e => { motionPaused = e.matches; renderMotion(); });
renderMotion();

// No microphone or analytics. Playback begins only with a real user gesture.
const tracks = {
  birthday: { el: $('#musicBirthday'), title: 'Saal Bhar Mein Sabse…' },
  memories: { el: $('#musicMemories'), title: 'Dabe Dabe Paav… · Barfi' },
  bond: { el: $('#musicBond'), title: 'Tera Mujhse Hai…' },
  letter: { el: $('#musicLetter'), title: 'Tere Jaisa Yaar Kahan' }
};
Object.values(tracks).forEach(t => { t.el.volume = .45; });
let activeTrack = 'bond', soundWanted = false, audioRequest = 0, manualTrack = false;
let playbackPending = false;
let musicSceneLocked = false;
function renderSound() {
  const playing = soundWanted && !tracks[activeTrack].el.paused;
  const waiting = soundWanted && !playing;
  const label = playing ? 'Sound on' : waiting ? 'Resume ♫' : 'Sound off';
  document.body.classList.toggle('music-playing', playing);
  $('#soundButton').setAttribute('aria-pressed', String(playing));
  $('#soundButton').setAttribute('aria-label', `${playing ? 'Mute' : waiting ? 'Resume' : 'Play'} music`);
  $('#soundLabel').textContent = label;
  $('#trackName').textContent = tracks[activeTrack].title;
  if ($('#gateSound')) {
    $('#gateSoundLabel').textContent = label;
    $('#gateSound').setAttribute('aria-label', playing ? 'Mute music' : waiting ? 'Resume music' : 'Play music');
    $('#gateSound').setAttribute('aria-pressed', String(playing));
    $('#gateAudioHint').textContent = playing ? 'A familiar tune. A very special beginning.' : waiting ? 'Your music is still on. Tap to resume if your browser paused it.' : 'Your first tap starts the soundtrack. Sound is optional.';
  }
  if ($('#filmSound')) {
    $('#filmSound').textContent = playing ? 'Mute soundtrack ♫' : waiting ? 'Resume soundtrack ♫' : 'Play soundtrack ♫';
    $('#filmSound').setAttribute('aria-label', playing ? 'Mute soundtrack' : waiting ? 'Resume soundtrack' : 'Play soundtrack');
    $('#filmSound').setAttribute('aria-pressed', String(playing));
  }
  if ($('#vortexSound')) {
    $('#vortexSound').textContent = playing ? 'Sound on ♫' : waiting ? 'Resume ♫' : 'Sound off ♫';
    $('#vortexSound').setAttribute('aria-label', playing ? 'Mute the vortex soundtrack' : waiting ? 'Resume the vortex soundtrack' : 'Play the vortex soundtrack');
    $('#vortexSound').setAttribute('aria-pressed', String(playing));
  }
}
async function setSound(enabled) {
  const request = ++audioRequest;
  soundWanted = enabled;
  playbackPending = enabled;
  const audio = tracks[activeTrack].el;
  for (const track of Object.values(tracks)) if (!enabled || track.el !== audio) track.el.pause();
  renderSound();
  if (!enabled) return;
  try {
    await audio.play();
    if (request !== audioRequest) {
      if (audio !== tracks[activeTrack].el || !soundWanted) audio.pause();
      return;
    }
  } catch (_) {
    if (request !== audioRequest) return;
    // A browser interruption is not the visitor choosing to mute the music.
    // Keep that intent, and retry on return or the next real gesture.
    audio.pause();
    toast('Your browser paused the music. Tap Resume to bring it back.');
  } finally {
    if (request === audioRequest) playbackPending = false;
  }
  renderSound();
}
function resumeMusic() {
  if (soundWanted && !document.hidden && !playbackPending && tracks[activeTrack].el.paused) setSound(true);
}
function toggleSound() {
  // A blocked/paused player should resume, not require two clicks to turn back on.
  setSound(!(soundWanted && !tracks[activeTrack].el.paused));
}
function switchTrack(key) {
  if (!tracks[key] || key === activeTrack) return;
  ++audioRequest;
  tracks[activeTrack].el.pause();
  activeTrack = key;
  renderSound();
  setSound(soundWanted);
}
$('#soundButton').addEventListener('click', toggleSound);
$('#gateSound').addEventListener('click', toggleSound);
let firstGestureHandled = false;
function startOnFirstGesture(event) {
  if (firstGestureHandled || !event.isTrusted) return;
  if (event.type === 'keydown' && (event.ctrlKey || event.metaKey || event.altKey || !(/^[0-9a-z ]$/i.test(event.key) || event.key === 'Enter'))) return;
  firstGestureHandled = true;
  document.removeEventListener('click', startOnFirstGesture, true);
  document.removeEventListener('keydown', startOnFirstGesture, true);
  // A first click on a sound control belongs to that control; do not double-toggle it.
  if (event.target instanceof Element && event.target.closest('#soundButton,#gateSound,#filmSound,#vortexSound,#changeTrack')) return;
  setSound(true);
}
document.addEventListener('click', startOnFirstGesture, true);
document.addEventListener('keydown', startOnFirstGesture, true);
function resumeOnGesture(event) {
  if (!event.isTrusted || !firstGestureHandled) return;
  if (event.type === 'keydown' && (event.ctrlKey || event.metaKey || event.altKey || !(/^[0-9a-z ]$/i.test(event.key) || event.key === 'Enter'))) return;
  if (event.target instanceof Element && event.target.closest('#soundButton,#gateSound,#filmSound,#vortexSound,#changeTrack')) return;
  resumeMusic();
}
document.addEventListener('click', resumeOnGesture, true);
document.addEventListener('keydown', resumeOnGesture, true);
window.addEventListener('focus', resumeMusic);
window.addEventListener('pageshow', resumeMusic);
$('#changeTrack').addEventListener('click', () => {
  manualTrack = true;
  const keys = Object.keys(tracks);
  switchTrack(keys[(keys.indexOf(activeTrack) + 1) % keys.length]);
  if (!soundWanted) setSound(true);
  toast(`Now playing: ${tracks[activeTrack].title}`);
});
Object.values(tracks).forEach(track => {
  track.el.addEventListener('pause', () => { if (track.el === tracks[activeTrack].el && track.el.paused) renderSound(); });
  track.el.addEventListener('playing', () => { if (track.el === tracks[activeTrack].el) renderSound(); });
  track.el.addEventListener('error', () => {
    if (track.el === tracks[activeTrack].el) { renderSound(); toast('This song could not load. Tap Resume or try the next soundtrack.'); }
  });
});
$('#startButton').addEventListener('click', () => {
  manualTrack = false;
  switchTrack('memories');
});
renderSound();

const birthdayParts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', month: 'numeric', day: 'numeric', year: 'numeric' }).formatToParts(new Date());
const datePart = type => Number(birthdayParts.find(p => p.type === type).value);
const dayDifference = Math.round((Date.UTC(datePart('year'), 8, 12) - Date.UTC(datePart('year'), datePart('month') - 1, datePart('day'))) / 86400000);
if (dayDifference === 0) $('#birthdayStatus').textContent = 'It’s your day, birthday boy. Let’s make a memory. ✦';
else if (dayDifference > 0 && dayDifference <= 14) $('#birthdayStatus').textContent = dayDifference === 1 ? 'Tomorrow is your day. The magic is already waiting. ✦' : `${dayDifference} days until 12 September. A lifetime of cheering for you.`;
else $('#birthdayStatus').textContent = '12 September. A special day, worth coming back to.';

// Scrollable chapters: no timers or locked navigation.
const chapters = $$('.chapter');
let scrollFrame = 0;
let sceneTrack = 'bond', trackChangeTimer;
function updateScroll() {
  if (document.body.classList.contains('birthday-locked')) { scrollFrame = 0; return; }
  const range = document.documentElement.scrollHeight - innerHeight;
  $('#readingProgress').style.transform = `scaleX(${range > 0 ? Math.min(1, scrollY / range) : 0})`;
  const line = innerHeight * .38;
  const chapter = [...chapters].reverse().find(el => el.getBoundingClientRect().top <= line) || chapters[0];
  if (chapter && chapter.dataset.track !== sceneTrack) {
    sceneTrack = chapter.dataset.track;
    clearTimeout(trackChangeTimer);
    // Let a chapter settle before changing songs during a long smooth scroll.
    trackChangeTimer = setTimeout(() => { if (!manualTrack && !musicSceneLocked) switchTrack(sceneTrack); }, 450);
  }
  scrollFrame = 0;
}
window.addEventListener('scroll', () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll); }, { passive: true });
window.addEventListener('resize', updateScroll);
updateScroll();
if ('IntersectionObserver' in window) {
  document.body.classList.add('js-ready');
  const revealObserver = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-visible'); revealObserver.unobserve(e.target); }
  }), { threshold: .08, rootMargin: '0px 0px 20px 0px' });
  $$('.reveal').forEach(el => revealObserver.observe(el));
}

let filter = 'all';
const filtered = () => memories.filter(m => filter === 'all' || m.group === filter);
function renderGallery() {
  const list = filtered();
  const grid = $('#memoryGrid');
  const fragment = document.createDocumentFragment();
  for (const memory of list) {
    const figure = document.createElement('figure'); figure.className = 'memory-card';
    const button = document.createElement('button'); button.type = 'button'; button.setAttribute('aria-label', `Open memory: ${memory.title}`);
    const frame = document.createElement('div'); frame.className = 'memory-image';
    const img = document.createElement('img'); img.src = memory.src; img.alt = memory.alt; img.loading = 'lazy'; img.decoding = 'async';
    const caption = document.createElement('figcaption');
    const num = document.createElement('small'); num.textContent = String(memory.id + 1).padStart(2, '0');
    const title = document.createElement('h3'); title.textContent = memory.title;
    frame.append(img); caption.append(num, title); button.append(frame, caption); figure.append(button); fragment.append(figure);
    button.addEventListener('click', () => openPhoto(memory.id));
  }
  grid.replaceChildren(fragment);
  $('#memoryCount').textContent = `${list.length} little pieces of your story`;
}
$$('[data-filter]').forEach(button => button.addEventListener('click', () => {
  filter = button.dataset.filter;
  $$('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  renderGallery();
}));
renderGallery();

const photoDialog = $('#photoDialog');
let photoIndex = 0, photoList = memories, photoOpener, slideshowTimer = null, touchOrigin;
function showPhoto(index) {
  photoIndex = (index + photoList.length) % photoList.length;
  const memory = photoList[photoIndex];
  $('#lightboxPhoto').src = memory.src;
  $('#lightboxPhoto').alt = memory.alt;
  $('#photoTitle').textContent = memory.title;
  $('#photoDescription').textContent = memory.caption;
  $('#photoCounter').textContent = `MEMORY ${String(photoIndex + 1).padStart(2, '0')} / ${String(photoList.length).padStart(2, '0')}`;
}
function openPhoto(id) {
  photoOpener = document.activeElement;
  photoList = filtered();
  showPhoto(photoList.findIndex(m => m.id === id));
  photoDialog.showModal();
  photoDialog.querySelector('[data-close]').focus({ preventScroll: true });
}
function stopSlideshow() {
  clearInterval(slideshowTimer); slideshowTimer = null;
  $('#slideshowButton').textContent = 'Play the memories ▷';
  $('#slideshowButton').setAttribute('aria-pressed', 'false');
}
$('#previousPhoto').addEventListener('click', () => { stopSlideshow(); showPhoto(photoIndex - 1); });
$('#nextPhoto').addEventListener('click', () => { stopSlideshow(); showPhoto(photoIndex + 1); });
$$('[data-close]').forEach(b => b.addEventListener('click', () => photoDialog.close()));
photoDialog.addEventListener('close', () => { stopSlideshow(); photoOpener?.focus({ preventScroll: true }); });
photoDialog.addEventListener('click', e => { if (e.target === photoDialog) { const r = photoDialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) photoDialog.close(); } });
photoDialog.addEventListener('keydown', e => {
  if (['ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); stopSlideshow(); showPhoto(photoIndex + (e.key === 'ArrowRight' ? 1 : -1)); }
});
$('#lightboxPhoto').addEventListener('touchstart', e => { const t = e.changedTouches[0]; touchOrigin = { x:t.clientX, y:t.clientY }; }, { passive:true });
$('#lightboxPhoto').addEventListener('touchend', e => {
  if (!touchOrigin) return;
  const t = e.changedTouches[0], dx = t.clientX-touchOrigin.x, dy=t.clientY-touchOrigin.y;
  if (Math.abs(dx)>45 && Math.abs(dx)>Math.abs(dy)*1.3) { stopSlideshow(); showPhoto(photoIndex+(dx<0?1:-1)); }
  touchOrigin = null;
}, { passive:true });
$('#slideshowButton').addEventListener('click', () => {
  if (slideshowTimer) { stopSlideshow(); return; }
  slideshowTimer = setInterval(() => showPhoto(photoIndex + 1), 5500);
  $('#slideshowButton').textContent = 'Pause the memories Ⅱ';
  $('#slideshowButton').setAttribute('aria-pressed', 'true');
});

let candlesBlown = false;
$('#blowCandles').addEventListener('click', () => {
  if (candlesBlown) return;
  candlesBlown = true;
  $('#cakeArt').classList.add('blown');
  $('#cakeArt').setAttribute('aria-label', 'Navit’s birthday cake, with the five candles blown out');
  $('#blowCandles').hidden = true;
  $('#relightCandles').hidden = false;
  $('#wishStatus').textContent = 'Wish made. Magic sent. Ab ek badi si smile, birthday boy! ✦';
  $('#relightCandles').focus({ preventScroll: true });
  window.navitBurst?.(innerWidth * .5, innerHeight * .4, 120);
  toast('May your little wish find a beautiful way to come true.');
});
$('#relightCandles').addEventListener('click', () => {
  candlesBlown = false;
  $('#cakeArt').classList.remove('blown');
  $('#cakeArt').setAttribute('aria-label', 'A birthday cake with five glowing candles');
  $('#blowCandles').hidden = false;
  $('#relightCandles').hidden = true;
  $('#wishStatus').textContent = 'A fresh sky. Another wish. Take all the time you need.';
  $('#blowCandles').focus({ preventScroll: true });
});

$('#openLetter').addEventListener('click', () => {
  $('#letterPaper').hidden = false;
  $('#openLetter').setAttribute('aria-expanded', 'true');
  $('#openLetter').hidden = true;
  $('#letterPaper').scrollIntoView({ behavior:motionPaused ? 'instant':'smooth', block:'start' });
  $('#letterPaper').tabIndex = -1;
  $('#letterPaper').focus({ preventScroll:true });
});
$('#closeLetter').addEventListener('click', () => {
  $('#letterPaper').hidden = true;
  $('#openLetter').hidden = false;
  $('#openLetter').setAttribute('aria-expanded', 'false');
  $('#openLetter').focus({ preventScroll:true });
  $('#openLetter').scrollIntoView({ behavior:motionPaused ? 'instant':'smooth', block:'center' });
});
$('#downloadLetter').addEventListener('click', () => {
  const content = `FOR NAVIT — A LETTER TO MY LITTLE BHAI\n12 September\n\nMere pyaare Navit,\n\n${$('#letterBody').innerText}`;
  const url = URL.createObjectURL(new Blob([content], { type:'text/plain;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = 'Navit-a-letter-from-your-bhai.txt';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  toast('A little piece of this birthday, yours to keep.');
});
$$('.future-card').forEach(card => card.addEventListener('toggle', () => {
  if (!card.open) return;
  const rect = card.getBoundingClientRect();
  window.navitBurst?.(rect.left + rect.width * .5, Math.min(innerHeight * .75, rect.top + 65), 22);
}));
let wishNumber = 0;
const finalWishes = ['For a lifetime of laughing like this. ✦', 'For dreams that feel a little closer every day.', 'For good people, brave choices, and soft landings.', 'For the little boy in you. May he always feel loved.', 'For every future version of you. Always Team Navit. ♡'];
$('#launchStars').addEventListener('click', () => {
  $('#finaleStatus').textContent = finalWishes[wishNumber++ % finalWishes.length];
  window.navitFinale?.();
  window.navitBurst?.(innerWidth * .5, innerHeight * .45, 130);
});
document.addEventListener('visibilitychange', () => {
  // Do not mute on tab switches. Keep playing where the browser allows it;
  // if the OS suspends playback, resume the visitor's chosen music on return.
  if (document.hidden) stopSlideshow();
  else resumeMusic();
});
