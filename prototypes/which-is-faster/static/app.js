// Verified Scientific Question Bank passed from backend or fallback to static data
const RAW_BANK = JSON.parse(document.getElementById('data').textContent);

// Category Colors & Badges
const CATEGORY_STYLES = {
  biology: { bg: 'bg-emerald-100', text: 'text-emerald-900', label: '🌿 BIOLOGY' },
  human_body: { bg: 'bg-rose-100', text: 'text-rose-900', label: '🫀 HUMAN' },
  physics: { bg: 'bg-cyan-100', text: 'text-cyan-900', label: '⚡ PHYSICS' },
  cosmos: { bg: 'bg-indigo-100', text: 'text-indigo-900', label: '🌌 COSMOS' },
  speed_records: { bg: 'bg-amber-100', text: 'text-amber-900', label: '🏆 RECORDS' },
  nature: { bg: 'bg-teal-100', text: 'text-teal-900', label: '🌊 NATURE' },
  everyday_life: { bg: 'bg-purple-100', text: 'text-purple-900', label: '🎬 EVERYDAY' }
};

// Game State
let state = {
  streak: 0,
  bestStreak: parseInt(localStorage.getItem('which_is_faster_best') || '0', 10),
  round: 1,
  reignCount: 0,
  tier: 1,
  cardA: null, // Champion or Contender 1
  cardB: null, // Challenger or Contender 2
  hasAnswered: false,
  fasterCardKey: null, // 'a' or 'b'
  unlockedIds: new Set(JSON.parse(localStorage.getItem('which_is_faster_unlocked') || '[]')),
  seenInRun: new Set(),
  journalCategory: 'all'
};

// Initialize Game
function initGame() {
  document.getElementById('stat-best').innerText = state.bestStreak;
  setupRound(true);
  renderJournal();
  setupKeyboardListeners();
}

// Select matching pair based on difficulty tier
function selectPair(keepSurvivor = false) {
  const currentTier = getTierForStreak(state.streak);
  state.tier = currentTier;
  updateTierBadge(currentTier);

  let champion = null;
  let challenger = null;

  if (keepSurvivor && state.cardA) {
    champion = state.cardA;
  } else {
    // Pick initial champion
    const pool = RAW_BANK.filter(item => item.tier <= Math.max(2, currentTier));
    champion = pool[Math.floor(Math.random() * pool.length)];
  }

  // Pick suitable challenger with deliberate contrast based on current tier
  const remainingPool = RAW_BANK.filter(item => item.id !== champion.id && !state.seenInRun.has(item.id));
  let candidatePool = remainingPool;

  if (currentTier === 1) {
    // Warmup: Look for items with significant duration ratio (> 5x or < 0.2x)
    candidatePool = remainingPool.filter(item => {
      const ratio = item.duration_s / champion.duration_s;
      return ratio > 5 || ratio < 0.2;
    });
  } else if (currentTier === 2) {
    // Intermediate: ratio between 2x and 20x
    candidatePool = remainingPool.filter(item => {
      const ratio = item.duration_s / champion.duration_s;
      return (ratio > 1.8 && ratio < 30) || (ratio < 0.55 && ratio > 0.03);
    });
  } else if (currentTier === 3) {
    // Closer calls
    candidatePool = remainingPool.filter(item => item.tier >= 2);
  }

  // Fallback to any remaining if filtered pool is small
  if (!candidatePool || candidatePool.length === 0) {
    candidatePool = remainingPool.length > 0 ? remainingPool : RAW_BANK.filter(item => item.id !== champion.id);
  }

  challenger = candidatePool[Math.floor(Math.random() * candidatePool.length)];

  state.seenInRun.add(champion.id);
  state.seenInRun.add(challenger.id);
  unlockFact(champion.id);
  unlockFact(challenger.id);

  return { champion, challenger };
}

function getTierForStreak(streak) {
  if (streak < 3) return 1;
  if (streak < 6) return 2;
  if (streak < 9) return 3;
  return 4;
}

function updateTierBadge(tier) {
  const tierMap = {
    1: { name: 'Tier 1: Warmup', icon: '🌱' },
    2: { name: 'Tier 2: Organisms & Human Motion', icon: '⚡' },
    3: { name: 'Tier 3: Microseconds & Biomechanics', icon: '🔥' },
    4: { name: 'Tier 4: Razor Quantum Margins', icon: '👑' }
  };
  const info = tierMap[tier] || tierMap[1];
  document.getElementById('stat-tier').innerText = info.name;
  document.getElementById('tier-badge-icon').innerText = info.icon;
}

// Setup a new matchup round
function setupRound(isFirst = false) {
  state.hasAnswered = false;

  let pair;
  if (isFirst) {
    pair = selectPair(false);
    state.cardA = pair.champion;
    state.cardB = pair.challenger;
    state.reignCount = 0;
  } else {
    pair = selectPair(true);
    state.cardA = pair.champion; // Survivor stays
    state.cardB = pair.challenger; // New challenger
  }

  // Which one is mathematically faster (shorter duration)?
  state.fasterCardKey = (state.cardA.duration_s < state.cardB.duration_s) ? 'a' : 'b';

  // Render cards
  renderCard('a', state.cardA, isFirst ? 'CONTENDER 1' : '👑 DEFENDING CHAMPION');
  renderCard('b', state.cardB, isFirst ? 'CONTENDER 2' : '⚔️ NEW CHALLENGER');

  // Reset UI visual states
  resetCardStyles();
  const strip = document.getElementById('inline-verdict-strip');
  if (strip) strip.classList.add('hidden');
  document.getElementById('stat-round').innerText = `#${state.round}`;
  const arenaRound = document.getElementById('arena-round');
  if (arenaRound) arenaRound.innerText = `#${state.round}`;
  document.getElementById('reign-count').innerText = state.reignCount;

  // Animate challenger entering
  const cardBEl = document.getElementById('card-b');
  cardBEl.classList.remove('animate-challenger');
  void cardBEl.offsetWidth; // Trigger reflow
  cardBEl.classList.add('animate-challenger');
}

function renderCard(key, data, roleLabel) {
  document.getElementById(`card-${key}-role`).innerText = roleLabel;
  document.getElementById(`card-${key}-title`).innerText = data.title;
  document.getElementById(`card-${key}-desc`).innerText = data.description;
  document.getElementById(`card-${key}-duration-text`).innerText = '❓ Hidden Duration';
  document.getElementById(`card-${key}-seconds-sub`).innerHTML = '&nbsp;';

  // Category Pill
  const cat = CATEGORY_STYLES[data.category] || { bg: 'bg-slate-100', text: 'text-ink', label: data.category.toUpperCase() };
  const catEl = document.getElementById(`card-${key}-category`);
  catEl.innerText = cat.label;
  catEl.className = `badge-category ${cat.bg} ${cat.text}`;

  // Facts
  document.getElementById(`card-${key}-fact-text`).innerText = data.scientific_fact;
  document.getElementById(`card-${key}-source-text`).innerText = `Source: ${data.source}`;
  document.getElementById(`card-${key}-desc`).classList.remove('hidden');
  document.getElementById(`card-${key}-fact-wrapper`).classList.add('hidden');

  // Reset Button
  const btn = document.getElementById(`card-${key}-btn`);
  btn.classList.remove('pointer-events-none');
  btn.innerHTML = `<span class="material-symbols-outlined text-base">bolt</span><span>THIS ONE WAS FASTER</span>`;
}

function resetCardStyles() {
  const cardA = document.getElementById('card-a');
  const cardB = document.getElementById('card-b');

  cardA.className = 'duel-card memphis-box p-5 bg-white flex flex-col justify-between cursor-pointer clickable min-h-[440px]';
  cardB.className = 'duel-card memphis-box p-5 bg-white flex flex-col justify-between cursor-pointer clickable min-h-[440px]';

  // Content swap reset
  const descA = document.getElementById('card-a-desc');
  const factA = document.getElementById('card-a-fact-wrapper');
  if (descA) descA.classList.remove('hidden');
  if (factA) factA.classList.add('hidden');

  const descB = document.getElementById('card-b-desc');
  const factB = document.getElementById('card-b-fact-wrapper');
  if (descB) descB.classList.remove('hidden');
  if (factB) factB.classList.add('hidden');

  document.getElementById('card-a-duration-box').className = 'border-2 border-ink p-2 mb-3 bg-white text-center';
  document.getElementById('card-b-duration-box').className = 'border-2 border-ink p-2 mb-3 bg-white text-center';

  const btnA = document.getElementById('card-a-btn');
  btnA.className = 'w-full btn-tactile bg-tertiary-yellow text-ink font-display font-black text-sm uppercase py-3 flex items-center justify-center gap-2';
  btnA.innerHTML = '<span class="material-symbols-outlined text-base">bolt</span><span>THIS ONE WAS FASTER</span>';
  btnA.onclick = (e) => { e.stopPropagation(); handleCardChoice('a'); };

  const btnB = document.getElementById('card-b-btn');
  btnB.className = 'w-full btn-tactile bg-accent-orange text-white font-display font-black text-sm uppercase py-3 flex items-center justify-center gap-2';
  btnB.innerHTML = '<span class="material-symbols-outlined text-base">bolt</span><span>THIS ONE WAS FASTER</span>';
  btnB.onclick = (e) => { e.stopPropagation(); handleCardChoice('b'); };

  // Reset top bar verdict elements (no popout panel)
  const verdictTag = document.getElementById('arena-verdict-tag');
  if (verdictTag) verdictTag.classList.add('hidden');
  const ratioBanner = document.getElementById('arena-ratio-banner');
  if (ratioBanner) ratioBanner.classList.add('hidden');

  // Reset center VS circle
  const centerVs = document.getElementById('center-vs-badge');
  if (centerVs) {
    centerVs.innerText = 'VS';
    centerVs.className = 'hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-14 h-14 bg-tertiary-yellow border-[3px] border-ink shadow-[4px_4px_0px_#1c1b1b] rounded-full items-center justify-center font-display font-black text-lg text-ink pointer-events-none';
  }
}

// Handle User Click on either Card A or Card B
function handleCardChoice(chosenKey) {
  if (state.hasAnswered) return;
  state.hasAnswered = true;

  const isCorrect = (chosenKey === state.fasterCardKey);
  const winnerCard = (state.fasterCardKey === 'a') ? state.cardA : state.cardB;
  const loserCard = (state.fasterCardKey === 'a') ? state.cardB : state.cardA;

  // Reveal exact durations and swap facts in-place on both cards
  revealCardDuration('a', state.cardA, state.fasterCardKey === 'a');
  revealCardDuration('b', state.cardB, state.fasterCardKey === 'b');

  // Disable click pointer
  document.getElementById('card-a').classList.remove('clickable');
  document.getElementById('card-b').classList.remove('clickable');

  // Update streak & personal best
  if (isCorrect) {
    state.streak += 1;
    if (state.fasterCardKey === 'a') {
      state.reignCount += 1;
    } else {
      state.reignCount = 1; // Challenger took the throne!
    }

    if (state.streak > state.bestStreak) {
      state.bestStreak = state.streak;
      localStorage.setItem('which_is_faster_best', state.bestStreak);
      document.getElementById('stat-best').innerText = state.bestStreak;
    }
  } else {
    // Reset streak on wrong pick
    state.streak = 0;
    state.reignCount = (state.fasterCardKey === 'a') ? (state.reignCount + 1) : 1;
  }
  document.getElementById('stat-streak').innerText = state.streak;
  document.getElementById('reign-count').innerText = state.reignCount;

  // Update top bar & center badge in place without popping out any panel
  showComparisonBanner(isCorrect, winnerCard, loserCard);

  // Check for milestone toasts (e.g. at streak 3, 5, 8, 12)
  if (isCorrect && [3, 5, 8, 12, 15].includes(state.streak)) {
    setTimeout(() => {
      showMilestoneModal(state.streak);
    }, 450);
  }
}

function revealCardDuration(key, data, isWinner) {
  const cardEl = document.getElementById(`card-${key}`);
  const durationBox = document.getElementById(`card-${key}-duration-box`);
  const durationText = document.getElementById(`card-${key}-duration-text`);
  const secondsSub = document.getElementById(`card-${key}-seconds-sub`);
  const descEl = document.getElementById(`card-${key}-desc`);
  const factWrapper = document.getElementById(`card-${key}-fact-wrapper`);
  const btn = document.getElementById(`card-${key}-btn`);

  // Reveal values in-place (no expansion)
  durationText.innerText = data.duration_display;
  secondsSub.innerText = `${data.duration_s}s`;

  // Swap description with wonder fact inside the exact same container
  if (descEl) descEl.classList.add('hidden');
  if (factWrapper) factWrapper.classList.remove('hidden');

  if (isWinner) {
    cardEl.classList.add('winner');
    durationBox.className = 'border-2 border-ink p-2 mb-3 bg-accent-lime/25 font-black text-center';
    
    // In-place button transformation: the button you just clicked is now NEXT CHALLENGER
    btn.className = 'w-full btn-tactile bg-accent-lime text-ink font-display font-black text-sm uppercase py-3 flex items-center justify-center gap-2 cursor-pointer shadow-[4px_4px_0px_#1c1b1b]';
    btn.innerHTML = `<span>NEXT CHALLENGER</span><span class="material-symbols-outlined text-base">arrow_forward</span>`;
    btn.onclick = (e) => {
      e.stopPropagation();
      advanceSurvivor();
    };
  } else {
    cardEl.classList.add('loser');
    durationBox.className = 'border-2 border-ink p-2 mb-3 bg-rose-50 text-slate-500 line-through text-center';
    btn.className = 'w-full btn-tactile bg-slate-200 text-slate-600 font-display font-bold text-sm uppercase py-3 flex items-center justify-center gap-2 pointer-events-none';
    btn.innerHTML = `<span class="material-symbols-outlined text-base">close</span><span>SLOWER</span>`;
  }
}

function showComparisonBanner(isCorrect, winner, loser) {
  const verdictTag = document.getElementById('arena-verdict-tag');
  const ratioBanner = document.getElementById('arena-ratio-banner');
  const centerVs = document.getElementById('center-vs-badge');

  const ratio = (loser.duration_s / winner.duration_s);
  let ratioFormatted = '';
  if (ratio >= 1000000) {
    ratioFormatted = `${(ratio / 1000000).toFixed(1)}M×`;
  } else if (ratio >= 1000) {
    ratioFormatted = `${(ratio / 1000).toFixed(1)}k×`;
  } else if (ratio >= 10) {
    ratioFormatted = `${Math.round(ratio)}×`;
  } else {
    ratioFormatted = `${ratio.toFixed(1)}×`;
  }

  // Update top bar in place (zero layout jump)
  if (verdictTag) {
    verdictTag.classList.remove('hidden');
    if (isCorrect) {
      verdictTag.innerText = '🎯 SPOT ON!';
      verdictTag.className = 'font-mono text-xs font-black uppercase px-2.5 py-0.5 border-2 border-ink bg-accent-lime text-ink';
    } else {
      verdictTag.innerText = '💔 STREAK BROKEN';
      verdictTag.className = 'font-mono text-xs font-black uppercase px-2.5 py-0.5 border-2 border-ink bg-accent-orange text-white';
    }
  }

  if (ratioBanner) {
    ratioBanner.classList.remove('hidden');
    ratioBanner.innerText = `⚡ ${winner.title} is ${ratioFormatted} faster!`;
  }

  // Update center badge circle without shifting
  if (centerVs) {
    centerVs.innerText = ratioFormatted;
    centerVs.className = 'hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-16 h-16 bg-accent-lime border-[3px] border-ink shadow-[4px_4px_0px_#1c1b1b] rounded-full items-center justify-center font-display font-black text-sm text-ink pointer-events-none text-center leading-none p-1';
  }
}

// Next Survivor Round
function advanceSurvivor() {
  state.round += 1;
  // The winner survives! Set cardA to whichever card was faster
  const survivor = (state.fasterCardKey === 'a') ? state.cardA : state.cardB;
  state.cardA = survivor;
  setupRound(false);
}

// Restart Game Run
function restartGame() {
  state.streak = 0;
  state.round = 1;
  state.reignCount = 0;
  state.seenInRun.clear();
  document.getElementById('stat-streak').innerText = '0';
  setupRound(true);
}

// Fact Bank / Journal Management
function unlockFact(id) {
  if (!state.unlockedIds.has(id)) {
    state.unlockedIds.add(id);
    localStorage.setItem('which_is_faster_unlocked', JSON.stringify([...state.unlockedIds]));
    renderJournal();
  }
}

function toggleJournal() {
  const drawer = document.getElementById('journal-drawer');
  drawer.scrollIntoView({ behavior: 'smooth' });
}

function filterJournal(category) {
  state.journalCategory = category;
  document.querySelectorAll('.journal-filter-btn').forEach(btn => {
    btn.classList.remove('bg-tertiary-yellow');
    btn.classList.add('bg-white');
  });
  event.target.classList.remove('bg-white');
  event.target.classList.add('bg-tertiary-yellow');
  renderJournal();
}

function renderJournal() {
  const grid = document.getElementById('journal-grid');
  document.getElementById('journal-btn-text').innerText = `Fact Bank (${state.unlockedIds.size}/${RAW_BANK.length})`;

  let filtered = RAW_BANK;
  if (state.journalCategory !== 'all') {
    filtered = RAW_BANK.filter(i => i.category === state.journalCategory);
  }

  grid.innerHTML = filtered.map(item => {
    const isUnlocked = state.unlockedIds.has(item.id);
    const cat = CATEGORY_STYLES[item.category] || { bg: 'bg-slate-100', text: 'text-ink', label: item.category };

    if (!isUnlocked) {
      return `
        <div class="memphis-box-sm p-3 bg-slate-100 border-2 border-slate-300 opacity-60">
          <div class="flex items-center justify-between mb-1">
            <span class="badge-category bg-slate-200 text-slate-600">${cat.label}</span>
            <span class="font-mono text-xs text-slate-400">🔒 LOCKED</span>
          </div>
          <div class="font-display font-bold text-sm text-slate-400 uppercase mt-2">
            Undiscovered Phenomenon
          </div>
          <p class="font-body text-xs text-slate-400 mt-1 italic">
            Play more matchups to uncover this time wonder!
          </p>
        </div>
      `;
    }

    return `
      <div class="memphis-box-sm p-3 bg-white border-2 border-ink hover:-translate-y-0.5 transition-all">
        <div class="flex items-center justify-between gap-1 mb-1.5">
          <span class="badge-category ${cat.bg} ${cat.text}">${cat.label}</span>
          <span class="font-mono text-xs font-black text-ink bg-tertiary-yellow px-1.5 py-0.5 border border-ink">
            ${item.duration_display}
          </span>
        </div>
        <h4 class="font-display font-black text-sm uppercase text-ink leading-tight">
          ${item.title}
        </h4>
        <p class="font-body text-xs text-slate-700 mt-1 line-clamp-2">
          ${item.scientific_fact}
        </p>
        <div class="font-mono text-[9px] text-slate-500 mt-2 font-bold truncate">
          ${item.source}
        </div>
      </div>
    `;
  }).join('');
}

// Milestone Modals
function showMilestoneModal(streak) {
  const modal = document.getElementById('milestone-modal');
  const title = document.getElementById('modal-title');
  const desc = document.getElementById('modal-desc');
  const icon = document.getElementById('modal-icon');

  const milestones = {
    3: { title: 'Temporal Explorer!', desc: '3 correct comparisons in a row! You are developing an instinct for microseconds and nature\'s speeds.', icon: '⚡' },
    5: { title: 'Master of Fleeting Time!', desc: '5 consecutive victories! The King of the Hill arena is buzzing as you navigate biological and cosmic thresholds.', icon: '🔥' },
    8: { title: 'Chrono Grandmaster!', desc: '8 in a row! You are reading the fabric of time like an open book.', icon: '👑' },
    12: { title: 'Cosmic Time Whisperer!', desc: '12 straight victories! You\'ve conquered quantum lasers, celestial light, and biological wonders.', icon: '🌌' }
  };

  const m = milestones[streak] || { title: 'Incredible Streak!', desc: `You reached a winning streak of ${streak}!`, icon: '🏆' };
  title.innerText = m.title;
  desc.innerText = m.desc;
  icon.innerText = m.icon;
  modal.classList.remove('hidden');
}

function closeMilestoneModal() {
  document.getElementById('milestone-modal').classList.add('hidden');
}

// Keyboard Listeners
function setupKeyboardListeners() {
  window.addEventListener('keydown', (e) => {
    // Modal open
    if (!document.getElementById('milestone-modal').classList.contains('hidden')) {
      if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') {
        closeMilestoneModal();
      }
      return;
    }

    if (!state.hasAnswered) {
      if (e.key === '1' || e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        handleCardChoice('a');
      } else if (e.key === '2' || e.key === 'ArrowRight' || e.key === 'b' || e.key === 'B') {
        handleCardChoice('b');
      }
    } else {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
        advanceSurvivor();
      }
    }
  });
}

// Start on load
window.addEventListener('DOMContentLoaded', initGame);
