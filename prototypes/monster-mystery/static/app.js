  // 8 Archetypal Suspects: Normal mundane humans + absurd monster personas
  const DEFAULT_ROSTER = [
    {
      id: 1,
      name: "Gary from Accounting",
      costume: "Dracula / Vampire Cape",
      alias: "Count Vladimir of HR",
      reality: "Senior Human Resources Business Partner obsessed with workplace ergonomics and air fryer recipes.",
      lore: "600-year-old Carpathian nobleman who refuses to drink O-negative blood unless it is ethically sourced and logged in an expense report.",
      grudge: "The victim repeatedly microwaved leftover fish in the office kitchenette during Vlad's sacred daylight sleep cycle.",
      alibi: "Claimed he was trapped in the restroom trying to fish his clip-in plastic vampire fangs out of the U-bend.",
      catchphrase: "Hiss dramatically whenever someone says 'synergy' or 'budget cuts', and flare your cape when lights flicker.",
      isCulprit: true
    },
    {
      id: 2,
      name: "Brenda from Sales",
      costume: "Furry Werewolf Headband & Flannel",
      alias: "Fenrir the Agile Scrum Master",
      reality: "Sprint coordinator and amateur sourdough baker who gets physically agitated when meetings exceed 15 minutes.",
      lore: "Ancient cursed shapeshifter whose monthly transformation is triggered equally by full moons and unassigned Jira tickets.",
      grudge: "The victim replied 'per my last email' to Fenrir's urgent Slack ping at 4:59 PM on a bank holiday Friday.",
      alibi: "Was outside by the recycling bins chewing on a cardboard Amazon Prime delivery box to manage canine anxiety.",
      catchphrase: "Sniff aggressively at everyone's appetizers and let out a small guttural howl when you agree with someone.",
      isCulprit: false
    },
    {
      id: 3,
      name: "Marcus from Legal",
      costume: "Toilet Paper & Gauze Mummy",
      alias: "High Priest Imhotep (Tax Bracket IV)",
      reality: "Contract paralegal who carries his own travel hand sanitizer and obsessively tracks daily walking steps.",
      lore: "3,000-year-old embalmed vizier suffering from acute dust mite allergies, currently disputing estate taxes on his pyramid.",
      grudge: "The victim borrowed a vintage Tupperware soup container six months ago and returned it without the lid.",
      alibi: "Was tangled in a winter coat by the entrance because his 2-ply wrap unraveled when the front door opened.",
      catchphrase: "Walk stiff-legged, complain about drafty windows, and mutter ancient curses structured like Excel macros.",
      isCulprit: false
    },
    {
      id: 4,
      name: "Sam from DevOps",
      costume: "Frankenstein Bolts & Oversized Blazer",
      alias: "The Reanimated Tech Lead",
      reality: "Full-stack developer convinced of imposter syndrome who survives almost entirely on cold oat milk lattes.",
      lore: "Assembled from discarded anatomical surplus in an unpermitted Geneva cellar; navigates severe existential angst.",
      grudge: "The victim commented 'easy fix, why didn't you just refactor?' on Sam's 900-line emergency patch.",
      alibi: "Was standing motionless next to the toaster outlet to recharge his neck bolts with minor ambient current.",
      catchphrase: "Lock your knees, groan deeply whenever someone makes direct eye contact, and refresh LinkedIn every 10 minutes.",
      isCulprit: false
    },
    {
      id: 5,
      name: "Chloe from Marketing",
      costume: "Creature from the Black Lagoon (Goggles & Fins)",
      alias: "Gill-Man of HOA Compliance",
      reality: "Neighborhood Homeowners Association officer who measures front-lawn grass heights with a wooden kitchen ruler.",
      lore: "Primeval Devonian lungfish entity from the Amazonian murky depths who despises non-recyclable cardboard.",
      grudge: "The victim left their wheelie bin on the curb 47 minutes past the designated Tuesday collection window.",
      alibi: "Was moistening their facial gills over the punch bowl with the plastic soup ladle for medicinal hydration.",
      catchphrase: "Gurgle softly between sentences, rub cold hands together, and lecture suspects on stormwater runoff.",
      isCulprit: false
    },
    {
      id: 6,
      name: "Liam from Procurement",
      costume: "Ghost Sheet with Ray-Ban Sunglasses",
      alias: "Lady Beatrice the Poltergeist",
      reality: "True-crime podcast addict who claims to 'hate drama' but always lingers directly outside the kitchen door.",
      lore: "19th-century Victorian aristocrat who died of sheer boredom at a dull tea party and refuses to cross over.",
      grudge: "The victim spoiled the season finale of a prestige murder mystery television show during cocktail hour.",
      alibi: "Was hovering non-corporeally inside the pantry inspecting artisanal crisp selections.",
      catchphrase: "Moan 'OoOoOh... the betrayal!' whenever somebody passes cheese, and glide backwards out of awkward conversations.",
      isCulprit: false
    },
    {
      id: 7,
      name: "Maya from Education",
      costume: "Witch Hat & Chemistry Lab Coat",
      alias: "Dr. Morgana Hex (Senior Alchemist)",
      reality: "Secondary school science teacher running an Etsy shop selling cursed organic lavender soap bars.",
      lore: "Grand coven arch-sorceress unionized under the National Union of Necromancers demanding paid brew breaks.",
      grudge: "The victim called her hand-crafted sacred smudging herbs 'expensive burnt weeds' in front of everyone.",
      alibi: "Was heating an infusion of valerian root and chamomile in the microwave; it required exactly 90 seconds.",
      catchphrase: "Cackle wildly at mild remarks and attempt to read other guests' futures from the bottom of their salsa dips.",
      isCulprit: false
    },
    {
      id: 8,
      name: "Dave (Or First Uncostumed Guest)",
      costume: "NO COSTUME // PENALTY CORPSE",
      alias: "The Doomed Mortal (Victim / Ghost)",
      reality: "Showed up in jeans and a fleece saying 'I don't really do costumes, but I came for the chips.'",
      lore: "Immediately sentenced by ancient party law to become the night's deceased corpse and subsequent spectral witness.",
      grudge: "Annoyed everyone by not dressing up. The entire room had a collective subconscious motive.",
      alibi: "Cannot have an alibi because they are dramatically deceased on the parlor rug!",
      catchphrase: "Slump dramatically during Act II. Spend Act III wearing a napkin on your head whispering eerie ghost gossip.",
      isCulprit: false
    }
  ];

  let roster = [];

  function loadRoster() {
    const saved = localStorage.getItem("monster_mystery_roster");
    if (saved) {
      try {
        roster = JSON.parse(saved);
      } catch(e) {
        roster = JSON.parse(JSON.stringify(DEFAULT_ROSTER));
      }
    } else {
      roster = JSON.parse(JSON.stringify(DEFAULT_ROSTER));
    }
    renderRosterInputs();
    renderDossierCards();
  }

  function saveRoster() {
    localStorage.setItem("monster_mystery_roster", JSON.stringify(roster));
    renderDossierCards();
  }

  function resetGuestRoster() {
    if (confirm("Reset roster to default monster cast?")) {
      roster = JSON.parse(JSON.stringify(DEFAULT_ROSTER));
      localStorage.removeItem("monster_mystery_roster");
      renderRosterInputs();
      renderDossierCards();
    }
  }

  function fillSampleGuests() {
    roster[0].name = "Gary (Accountant)";
    roster[0].costume = "Cheap Dracula Cape & Fangs";
    roster[1].name = "Brenda (Manager)";
    roster[1].costume = "Wolf Ears & Flannel Shirt";
    roster[2].name = "Marcus (Friend)";
    roster[2].costume = "Toilet Paper Wrapped Mummy";
    roster[3].name = "Sam (Brother)";
    roster[3].costume = "Frankenstein Neck Bolts";
    roster[4].name = "Chloe (Neighbor)";
    roster[4].costume = "Green Facepaint Swamp Creature";
    roster[5].name = "Liam (Colleague)";
    roster[5].costume = "White Bed Sheet Ghost";
    roster[6].name = "Maya (Host Partner)";
    roster[6].costume = "Witch Hat & Cauldrons";
    roster[7].name = "Dave (The Late Arrival)";
    roster[7].costume = "NO COSTUME (PENALTY VICTIM!)";
    saveRoster();
    renderRosterInputs();
  }

  function renderRosterInputs() {
    const container = document.getElementById("roster-inputs-grid");
    if (!container) return;
    container.innerHTML = "";

    roster.forEach((item, index) => {
      const col = document.createElement("div");
      col.className = "bg-white p-3 border border-ink shadow-[2px_2px_0px_#181513] flex flex-col gap-1.5";
      col.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="font-mono text-[10px] font-bold text-dossier-crimson uppercase">ROLE #${item.id}</span>
          <span class="font-mono text-[9px] text-gray-500">${item.alias.split(' ')[0]}</span>
        </div>
        <div>
          <label class="block font-display font-bold text-[11px] text-ink uppercase">Guest Name</label>
          <input type="text" value="${item.name}" onchange="updateRosterField(${index}, 'name', this.value)" 
                 class="w-full text-xs font-courier p-1 border border-ink bg-yellow-50/40 focus:bg-white" />
        </div>
        <div>
          <label class="block font-display font-bold text-[11px] text-ink uppercase">Actual Costume</label>
          <input type="text" value="${item.costume}" onchange="updateRosterField(${index}, 'costume', this.value)" 
                 class="w-full text-xs font-courier p-1 border border-ink bg-yellow-50/40 focus:bg-white" />
        </div>
      `;
      container.appendChild(col);
    });
  }

  function updateRosterField(index, field, value) {
    if (roster[index]) {
      roster[index][field] = value;
      saveRoster();
    }
  }

  function toggleQuickAssigner() {
    const panel = document.getElementById("quick-assigner-panel");
    const label = document.getElementById("assigner-toggle-label");
    if (panel.classList.contains("hidden")) {
      panel.classList.remove("hidden");
      label.textContent = "Close Guest Roster";
    } else {
      panel.classList.add("hidden");
      label.textContent = "Edit Guest Roster";
    }
  }

  function renderDossierCards() {
    const container = document.getElementById("dossiers-cards-container");
    if (!container) return;
    container.innerHTML = "";

    roster.forEach((item) => {
      const card = document.createElement("div");
      card.className = "dossier-sheet p-5 flex flex-col justify-between relative print-page";
      
      const isPenalty = item.id === 8;

      card.innerHTML = `
        <div class="paperclip-marker"></div>
        <div>
          <div class="flex items-center justify-between border-b-2 border-ink pb-2 mb-3">
            <div class="flex items-center gap-2">
              <span class="${isPenalty ? 'stamp-penalty' : 'stamp-classified'} text-[11px]">
                ${isPenalty ? 'DECEASED VICTIM' : 'SUSPECT #' + item.id}
              </span>
              <span class="font-mono text-xs font-bold uppercase text-ink">
                ${item.alias}
              </span>
            </div>
            <span class="font-mono text-[10px] text-gray-500">CONFIDENTIAL</span>
          </div>

          <!-- GUEST & COSTUME BADGE -->
          <div class="bg-yellow-100/70 border border-ink p-2 mb-3 flex items-center justify-between">
            <div class="font-courier text-xs">
              <span class="font-bold uppercase text-ink">Assigned To:</span> 
              <span class="font-mono font-bold text-dossier-crimson">${item.name}</span>
            </div>
            <div class="font-courier text-xs">
              <span class="font-bold uppercase text-ink">Costume:</span> 
              <span class="font-mono text-ink">${item.costume}</span>
            </div>
          </div>

          <!-- MUNDANE REALITY VS MONSTER LORE -->
          <div class="flex flex-col gap-2 font-courier text-xs text-ink mb-4">
            <div class="bg-white p-2.5 border border-ink/40">
              <strong class="font-display uppercase text-dossier-crimson block text-[11px] mb-0.5">
                The Mundane Reality:
              </strong>
              ${item.reality}
            </div>

            <div class="bg-white p-2.5 border border-ink/40">
              <strong class="font-display uppercase text-ink block text-[11px] mb-0.5">
                Your Assigned Monster Persona (Stay in character!):
              </strong>
              ${item.lore}
            </div>

            <div class="bg-white p-2.5 border border-ink/40">
              <strong class="font-display uppercase text-ink block text-[11px] mb-0.5">
                Your Secret Grudge with the Victim:
              </strong>
              ${item.grudge}
            </div>

            <div class="bg-white p-2.5 border border-ink/40">
              <strong class="font-display uppercase text-ink block text-[11px] mb-0.5">
                Your Blackout Alibi:
              </strong>
              ${item.alibi}
            </div>
          </div>

          <!-- ROLEPLAY CHALLENGE -->
          <div class="bg-[#faf6eb] border-2 border-dashed border-ink p-3 mb-4">
            <div class="font-display font-black text-xs uppercase text-dossier-crimson mb-1 flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">theater_comedy</span>
              Mandatory Roleplay Challenge &amp; Quirk:
            </div>
            <div class="font-typewriter text-xs text-ink">
              "${item.catchphrase}"
            </div>
          </div>
        </div>

        <div class="pt-2 border-t border-ink/30 flex items-center justify-between no-print">
          <span class="font-mono text-[10px] text-gray-500">Party Dossier #1031 • Monster Gala</span>
          <button onclick="copyRoleText(${item.id})" class="font-mono text-[11px] font-bold bg-white hover:bg-yellow-200 border border-ink px-2 py-1 shadow-[2px_2px_0px_#181513] flex items-center gap-1">
            <span class="material-symbols-outlined text-xs">content_copy</span>
            <span>Copy Role for Text/WhatsApp</span>
          </button>
        </div>
      `;
      container.appendChild(card);
    });
  }

  function copyRoleText(id) {
    const item = roster.find(r => r.id === id);
    if (!item) return;

    const text = `🎃 MONSTER GALA MURDER MYSTERY // YOUR SECRET ROLE 🎃\n` +
      `Hey ${item.name}! Here is your classified character for tonight:\n\n` +
      `🎭 YOUR MONSTER ALIAS: ${item.alias}\n` +
      `👗 YOUR COSTUME: ${item.costume}\n\n` +
      `👔 THE MUNDANE REALITY: ${item.reality}\n\n` +
      `🧛 YOUR MONSTER BACKSTORY: ${item.lore}\n\n` +
      `🩸 YOUR GRUDGE WITH VICTIM: ${item.grudge}\n\n` +
      `🕒 YOUR BLACKOUT ALIBI: ${item.alibi}\n\n` +
      `🦇 YOUR ROLEPLAY CHALLENGE: "${item.catchphrase}"\n\n` +
      `Remember: Stay in character and do NOT reveal whether you are the killer until the grand finale!`;

    navigator.clipboard.writeText(text).then(() => {
      alert(`Copied role briefing for "${item.name}"! Paste into WhatsApp or SMS to send them their role!`);
    }).catch(() => {
      prompt("Copy your character text below:", text);
    });
  }

  function switchTab(tabId) {
    const tabs = ['host-tab', 'dossiers-tab', 'clues-tab', 'solution-tab'];
    tabs.forEach(t => {
      const pane = document.getElementById(t + '-pane');
      if (pane) pane.classList.add('hidden');
    });

    const activePane = document.getElementById(tabId + '-pane');
    if (activePane) activePane.classList.remove('hidden');

    document.querySelectorAll('.mystery-tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    const clickedBtn = Array.from(document.querySelectorAll('.mystery-tab-btn')).find(b => 
      b.getAttribute('onclick') && b.getAttribute('onclick').includes(tabId)
    );
    if (clickedBtn) clickedBtn.classList.add('active');
  }

  function revealSolution() {
    document.getElementById("solution-locked-box").classList.add("hidden");
    document.getElementById("solution-revealed-box").classList.remove("hidden");
  }

  // Web Audio API Synthesizer Blackout Scream & Horror Chord (Zero Dependencies!)
  function playBlackoutScream() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();

      // Deep rumble oscillator
      const oscBass = ctx.createOscillator();
      const gainBass = ctx.createGain();
      oscBass.type = 'sawtooth';
      oscBass.frequency.setValueAtTime(65, ctx.currentTime);
      oscBass.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 2.5);
      gainBass.gain.setValueAtTime(0.5, ctx.currentTime);
      gainBass.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2.5);
      oscBass.connect(gainBass);
      gainBass.connect(ctx.destination);
      oscBass.start();
      oscBass.stop(ctx.currentTime + 2.5);

      // Dissonant high screamer oscillator
      const oscScream = ctx.createOscillator();
      const gainScream = ctx.createGain();
      oscScream.type = 'triangle';
      oscScream.frequency.setValueAtTime(880, ctx.currentTime);
      oscScream.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.3);
      oscScream.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 1.8);
      gainScream.gain.setValueAtTime(0.01, ctx.currentTime);
      gainScream.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.2);
      gainScream.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0);
      oscScream.connect(gainScream);
      gainScream.connect(ctx.destination);
      oscScream.start();
      oscScream.stop(ctx.currentTime + 2.0);

      // Noise burst (the blackout crash)
      const bufferSize = ctx.sampleRate * 1.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.3));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.4, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
      noise.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start();

    } catch (e) {
      console.warn("Audio playback not supported or user blocked audio context", e);
      alert("⚡ *CRASH! A BLOODCURDLING SCREAM ECHOES IN THE DARKNESS!* ⚡");
    }
  }

  // Initialize on page load
  document.addEventListener("DOMContentLoaded", () => {
    loadRoster();
  });
