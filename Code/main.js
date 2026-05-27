'use strict';

const videoConfig = {
  fossa:      { loop: '../Midia/Trasi%C3%A7%C3%B5es/BackGound_s/AmbFossa.mp4' },
  transition: {
    bridge: '../Midia/Trasi%C3%A7%C3%B5es/Trasi%C3%A7%C3%A3o%20Gar%C3%A7aMoura.mp4',
    reverseBridge: '../Midia/Trasi%C3%A7%C3%B5es/Trasi%C3%A7%C3%A3o%20Gar%C3%A7aMoura.mp4',
    fossaReturn: '../Midia/Trasi%C3%A7%C3%B5es/Imagens/Apresenta%C3%A7%C3%A3o%20Animal/fossaint.mp4',
    garcaReturn: '../Midia/Trasi%C3%A7%C3%B5es/Imagens/Apresenta%C3%A7%C3%A3o%20Animal/fossaint.mp4',
    extraReturn: '../Midia/Trasi%C3%A7%C3%B5es/Imagens/Apresenta%C3%A7%C3%A3o%20Animal/fossaint.mp4',
    extra2Return: '../Midia/Trasi%C3%A7%C3%B5es/Imagens/Apresenta%C3%A7%C3%A3o%20Animal/fossaint.mp4',
    extra3Return: '../Midia/Trasi%C3%A7%C3%B5es/Imagens/Apresenta%C3%A7%C3%A3o%20Animal/fossaint.mp4',
  },
  garca:      { loop: '../Midia/Trasi%C3%A7%C3%B5es/BackGound_s/Rios%20E%20Nevoas.mp4' },
  extra:      { loop: '../Midia/Trasi%C3%A7%C3%B5es/BackGound_s/Rios%20E%20Nevoas.mp4' },
  'extra-2':  { loop: '../Midia/Trasi%C3%A7%C3%B5es/BackGound_s/Rios%20E%20Nevoas.mp4' },
  'extra-3':  { loop: '../Midia/Trasi%C3%A7%C3%B5es/BackGound_s/Rios%20E%20Nevoas.mp4' },
};

const vidA = document.getElementById('video-A');
const vidB = document.getElementById('video-B');
let _activeIsA = true;

const _active   = () => _activeIsA ? vidA : vidB;
const _inactive = () => _activeIsA ? vidB : vidA;

function videoLoad(el, src, loop = true) {
  const nextSrc = new URL(src, document.baseURI).href;

  el.loop = loop;
  el.playbackRate = 1;
  el.preload = 'auto';

  if (el.src !== nextSrc) {
    el.src = src;
  }

  try { el.load(); } catch (_) {}
}

function waitForEventOrState(el, eventName, isReady) {
  return new Promise(resolve => {
    if (isReady()) {
      resolve();
      return;
    }

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

    if (duration && el.currentTime >= duration - 0.05) {
      resolve();
      return;
    }

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

const BLOCKED_KEYS = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End',' ','Spacebar'];
const noScroll  = e => e.preventDefault();
const noKey     = e => BLOCKED_KEYS.includes(e.key) && e.preventDefault();
const _opts     = { passive: false };
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

const fossaSection = document.getElementById('act-fossa');
const fossaCard    = document.getElementById('fossa-card');
const fossaLastBlk = document.getElementById('fossa-last-block');
const garcaSection = document.getElementById('act-garca');
const garcaCard    = document.getElementById('garca-card');
const extraSection = document.getElementById('act-extra');
const extraCard    = document.getElementById('extra-card');
const extra2Section = document.getElementById('act-extra-2');
const extra2Card    = document.getElementById('extra-card-2');
const extra3Section = document.getElementById('act-extra-3');
const extra3Card    = document.getElementById('extra-card-3');
const scrollCue    = document.getElementById('scroll-cue');
const scrollOrb    = document.getElementById('scroll-orb');

const END_EPSILON = 4;
const ORB_TARGET = 320;
const ORB_TRAVEL = 138;
const SMALL_STEP = 46;
const LARGE_STEP = 116;
const SLIDE_MS = 780;

let currentAct = 'fossa';
let isTransitioning = false;
let gateDirection = null;
let gateProgress = 0;
let lastTouchY = null;

const EXIT_CLASSES = ['is-exiting', 'is-exiting-left'];
const ENTER_CLASS = 'is-entering-from-right';
const EXIT_STYLE_PROPS = ['--exit-top', '--exit-left', '--exit-width', '--exit-height'];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clearCardExit(card) {
  card.classList.remove(...EXIT_CLASSES, ENTER_CLASS);
  EXIT_STYLE_PROPS.forEach(prop => card.style.removeProperty(prop));
}

function prepareCardExit(card) {
  const rect = card.getBoundingClientRect();
  card.style.setProperty('--exit-top', `${rect.top}px`);
  card.style.setProperty('--exit-left', `${rect.left}px`);
  card.style.setProperty('--exit-width', `${rect.width}px`);
  card.style.setProperty('--exit-height', `${rect.height}px`);
  card.classList.add('is-exiting');
  card.getBoundingClientRect();
}

function animateCardExit(card, direction) {
  return new Promise(resolve => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      card.removeEventListener('transitionend', onTransitionEnd);
      resolve();
    };
    const onTransitionEnd = event => {
      if (event.target === card && event.propertyName === 'transform') finish();
    };
    const timer = setTimeout(finish, SLIDE_MS + 180);

    clearCardExit(card);
    prepareCardExit(card);
    card.addEventListener('transitionend', onTransitionEnd);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        card.classList.add(`is-exiting-${direction}`);
      });
    });
  });
}

function animateCardEnter(card, setup) {
  return new Promise(resolve => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      card.removeEventListener('transitionend', onTransitionEnd);
      card.classList.remove(ENTER_CLASS);
      resolve();
    };
    const onTransitionEnd = event => {
      if (event.target === card && event.propertyName === 'transform') finish();
    };
    const timer = setTimeout(finish, SLIDE_MS + 180);

    clearCardExit(card);
    card.classList.add(ENTER_CLASS);
    if (setup) setup();
    card.getBoundingClientRect();
    card.addEventListener('transitionend', onTransitionEnd);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        card.classList.remove(ENTER_CLASS);
      });
    });
  });
}

function fossaEndY() {
  return Math.max(0, fossaSection.offsetTop + fossaCard.offsetHeight - window.innerHeight);
}

function garcaTopY() {
  return garcaSection.offsetTop;
}

function garcaEndY() {
  return Math.max(0, garcaSection.offsetTop + garcaCard.offsetHeight - window.innerHeight);
}

function extraTopY() {
  return extraSection.offsetTop;
}

function extraEndY() {
  return Math.max(0, extraSection.offsetTop + extraCard.offsetHeight - window.innerHeight);
}

function extra2TopY() {
  return extra2Section.offsetTop;
}

function extra2EndY() {
  return Math.max(0, extra2Section.offsetTop + extra2Card.offsetHeight - window.innerHeight);
}

function extra3TopY() {
  return extra3Section.offsetTop;
}

function isAtFossaEnd() {
  return window.scrollY >= fossaEndY() - END_EPSILON;
}

function isAtGarcaEnd() {
  return window.scrollY >= garcaEndY() - END_EPSILON;
}

function isAtExtraEnd() {
  return window.scrollY >= extraEndY() - END_EPSILON;
}

function isAtExtra2End() {
  return window.scrollY >= extra2EndY() - END_EPSILON;
}

function isAtExtraTop() {
  return window.scrollY <= extraTopY() + END_EPSILON;
}

function isAtExtra2Top() {
  return window.scrollY <= extra2TopY() + END_EPSILON;
}

function isAtExtra3Top() {
  return window.scrollY <= extra3TopY() + END_EPSILON;
}

function isAtGarcaTop() {
  return window.scrollY <= garcaTopY() + END_EPSILON;
}

function snapToFossaEnd() {
  const endY = fossaEndY();
  if (window.scrollY > endY) window.scrollTo({ top: endY, behavior: 'auto' });
}

function snapToGarcaTop() {
  const topY = garcaTopY();
  if (window.scrollY < topY) window.scrollTo({ top: topY, behavior: 'auto' });
}

function snapToGarcaEnd() {
  const endY = garcaEndY();
  if (window.scrollY > endY) window.scrollTo({ top: endY, behavior: 'auto' });
}

function snapToExtraTop() {
  const topY = extraTopY();
  if (window.scrollY < topY) window.scrollTo({ top: topY, behavior: 'auto' });
}

function snapToExtraEnd() {
  const endY = extraEndY();
  if (window.scrollY > endY) window.scrollTo({ top: endY, behavior: 'auto' });
}

function snapToExtra2Top() {
  const topY = extra2TopY();
  if (window.scrollY < topY) window.scrollTo({ top: topY, behavior: 'auto' });
}

function snapToExtra2End() {
  const endY = extra2EndY();
  if (window.scrollY > endY) window.scrollTo({ top: endY, behavior: 'auto' });
}

function snapToExtra3Top() {
  const topY = extra3TopY();
  if (window.scrollY < topY) window.scrollTo({ top: topY, behavior: 'auto' });
}

function armGate(direction) {
  if (gateDirection !== direction) gateProgress = 0;
  gateDirection = direction;
  updateOrb();
}

function closeGate() {
  gateDirection = null;
  gateProgress = 0;
  updateOrb();
}

function updateOrb() {
  if (!scrollOrb) return;

  const ratio = clamp(gateProgress / ORB_TARGET, 0, 1);
  const orbTravel = gateDirection === 'prev' ? ORB_TRAVEL : -ORB_TRAVEL;
  scrollOrb.style.setProperty('--orb-y', `${Math.round(ratio * orbTravel)}px`);
  scrollOrb.style.setProperty('--orb-scale', `${1 + ratio * 0.28}`);
  scrollOrb.classList.toggle('is-visible', Boolean(gateDirection));
  scrollOrb.classList.toggle('is-back', gateDirection === 'prev');
  scrollOrb.classList.toggle('is-ready', ratio >= 1);

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

  currentAct = act;
  isTransitioning = false;
  if (act === 'fossa') {
    clearCardExit(fossaCard);
  }
  if (act === 'garca') {
    clearCardExit(garcaCard);
  }
  if (act === 'extra') {
    clearCardExit(extraCard);
  }
  if (act === 'extra-2') {
    clearCardExit(extra2Card);
  }
  if (act === 'extra-3') {
    clearCardExit(extra3Card);
  }
  garcaSection.classList.toggle('revealed', act === 'garca');
  extraSection.classList.toggle('revealed', act === 'extra');
  extra2Section.classList.toggle('revealed', act === 'extra-2');
  extra3Section.classList.toggle('revealed', act === 'extra-3');
  unlockScrollHard();
  closeGate();
  onScroll();
}

function addGateProgress(direction, amount) {
  if (isTransitioning) return;

  armGate(direction);
  gateProgress = clamp(gateProgress + amount, 0, ORB_TARGET);
  updateOrb();

  if (gateProgress >= ORB_TARGET) {
    if (direction === 'next') {
      if (currentAct === 'fossa') {
        fossaFireExit();
      } else if (currentAct === 'garca') {
        garcaFireExit();
      } else if (currentAct === 'extra') {
        extraFireExit();
      } else if (currentAct === 'extra-2') {
        extra2FireExit();
      }
    } else {
      if (currentAct === 'garca') {
        garcaFireBack();
      } else if (currentAct === 'extra') {
        extraFireBack();
      } else if (currentAct === 'extra-2') {
        extra2FireBack();
      } else if (currentAct === 'extra-3') {
        extra3FireBack();
      }
    }
  }
}

function reduceGateProgress(amount) {
  if (!gateDirection) return;

  gateProgress = clamp(gateProgress - amount, 0, ORB_TARGET);
  if (gateProgress <= 0) {
    closeGate();
    return;
  }

  updateOrb();
}

function handleScrollIntent(deltaY, event) {
  if (isTransitioning) {
    event.preventDefault();
    return;
  }

  if (currentAct === 'fossa') {
    if (isAtFossaEnd()) {
      snapToFossaEnd();

      if (deltaY > 0) {
        event.preventDefault();
        addGateProgress('next', Math.min(Math.abs(deltaY), LARGE_STEP));
        return;
      }

      reduceGateProgress(Math.abs(deltaY));
      return;
    }

    if (gateDirection === 'next') closeGate();
    return;
  }

  if (currentAct === 'garca') {
    if (isAtGarcaEnd()) {
      snapToGarcaEnd();

      if (deltaY > 0) {
        event.preventDefault();
        addGateProgress('next', Math.min(Math.abs(deltaY), LARGE_STEP));
        return;
      }

      reduceGateProgress(Math.abs(deltaY));
      return;
    }

    if (isAtGarcaTop()) {
      snapToGarcaTop();

      if (deltaY < 0) {
        event.preventDefault();
        addGateProgress('prev', Math.min(Math.abs(deltaY), LARGE_STEP));
        return;
      }

      reduceGateProgress(Math.abs(deltaY));
      return;
    }

    if (gateDirection === 'prev') closeGate();
  }

  if (currentAct === 'extra') {
    if (isAtExtraEnd()) {
      snapToExtraEnd();

      if (deltaY > 0) {
        event.preventDefault();
        addGateProgress('next', Math.min(Math.abs(deltaY), LARGE_STEP));
        return;
      }

      reduceGateProgress(Math.abs(deltaY));
      return;
    }

    if (isAtExtraTop()) {
      snapToExtraTop();

      if (deltaY < 0) {
        event.preventDefault();
        addGateProgress('prev', Math.min(Math.abs(deltaY), LARGE_STEP));
        return;
      }

      reduceGateProgress(Math.abs(deltaY));
      return;
    }

    if (gateDirection === 'prev') closeGate();
  }

  if (currentAct === 'extra-2') {
    if (isAtExtra2End()) {
      snapToExtra2End();

      if (deltaY > 0) {
        event.preventDefault();
        addGateProgress('next', Math.min(Math.abs(deltaY), LARGE_STEP));
        return;
      }

      reduceGateProgress(Math.abs(deltaY));
      return;
    }

    if (isAtExtra2Top()) {
      snapToExtra2Top();

      if (deltaY < 0) {
        event.preventDefault();
        addGateProgress('prev', Math.min(Math.abs(deltaY), LARGE_STEP));
        return;
      }

      reduceGateProgress(Math.abs(deltaY));
      return;
    }

    if (gateDirection === 'prev') closeGate();
  }

  if (currentAct === 'extra-3') {
    if (isAtExtra3Top()) {
      snapToExtra3Top();

      if (deltaY < 0) {
        event.preventDefault();
        addGateProgress('prev', Math.min(Math.abs(deltaY), LARGE_STEP));
        return;
      }

      reduceGateProgress(Math.abs(deltaY));
      return;
    }

    if (gateDirection === 'prev') closeGate();
  }
}

function onWheel(event) {
  handleScrollIntent(event.deltaY, event);
}

function onTouchStart(event) {
  lastTouchY = event.touches && event.touches.length ? event.touches[0].clientY : null;
}

function onTouchMove(event) {
  if (lastTouchY === null || !event.touches || !event.touches.length) return;

  const currentY = event.touches[0].clientY;
  const deltaY = lastTouchY - currentY;
  lastTouchY = currentY;

  if (Math.abs(deltaY) > 2) handleScrollIntent(deltaY * 2.2, event);
}

function onKeyDown(event) {
  const forwardKeys = ['ArrowDown','PageDown','End',' ','Spacebar'];
  const backKeys = ['ArrowUp','PageUp','Home'];

  if (currentAct === 'fossa' && isAtFossaEnd() && forwardKeys.includes(event.key)) {
    event.preventDefault();
    addGateProgress('next', event.key === 'ArrowDown' ? SMALL_STEP : LARGE_STEP);
    return;
  }

  if (currentAct === 'garca' && isAtGarcaTop() && backKeys.includes(event.key)) {
    event.preventDefault();
    addGateProgress('prev', event.key === 'ArrowUp' ? SMALL_STEP : LARGE_STEP);
    return;
  }

  if (currentAct === 'extra' && isAtExtraTop() && backKeys.includes(event.key)) {
    event.preventDefault();
    addGateProgress('prev', event.key === 'ArrowUp' ? SMALL_STEP : LARGE_STEP);
    return;
  }

  if (currentAct === 'extra-2' && isAtExtra2Top() && backKeys.includes(event.key)) {
    event.preventDefault();
    addGateProgress('prev', event.key === 'ArrowUp' ? SMALL_STEP : LARGE_STEP);
    return;
  }

  if (currentAct === 'extra-3' && isAtExtra3Top() && backKeys.includes(event.key)) {
    event.preventDefault();
    addGateProgress('prev', event.key === 'ArrowUp' ? SMALL_STEP : LARGE_STEP);
  }
}

function onScroll() {
  if (isTransitioning) return;

  if (currentAct === 'fossa') {
    const endY = fossaEndY();
    if (window.scrollY > endY) {
      window.scrollTo({ top: endY, behavior: 'auto' });
      armGate('next');
      return;
    }

    if (isAtFossaEnd()) {
      armGate('next');
    } else if (gateDirection === 'next') {
      closeGate();
    }

    return;
  }

  if (currentAct === 'garca') {
    const topY = garcaTopY();
    if (window.scrollY < topY) {
      window.scrollTo({ top: topY, behavior: 'auto' });
      return;
    }

    if (window.scrollY > topY + END_EPSILON && gateDirection === 'prev') closeGate();
    return;
  }

  if (currentAct === 'extra') {
    const topY = extraTopY();
    if (window.scrollY < topY) {
      window.scrollTo({ top: topY, behavior: 'auto' });
      return;
    }

    if (window.scrollY > topY + END_EPSILON && gateDirection === 'prev') closeGate();
    return;
  }

  if (currentAct === 'extra-2') {
    const topY = extra2TopY();
    if (window.scrollY < topY) {
      window.scrollTo({ top: topY, behavior: 'auto' });
      return;
    }

    if (window.scrollY > topY + END_EPSILON && gateDirection === 'prev') closeGate();
    return;
  }

  if (currentAct === 'extra-3') {
    const topY = extra3TopY();
    if (window.scrollY < topY) {
      window.scrollTo({ top: topY, behavior: 'auto' });
      return;
    }

    if (window.scrollY > topY + END_EPSILON && gateDirection === 'prev') closeGate();
  }
}

async function transitionRunForward() {
  videoLoad(_inactive(), videoConfig.transition.bridge, false);
  await videoCrossFadeTo(_inactive());
  await videoWaitForEnd();
}

async function transitionRunReverse() {
  videoLoad(_inactive(), videoConfig.transition.reverseBridge, false);
  await videoCrossFadeTo(_inactive());
  await videoWaitForEnd();
}

async function fossaFireExit() {
  if (isTransitioning) return;
  isTransitioning = true;
  closeGate();
  if (scrollCue) scrollCue.classList.add('is-hidden');
  lockScrollHard();
  snapToFossaEnd();

  try {
    await animateCardExit(fossaCard, 'left');

    await transitionRunForward();
    await garcaArrive();
  } catch (error) {
    recoverFromTransitionError(error, 'fossa');
  }
}

async function garcaArrive() {
  videoLoad(_inactive(), videoConfig.garca.loop, true);
  await videoCrossFadeTo(_inactive());

  currentAct = 'garca';
  videoPreload(videoConfig.transition.reverseBridge, false);
  await animateCardEnter(garcaCard, () => {
    garcaSection.scrollIntoView({ behavior: 'auto' });
    garcaSection.classList.add('revealed');
  });

  releaseScrollAfter(280);
}

async function garcaFireExit() {
  if (isTransitioning) return;
  isTransitioning = true;
  closeGate();
  lockScrollHard();
  snapToGarcaEnd();

  try {
    await animateCardExit(garcaCard, 'left');

    garcaSection.classList.remove('revealed');
    clearCardExit(garcaCard);

    await transitionRunForward();
    await extraArrive();
  } catch (error) {
    recoverFromTransitionError(error, 'garca');
  }
}

async function extraArrive() {
  videoLoad(_inactive(), videoConfig.garca.loop, true);
  await videoCrossFadeTo(_inactive());

  currentAct = 'extra';
  videoPreload(videoConfig.transition.reverseBridge, false);
  await animateCardEnter(extraCard, () => {
    extraSection.scrollIntoView({ behavior: 'auto' });
    extraSection.classList.add('revealed');
  });

  releaseScrollAfter(280);
}

async function extraFireBack() {
  if (isTransitioning) return;
  isTransitioning = true;
  closeGate();
  lockScrollHard();
  snapToExtraTop();

  try {
    await animateCardExit(extraCard, 'left');

    extraSection.classList.remove('revealed');
    clearCardExit(extraCard);

    await transitionRunReverse();
    await garcaArrive();
  } catch (error) {
    recoverFromTransitionError(error, 'extra');
  }
}

async function extraFireExit() {
  if (isTransitioning) return;
  isTransitioning = true;
  closeGate();
  lockScrollHard();
  snapToExtraEnd();

  try {
    await animateCardExit(extraCard, 'left');

    extraSection.classList.remove('revealed');
    clearCardExit(extraCard);

    await transitionRunForward();
    await extra2Arrive();
  } catch (error) {
    recoverFromTransitionError(error, 'extra');
  }
}

async function extra2Arrive() {
  videoLoad(_inactive(), videoConfig.garca.loop, true);
  await videoCrossFadeTo(_inactive());

  currentAct = 'extra-2';
  videoPreload(videoConfig.transition.reverseBridge, false);
  await animateCardEnter(extra2Card, () => {
    extra2Section.scrollIntoView({ behavior: 'auto' });
    extra2Section.classList.add('revealed');
  });

  releaseScrollAfter(280);
}

async function extra2FireBack() {
  if (isTransitioning) return;
  isTransitioning = true;
  closeGate();
  lockScrollHard();
  snapToExtra2Top();

  try {
    await animateCardExit(extra2Card, 'left');

    extra2Section.classList.remove('revealed');
    clearCardExit(extra2Card);

    await transitionRunReverse();
    await extraArrive();
  } catch (error) {
    recoverFromTransitionError(error, 'extra-2');
  }
}

async function extra2FireExit() {
  if (isTransitioning) return;
  isTransitioning = true;
  closeGate();
  lockScrollHard();
  snapToExtra2End();

  try {
    await animateCardExit(extra2Card, 'left');

    extra2Section.classList.remove('revealed');
    clearCardExit(extra2Card);

    await transitionRunForward();
    await extra3Arrive();
  } catch (error) {
    recoverFromTransitionError(error, 'extra-2');
  }
}

async function extra3Arrive() {
  videoLoad(_inactive(), videoConfig.garca.loop, true);
  await videoCrossFadeTo(_inactive());

  currentAct = 'extra-3';
  videoPreload(videoConfig.transition.reverseBridge, false);
  await animateCardEnter(extra3Card, () => {
    extra3Section.scrollIntoView({ behavior: 'auto' });
    extra3Section.classList.add('revealed');
  });

  releaseScrollAfter(280);
}

async function extra3FireBack() {
  if (isTransitioning) return;
  isTransitioning = true;
  closeGate();
  lockScrollHard();
  snapToExtra3Top();

  try {
    await animateCardExit(extra3Card, 'left');

    extra3Section.classList.remove('revealed');
    clearCardExit(extra3Card);

    await transitionRunReverse();
    await extra2Arrive();
  } catch (error) {
    recoverFromTransitionError(error, 'extra-3');
  }
}

async function garcaFireBack() {
  if (isTransitioning) return;
  isTransitioning = true;
  closeGate();
  lockScrollHard();
  snapToGarcaTop();

  try {
    await animateCardExit(garcaCard, 'left');

    await transitionRunReverse();

    videoLoad(_inactive(), videoConfig.fossa.loop, true);
    await videoCrossFadeTo(_inactive());

    currentAct = 'fossa';
    garcaSection.classList.remove('revealed');
    clearCardExit(garcaCard);
    videoPreload(videoConfig.transition.bridge, false);
    await animateCardEnter(fossaCard, () => {
      window.scrollTo({ top: fossaEndY(), behavior: 'auto' });
    });

    releaseScrollAfter(280);
  } catch (error) {
    recoverFromTransitionError(error, 'garca');
  }
}

async function fossaInterlude() {
  if (isTransitioning || currentAct !== 'fossa') return;
  isTransitioning = true;
  closeGate();
  
  if (scrollCue) scrollCue.classList.add('is-hidden');
  
  // Adiciona classe ao body para esconder o card lateral e o botão de canto
  document.body.classList.add('is-interlude');
  lockScrollHard();

  try {
    // 1. Toca o vídeo especial (transição de entrada)
    videoLoad(_inactive(), videoConfig.transition.fossaReturn, false);
    await videoCrossFadeTo(_inactive());
    await videoWaitForEnd();

    // 2. Espera o usuário pressionar uma tecla (Interação)
    await new Promise(resolve => {
      const handleKeyDown = () => {
        document.removeEventListener('keydown', handleKeyDown);
        resolve();
      };
      document.addEventListener('keydown', handleKeyDown, { once: true });
    });

    // 3. Retorna para o loop da fossa
    videoLoad(_inactive(), videoConfig.fossa.loop, true);
    await videoCrossFadeTo(_inactive());

    // 4. Remove a classe para o card lateral voltar suavemente
    document.body.classList.remove('is-interlude');
    
    currentAct = 'fossa';
    videoPreload(videoConfig.transition.bridge, false);

    releaseScrollAfter(280);
  } catch (error) {
    document.body.classList.remove('is-interlude');
    recoverFromTransitionError(error, 'fossa');
  }
}

async function sectionInterlude(section, sectionElement) {
  if (isTransitioning) return;
  isTransitioning = true;
  closeGate();
  if (scrollCue) scrollCue.classList.add('is-hidden');
  document.body.classList.add('is-interlude');
  lockScrollHard();

  const sectionKey = section.replace(/-/g, '');
  const returnSource = videoConfig.transition[`${sectionKey}Return`] || videoConfig.transition.fossaReturn;
  const loopSource = (videoConfig[section] && videoConfig[section].loop) ? videoConfig[section].loop : videoConfig.garca.loop;

  try {
    videoLoad(_inactive(), returnSource, false);
    await videoCrossFadeTo(_inactive());
    await videoWaitForEnd();

    videoLoad(_inactive(), loopSource, true);
    await videoCrossFadeTo(_inactive());

    document.body.classList.remove('is-interlude');
    currentAct = section;
    if (sectionElement) sectionElement.classList.add('revealed');
    videoPreload(videoConfig.transition.bridge, false);
    releaseScrollAfter(280);
  } catch (error) {
    document.body.classList.remove('is-interlude');
    recoverFromTransitionError(error, section);
  }
}

function init() {
  videoLoad(vidA, videoConfig.fossa.loop, true);
  vidA.addEventListener('canplay', () => {
    vidA.currentTime = 0;
    vidA.play().catch(() => {});
    vidA.classList.add('visible');
  }, { once: true });

  videoPreload(videoConfig.transition.bridge, false);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('wheel', onWheel, _opts);
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, _opts);
  window.addEventListener('keydown', onKeyDown, false);
  window.addEventListener('resize', onScroll, { passive: true });

  const lightbox = document.getElementById('image-lightbox');
  const lightboxImg = document.querySelector('.image-lightbox__img');
  const lightboxClose = document.querySelector('.image-lightbox__close');
  const lightboxScrim = document.querySelector('.image-lightbox__scrim');
  const cornerZone = document.getElementById('corner-hover-zone');
  const cornerButton = document.getElementById('corner-image-button');

  // controla quando o botão do canto deve estar disponível
  function updateCornerButton() {
    const show = ['fossa', 'garca', 'extra', 'extra-2', 'extra-3'].includes(currentAct) && !isTransitioning;
    document.body.classList.toggle('show-corner-button', show);
    if (!cornerButton) return;

    const labels = {
      fossa: 'Animação de retorno para Fossa',
      garca: 'Animação de retorno para Garça-moura',
      extra: 'Animação de retorno para seção extra 1',
      'extra-2': 'Animação de retorno para seção extra 2',
      'extra-3': 'Animação de retorno para seção extra 3',
    };
    cornerButton.setAttribute('aria-label', labels[currentAct] || 'Botão de animação de seção');
  }

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

  const pngSlots = document.querySelectorAll('.png-slot[data-src]');
  pngSlots.forEach(slot => {
    slot.tabIndex = 0;
    slot.addEventListener('click', () => {
      openLightbox(slot.dataset.src, slot.dataset.label);
    });
    slot.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openLightbox(slot.dataset.src, slot.dataset.label);
      }
    });
  });

  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }

  if (lightboxScrim) {
    lightboxScrim.addEventListener('click', closeLightbox);
  }

  // botão de canto dispara animação interlúdio para a seção atual
  if (cornerButton) {
    cornerButton.addEventListener('click', event => {
      event.stopPropagation();
      switch (currentAct) {
        case 'fossa':
          fossaInterlude();
          break;
        case 'garca':
          sectionInterlude('garca', garcaSection);
          break;
        case 'extra':
          sectionInterlude('extra', extraSection);
          break;
        case 'extra-2':
          sectionInterlude('extra-2', extra2Section);
          break;
        case 'extra-3':
          sectionInterlude('extra-3', extra3Section);
          break;
      }
    });

    cornerButton.addEventListener('animationend', event => {
      if (event.animationName === 'corner-fall-out') {
        cornerButton.classList.remove('returning');
      }
    });
  }

  if (cornerZone && cornerButton) {
    cornerZone.addEventListener('mouseenter', () => {
      cornerButton.classList.remove('returning');
    });

    cornerZone.addEventListener('mouseleave', () => {
      cornerButton.classList.add('returning');
    });
  }

  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && lightbox && lightbox.classList.contains('active')) {
      closeLightbox();
    }
  });

  // atualizar visibilidade do botão em eventos relevantes
  window.addEventListener('scroll', updateCornerButton, { passive: true });
  window.addEventListener('resize', updateCornerButton);

  updateCornerButton();

  onScroll();
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', init)
  : init();
