/**
 * main.js — Animais • Transição Visual
 *
 * MÁQUINA DE ESTADOS:
 *   STATE_1_FOSSA       → loop da Fossa, scroll habilitado
 *   STATE_2_TRANSITION  → coluna sai, vídeo-ponte toca, scroll bloqueado
 *   STATE_3_GARCA       → loop da Garça, coluna volta, scroll habilitado
 *
 * Double-buffer de vídeo:
 *   video-A e video-B alternam sem tela preta.
 *   O slot "ativo" é o que está visível. O slot "inativo" é usado para
 *   pré-carregamento silencioso e, em seguida, cross-fade.
 */

'use strict';

// ═══════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════════

const VIDEO = {
  fossa:      { src: '../VDalt/FossaFlorest.mp4',       loop: true  },
  transition: { src: '../Videos/transition-bridge.mp4', loop: false },
  garca:      { src: '../Videos/Rios e Nevoas.mp4',     loop: true  },
};

// Fallback: se o vídeo de transição não disparar 'ended' em X ms, avança.
const TRANSITION_FALLBACK_MS = 4000;

// Debounce antes de disparar a saída (evita triggers acidentais).
const SCROLL_HOLD_MS = 300;


// ═══════════════════════════════════════════════════════════════════
// ESTADOS
// ═══════════════════════════════════════════════════════════════════

const STATES = {
  FOSSA:      'STATE_1_FOSSA',
  TRANSITION: 'STATE_2_TRANSITION',
  GARCA:      'STATE_3_GARCA',
};

let currentState = null;

function setState(next) {
  console.log(`[STATE] ${currentState ?? 'INIT'} → ${next}`);
  currentState = next;
}


// ═══════════════════════════════════════════════════════════════════
// VIDEO ENGINE — double-buffer
// ═══════════════════════════════════════════════════════════════════

const vidA = document.getElementById('video-A');
const vidB = document.getElementById('video-B');
let _activeIsA = true;

const activeVideo   = () => (_activeIsA ? vidA : vidB);
const inactiveVideo = () => (_activeIsA ? vidB : vidA);

/**
 * Carrega src + loop no elemento sem exibi-lo.
 */
function videoLoad(el, src, loop) {
  console.log(`[VIDEO] Carregando: ${src} (loop=${loop}) → slot ${el.id}`);
  el.src     = src;
  el.loop    = loop;
  el.preload = 'auto';
  try { el.load(); } catch (_) {}
}

/**
 * Cross-fade para `el`. O `el` deve já ter sido carregado via videoLoad.
 * Retorna uma Promise que resolve quando o vídeo começa a tocar.
 */
function videoCrossFadeTo(el) {
  return new Promise((resolve) => {
    const prev = activeVideo(); // snapshot ANTES de alterar _activeIsA

    const start = () => {
      console.log(`[VIDEO] Cross-fade → ${el.id} (readyState=${el.readyState})`);
      el.currentTime = 0;
      el.play().catch((err) => console.warn('[VIDEO] play() bloqueado:', err));
      el.classList.add('visible');
      prev.classList.remove('visible');
      _activeIsA = (el === vidA);
      resolve();
    };

    if (el.readyState >= 3) { // HAVE_FUTURE_DATA ou melhor
      start();
    } else {
      console.log(`[VIDEO] Aguardando canplay em ${el.id}…`);
      el.addEventListener('canplay', start, { once: true });
    }
  });
}

/**
 * Resolve quando o vídeo ativo dispara 'ended'.
 * Inclui fallback de segurança para caso o evento não dispare.
 */
function videoWaitForEnd(fallbackMs = TRANSITION_FALLBACK_MS) {
  return new Promise((resolve) => {
    let resolved = false;

    const done = (reason) => {
      if (resolved) return;
      resolved = true;
      console.log(`[VIDEO] Fim detectado via: ${reason}`);
      resolve();
    };

    activeVideo().addEventListener('ended', () => done('ended'), { once: true });

    const timer = setTimeout(() => done(`fallback ${fallbackMs}ms`), fallbackMs);

    // Limpa o timer se o evento 'ended' disparar primeiro
    activeVideo().addEventListener('ended', () => clearTimeout(timer), { once: true });
  });
}

/**
 * Pré-carrega src no slot inativo sem exibi-lo.
 */
function videoPrefetch(src, loop) {
  console.log(`[VIDEO] Pré-carregando: ${src}`);
  videoLoad(inactiveVideo(), src, loop);
}


// ═══════════════════════════════════════════════════════════════════
// ELEMENTOS DO DOM
// ═══════════════════════════════════════════════════════════════════

const leftCol   = document.getElementById('left-col');
const sentinel  = document.getElementById('scroll-sentinel');
const scrollCue = document.getElementById('scroll-cue-text');


// ═══════════════════════════════════════════════════════════════════
// ESTADO 1 — FOSSA
// ═══════════════════════════════════════════════════════════════════

function enterFossa() {
  setState(STATES.FOSSA);
  console.log('[FOSSA] Iniciando loop da Fossa…');

  // Carrega e inicia o vídeo A (slot ativo)
  videoLoad(vidA, VIDEO.fossa.src, VIDEO.fossa.loop);
  vidA.addEventListener('canplay', () => {
    console.log('[FOSSA] Vídeo pronto — iniciando playback');
    vidA.currentTime = 0;
    vidA.play().catch((e) => console.warn('[FOSSA] play() bloqueado:', e));
    vidA.classList.add('visible');
  }, { once: true });

  // Pré-carrega a transição no slot B (silencioso)
  videoPrefetch(VIDEO.transition.src, VIDEO.transition.loop);

  // Monitora o fim da coluna via IntersectionObserver
  _watchScrollEnd();
}

let _holdTimer    = null;
let _exitFired    = false;
let _observer     = null;

function _watchScrollEnd() {
  if (!sentinel) {
    console.warn('[FOSSA] #scroll-sentinel não encontrado — usando fallback scroll event');
    leftCol.addEventListener('scroll', _onScrollFallback, { passive: true });
    return;
  }

  console.log('[FOSSA] IntersectionObserver configurado no sentinel');

  _observer = new IntersectionObserver(
    (entries) => {
      const visible = entries[0].isIntersecting;

      if (visible) {
        // Sentinel visível → usuário chegou ao fim
        if (!_holdTimer) {
          console.log(`[FOSSA] Sentinel visível — aguardando ${SCROLL_HOLD_MS}ms…`);
          _holdTimer = setTimeout(() => _fireExit(), SCROLL_HOLD_MS);
        }
      } else {
        // Saiu da vista → cancela o timer
        if (_holdTimer) {
          console.log('[FOSSA] Sentinel saiu — cancelando hold timer');
          clearTimeout(_holdTimer);
          _holdTimer = null;
        }
      }
    },
    {
      root: leftCol,       // observa dentro da coluna
      threshold: 0.5,      // metade do sentinel visível já basta
    }
  );

  _observer.observe(sentinel);
}

// Fallback caso o IntersectionObserver não esteja disponível
function _onScrollFallback() {
  if (_exitFired) return;
  const atBottom = (leftCol.scrollTop + leftCol.clientHeight) >= (leftCol.scrollHeight - 8);
  if (atBottom) {
    if (!_holdTimer) _holdTimer = setTimeout(() => _fireExit(), SCROLL_HOLD_MS);
  } else {
    clearTimeout(_holdTimer);
    _holdTimer = null;
  }
}

function _fireExit() {
  if (_exitFired) return;
  _exitFired = true;

  console.log('[FOSSA] Fim de scroll confirmado — disparando saída');

  // Para de observar
  if (_observer) { _observer.disconnect(); _observer = null; }
  leftCol.removeEventListener('scroll', _onScrollFallback);

  enterTransition();
}


// ═══════════════════════════════════════════════════════════════════
// ESTADO 2 — TRANSIÇÃO
// ═══════════════════════════════════════════════════════════════════

async function enterTransition() {
  setState(STATES.TRANSITION);
  console.log('[TRANSITION] Bloqueando scroll…');

  // 1. Bloqueia scroll
  document.documentElement.style.overflow = 'hidden';
  leftCol.style.overflow = 'hidden';

  // 2. Esconde dica de scroll
  if (scrollCue) {
    scrollCue.style.opacity = '0';
    scrollCue.style.pointerEvents = 'none';
  }

  // 3. Anima saída da coluna
  console.log('[TRANSITION] Animando saída da coluna esquerda…');
  leftCol.classList.add('state-exiting');

  // 4. Aguarda a transição CSS terminar antes de trocar o vídeo
  await _waitForTransition(leftCol);
  console.log('[TRANSITION] Coluna saiu — iniciando cross-fade para vídeo de transição');

  // 5. O slot inativo (B) já tem o vídeo de transição pré-carregado
  //    Se não estiver pronto, videoLoad garante
  const transSlot = inactiveVideo();
  if (!transSlot.src || !transSlot.src.includes('transition')) {
    console.log('[TRANSITION] Re-carregando vídeo de transição (não estava no slot)');
    videoLoad(transSlot, VIDEO.transition.src, VIDEO.transition.loop);
  }

  await videoCrossFadeTo(transSlot);
  console.log('[TRANSITION] Vídeo de transição tocando — aguardando fim…');

  // 6. Aguarda o fim (com fallback automático)
  await videoWaitForEnd(TRANSITION_FALLBACK_MS);
  console.log('[TRANSITION] Vídeo de transição terminado — avançando para Garça');

  enterGarca();
}

/**
 * Aguarda o evento transitionend em `el`.
 * Timeout de segurança: duration CSS + 200ms de margem.
 */
function _waitForTransition(el, timeoutMs = 1100) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    el.addEventListener('transitionend', finish, { once: true });
    setTimeout(finish, timeoutMs);
  });
}


// ═══════════════════════════════════════════════════════════════════
// ESTADO 3 — GARÇA
// ═══════════════════════════════════════════════════════════════════

async function enterGarca() {
  setState(STATES.GARCA);
  console.log('[GARCA] Carregando loop da Garça…');

  // 1. Carrega loop da Garça no slot agora-inativo e cross-fada
  const garcaSlot = inactiveVideo();
  videoLoad(garcaSlot, VIDEO.garca.src, VIDEO.garca.loop);
  await videoCrossFadeTo(garcaSlot);
  console.log('[GARCA] Loop da Garça ativo');

  // 2. Injeta conteúdo da Garça na coluna
  console.log('[GARCA] Injetando conteúdo na coluna…');
  leftCol.innerHTML = _garcaHTML();
  leftCol.scrollTop = 0;

  // 3. Traz a coluna de volta (remove a classe que aplicou translateX(-100%))
  console.log('[GARCA] Animando entrada da coluna…');
  leftCol.classList.remove('state-exiting');

  // Dois rAF garantem que o browser processa o DOM e a remoção da classe
  // antes de iniciar a animação CSS reversa.
  await _nextFrame();
  await _nextFrame();

  // 4. Revela o conteúdo com fade-in após a coluna entrar
  const section = leftCol.querySelector('#part-garca');

  // Aguarda a coluna chegar antes de fazer o fade
  await _waitForTransition(leftCol, 1000);
  console.log('[GARCA] Coluna retornou — revelando conteúdo');

  if (section) section.classList.add('visible');

  // 5. Desbloqueia scroll
  leftCol.style.overflow = '';
  document.documentElement.style.overflow = '';
  console.log('[GARCA] Scroll desbloqueado — Estado 3 completo ✓');
}

/** Retorna Promise que resolve no próximo frame de animação. */
function _nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function _garcaHTML() {
  return `
    <section id="part-garca">
      <header class="hero">
        <p class="eyebrow">Pantanal · Ardeidae</p>
        <h1 class="headline">GARÇA-MOURA</h1>
        <p class="lead">A Garça-moura é majestosa em sua elegância sutil. Com plumagem azul-escura e movimentos precisos, ela navega pelos rios e lagoas com a graça de uma dançarina.</p>
      </header>

      <div class="section">
        <h2>Presença e Significado</h2>
        <p>Este pássaro legendário é guardião das paisagens aquáticas, uma presença que traz serenidade e poder simultâneos.</p>
        <p>A Garça-moura é o símbolo de tranquilidade dinâmica — o equilíbrio perfeito entre movimento e repouso.</p>
      </div>

      <div class="section">
        <h2>Habitat</h2>
        <p>Distribui-se pelos grandes rios e lagoas do Pantanal, Amazônia e litoral atlântico, sempre próxima à água onde a oferta de peixes é abundante.</p>
        <p>Prefere rios de curso lento, alagados e lagos rasos, onde aguarda imóvel antes de atacar com precisão cirúrgica.</p>
      </div>

      <div class="section">
        <h2>Comportamento</h2>
        <p>Solitária fora do período reprodutivo, a Garça-moura pode permanecer imóvel por longos períodos, fundindo-se com a paisagem enquanto aguarda a presa perfeita.</p>
        <p>Seu voo é silencioso e hipnótico — asas largas, pescoço recolhido, uma silhueta que parece desafiar o peso do mundo.</p>
      </div>
    </section>
  `;
}


// ═══════════════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════════════

console.log('[BOOT] Inicializando Animais • Transição Visual');

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', enterFossa);
} else {
  enterFossa();
}
