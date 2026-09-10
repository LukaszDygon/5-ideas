// 5 Ideas Daily Showcase - Interactive Script

// Web Audio synthesizer for retro 8-bit sound effects and chiptune preview
let audioCtx = null;
let isAudioPlaying = false;
let audioOsc = null;
let audioGain = null;
let intervalId = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Play a quick 8-bit sound effect on clicks
function playRetroClick(freq = 440, type = 'square', duration = 0.08) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + duration);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // AudioContext blocked before interaction
  }
}

// Chiptune Song Generator (for "Neon Skyline" Song preview)
function toggleSongPreview(button) {
  const ctx = getAudioContext();
  const statusSpan = document.getElementById('song-status');
  const eqBars = document.querySelectorAll('.eq-bar-anim');

  if (isAudioPlaying) {
    // Stop
    clearInterval(intervalId);
    if (audioOsc) {
      try { audioOsc.stop(); } catch(e) {}
    }
    isAudioPlaying = false;
    if (button) button.innerHTML = '<span class="material-symbols-outlined">play_arrow</span> PLAY CHIPTUNE';
    if (statusSpan) statusSpan.textContent = 'STOPPED';
    eqBars.forEach(bar => bar.style.height = '10px');
    return;
  }

  // Start Chiptune Arpeggiator
  isAudioPlaying = true;
  if (button) button.innerHTML = '<span class="material-symbols-outlined">stop</span> STOP CHIPTUNE';
  if (statusSpan) statusSpan.textContent = 'PLAYING 135 BPM';

  const notes = [220, 261.63, 329.63, 392.00, 440, 523.25, 659.25, 783.99];
  let noteIndex = 0;

  intervalId = setInterval(() => {
    if (!isAudioPlaying) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const freq = notes[noteIndex % notes.length];
    noteIndex = (noteIndex + 1 + (Math.random() > 0.7 ? 2 : 0)) % notes.length;

    osc.type = Math.random() > 0.5 ? 'square' : 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);

    // Animate EQ bars
    eqBars.forEach(bar => {
      const h = Math.floor(Math.random() * 50) + 10;
      bar.style.height = `${h}px`;
    });
  }, 160);
}

// Stream filter by build type
function filterStream(type) {
  playRetroClick(520, 'square');
  const cards = document.querySelectorAll('.stream-day-card');
  const buttons = document.querySelectorAll('.filter-pill');

  buttons.forEach(b => {
    if (b.dataset.filter === type) {
      b.classList.remove('bg-white');
      b.classList.add('bg-primary-magenta', 'text-white');
    } else {
      b.classList.add('bg-white');
      b.classList.remove('bg-primary-magenta', 'text-white');
    }
  });

  cards.forEach(card => {
    if (type === 'all') {
      card.style.display = 'block';
    } else {
      const cardType = card.dataset.buildType;
      card.style.display = (cardType === type) ? 'block' : 'none';
    }
  });
}

// Surprise me button helper
function surpriseMe() {
  playRetroClick(660, 'sine', 0.15);
  window.location.href = '/random';
}

document.addEventListener('DOMContentLoaded', () => {
  // Attach retro click sound to all neo-buttons
  document.querySelectorAll('.neo-btn').forEach(btn => {
    btn.addEventListener('mouseenter', () => playRetroClick(350, 'triangle', 0.03));
  });
});
