  // ---------------------------------------------------------------------------
  // 1. ASSET DEFINITIONS & PRESETS
  // ---------------------------------------------------------------------------
  const CAP_MODELS = {
    dad: {
      name: "Vintage Dad Cap",
      src: "/static/prototypes/nostalgia-cap/images/caps/cap_dad.jpg",
      fabric: "100% WASHED CHINO TWILL",
      desc: "Washed chino cotton twill with an authentic 90s merrowed embroidered patch, curved visor, and relaxed unstructured crown.",
      defaultPatchCenter: { x: 505, y: 440 },
      defaultRot: -5,
      defaultScale: 1.0,
      clipRadius: 155
    },
    trucker: {
      name: "90s Foam Trucker",
      src: "/static/prototypes/nostalgia-cap/images/caps/cap_trucker.jpg",
      fabric: "POLY-FOAM FRONT WITH NYLON MESH REAR",
      desc: "Classic high-crown foam trucker with breezy rear mesh, contrast foam front panel, and retro curved bill.",
      defaultPatchCenter: { x: 480, y: 450 },
      defaultRot: -4,
      defaultScale: 1.08,
      clipRadius: 165
    },
    snapback: {
      name: "Pro Flat Snapback",
      src: "/static/prototypes/nostalgia-cap/images/caps/cap_snapback.jpg",
      fabric: "STRUCTURED 6-PANEL HEAVY WOOL",
      desc: "High-profile structured 6-panel crown with flat stiff brim, embroidered eyelets, and classic streetwear attitude.",
      defaultPatchCenter: { x: 495, y: 425 },
      defaultRot: -5,
      defaultScale: 1.05,
      clipRadius: 160
    }
  };

  const DYE_COLORWAYS = [
    { id: "original", name: "Crisp Studio White", hex: null, label: "Original" },
    { id: "magenta",  name: "Radical Magenta",    hex: "#b40065", label: "Magenta" },
    { id: "cyan",     name: "Electric Cyan",       hex: "#00e5ff", label: "Cyan" },
    { id: "lime",     name: "Acid Lime",           hex: "#39ff14", label: "Lime" },
    { id: "yellow",   name: "Sunshine Yellow",     hex: "#fae100", label: "Yellow" },
    { id: "orange",   name: "Vivid Orange",        hex: "#ff5e00", label: "Orange" },
    { id: "purple",   name: "Retro Violet",        hex: "#7c3aed", label: "Violet" },
    { id: "navy",     name: "Washed Navy",         hex: "#1e3a8a", label: "Navy" },
    { id: "charcoal", name: "Cyber Charcoal",      hex: "#262626", label: "Charcoal" },
    { id: "teal",     name: "Taco Bell Teal",      hex: "#0d9488", label: "Teal" },
    { id: "green",    name: "Forest Evergreen",    hex: "#065f46", label: "Forest" },
  ];

  const PATCH_PRESETS = [
    {
      id: "synthwave",
      name: "Synthwave Sunset",
      src: "/static/prototypes/nostalgia-cap/images/caps/patch_synthwave.jpg",
      type: "circle",
      icon: "🌴",
      desc: "Neon palm & synth grid sunset crest"
    },
    {
      id: "floppy",
      name: "Floppy Disk 3.5\"",
      src: "/static/prototypes/nostalgia-cap/images/caps/patch_floppy.jpg",
      type: "circle",
      icon: "💾",
      desc: "Cyberpunk 3.5-inch 'SAVE ME' diskette"
    },
    {
      id: "smiley",
      name: "Techno Smiley",
      src: "/static/prototypes/nostalgia-cap/images/caps/patch_smiley.jpg",
      type: "circle",
      icon: "☻",
      desc: "Acid house sunglasses '90s Revolution' patch"
    },
    {
      id: "pizza",
      name: "Radical Pizza",
      src: "/static/prototypes/nostalgia-cap/images/caps/patch_pizza.jpg",
      type: "circle",
      icon: "🍕",
      desc: "Skateboarding pepperoni slice mascot"
    },
    {
      id: "arcade",
      name: "Arcade Joystick",
      src: "/static/prototypes/nostalgia-cap/images/caps/patch_arcade.jpg",
      type: "circle",
      icon: "🕹️",
      desc: "Retro arcade 'INSERT COIN' high score patch"
    },
    {
      id: "vhs",
      name: "VHS Rewind",
      src: "/static/prototypes/nostalgia-cap/images/caps/patch_vhs.jpg",
      type: "rounded_rect",
      icon: "📼",
      desc: "Vintage 'BE KIND REWIND' cassette tape"
    },
    {
      id: "none",
      name: "Clean / No Patch",
      src: null,
      type: "none",
      icon: "🚫",
      desc: "Blank hat without patch"
    }
  ];

  // Current customization state
  const state = {
    capModel: "dad",
    colorwayId: "original",
    patchId: "synthwave",
    customGraphicUrl: null,
    customGraphicImage: null,
    customText: "",
    scalePercent: 100,
    offsetY: 0,
    rotDeg: -5,
    dropShadow: true,
    cycLighting: true,
    audio: true,
    stockCount: 2,
    batchNum: 42
  };

  // Image cache
  const imageCache = {};

  // ---------------------------------------------------------------------------
  // 2. AUDIO SYNTHESIZER (WEB AUDIO API - ZERO DEPENDENCIES)
  // ---------------------------------------------------------------------------
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      const AudioClass = window.AudioContext || window.webkitAudioContext;
      if (AudioClass) audioCtx = new AudioClass();
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playSound(type) {
    if (!state.audio) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (type === "click") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.04);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === "shuffle") {
        [440, 554.37, 659.25, 880].forEach((f, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(f, now + i * 0.035);
          gain.gain.setValueAtTime(0.06, now + i * 0.035);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.035 + 0.09);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.035);
          osc.stop(now + i * 0.035 + 0.09);
        });
      } else if (type === "buy") {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "square";
          osc.frequency.setValueAtTime(f, now + i * 0.06);
          gain.gain.setValueAtTime(0.09, now + i * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.06);
          osc.stop(now + i * 0.06 + 0.25);
        });
      }
    } catch (e) {}
  }

  function toggleAudio() {
    state.audio = !state.audio;
    const btn = document.getElementById("audio-toggle-btn");
    const icon = document.getElementById("audio-icon");
    const text = document.getElementById("audio-text");
    if (state.audio) {
      icon.innerText = "volume_up";
      text.innerText = "SOUND ON";
      btn.classList.add("neo-btn-yellow");
      btn.classList.remove("neo-btn-white");
      playSound("click");
    } else {
      icon.innerText = "volume_off";
      text.innerText = "MUTED";
      btn.classList.remove("neo-btn-yellow");
      btn.classList.add("neo-btn-white");
    }
  }

  // ---------------------------------------------------------------------------
  // 3. IMAGE PRELOADER
  // ---------------------------------------------------------------------------
  function preloadImage(url) {
    if (!url) return Promise.resolve(null);
    if (imageCache[url]) return Promise.resolve(imageCache[url]);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        imageCache[url] = img;
        resolve(img);
      };
      img.onerror = () => {
        console.error("Failed to load image:", url);
        resolve(null);
      };
      img.src = url;
    });
  }

  // ---------------------------------------------------------------------------
  // 4. CANVAS COMPOSITING & RENDERING PIPELINE
  // ---------------------------------------------------------------------------
  const canvas = document.getElementById("hatCanvas");
  const ctx = canvas.getContext("2d");

  // Offscreen tinting buffer
  const tintCanvas = document.createElement("canvas");
  tintCanvas.width = 800;
  tintCanvas.height = 800;
  const tintCtx = tintCanvas.getContext("2d");

  async function renderHatScene() {
    const model = CAP_MODELS[state.capModel] || CAP_MODELS.dad;
    const capImg = await preloadImage(model.src);

    const loader = document.getElementById("canvasLoader");
    if (loader) loader.style.display = "none";

    if (!capImg) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Background studio cyc gradient
    const bgGrad = ctx.createRadialGradient(400, 360, 80, 400, 400, 450);
    bgGrad.addColorStop(0, "#ffffff");
    bgGrad.addColorStop(1, "#e2e8f0");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 800, 800);

    // 2. Draw & Dye the Realistic Cap
    tintCtx.clearRect(0, 0, 800, 800);
    tintCtx.drawImage(capImg, 0, 0, 800, 800);

    const colorway = DYE_COLORWAYS.find(c => c.id === state.colorwayId) || DYE_COLORWAYS[0];
    if (colorway.hex) {
      // Multiply color tint to dye fabric while keeping cloth shadows & weave intact
      tintCtx.save();
      tintCtx.globalCompositeOperation = "multiply";
      tintCtx.fillStyle = colorway.hex;
      tintCtx.fillRect(0, 0, 800, 800);

      // Re-illuminate specular highlights
      tintCtx.globalCompositeOperation = "screen";
      tintCtx.fillStyle = "rgba(255, 255, 255, 0.22)";
      tintCtx.fillRect(0, 0, 800, 800);
      tintCtx.restore();
    }

    // Draw the dyed cap onto main canvas
    ctx.drawImage(tintCanvas, 0, 0, 800, 800);

    // 3. Superimpose Embroidered Patch Graphic
    const patchPreset = PATCH_PRESETS.find(p => p.id === state.patchId);
    let patchImg = null;

    if (state.customGraphicImage) {
      patchImg = state.customGraphicImage;
    } else if (patchPreset && patchPreset.src) {
      patchImg = await preloadImage(patchPreset.src);
    }

    const patchPos = {
      x: model.defaultPatchCenter.x,
      y: model.defaultPatchCenter.y + state.offsetY
    };
    const scaleFactor = (state.scalePercent / 100) * model.defaultScale;
    const rotRad = (state.rotDeg * Math.PI) / 180;

    if (patchImg) {
      ctx.save();
      ctx.translate(patchPos.x, patchPos.y);
      ctx.rotate(rotRad);
      ctx.scale(scaleFactor, scaleFactor);

      const targetRadius = model.clipRadius;

      // Realistic physical drop shadow under the embroidered patch onto the cap
      if (state.dropShadow) {
        ctx.shadowColor = "rgba(18, 16, 16, 0.48)";
        ctx.shadowBlur = 14;
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 8;
      } else {
        ctx.shadowColor = "transparent";
      }

      if (state.customGraphicImage) {
        // User custom uploaded graphic
        const uW = targetRadius * 2;
        const uH = (patchImg.height / patchImg.width) * uW;
        ctx.drawImage(patchImg, -uW / 2, -uH / 2, uW, uH);
      } else if (patchPreset && patchPreset.type === "rounded_rect") {
        // Rounded rectangle patch (VHS)
        const rw = targetRadius * 2.2;
        const rh = targetRadius * 2.1;
        const rx = -rw / 2;
        const ry = -rh / 2;

        ctx.beginPath();
        ctx.roundRect(rx, ry, rw, rh, 30);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        ctx.clip();
        ctx.shadowColor = "transparent";
        ctx.drawImage(patchImg, rx, ry, rw, rh);
      } else {
        // Circular embroidered patches
        ctx.beginPath();
        ctx.arc(0, 0, targetRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        ctx.clip();
        ctx.shadowColor = "transparent";
        ctx.drawImage(patchImg, -targetRadius, -targetRadius, targetRadius * 2, targetRadius * 2);
      }

      ctx.restore();
    }

    // 4. Superimpose Custom Stitched Arch Text (if entered)
    if (state.customText) {
      renderArchedEmbroideryText(state.customText, patchPos.x, patchPos.y - (patchImg ? 155 * scaleFactor : 40), rotRad);
    }

    updateMetadataLabels();
  }

  // ---------------------------------------------------------------------------
  // 5. ARCHED 3D EMBROIDERY TEXT ENGINE
  // ---------------------------------------------------------------------------
  function renderArchedEmbroideryText(text, cx, cy, baseRot) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(baseRot);

    const radius = 240;
    const angleStep = 0.08;
    const totalAngle = (text.length - 1) * angleStep;
    const startAngle = -Math.PI / 2 - totalAngle / 2;

    ctx.font = "900 28px 'Bricolage Grotesque', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const angle = startAngle + i * angleStep;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle) + radius;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);

      // Thread drop shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.fillText(ch, 2, 3);

      // Black thread outline
      ctx.strokeStyle = "#1c1b1b";
      ctx.lineWidth = 5;
      ctx.strokeText(ch, 0, 0);

      // Golden embroidery satin fill
      ctx.fillStyle = "#fae100";
      ctx.fillText(ch, 0, 0);

      ctx.restore();
    }

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // 6. EVENT HANDLERS & STATE ACTIONS
  // ---------------------------------------------------------------------------
  function setCapModel(modelKey) {
    if (!CAP_MODELS[modelKey]) return;
    state.capModel = modelKey;
    playSound("click");

    document.querySelectorAll(".model-btn").forEach(btn => {
      btn.classList.remove("neo-btn-yellow", "shadow-[2px_2px_0px_#1c1b1b]");
      btn.classList.add("neo-btn-white");
    });
    const activeBtn = document.getElementById(`model-${modelKey}`);
    if (activeBtn) {
      activeBtn.classList.remove("neo-btn-white");
      activeBtn.classList.add("neo-btn-yellow", "shadow-[2px_2px_0px_#1c1b1b]");
    }

    // Set default rotation for model
    state.rotDeg = CAP_MODELS[modelKey].defaultRot;
    const rotSlider = document.getElementById("patchRotSlider");
    if (rotSlider) rotSlider.value = state.rotDeg;
    document.getElementById("rotDisplay").innerText = `${state.rotDeg}°`;

    renderHatScene();
  }

  function setColorway(colorId) {
    state.colorwayId = colorId;
    playSound("click");
    updateSwatchHighlights();
    renderHatScene();
  }

  function setPatch(patchId) {
    state.patchId = patchId;
    state.customGraphicImage = null;
    document.getElementById("uploadStatusText").innerText = "Or upload any custom PNG/JPG logo to superimpose!";
    playSound("click");
    updatePatchHighlights();
    renderHatScene();
  }

  function handleUserGraphicUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    playSound("click");
    const reader = new FileReader();
    reader.onload = evt => {
      const img = new Image();
      img.onload = () => {
        state.customGraphicImage = img;
        state.patchId = "custom";
        document.getElementById("uploadStatusText").innerText = `Uploaded: ${file.name.substring(0, 20)}`;
        updatePatchHighlights();
        renderHatScene();
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  }

  function handleCustomTextInput(val) {
    state.customText = val.toUpperCase().trim();
    renderHatScene();
  }

  function clearCustomText() {
    state.customText = "";
    document.getElementById("customTextInput").value = "";
    playSound("click");
    renderHatScene();
  }

  function updatePatchScale(val) {
    state.scalePercent = parseInt(val, 10);
    document.getElementById("scaleDisplay").innerText = `${val}%`;
    renderHatScene();
  }

  function updatePatchOffsetY(val) {
    state.offsetY = parseInt(val, 10);
    document.getElementById("offsetYDisplay").innerText = `${val}px`;
    renderHatScene();
  }

  function updatePatchRot(val) {
    state.rotDeg = parseInt(val, 10);
    document.getElementById("rotDisplay").innerText = `${val}°`;
    renderHatScene();
  }

  function resetTuning() {
    playSound("click");
    state.scalePercent = 100;
    state.offsetY = 0;
    const model = CAP_MODELS[state.capModel] || CAP_MODELS.dad;
    state.rotDeg = model.defaultRot;

    document.getElementById("patchScaleSlider").value = 100;
    document.getElementById("patchOffsetYSlider").value = 0;
    document.getElementById("patchRotSlider").value = state.rotDeg;

    document.getElementById("scaleDisplay").innerText = "100%";
    document.getElementById("offsetYDisplay").innerText = "0px";
    document.getElementById("rotDisplay").innerText = `${state.rotDeg}°`;

    renderHatScene();
  }

  function togglePatchShadow(checked) {
    state.dropShadow = checked;
    playSound("click");
    renderHatScene();
  }

  function toggleCycLighting(checked) {
    state.cycLighting = checked;
    playSound("click");
    renderHatScene();
  }

  // ---------------------------------------------------------------------------
  // 7. SURPRISE DROP (SHUFFLE GENERATOR)
  // ---------------------------------------------------------------------------
  function randomizeDrop(withSound = true) {
    if (withSound) playSound("shuffle");

    // Random model
    const modelKeys = Object.keys(CAP_MODELS);
    state.capModel = modelKeys[Math.floor(Math.random() * modelKeys.length)];

    // Random colorway
    state.colorwayId = DYE_COLORWAYS[Math.floor(Math.random() * DYE_COLORWAYS.length)].id;

    // Random patch (excluding none)
    const validPatches = PATCH_PRESETS.filter(p => p.id !== "none");
    state.patchId = validPatches[Math.floor(Math.random() * validPatches.length)].id;
    state.customGraphicImage = null;

    // Tuning variation
    state.scalePercent = Math.floor(Math.random() * 30) + 90; // 90 to 120%
    state.offsetY = Math.floor(Math.random() * 20) - 10; // -10 to +10px
    const model = CAP_MODELS[state.capModel];
    state.rotDeg = model.defaultRot + (Math.floor(Math.random() * 8) - 4);

    state.stockCount = Math.floor(Math.random() * 4) + 1;
    state.batchNum = Math.floor(Math.random() * 80) + 10;

    syncUIFromState();
    renderHatScene();
  }

  // ---------------------------------------------------------------------------
  // 8. METADATA & UI LABELS SYNC
  // ---------------------------------------------------------------------------
  function syncUIFromState() {
    // Model buttons
    document.querySelectorAll(".model-btn").forEach(btn => {
      btn.classList.remove("neo-btn-yellow", "shadow-[2px_2px_0px_#1c1b1b]");
      btn.classList.add("neo-btn-white");
    });
    const activeModelBtn = document.getElementById(`model-${state.capModel}`);
    if (activeModelBtn) {
      activeModelBtn.classList.remove("neo-btn-white");
      activeModelBtn.classList.add("neo-btn-yellow", "shadow-[2px_2px_0px_#1c1b1b]");
    }

    // Sliders
    document.getElementById("patchScaleSlider").value = state.scalePercent;
    document.getElementById("scaleDisplay").innerText = `${state.scalePercent}%`;

    document.getElementById("patchOffsetYSlider").value = state.offsetY;
    document.getElementById("offsetYDisplay").innerText = `${state.offsetY}px`;

    document.getElementById("patchRotSlider").value = state.rotDeg;
    document.getElementById("rotDisplay").innerText = `${state.rotDeg}°`;

    updateSwatchHighlights();
    updatePatchHighlights();
  }

  function updateSwatchHighlights() {
    document.querySelectorAll(".colorway-swatch").forEach(btn => {
      const match = btn.dataset.colorId === state.colorwayId;
      btn.classList.toggle("ring-4", match);
      btn.classList.toggle("ring-ink", match);
      btn.classList.toggle("scale-110", match);
    });
  }

  function updatePatchHighlights() {
    document.querySelectorAll(".patch-btn").forEach(btn => {
      const match = btn.dataset.patchId === state.patchId;
      btn.classList.toggle("bg-tertiary-yellow", match);
      btn.classList.toggle("bg-white", !match);
      btn.classList.toggle("shadow-[2px_2px_0px_#1c1b1b]", match);
    });
  }

  function updateMetadataLabels() {
    const model = CAP_MODELS[state.capModel] || CAP_MODELS.dad;
    const colorway = DYE_COLORWAYS.find(c => c.id === state.colorwayId) || DYE_COLORWAYS[0];
    const patch = PATCH_PRESETS.find(p => p.id === state.patchId) || { name: "Custom Artwork", id: "custom" };

    const titleEl = document.getElementById("productTitle");
    const subTitleEl = document.getElementById("productSubtitle");
    const skuEl = document.getElementById("productSku");
    const stockEl = document.getElementById("stockCount");
    const batchEl = document.getElementById("batchDisplay");

    const dynamicTitle = `THE '94 ${model.name.toUpperCase()} • ${patch.name.toUpperCase()}`;
    if (titleEl) titleEl.innerText = dynamicTitle;
    if (subTitleEl) subTitleEl.innerText = `${model.desc} Dyed in ${colorway.name} with real superimposed ${patch.name} embroidered graphics.`;
    if (skuEl) skuEl.innerText = `SKU: CAP-94-${state.capModel.toUpperCase()}-${patch.id.toUpperCase()}-${colorway.id.toUpperCase()}`;
    if (stockEl) stockEl.innerText = state.stockCount;
    if (batchEl) batchEl.innerText = `#0${state.batchNum}`;

    // Spec card
    document.getElementById("specFabric").innerText = model.fabric;
    document.getElementById("specPatch").innerText = `${patch.name.toUpperCase()} (MERROWED)`;

    // Telemetry
    document.getElementById("canvasTelemetrySilhouette").innerText = model.name.toUpperCase();
    document.getElementById("canvasTelemetryPatch").innerText = `${patch.name.toUpperCase()} // ${colorway.name.toUpperCase()}`;

    document.getElementById("currentSilhouetteLabel").innerText = model.name;
    document.getElementById("colorwayLabel").innerText = colorway.name;
    document.getElementById("patchLabel").innerText = patch.name;
  }

  // ---------------------------------------------------------------------------
  // 9. CHECKOUT & THERMAL RECEIPT
  // ---------------------------------------------------------------------------
  function triggerCheckout() {
    playSound("buy");

    const model = CAP_MODELS[state.capModel] || CAP_MODELS.dad;
    const colorway = DYE_COLORWAYS.find(c => c.id === state.colorwayId) || DYE_COLORWAYS[0];
    const patch = PATCH_PRESETS.find(p => p.id === state.patchId) || { name: "Custom Art" };

    document.getElementById("receiptOrderNum").innerText = `NC-${Math.floor(100000 + Math.random() * 900000)}`;
    document.getElementById("receiptTimestamp").innerText = new Date().toISOString().replace('T', ' ').substring(0, 19) + " UTC";
    document.getElementById("receiptItemName").innerText = document.getElementById("productTitle").innerText;
    document.getElementById("receiptSilhouette").innerText = model.name;
    document.getElementById("receiptColor").innerText = colorway.name;
    document.getElementById("receiptPatch").innerText = patch.name;
    document.getElementById("receiptCustomText").innerText = state.customText || "NONE";

    // Draw barcode
    const barcodeBox = document.getElementById("receiptBarcode");
    barcodeBox.innerHTML = "";
    for (let i = 0; i < 48; i++) {
      const line = document.createElement("div");
      line.className = "h-full";
      line.style.width = (Math.random() > 0.5 ? "3px" : "1.5px");
      line.style.backgroundColor = (Math.random() > 0.2 ? "#1c1b1b" : "transparent");
      barcodeBox.appendChild(line);
    }

    document.getElementById("receiptModal").classList.remove("hidden");
  }

  function closeReceipt() {
    playSound("click");
    document.getElementById("receiptModal").classList.add("hidden");
  }

  // ---------------------------------------------------------------------------
  // 10. EXPORT HIGH-RES PRODUCT PHOTO (.PNG)
  // ---------------------------------------------------------------------------
  function downloadProductPhoto() {
    playSound("click");
    const link = document.createElement("a");
    link.download = `nostalgia-cap-${state.capModel}-${state.colorwayId}-${state.patchId}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function copyRecipe() {
    playSound("click");
    const recipe = `NOSTALGIA-CAP-PHOTO: Silhouette=${state.capModel}, Color=${state.colorwayId}, Patch=${state.patchId}, Scale=${state.scalePercent}%, Text="${state.customText}"`;
    navigator.clipboard.writeText(recipe).then(() => {
      const btn = document.getElementById("copyRecipeBtn");
      const orig = btn.innerHTML;
      btn.innerHTML = `<span class="material-symbols-outlined text-sm">check</span><span>COPIED!</span>`;
      btn.classList.add("bg-acid-lime");
      setTimeout(() => {
        btn.innerHTML = orig;
        btn.classList.remove("bg-acid-lime");
      }, 2000);
    });
  }

  // ---------------------------------------------------------------------------
  // 11. INITIALIZATION & POPULATION
  // ---------------------------------------------------------------------------
  function init() {
    // Populate colorway swatches
    const swatchContainer = document.getElementById("colorwaySwatches");
    DYE_COLORWAYS.forEach(c => {
      const btn = document.createElement("button");
      btn.className = "colorway-swatch w-7 h-7 border-2 border-ink transition-transform hover:scale-110 relative";
      btn.dataset.colorId = c.id;
      btn.title = c.name;
      if (c.hex) {
        btn.style.backgroundColor = c.hex;
      } else {
        btn.style.background = "linear-gradient(135deg, #ffffff 50%, #e2e8f0 50%)";
      }
      btn.onclick = () => setColorway(c.id);
      swatchContainer.appendChild(btn);
    });

    // Populate patch buttons
    const patchContainer = document.getElementById("patchGrid");
    PATCH_PRESETS.forEach(p => {
      const btn = document.createElement("button");
      btn.className = "patch-btn neo-btn text-xs py-2 px-1 flex flex-col items-center gap-0.5 border-2 border-ink";
      btn.dataset.patchId = p.id;
      btn.title = `${p.name}: ${p.desc}`;
      btn.onclick = () => setPatch(p.id);
      btn.innerHTML = `<span class="text-base leading-none">${p.icon}</span><span class="text-[9px] font-mono font-bold truncate max-w-full">${p.name}</span>`;
      patchContainer.appendChild(btn);
    });

    syncUIFromState();
    renderHatScene();
  }

  document.addEventListener("DOMContentLoaded", init);
