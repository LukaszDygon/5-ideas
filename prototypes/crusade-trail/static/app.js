(function() {
  let geoData = null;
  let waypointsData = null;
  let activeIndex = 0;

  // Viewport Transformation State (Pan & Zoom)
  const view = {
    x: 0,
    y: 0,
    scale: 1,
    minScale: 0.6,
    maxScale: 6.0,
    isDragging: false,
    startX: 0,
    startY: 0
  };

  const canvas = document.getElementById('cartoCanvas');
  const ctx = canvas.getContext('2d');
  const container = document.getElementById('map-container');
  const tooltip = document.getElementById('mapTooltip');

  // Geographic bounds for Equirectangular projection
  // Lon: -10° to 42° (Width: 52°), Lat: 29° to 54° (Height: 25°)
  const GEO = {
    minLon: -8.0,
    maxLon: 40.5,
    minLat: 29.5,
    maxLat: 53.5
  };

  // Convert Lon/Lat to Canvas World Coordinates (Equirectangular)
  function project(lon, lat, width, height) {
    const x = ((lon - GEO.minLon) / (GEO.maxLon - GEO.minLon)) * width;
    const y = ((GEO.maxLat - lat) / (GEO.maxLat - GEO.minLat)) * height;
    return { x, y };
  }

  // Inverse project from Canvas World to Lon/Lat
  function unproject(x, y, width, height) {
    const lon = GEO.minLon + (x / width) * (GEO.maxLon - GEO.minLon);
    const lat = GEO.maxLat - (y / height) * (GEO.maxLat - GEO.minLat);
    return { lon, lat };
  }

  // Base virtual canvas dimensions for standard projection
  const V_WIDTH = 1800;
  const V_HEIGHT = 1200;

  // Initialize Canvas DPI
  function resizeCanvas() {
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    renderMap();
  }

  // Initial fit of map into view
  function resetView() {
    const rect = container.getBoundingClientRect();
    const scaleX = rect.width / V_WIDTH;
    const scaleY = rect.height / V_HEIGHT;
    view.scale = Math.max(scaleX, scaleY) * 1.05;
    view.x = (rect.width - V_WIDTH * view.scale) / 2;
    view.y = (rect.height - V_HEIGHT * view.scale) / 2;
    renderMap();
  }

  // Focus on a specific waypoint
  function focusWaypoint(idx) {
    if (!waypointsData || !waypointsData.waypoints[idx]) return;
    const wp = waypointsData.waypoints[idx];
    const pt = project(wp.coords[0], wp.coords[1], V_WIDTH, V_HEIGHT);
    const rect = container.getBoundingClientRect();

    view.scale = Math.min(2.8, view.maxScale);
    view.x = rect.width / 2 - pt.x * view.scale;
    view.y = rect.height / 2 - pt.y * view.scale;
    renderMap();
  }

  // DRAWING: Classical Nautical Compass Rose
  function drawCompassRose(context, cx, cy, radius) {
    context.save();
    context.translate(cx, cy);

    // Decorative outer ring
    context.strokeStyle = 'rgba(74, 52, 35, 0.4)';
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.stroke();

    context.beginPath();
    context.arc(0, 0, radius * 0.7, 0, Math.PI * 2);
    context.stroke();

    // 16-point star
    const points = 16;
    for (let i = 0; i < points; i++) {
      const angle = (i * Math.PI * 2) / points;
      const isCard = i % 4 === 0;
      const isSub = i % 2 === 0;
      const r = isCard ? radius : isSub ? radius * 0.75 : radius * 0.55;

      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      context.lineTo(Math.cos(angle + Math.PI / points) * (radius * 0.25), Math.sin(angle + Math.PI / points) * (radius * 0.25));
      context.closePath();
      context.fillStyle = isCard ? (i === 12 ? '#9e2a2b' : '#4a3423') : '#bf9b52';
      context.fill();
    }

    // Cardinal Labels: Latin Cartographic
    context.font = '700 11px Cinzel, serif';
    context.fillStyle = '#221710';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('N', 0, -radius - 12);
    context.fillText('S', 0, radius + 12);
    context.fillText('E', radius + 12, 0);
    context.fillText('W', -radius - 12, 0);

    context.restore();
  }

  // DRAWING: Sea Rhumb Lines
  function drawRhumbLines(context) {
    context.save();
    context.strokeStyle = 'rgba(115, 84, 56, 0.12)';
    context.lineWidth = 0.8;

    const centers = [
      project(15.0, 36.5, V_WIDTH, V_HEIGHT), // Central Med
      project(28.0, 34.5, V_WIDTH, V_HEIGHT), // East Med / Rhodes
      project(7.0, 42.0, V_WIDTH, V_HEIGHT)   // West Med
    ];

    centers.forEach(c => {
      for (let a = 0; a < 32; a++) {
        const rad = (a * Math.PI * 2) / 32;
        context.beginPath();
        context.moveTo(c.x, c.y);
        context.lineTo(c.x + Math.cos(rad) * 2000, c.y + Math.sin(rad) * 2000);
        context.stroke();
      }
    });

    context.restore();
  }

  // DRAWING: Mountain Hachures
  function drawMountains(context) {
    if (!waypointsData || !waypointsData.mountains) return;
    context.save();
    context.font = 'italic 11px "EB Garamond", serif';
    context.fillStyle = 'rgba(74, 52, 35, 0.65)';
    context.strokeStyle = 'rgba(115, 84, 56, 0.4)';
    context.lineWidth = 1;

    waypointsData.mountains.forEach(m => {
      const pt = project(m.coords[0], m.coords[1], V_WIDTH, V_HEIGHT);
      
      // Draw 3-4 small medieval mountain peaks
      for (let offset of [-20, -7, 8, 22]) {
        const px = pt.x + offset;
        const py = pt.y;
        context.beginPath();
        context.moveTo(px - 10, py + 8);
        context.lineTo(px, py - 8);
        context.lineTo(px + 10, py + 8);
        context.stroke();
      }
      context.textAlign = 'center';
      context.fillText(m.name, pt.x, pt.y + 22);
    });
    context.restore();
  }

  // RENDER MAP
  function renderMap() {
    const rect = container.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(view.x, view.y);
    ctx.scale(view.scale, view.scale);

    // 1. Sea Fill across entire canvas
    ctx.fillStyle = '#e4d8bf';
    ctx.fillRect(-5000, -5000, 12000, 12000);

    // 2. Rhumb lines
    drawRhumbLines(ctx);

    // 3. Land Polygons (authentic closed land masses)
    if (geoData && geoData.land) {
      ctx.fillStyle = '#faf6ec';
      ctx.beginPath();
      geoData.land.forEach(ring => {
        if (!ring || ring.length < 3) return;
        const start = project(ring[0][0], ring[0][1], V_WIDTH, V_HEIGHT);
        ctx.moveTo(start.x, start.y);
        for (let i = 1; i < ring.length; i++) {
          const p = project(ring[i][0], ring[i][1], V_WIDTH, V_HEIGHT);
          ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
      });
      ctx.fill();
    }

    // 3b. Detailed Coastlines (high-resolution vintage ink linework)
    if (geoData && geoData.coast) {
      ctx.strokeStyle = '#6d4c33';
      ctx.lineWidth = 1.2;
      geoData.coast.forEach(line => {
        if (!line || line.length < 2) return;
        ctx.beginPath();
        const start = project(line[0][0], line[0][1], V_WIDTH, V_HEIGHT);
        ctx.moveTo(start.x, start.y);
        for (let i = 1; i < line.length; i++) {
          const p = project(line[i][0], line[i][1], V_WIDTH, V_HEIGHT);
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      });
    }

    // 4. Principal Rivers
    if (geoData && geoData.rivers) {
      ctx.strokeStyle = '#4e7399';
      ctx.lineWidth = 1.3;
      geoData.rivers.forEach(r => {
        if (!r.coords || r.coords.length < 2) return;
        ctx.beginPath();
        const start = project(r.coords[0][0], r.coords[0][1], V_WIDTH, V_HEIGHT);
        ctx.moveTo(start.x, start.y);
        for (let i = 1; i < r.coords.length; i++) {
          const p = project(r.coords[i][0], r.coords[i][1], V_WIDTH, V_HEIGHT);
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      });
    }

    // 5. Mountain chains
    drawMountains(ctx);

    // 6. Regional Labels (Latin Toponyms)
    ctx.save();
    ctx.font = '700 12px Cinzel, serif';
    ctx.fillStyle = 'rgba(74, 52, 35, 0.45)';
    ctx.textAlign = 'center';
    
    const regions = [
      { text: 'GALLIA', lon: 2.5, lat: 47.0 },
      { text: 'GERMANIA', lon: 10.0, lat: 51.5 },
      { text: 'HUNGARIA', lon: 19.5, lat: 46.5 },
      { text: 'ITALIA', lon: 13.0, lat: 43.0 },
      { text: 'ILLYRICUM', lon: 18.0, lat: 43.5 },
      { text: 'THRACIA', lon: 26.0, lat: 42.0 },
      { text: 'IMPERIUM BYZANTINUM', lon: 31.0, lat: 41.2 },
      { text: 'ANATOLIA', lon: 33.5, lat: 39.0 },
      { text: 'SYRIA', lon: 37.5, lat: 35.0 },
      { text: 'PALÆSTINA', lon: 35.3, lat: 31.5 },
      { text: 'MARE MEDITERRANEUM', lon: 18.0, lat: 35.5 },
      { text: 'PONTUS EUXINUS', lon: 34.0, lat: 43.5 }
    ];
    regions.forEach(reg => {
      const pt = project(reg.lon, reg.lat, V_WIDTH, V_HEIGHT);
      ctx.fillText(reg.text, pt.x, pt.y);
    });
    ctx.restore();

    // 7. Crusade Route Polyline
    if (waypointsData && waypointsData.route) {
      // Glow underlay
      ctx.strokeStyle = 'rgba(158, 42, 43, 0.2)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      const first = project(waypointsData.route[0][0], waypointsData.route[0][1], V_WIDTH, V_HEIGHT);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < waypointsData.route.length; i++) {
        const pt = project(waypointsData.route[i][0], waypointsData.route[i][1], V_WIDTH, V_HEIGHT);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();

      // Main vermilion trail
      ctx.strokeStyle = '#9e2a2b';
      ctx.lineWidth = 2.4;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 8. Waypoint Markers & Historical Labels
    if (waypointsData && waypointsData.waypoints) {
      waypointsData.waypoints.forEach((wp, idx) => {
        const pt = project(wp.coords[0], wp.coords[1], V_WIDTH, V_HEIGHT);
        const isActive = idx === activeIndex;

        // Outer halo
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isActive ? 10 : 6, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? '#9e2a2b' : '#ffffff';
        ctx.strokeStyle = '#221710';
        ctx.lineWidth = isActive ? 2.5 : 1.5;
        ctx.fill();
        ctx.stroke();

        // Inner marker dot or cross
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isActive ? 4 : 2.5, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? '#d4af37' : '#9e2a2b';
        ctx.fill();

        // Label above / beside marker
        ctx.font = isActive ? 'bold 12px Cinzel, serif' : '600 10.5px Cinzel, serif';
        ctx.fillStyle = isActive ? '#9e2a2b' : '#221710';
        ctx.textAlign = 'left';
        
        // Offset label
        const lx = pt.x + (isActive ? 12 : 8);
        const ly = pt.y + 4;

        // Label halo for legibility
        ctx.strokeStyle = 'rgba(250, 246, 237, 0.9)';
        ctx.lineWidth = 3;
        ctx.strokeText(wp.name, lx, ly);
        ctx.fillText(wp.name, lx, ly);
      });
    }

    // 9. Compass Rose in Western Mediterranean
    const compPt = project(5.0, 36.5, V_WIDTH, V_HEIGHT);
    drawCompassRose(ctx, compPt.x, compPt.y, 48);

    ctx.restore();
  }

  // UPDATE ILLUMINATED DOSSIER CONTENT
  function updateDossier(idx) {
    if (!waypointsData || !waypointsData.waypoints[idx]) return;
    activeIndex = idx;
    const wp = waypointsData.waypoints[idx];

    // Numbers & Titles
    document.getElementById('dossier-stage-num').textContent = `STATION ${wp.number} OF XII`;
    document.getElementById('dossier-date').textContent = wp.date.toUpperCase();
    document.getElementById('dossier-title').textContent = wp.name;
    document.getElementById('dossier-toponym').textContent = `${wp.toponym} • ${wp.region}`;
    document.getElementById('dossier-leaders').textContent = wp.leaders;
    document.getElementById('dossier-distance').textContent = `${wp.distance_km} km (${wp.stage_title})`;

    // Texts
    document.getElementById('dossier-chronicle').innerHTML = `<span class="drop-cap">${wp.chronicle.charAt(0)}</span>${wp.chronicle.slice(1)}`;
    document.getElementById('dossier-lore').textContent = wp.lore_relics;
    document.getElementById('dossier-logistics').textContent = wp.logistics;
    document.getElementById('dossier-today').textContent = wp.today;

    document.getElementById('dossier-indicator').textContent = `${idx + 1} / ${waypointsData.waypoints.length}`;

    // Highlight button in rail
    document.querySelectorAll('.stage-pill').forEach((btn, bIdx) => {
      if (bIdx === idx) {
        btn.classList.add('active');
        btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      } else {
        btn.classList.remove('active');
      }
    });

    renderMap();
  }

  // BUILD STAGE BUTTONS
  function buildStageButtons() {
    const rail = document.getElementById('stage-buttons-rail');
    rail.innerHTML = '';
    waypointsData.waypoints.forEach((wp, idx) => {
      const btn = document.createElement('button');
      btn.className = `stage-pill carto-badge px-2.5 py-1 text-[11px] whitespace-nowrap cursor-pointer ${idx === 0 ? 'active' : ''}`;
      btn.textContent = `${wp.number}. ${wp.name.split('&')[0].trim()}`;
      btn.addEventListener('click', () => {
        updateDossier(idx);
        focusWaypoint(idx);
      });
      rail.appendChild(btn);
    });
  }

  // HIT TESTING FOR WAYPOINTS
  function getWaypointAtPos(clientX, clientY) {
    if (!waypointsData) return null;
    const rect = container.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    const dpr = window.devicePixelRatio || 1;
    // Map mouse coordinate to virtual coordinate
    const worldX = (mouseX - view.x) / view.scale;
    const worldY = (mouseY - view.y) / view.scale;

    for (let i = 0; i < waypointsData.waypoints.length; i++) {
      const wp = waypointsData.waypoints[i];
      const pt = project(wp.coords[0], wp.coords[1], V_WIDTH, V_HEIGHT);
      const dx = worldX - pt.x;
      const dy = worldY - pt.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 18 / view.scale) {
        return { index: i, waypoint: wp, screenX: mouseX, screenY: mouseY };
      }
    }
    return null;
  }

  // INTERACTION EVENT LISTENERS
  container.addEventListener('mousedown', (e) => {
    view.isDragging = true;
    view.startX = e.clientX - view.x;
    view.startY = e.clientY - view.y;
  });

  window.addEventListener('mousemove', (e) => {
    if (view.isDragging) {
      view.x = e.clientX - view.startX;
      view.y = e.clientY - view.startY;
      renderMap();
    } else {
      const hit = getWaypointAtPos(e.clientX, e.clientY);
      if (hit) {
        container.style.cursor = 'pointer';
        tooltip.style.display = 'block';
        tooltip.style.left = `${hit.screenX}px`;
        tooltip.style.top = `${hit.screenY}px`;
        tooltip.innerHTML = `<strong>${hit.waypoint.name}</strong><br><span style="font-size:10px; color:#735438;">${hit.waypoint.toponym}</span>`;
      } else {
        container.style.cursor = 'grab';
        tooltip.style.display = 'none';
      }
    }
  });

  window.addEventListener('mouseup', (e) => {
    if (view.isDragging) {
      view.isDragging = false;
    }
  });

  container.addEventListener('click', (e) => {
    const hit = getWaypointAtPos(e.clientX, e.clientY);
    if (hit) {
      updateDossier(hit.index);
      focusWaypoint(hit.index);
    }
  });

  // WHEEL & TRACKPAD ZOOM (Smooth normalized exponential zoom)
  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Normalize delta across Mac trackpads and wheel mice
    const delta = Math.max(-50, Math.min(50, e.deltaY));
    const zoomFactor = Math.exp(-delta * 0.0035);
    const newScale = Math.min(Math.max(view.scale * zoomFactor, view.minScale), view.maxScale);
    const actualFactor = newScale / view.scale;

    view.x = mouseX - (mouseX - view.x) * actualFactor;
    view.y = mouseY - (mouseY - view.y) * actualFactor;
    view.scale = newScale;

    renderMap();
  }, { passive: false });

  // TOUCH GESTURE SUPPORT (Drag & Pinch)
  let touchStartDist = 0;
  let touchStartScale = 1;
  container.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      view.isDragging = true;
      view.startX = e.touches[0].clientX - view.x;
      view.startY = e.touches[0].clientY - view.y;
    } else if (e.touches.length === 2) {
      view.isDragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDist = Math.sqrt(dx * dx + dy * dy);
      touchStartScale = view.scale;
    }
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && view.isDragging) {
      view.x = e.touches[0].clientX - view.startX;
      view.y = e.touches[0].clientY - view.startY;
      renderMap();
    } else if (e.touches.length === 2 && touchStartDist > 0) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ratio = dist / touchStartDist;
      view.scale = Math.min(Math.max(touchStartScale * ratio, view.minScale), view.maxScale);
      renderMap();
    }
  }, { passive: true });

  container.addEventListener('touchend', () => {
    view.isDragging = false;
    touchStartDist = 0;
  });

  // BUTTON CONTROLS
  document.getElementById('btnZoomIn').addEventListener('click', () => {
    const rect = container.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const newScale = Math.min(view.scale * 1.25, view.maxScale);
    view.x = cx - (cx - view.x) * (newScale / view.scale);
    view.y = cy - (cy - view.y) * (newScale / view.scale);
    view.scale = newScale;
    renderMap();
  });

  document.getElementById('btnZoomOut').addEventListener('click', () => {
    const rect = container.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const newScale = Math.max(view.scale * 0.8, view.minScale);
    view.x = cx - (cx - view.x) * (newScale / view.scale);
    view.y = cy - (cy - view.y) * (newScale / view.scale);
    view.scale = newScale;
    renderMap();
  });

  document.getElementById('btnResetView').addEventListener('click', () => {
    resetView();
  });

  document.getElementById('btnPrevStage').addEventListener('click', () => {
    if (!waypointsData) return;
    const newIdx = (activeIndex - 1 + waypointsData.waypoints.length) % waypointsData.waypoints.length;
    updateDossier(newIdx);
    focusWaypoint(newIdx);
  });

  document.getElementById('btnNextStage').addEventListener('click', () => {
    if (!waypointsData) return;
    const newIdx = (activeIndex + 1) % waypointsData.waypoints.length;
    updateDossier(newIdx);
    focusWaypoint(newIdx);
  });

  // DATA FETCH & INITIALIZATION
  Promise.all([
    fetch('/static/prototypes/crusade-trail/data/crusade_geo.json').then(r => r.json()),
    fetch('/static/prototypes/crusade-trail/data/crusade_waypoints.json').then(r => r.json())
  ]).then(([geo, wp]) => {
    geoData = geo;
    waypointsData = wp;

    buildStageButtons();
    resizeCanvas();
    resetView();
    updateDossier(0);
  }).catch(err => {
    console.error('Error loading cartography data:', err);
  });

  window.addEventListener('resize', () => {
    resizeCanvas();
  });

})();
