'use strict';

// ── Configuração de vídeo ────────────────────────────────────────────────────
const videoConfig = {
  fossa:     { loop: '../VDalt/AmbFossa.mp4' },
  garca:     { loop: '../VDalt/Rios e Nevoas.mp4' },
  extra:     { loop: '../VDalt/Rios e Nevoas.mp4' },
  'extra-2': { loop: '../VDalt/Rios e Nevoas.mp4' },
  'extra-3': { loop: '../VDalt/Rios e Nevoas.mp4' },
  transition: {
    bridge:        '../VDalt/Trasição.mp4',
    reverseBridge: '../VDalt/transition-reverse.mp4',
    fossaReturn:   '../VDalt/fossaint.mp4',
  },
};

// Todos os returns usam o mesmo vídeo; centraliza aqui
const getReturnSrc = () => videoConfig.transition.fossaReturn;

// ── Elementos de vídeo ───────────────────────────────────────────────────────
const vidA = document.getElementById('video-A');
const vidB = document.getElementById('video-B');
let _activeIsA = true;

const _active   = () => _activeIsA ? vidA : vidB;
const _inactive = () => _activeIsA ? vidB : vidA;

function videoLoad(el, src, loop = true) {
  const next = new URL(src, document.baseURI).href;
  el.loop = loop;
  el.playbackRate = 1;
  el.preload = 'auto';
  if (el.src !== next) el.src = src;
  try { el.load(); } catch (_) {}
}

function waitForEventOrState(el, eventName, isReady) {
  return new Promise(resolve => {
    if (isReady()) return resolve();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      el.removeEventListener(eventName, finish);
      resolve();
    };
    const timer = setTimeout(finish, 2000);
    el.addEventListener(eventName, finish, { once: true });
  });
}

const waitForCanPlay = el =>
  waitForEventOrState(el, 'canplay', () => el.readyState >= 3);

async function videoCrossFadeTo(el, restart = true) {
  await waitForCanPlay(el);
  if (restart) el.currentTime = 0;
  el.playbackRate = 1;
  el.play().catch(() => {});
  el.classList.add('visible');
  _active().classList.remove('visible');
  _activeIsA = el === vidA;
}

function videoWaitForEnd(el = _active()) {
  return new Promise(resolve => {
    const duration = Number.isFinite(el.duration) ? el.duration : 0;
    if (duration && el.currentTime >= duration - 0.05) return resolve();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      el.removeEventListener('ended', finish);
      resolve();
    };
    const remaining = duration ? Math.max(0.5, duration - el.currentTime) : 10;
    const timer = setTimeout(finish, (remaining + 1.5) * 1000);
    el.addEventListener('ended', finish, { once: true });
  });
}

const videoPreload = (src, loop = true) => videoLoad(_inactive(), src, loop);

// ── Bloqueio de scroll ───────────────────────────────────────────────────────
const BLOCKED_KEYS = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End',' ','Spacebar'];
const noScroll = e => e.preventDefault();
const noKey    = e => BLOCKED_KEYS.includes(e.key) && e.preventDefault();
const _opts    = { passive: false };
let scrollLockTimer = null;

function lockScrollHard() {
  clearTimeout(scrollLockTimer);
  document.body.style.overflow = 'hidden';
  window.addEventListener('wheel',     noScroll, _opts);
  window.addEventListener('touchmove', noScroll, _opts);
  window.addEventListener('keydown',   noKey,    false);
  scrollLockTimer = setTimeout(() => {
    if (!isTransitioning) return;
    isTransitioning = false;
    unlockScrollHard();
    closeGate();
    onScroll();
  }, 18000);
}

function unlockScrollHard() {
  clearTimeout(scrollLockTimer);
  scrollLockTimer = null;
  document.body.style.overflow = '';
  window.removeEventListener('wheel',     noScroll, _opts);
  window.removeEventListener('touchmove', noScroll, _opts);
  window.removeEventListener('keydown',   noKey,    false);
}

// ── Dados das seções (ordem importa) ────────────────────────────────────────
// Cada entry: { id, card, section }
const ACTS = ['fossa', 'garca', 'extra', 'extra-2', 'extra-3'];

const actData = {};
ACTS.forEach(id => {
  const suffix = id === 'fossa' ? 'fossa' : id.replace('-', '');
  actData[id] = {
    section: document.getElementById(`act-${id}`),
    card:    document.getElementById(id === 'fossa' ? 'fossa-card' : `${suffix === 'fossa' ? 'fossa' : id.replace('-','')}-card`),
  };
});
// Corrige IDs reais do HTML
actData['fossa'].card    = document.getElementById('fossa-card');
actData['garca'].card    = document.getElementById('garca-card');
actData['extra'].card    = document.getElementById('extra-card');
actData['extra-2'].card  = document.getElementById('extra-card-2');
actData['extra-3'].card  = document.getElementById('extra-card-3');

const fossaLastBlk = document.getElementById('fossa-last-block');
const scrollCue    = document.getElementById('scroll-cue');
const scrollOrb    = document.getElementById('scroll-orb');

// ── Constantes ───────────────────────────────────────────────────────────────
const END_EPSILON = 4;
const ORB_TARGET  = 320;
const ORB_TRAVEL  = 138;
const SMALL_STEP  = 46;
const LARGE_STEP  = 116;
const SLIDE_MS    = 780;

let currentAct      = 'fossa';
let isTransitioning = false;
let gateDirection   = null;
let gateProgress    = 0;
let lastTouchY      = null;

const EXIT_CLASSES     = ['is-exiting', 'is-exiting-left'];
const ENTER_CLASS      = 'is-entering-from-right';
const EXIT_STYLE_PROPS = ['--exit-top', '--exit-left', '--exit-width', '--exit-height'];

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function clearCardExit(card) {
  card.classList.remove(...EXIT_CLASSES, ENTER_CLASS);
  EXIT_STYLE_PROPS.forEach(p => card.style.removeProperty(p));
}

function prepareCardExit(card) {
  const r = card.getBoundingClientRect();
  card.style.setProperty('--exit-top',    `${r.top}px`);
  card.style.setProperty('--exit-left',   `${r.left}px`);
  card.style.setProperty('--exit-width',  `${r.width}px`);
  card.style.setProperty('--exit-height', `${r.height}px`);
  card.classList.add('is-exiting');
  card.getBoundingClientRect();
}

function animateCard(card, action) {
  return new Promise(resolve => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      card.removeEventListener('transitionend', onEnd);
      if (action === 'enter') card.classList.remove(ENTER_CLASS);
      resolve();
    };
    const onEnd = e => { if (e.target === card && e.propertyName === 'transform') finish(); };
    const timer = setTimeout(finish, SLIDE_MS + 180);

    clearCardExit(card);
    if (action === 'enter') {
      card.classList.add(ENTER_CLASS);
    } else {
      prepareCardExit(card);
    }
    card.addEventListener('transitionend', onEnd);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (action === 'enter') card.classList.remove(ENTER_CLASS);
      else card.classList.add(`is-exiting-${action}`);
    }));
  });
}

// Wrappers semânticos
const animateCardExit  = (card, dir)   => animateCard(card, dir);
const animateCardEnter = (card, setup) => {
  // setup é chamado após adicionar ENTER_CLASS, antes da transição
  return new Promise(resolve => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      card.removeEventListener('transitionend', onEnd);
      card.classList.remove(ENTER_CLASS);
      resolve();
    };
    const onEnd = e => { if (e.target === card && e.propertyName === 'transform') finish(); };
    const timer = setTimeout(finish, SLIDE_MS + 180);

    clearCardExit(card);
    card.classList.add(ENTER_CLASS);
    if (setup) setup();
    card.getBoundingClientRect();
    card.addEventListener('transitionend', onEnd);
    requestAnimationFrame(() => requestAnimationFrame(() => card.classList.remove(ENTER_CLASS)));
  });
};

// ── Helpers de posição de seção ──────────────────────────────────────────────
function sectionEndY(id) {
  const { section, card } = actData[id];
  return Math.max(0, section.offsetTop + card.offsetHeight - window.innerHeight);
}
function sectionTopY(id) { return actData[id].section.offsetTop; }

function isAtEnd(id)  { return window.scrollY >= sectionEndY(id) - END_EPSILON; }
function isAtTop(id)  { return window.scrollY <= sectionTopY(id) + END_EPSILON; }

function snapToEnd(id) {
  const y = sectionEndY(id);
  if (window.scrollY > y) window.scrollTo({ top: y, behavior: 'auto' });
}
function snapToTop(id) {
  const y = sectionTopY(id);
  if (window.scrollY < y) window.scrollTo({ top: y, behavior: 'auto' });
}

// ── Gate / orb ───────────────────────────────────────────────────────────────
function armGate(direction) {
  if (gateDirection !== direction) gateProgress = 0;
  gateDirection = direction;
  updateOrb();
}

function closeGate() {
  gateDirection = null;
  gateProgress  = 0;
  updateOrb();
}

function updateOrb() {
  if (!scrollOrb) return;
  const ratio     = clamp(gateProgress / ORB_TARGET, 0, 1);
  const travel    = gateDirection === 'prev' ? ORB_TRAVEL : -ORB_TRAVEL;
  scrollOrb.style.setProperty('--orb-y',     `${Math.round(ratio * travel)}px`);
  scrollOrb.style.setProperty('--orb-scale', `${1 + ratio * 0.28}`);
  scrollOrb.classList.toggle('is-visible', Boolean(gateDirection));
  scrollOrb.classList.toggle('is-back',    gateDirection === 'prev');
  scrollOrb.classList.toggle('is-ready',   ratio >= 1);
  if (scrollCue) scrollCue.classList.toggle('is-hidden', gateDirection === 'next');
}

function releaseScrollAfter(delay = 0) {
  setTimeout(() => {
    isTransitioning = false;
    unlockScrollHard();
    closeGate();
  }, delay);
}

function recoverFromTransitionError(error, act) {
  console.error('Transition failed:', error);
  currentAct      = act;
  isTransitioning = false;
  ACTS.forEach(id => {
    clearCardExit(actData[id].card);
    if (id !== 'fossa') actData[id].section.classList.toggle('revealed', id === act);
  });
  unlockScrollHard();
  closeGate();
  onScroll();
}

// ── Navegação por gate ───────────────────────────────────────────────────────
function addGateProgress(direction, amount) {
  if (isTransitioning) return;
  armGate(direction);
  gateProgress = clamp(gateProgress + amount, 0, ORB_TARGET);
  updateOrb();
  if (gateProgress < ORB_TARGET) return;

  const idx = ACTS.indexOf(currentAct);
  if (direction === 'next' && idx < ACTS.length - 1) {
    fireExit(currentAct, ACTS[idx + 1]);
  } else if (direction === 'prev' && idx > 0) {
    fireBack(currentAct, ACTS[idx - 1]);
  }
}

function reduceGateProgress(amount) {
  if (!gateDirection) return;
  gateProgress = clamp(gateProgress - amount, 0, ORB_TARGET);
  if (gateProgress <= 0) { closeGate(); return; }
  updateOrb();
}

// ── Transições de vídeo ──────────────────────────────────────────────────────
async function transitionRun(dir) {
  const src = dir === 'forward'
    ? videoConfig.transition.bridge
    : videoConfig.transition.reverseBridge;
  videoLoad(_inactive(), src, false);
  await videoCrossFadeTo(_inactive());
  await videoWaitForEnd();
}

// ── Arrive / Exit / Back genéricos ───────────────────────────────────────────
async function sectionArrive(id) {
  const loopSrc = (videoConfig[id] && videoConfig[id].loop) || videoConfig.garca.loop;
  videoLoad(_inactive(), loopSrc, true);
  await videoCrossFadeTo(_inactive());

  currentAct = id;
  videoPreload(videoConfig.transition.reverseBridge, false);
  const { section, card } = actData[id];
  await animateCardEnter(card, () => {
    section.scrollIntoView({ behavior: 'auto' });
    if (id !== 'fossa') section.classList.add('revealed');
  });
  releaseScrollAfter(280);
}

async function fireExit(fromId, toId) {
  if (isTransitioning) return;
  isTransitioning = true;
  closeGate();
  if (scrollCue) scrollCue.classList.add('is-hidden');
  lockScrollHard();
  snapToEnd(fromId);

  try {
    const { section: fromSec, card: fromCard } = actData[fromId];
    await animateCardExit(fromCard, 'left');
    if (fromId !== 'fossa') { fromSec.classList.remove('revealed'); clearCardExit(fromCard); }

    await transitionRun('forward');
    await sectionArrive(toId);
  } catch (e) {
    recoverFromTransitionError(e, fromId);
  }
}

async function fireBack(fromId, toId) {
  if (isTransitioning) return;
  isTransitioning = true;
  closeGate();
  lockScrollHard();
  snapToTop(fromId);

  try {
    const { section: fromSec, card: fromCard } = actData[fromId];
    await animateCardExit(fromCard, 'left');
    fromSec.classList.remove('revealed');
    clearCardExit(fromCard);

    await transitionRun('reverse');

    if (toId === 'fossa') {
      videoLoad(_inactive(), videoConfig.fossa.loop, true);
      await videoCrossFadeTo(_inactive());
      currentAct = 'fossa';
      actData['fossa'].section.classList.remove('revealed');
      videoPreload(videoConfig.transition.bridge, false);
      await animateCardEnter(actData['fossa'].card, () => {
        window.scrollTo({ top: sectionEndY('fossa'), behavior: 'auto' });
      });
      releaseScrollAfter(280);
    } else {
      await sectionArrive(toId);
    }
  } catch (e) {
    recoverFromTransitionError(e, fromId);
  }
}

// ── Fossa: entrada especial (interlúdio com keypress) ───────────────────────
async function fossaInterlude() {
  if (isTransitioning || currentAct !== 'fossa') return;
  isTransitioning = true;
  closeGate();
  if (scrollCue) scrollCue.classList.add('is-hidden');
  document.body.classList.add('is-interlude');
  lockScrollHard();

  try {
    videoLoad(_inactive(), getReturnSrc(), false);
    await videoCrossFadeTo(_inactive());
    await videoWaitForEnd();

    await new Promise(resolve => {
      document.addEventListener('keydown', resolve, { once: true });
    });

    videoLoad(_inactive(), videoConfig.fossa.loop, true);
    await videoCrossFadeTo(_inactive());

    document.body.classList.remove('is-interlude');
    currentAct = 'fossa';
    videoPreload(videoConfig.transition.bridge, false);
    releaseScrollAfter(280);
  } catch (e) {
    document.body.classList.remove('is-interlude');
    recoverFromTransitionError(e, 'fossa');
  }
}

// Interlúdio genérico para as demais seções
async function sectionInterlude(id) {
  if (isTransitioning) return;
  isTransitioning = true;
  closeGate();
  if (scrollCue) scrollCue.classList.add('is-hidden');
  document.body.classList.add('is-interlude');
  lockScrollHard();

  const loopSrc = (videoConfig[id] && videoConfig[id].loop) || videoConfig.garca.loop;
  try {
    videoLoad(_inactive(), getReturnSrc(), false);
    await videoCrossFadeTo(_inactive());
    await videoWaitForEnd();

    videoLoad(_inactive(), loopSrc, true);
    await videoCrossFadeTo(_inactive());

    document.body.classList.remove('is-interlude');
    currentAct = id;
    actData[id].section.classList.add('revealed');
    videoPreload(videoConfig.transition.bridge, false);
    releaseScrollAfter(280);
  } catch (e) {
    document.body.classList.remove('is-interlude');
    recoverFromTransitionError(e, id);
  }
}

// ── Handlers de input ────────────────────────────────────────────────────────
function handleScrollIntent(deltaY, event) {
  if (isTransitioning) { event.preventDefault(); return; }

  const idx   = ACTS.indexOf(currentAct);
  const isLast = idx === ACTS.length - 1;

  if (currentAct === 'fossa') {
    if (isAtEnd('fossa')) {
      snapToEnd('fossa');
      if (deltaY > 0) { event.preventDefault(); addGateProgress('next', Math.min(Math.abs(deltaY), LARGE_STEP)); return; }
      reduceGateProgress(Math.abs(deltaY));
      return;
    }
    if (gateDirection === 'next') closeGate();
    return;
  }

  // Seções do meio e final
  if (isAtEnd(currentAct) && !isLast) {
    snapToEnd(currentAct);
    if (deltaY > 0) { event.preventDefault(); addGateProgress('next', Math.min(Math.abs(deltaY), LARGE_STEP)); return; }
    reduceGateProgress(Math.abs(deltaY));
    return;
  }

  if (isAtTop(currentAct)) {
    snapToTop(currentAct);
    if (deltaY < 0) { event.preventDefault(); addGateProgress('prev', Math.min(Math.abs(deltaY), LARGE_STEP)); return; }
    reduceGateProgress(Math.abs(deltaY));
    return;
  }

  if (gateDirection === 'prev') closeGate();
}

function onWheel(event) { handleScrollIntent(event.deltaY, event); }

function onTouchStart(event) {
  lastTouchY = event.touches?.length ? event.touches[0].clientY : null;
}

function onTouchMove(event) {
  if (lastTouchY === null || !event.touches?.length) return;
  const y     = event.touches[0].clientY;
  const delta = lastTouchY - y;
  lastTouchY  = y;
  if (Math.abs(delta) > 2) handleScrollIntent(delta * 2.2, event);
}

function onKeyDown(event) {
  const fwd  = ['ArrowDown','PageDown','End',' ','Spacebar'];
  const back = ['ArrowUp','PageUp','Home'];
  const step = key => key === 'ArrowDown' || key === 'ArrowUp' ? SMALL_STEP : LARGE_STEP;
  const idx    = ACTS.indexOf(currentAct);
  const isLast = idx === ACTS.length - 1;

  if (isAtEnd(currentAct) && !isLast && fwd.includes(event.key)) {
    event.preventDefault();
    addGateProgress('next', step(event.key));
    return;
  }
  if (currentAct !== 'fossa' && isAtTop(currentAct) && back.includes(event.key)) {
    event.preventDefault();
    addGateProgress('prev', step(event.key));
  }
}

function onScroll() {
  if (isTransitioning) return;

  const idx    = ACTS.indexOf(currentAct);
  const isLast = idx === ACTS.length - 1;
  const end    = sectionEndY(currentAct);
  const top    = sectionTopY(currentAct);

  // Impede scroll além do fim da seção
  if (window.scrollY > end) { window.scrollTo({ top: end, behavior: 'auto' }); }

  // Arma gate "next" quando está no fim (exceto na última seção)
  if (!isLast && isAtEnd(currentAct)) {
    armGate('next');
  } else if (gateDirection === 'next') {
    closeGate();
  }

  // Para seções que não são a fossa: impede scroll acima do topo e arma gate "prev"
  if (currentAct !== 'fossa') {
    if (window.scrollY < top) { window.scrollTo({ top, behavior: 'auto' }); }
    if (isAtTop(currentAct)) {
      if (gateDirection !== 'next') armGate('prev');
    } else if (gateDirection === 'prev') {
      closeGate();
    }
  }
}

// ── Init ─────────────────────────────────────────────────────────────────────
function init() {
  videoLoad(vidA, videoConfig.fossa.loop, true);
  vidA.addEventListener('canplay', () => {
    vidA.currentTime = 0;
    vidA.play().catch(() => {});
    vidA.classList.add('visible');
  }, { once: true });

  videoPreload(videoConfig.transition.bridge, false);
  window.addEventListener('scroll',     onScroll,     { passive: true });
  window.addEventListener('wheel',      onWheel,      _opts);
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove',  onTouchMove,  _opts);
  window.addEventListener('keydown',    onKeyDown,    false);
  window.addEventListener('resize',     onScroll,     { passive: true });

  // Lightbox
  const lightbox      = document.getElementById('image-lightbox');
  const lightboxImg   = document.querySelector('.image-lightbox__img');
  const lightboxClose = document.querySelector('.image-lightbox__close');
  const lightboxScrim = document.querySelector('.image-lightbox__scrim');

  const openLightbox = (src, label) => {
    if (!lightbox || !lightboxImg || !src) return;
    lightboxImg.src = src;
    lightboxImg.alt = label || 'Imagem ampliada';
    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    if (!lightbox || !lightboxImg) return;
    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden', 'true');
    lightboxImg.src = '';
    document.body.style.overflow = '';
  };

  document.querySelectorAll('.png-slot[data-src]').forEach(slot => {
    slot.tabIndex = 0;
    slot.addEventListener('click', () => openLightbox(slot.dataset.src, slot.dataset.label));
    slot.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(slot.dataset.src, slot.dataset.label); }
    });
  });

  lightboxClose?.addEventListener('click', closeLightbox);
  lightboxScrim?.addEventListener('click', closeLightbox);
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && lightbox?.classList.contains('active')) closeLightbox();
  });

  // Botão de canto
  const cornerZone   = document.getElementById('corner-hover-zone');
  const cornerButton = document.getElementById('corner-image-button');

  const cornerLabels = {
    fossa:     'Animação de retorno para Fossa',
    garca:     'Animação de retorno para Garça-moura',
    extra:     'Animação de retorno para seção extra 1',
    'extra-2': 'Animação de retorno para seção extra 2',
    'extra-3': 'Animação de retorno para seção extra 3',
  };

  function updateCornerButton() {
    const show = ACTS.includes(currentAct) && !isTransitioning;
    document.body.classList.toggle('show-corner-button', show);
    if (!cornerButton) return;
    cornerButton.setAttribute('aria-label', cornerLabels[currentAct] || 'Botão de animação de seção');
  }

  if (cornerButton) {
    cornerButton.addEventListener('click', e => {
      e.stopPropagation();
      if (currentAct === 'fossa') fossaInterlude();
      else sectionInterlude(currentAct);
    });

    cornerButton.addEventListener('animationend', e => {
      if (e.animationName === 'corner-fall-out') cornerButton.classList.remove('returning');
    });
  }

  if (cornerZone && cornerButton) {
    cornerZone.addEventListener('mouseenter', () => cornerButton.classList.remove('returning'));
    cornerZone.addEventListener('mouseleave', () => cornerButton.classList.add('returning'));
  }

  window.addEventListener('scroll', updateCornerButton, { passive: true });
  window.addEventListener('resize', updateCornerButton);
  updateCornerButton();
  onScroll();
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', init)
  : init();
