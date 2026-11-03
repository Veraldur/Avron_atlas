'use strict';
let SC = null; // активная сцена

class WorldScene extends Phaser.Scene {
  constructor() { super('World'); }

  create() {
    SC = this;
    this.cmap = {}; this.camSt = {}; this.gest = null; this.hoverId = null; this.draft = null; this.lastClick = { t: 0, x: 0, y: 0 };
    this.areaTx = []; this.mw = 2048; this.mh = 1536; this.minZ = .1;
    this.cameras.main.setBackgroundColor('#0d1417');
    this.bg = this.add.image(0, 0, '__WHITE').setOrigin(0).setDepth(0).setVisible(false);
    this.gridG = this.add.graphics().setDepth(1);
    this.areasG = this.add.graphics().setDepth(2);
    this.relG = this.add.graphics().setDepth(3);
    this.ovG = this.add.graphics().setDepth(4);
    this.marks = this.add.container(0, 0).setDepth(5);

    this.input.on('pointerdown', p => this.onDown(p));
    this.input.on('pointermove', p => this.onMove(p));
    this.input.on('pointerup', p => this.onUp(p));
    this.input.on('gameout', () => { $('tip').style.display = 'none'; });
    this.input.on('wheel', (p, o, dx, dy) => this.zoomAt(p, dy < 0 ? 1.15 : 1 / 1.15));
    this.scale.on('resize', () => this.clampCam());
    this.ready = true;
    this.openMap(S.mapId);
  }

  /* ---------- координаты и камера ---------- */
  toWorld(p) { const c = this.cameras.main; return { x: (p.x - c.width / 2) / c.zoom + c.scrollX + c.width / 2, y: (p.y - c.height / 2) / c.zoom + c.scrollY + c.height / 2 }; }
  get zoom() { return this.cameras.main.zoom; }
  markScale() { return clamp(1 / this.zoom, .45, 1.8); }
  entityScale(e) { return e && e.fixedScale ? 1 / this.zoom : this.markScale(); }
  clampCam() {
    const c = this.cameras.main, cx = c.scrollX + c.width / 2, cy = c.scrollY + c.height / 2;
    c.scrollX = clamp(cx, -this.mw * .25, this.mw * 1.25) - c.width / 2;
    c.scrollY = clamp(cy, -this.mh * .25, this.mh * 1.25) - c.height / 2;
  }
  fitMap() {
    const c = this.cameras.main, z = Math.min(c.width / this.mw, c.height / this.mh) * .95;
    this.minZ = z * .4; c.setZoom(z); c.centerOn(this.mw / 2, this.mh / 2); this.onZoom();
  }
  zoomAt(p, f) {
    const c = this.cameras.main, b = this.toWorld(p);
    c.setZoom(clamp(c.zoom * f, this.minZ, 6));
    const a = this.toWorld(p); c.scrollX += b.x - a.x; c.scrollY += b.y - a.y;
    this.clampCam(); this.onZoom();
  }
  onZoom() {
    const s = this.markScale();
    Object.values(this.cmap).forEach(c => { const id = Object.keys(this.cmap).find(k => this.cmap[k] === c); c.setScale(this.entityScale(ent(id))); });
    this.drawAreas(); this.drawRel(); this.drawOverlay(); this.drawGrid();
    $('zoomInfo').textContent = Math.round(this.zoom * 100) + '%';
  }
  focus(e) {
    const c = this.cameras.main, p = center(e);
    if (geo(e) === 'area') {
      const xs = e.points.map(q => q[0]), ys = e.points.map(q => q[1]);
      const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
      c.setZoom(clamp(Math.min(c.width / (w * 1.6), c.height / (h * 1.6)), this.minZ, 3));
    }
    c.centerOn(p.x, p.y); this.clampCam(); this.onZoom();
  }

  /* ---------- карты и текстуры ---------- */
  openMap(id, o = {}) {
    const m = mapOf(id); if (!m) return;
    const c = this.cameras.main;
    if (this.curMap && mapOf(this.curMap) && !o.refit) this.camSt[this.curMap] = { z: c.zoom, x: c.scrollX, y: c.scrollY };
    S.mapId = id; this.cancelDraft(true); this.hoverId = null;
    this.ensureTexture(m, key => {
      if (S.mapId !== id) return;
      this.curMap = id;
      this.bg.setTexture(key).setVisible(true).setPosition(0, 0).setDisplaySize(m.width, m.height);
      this.mw = m.width; this.mh = m.height;
      this.fitMap();
      const st = this.camSt[id];
      if (o.focusId && ent(o.focusId)) this.focus(ent(o.focusId));
      else if (st && !o.refit) { c.setZoom(st.z); c.scrollX = st.x; c.scrollY = st.y; this.onZoom(); }
      this.refresh();
      c.fadeIn(220, 13, 20, 23);
      if (typeof afterMapOpen === 'function') afterMapOpen();
    });
  }
  ensureTexture(m, cb) {
    const key = 'map:' + m.id + ':' + (S.rev[m.id] || 0);
    if (this.textures.exists(key)) return cb(key);
    const size = (w, h) => { m.width = w; m.height = h; };
    const fallback = () => { S.missing[m.id] = !!m.src; cb(this.placeholder(m, key)); };
    S.missing[m.id] = false;
    if (S.uploads[m.id]) {
      const img = new Image();
      img.onload = () => { this.textures.addImage(key, img); size(img.width, img.height); cb(key); };
      img.onerror = fallback; img.src = S.uploads[m.id]; return;
    }
    if (!m.src) return fallback();
    const ok = () => { const s = this.textures.get(key).getSourceImage(); size(s.width, s.height); this.load.off('loaderror', bad); cb(key); };
    const bad = f => { if (f.key !== key) return; this.load.off('loaderror', bad); this.load.off('filecomplete-image-' + key, ok); fallback(); };
    this.load.once('filecomplete-image-' + key, ok); this.load.on('loaderror', bad);
    this.load.image(key, m.src); this.load.start();
  }
  placeholder(m, key) {
    const w = m.width || 2048, h = m.height || 1536;
    // Empty canvases are rendered at reduced texture resolution to avoid allocating 100+ MB per blank map.
    const cw = Math.min(w, 2048), ch = Math.min(h, 1536);
    const t = this.textures.createCanvas(key, cw, ch), g = t.context;
    const grd = g.createRadialGradient(cw / 2, ch / 2, 100, cw / 2, ch / 2, cw * .75);
    grd.addColorStop(0, '#2a3a3a'); grd.addColorStop(1, '#141d20');
    g.fillStyle = grd; g.fillRect(0, 0, cw, ch);
    g.strokeStyle = 'rgba(214,181,108,.12)'; g.lineWidth = 2;
    for (let x = 0; x <= cw; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, ch); g.stroke(); }
    for (let y = 0; y <= ch; y += 128) { g.beginPath(); g.moveTo(0, y); g.lineTo(cw, y); g.stroke(); }
    g.strokeStyle = 'rgba(214,181,108,.35)'; g.lineWidth = 6; g.strokeRect(3, 3, cw - 6, ch - 6);
    g.fillStyle = 'rgba(232,230,223,.16)'; g.textAlign = 'center'; g.font = 'bold 70px Georgia, serif';
    g.fillText(m.name || 'Карта', cw / 2, ch / 2); g.font = '22px Arial';
    g.fillText(m.src ? 'файл не найден' : 'пустой холст — загрузите изображение слева', cw / 2, ch / 2 + 48);
    t.refresh(); return key;
  }

  /* ---------- отрисовка ---------- */
  refresh() {
    if (!this.ready) return;
    this.drawMarkers(); this.drawAreas(); this.drawRel(); this.drawOverlay(); this.drawGrid();
    const n = S.world.entities.filter(e => e.mapId === S.mapId).length;
    $('countInfo').textContent = n + ' объектов на карте · ' + S.world.entities.length + ' всего';
  }
  visible() { return S.world.entities.filter(e => e.mapId === S.mapId && isShown(e) && typeOf(e)); }

  drawMarkers() {
    this.marks.removeAll(true); this.cmap = {};
    const sc = this.markScale(), edit = S.mode === 'edit';
    for (const e of this.visible()) {
      if (geo(e) !== 'point') continue;
      const t = typeOf(e), col = hex(e.color || t.color), sel = e.id === S.selId;
      const c = this.add.container(e.x, e.y).setScale(this.entityScale(e)).setAlpha((edit && (e.secret || e.draft) ? .6 : 1) * (e.opacity == null ? 1 : clamp(Number(e.opacity), 0, 1)));
      const markerColor = hex(e.color || t.color);
      const shape = e.markerShape || 'circle';
      const g = this.add.graphics();
      if (t.quick) {
        g.fillStyle(0x101619, .95).fillRect(-7, -7, 14, 14); g.lineStyle(2, col, 1).strokeRect(-7, -7, 14, 14);
        g.fillStyle(col, 1).fillRect(-2.5, -2.5, 5, 5);
      } else {
        if (shape === 'circle') { g.fillStyle(0x101619, .92).fillCircle(0, 0, 13); g.lineStyle(2.5, col, 1).strokeCircle(0, 0, 13); } else { g.lineStyle(2.5, col, 1).strokeCircle(0, 0, 13); }
      }
      if (e.image && /^data:image\//.test(e.image)) { /* uploaded image remains embedded for portable JSON; icon rendering is handled by the article card */ }
      if (e.linkMapId) g.fillStyle(0xffffff, 1).fillTriangle(9, -17, 18, -17, 18, -8);
      if (sel) g.lineStyle(2, 0xffe29a, 1).strokeCircle(0, 0, 20);
      c.add(g);
      if (!t.quick && e.image && /^data:image\//.test(e.image)) {
        const iconKey = 'entity-icon:' + e.id;
        if (this.textures.exists(iconKey)) {
          const icon = this.add.image(0, 0, iconKey).setDisplaySize(24, 24);
          c.add(icon);
        } else {
          this.iconLoading ||= new Set();
          if (!this.iconLoading.has(e.id)) {
            this.iconLoading.add(e.id); const img = new Image();
            img.onload = () => { if (!this.textures.exists(iconKey)) this.textures.addImage(iconKey, img); this.iconLoading.delete(e.id); this.refresh(); };
            img.onerror = () => this.iconLoading.delete(e.id); img.src = e.image;
          }
          c.add(this.add.text(0, 0, t.glyph, { fontFamily: 'Segoe UI Symbol, Arial', fontSize: '14px', color: t.color }).setOrigin(.5).setResolution(2));
      }
      } else if (!t.quick) c.add(this.add.text(0, 0, t.glyph, { fontFamily: 'Segoe UI Symbol, Arial', fontSize: '14px', color: t.color }).setOrigin(.5).setResolution(2));
      if (t.quick && (S.showLabels || sel) && e.summary) {
        c.add(this.add.text(13, -8, e.summary.slice(0, 110), { fontFamily: 'Arial', fontSize: '11px', color: '#ece5cf', backgroundColor: '#151c1ee6', padding: { x: 5, y: 3 }, wordWrap: { width: 150 } }).setResolution(2));
      } else if (!t.quick && S.showLabels && !e.hideLabel) {
        c.add(this.add.text(0, 20, e.name || t.name, { fontFamily: 'Arial', fontSize: '12px', color: '#f0e8d2', stroke: '#101619', strokeThickness: 3 }).setOrigin(.5, 0).setResolution(2));
      }
      this.cmap[e.id] = c; this.marks.add(c);
    }
  }

  drawAreas() {
    const g = this.areasG, z = this.zoom, read = S.mode === 'read';
    g.clear(); this.areaTx.forEach(t => t.destroy()); this.areaTx = [];
    const list = this.visible().filter(e => geo(e) === 'area').sort((a, b) => polyArea(b.points) - polyArea(a.points));
    for (const e of list) {
      const col = hex(e.color || typeOf(e).color), sel = e.id === S.selId, hov = e.id === this.hoverId;
      const opacity = e.opacity == null ? 1 : clamp(Number(e.opacity), 0, 1);
      const fa = (sel ? .34 : hov ? .2 : read ? .015 : .09) * opacity, la = (sel ? 1 : hov ? .85 : read ? .06 : .55) * opacity;
      const pts = e.points.map(q => ({ x: q[0], y: q[1] }));
      g.fillStyle(col, fa).fillPoints(pts, true, true);
      g.lineStyle((sel ? 3 : 2) / z, col, la).strokePoints(pts, true, true);
      if (!e.hideLabel && (sel || hov || (!read && S.showLabels))) {
        const c = centroid(e.points);
        this.areaTx.push(this.add.text(c.x, c.y, e.name || typeOf(e).name, { fontFamily: 'Georgia, serif', fontSize: '18px', color: '#f4ecd2', stroke: '#101619', strokeThickness: 4 })
          .setOrigin(.5).setDepth(2.5).setScale(this.markScale() * 1.15).setAlpha(sel || hov ? 1 : .6).setResolution(2));
      }
    }
  }

  drawRel() {
    const g = this.relG, z = this.zoom; g.clear();
    const all = S.showRel && S.mode === 'edit';
    for (const r of S.world.relations) {
      const a = ent(r.from), b = ent(r.to); if (!a || !b) continue;
      if (a.mapId !== S.mapId || b.mapId !== S.mapId || !isShown(a) || !isShown(b)) continue;
      const hot = r.from === S.selId || r.to === S.selId;
      if (!all && !hot) continue;
      const t = S.rix.get(r.typeId), col = hex(t ? t.color : '#d6b56c');
      const p = center(a), q = center(b);
      g.lineStyle((hot ? 3 : 1.5) / z, col, hot ? .95 : .45).lineBetween(p.x, p.y, q.x, q.y);
      if (t && t.directed) {
        const ang = Math.atan2(q.y - p.y, q.x - p.x), s = 11 / z, off = 18 * this.markScale();
        const tx = q.x - Math.cos(ang) * off, ty = q.y - Math.sin(ang) * off;
        g.fillStyle(col, hot ? .95 : .6).fillTriangle(tx, ty, tx - Math.cos(ang - .45) * s, ty - Math.sin(ang - .45) * s, tx - Math.cos(ang + .45) * s, ty - Math.sin(ang + .45) * s);
      }
    }
  }

  drawGrid() {
    const g = this.gridG; g.clear(); if (!S.showGrid) return;
    g.lineStyle(1 / this.zoom, 0xd5d6c2, .14);
    for (let x = 0; x <= this.mw; x += 256) g.lineBetween(x, 0, x, this.mh);
    for (let y = 0; y <= this.mh; y += 256) g.lineBetween(0, y, this.mw, y);
  }

  drawOverlay(cursor) {
    const g = this.ovG, z = this.zoom; g.clear();
    if (this.draft) {
      const d = this.draft, col = hex(S.tix.get(d.typeId).color), pts = d.pts.map(q => ({ x: q[0], y: q[1] }));
      if (cursor) pts.push({ x: cursor.x, y: cursor.y });
      g.lineStyle(2.5 / z, col, 1).strokePoints(pts, false, false);
      if (pts.length > 2) g.fillStyle(col, .12).fillPoints(pts, true, true);
      d.pts.forEach((q, i) => g.fillStyle(i ? 0x101619 : 0xffe29a, 1).fillCircle(q[0], q[1], 5 / z).lineStyle(2 / z, col, 1).strokeCircle(q[0], q[1], 5 / z));
    }
    const e = ent(S.selId);
    if (e && S.mode === 'edit' && S.tool === 'select' && geo(e) === 'area' && e.mapId === S.mapId) {
      const col = hex(typeOf(e).color), p = e.points;
      p.forEach((q, i) => {
        const n = p[(i + 1) % p.length];
        g.fillStyle(0xffffff, .35).fillCircle((q[0] + n[0]) / 2, (q[1] + n[1]) / 2, 4 / z);
      });
      p.forEach(q => g.fillStyle(0xffffff, 1).fillCircle(q[0], q[1], 6 / z).lineStyle(2 / z, col, 1).strokeCircle(q[0], q[1], 6 / z));
    }
  }

  /* ---------- hit-test ---------- */
  hitMarker(w) {
    const r = 16 * this.markScale(); let best = null, bd = 1e9;
    for (const e of this.visible()) {
      if (geo(e) !== 'point') continue;
      const d = Math.hypot(e.x - w.x, e.y - w.y);
      if (d < r && d < bd) { best = e; bd = d; }
    }
    return best;
  }
  hitAreas(w) {
    return this.visible().filter(e => geo(e) === 'area' && inPoly(w.x, w.y, e.points))
      .sort((a,b) => (Number(a.popup?.priority)||0) - (Number(b.popup?.priority)||0));
  }
  hitArea(w) { return this.hitAreas(w)[0] || null; }
  hitHandle(w) {
    const e = ent(S.selId); if (!e || S.mode !== 'edit' || S.tool !== 'select' || geo(e) !== 'area' || e.mapId !== S.mapId) return null;
    const r = 10 / this.zoom, p = e.points;
    for (let i = 0; i < p.length; i++) if (Math.hypot(p[i][0] - w.x, p[i][1] - w.y) < r) return { e, i };
    for (let i = 0; i < p.length; i++) {
      const n = p[(i + 1) % p.length], mx = (p[i][0] + n[0]) / 2, my = (p[i][1] + n[1]) / 2;
      if (Math.hypot(mx - w.x, my - w.y) < r) { p.splice(i + 1, 0, [Math.round(mx), Math.round(my)]); return { e, i: i + 1 }; }
    }
    return null;
  }

  /* ---------- ввод ---------- */
  onDown(p) {
    const c = this.cameras.main, w = this.toWorld(p), ev = p.event || {};
    if (p.button === 1 || p.button === 2 || S.space) { this.gest = { t: 'pan', sx: p.x, sy: p.y, cx: c.scrollX, cy: c.scrollY, moved: true }; return; }
    if (p.button !== 0) return;
    if (S.pick) { const h = this.hitMarker(w) || this.hitArea(w); if (h) finishPick(h.id); return; }
    if (S.mode === 'edit' && S.tool !== 'select') return this.toolClick(w, p);
    if (S.mode === 'edit') {
      const h = this.hitHandle(w);
      if (h) {
        if (ev.altKey && h.e.points.length > 3) { h.e.points.splice(h.i, 1); changed({ keep: true }); return; }
        this.gest = { t: 'vertex', e: h.e, i: h.i, moved: true }; return;
      }
    }
    const mk = this.hitMarker(w);
    if (mk) {
      this.gest = { t: 'mark', id: mk.id, sx: p.x, sy: p.y, ox: mk.x, oy: mk.y, wx: w.x, wy: w.y, moved: false };
      if (S.mode === 'edit' && S.selId !== mk.id) selectEntity(mk.id);
      return;
    }
    const ar = this.hitArea(w), sel = ent(S.selId);
    if (ar && S.mode === 'edit' && ev.shiftKey && sel && sel.id === ar.id) {
      this.gest = { t: 'areamove', e: ar, orig: clone(ar.points), wx: w.x, wy: w.y, moved: true }; return;
    }
    this.gest = { t: 'bg', id: ar ? ar.id : null, sx: p.x, sy: p.y, wx:w.x, wy:w.y, cx: c.scrollX, cy: c.scrollY, moved: false };
  }

  onMove(p) {
    const c = this.cameras.main, w = this.toWorld(p), g = this.gest;
    $('coords').textContent = 'X ' + Math.round(w.x) + ' · Y ' + Math.round(w.y);
    if (g) {
      const dist = Math.hypot(p.x - (g.sx ?? p.x), p.y - (g.sy ?? p.y));
      if (!g.moved && dist > 4) g.moved = true;
      if (g.t === 'pan' || (g.t === 'bg' && g.moved)) {
        c.scrollX = g.cx - (p.x - g.sx) / c.zoom; c.scrollY = g.cy - (p.y - g.sy) / c.zoom; this.clampCam();
      } else if (g.t === 'mark' && g.moved && S.mode === 'edit') {
        const e = ent(g.id); e.x = Math.round(g.ox + w.x - g.wx); e.y = Math.round(g.oy + w.y - g.wy);
        if (this.cmap[g.id]) this.cmap[g.id].setPosition(e.x, e.y);
        this.drawRel(); syncPos(e);
      } else if (g.t === 'vertex') {
        g.e.points[g.i] = [Math.round(w.x), Math.round(w.y)]; this.drawAreas(); this.drawRel(); this.drawOverlay();
      } else if (g.t === 'areamove') {
        const dx = w.x - g.wx, dy = w.y - g.wy; g.e.points = g.orig.map(q => [Math.round(q[0] + dx), Math.round(q[1] + dy)]); this.drawAreas(); this.drawRel(); this.drawOverlay();
      }
      $('tip').style.display = 'none'; return;
    }
    if (this.draft) this.drawOverlay(w);
    const mk = this.hitMarker(w), ars = mk ? [] : this.hitAreas(w), ar = ars[0] || null, hid = ars.map(e=>e.id).join('|') || null;
    if (hid !== this.hoverId) { this.hoverId = hid; this.drawAreas(); }
    const tg = mk || ar, tip = $('tip');
    if (tg && !(S.mode === 'edit' && S.tool !== 'select')) {
      tip.style.display = 'block'; tip.style.left = (p.x + 14) + 'px'; tip.style.top = (p.y + 14) + 'px';
      tip.textContent = ''; const b = document.createElement('b'); b.textContent = ars.length > 1 ? ars.map(label).join(' · ') : label(tg); tip.append(b, ars.length > 1 ? ' · областей: '+ars.length : ' · ' + typeOf(tg).name);
      if (tg.summary) { const s = document.createElement('div'); s.textContent = tg.summary.slice(0, 80); tip.append(s); }
    } else tip.style.display = 'none';
    this.sys.canvas.style.cursor = (S.mode === 'edit' && S.tool !== 'select') || S.pick ? 'crosshair' : tg ? 'pointer' : 'default';
  }

  onUp(p) {
    const g = this.gest; this.gest = null; if (!g) return;
    if (g.t === 'mark') {
      if (g.moved && S.mode === 'edit') changed({ keep: true });
      else if (!g.moved) {
        const e=ent(g.id), now=Date.now(), dbl=this.lastAreaClick && now-this.lastAreaClick.t<360 && this.lastAreaClick.id===g.id;
        this.lastAreaClick={t:now,id:g.id};
        selectEntity(g.id);
        if(S.mode==='read' && e && geo(e)==='area') {
          const w={x:g.wx,y:g.wy}, overlaps=this.hitAreas(w);
          if(dbl && overlaps.length>1) showMapPopups(overlaps.map(x=>x.id));
          else if(overlaps.length>1) showAreaChooser(overlaps.map(x=>x.id));
          else if(e.popup?.enabled) showMapPopup(e.id); else closeMapPopup();
        } else if(S.mode==='read' && e?.popup?.enabled) showMapPopup(e.id); else if(S.mode==='read') closeMapPopup();
      }
    } else if (g.t === 'bg' && !g.moved) {
      selectEntity(g.id); const e=ent(g.id); if (S.mode === 'read' && e && geo(e)==='area') {
        const overlaps=this.hitAreas({x:g.wx,y:g.wy}), now=Date.now(), key=overlaps.map(x=>x.id).join('|');
        const dbl=this.lastAreaClick && now-this.lastAreaClick.t<360 && this.lastAreaClick.key===key;
        this.lastAreaClick={t:now,key};
        if(dbl && overlaps.length>1) { clearTimeout(this.areaClickTimer); showMapPopups(overlaps.map(x=>x.id)); }
        else if(overlaps.length>1) { clearTimeout(this.areaClickTimer); const ids=overlaps.map(x=>x.id); this.areaClickTimer=setTimeout(()=>showAreaChooser(ids),280); }
        else if(e.popup?.enabled) showMapPopup(e.id); else closeMapPopup();
      } else if (S.mode === 'read' && e?.popup?.enabled) showMapPopup(e.id); else if (S.mode === 'read') closeMapPopup();
    } else if (g.t === 'vertex' || g.t === 'areamove') changed({ keep: true });
  }

  /* ---------- создание объектов ---------- */
  toolClick(w, p) {
    const t = S.tix.get(S.tool); if (!t) return;
    if (t.geometry === 'point') {
      const e = newEntity(t.id, { x: Math.round(clamp(w.x, 0, this.mw)), y: Math.round(clamp(w.y, 0, this.mh)) });
      if(!window.AvronMaterials?.adopt?.('entity',e))S.world.entities.push(e); changed({ select: e.id }); return;
    }
    const d = this.draft || (this.draft = { typeId: t.id, pts: [] }), now = Date.now(), lc = this.lastClick;
    if (d.pts.length >= 3 && Math.hypot(d.pts[0][0] - w.x, d.pts[0][1] - w.y) < 12 / this.zoom) return this.finishDraft();
    if (now - lc.t < 320 && Math.hypot(lc.x - p.x, lc.y - p.y) < 6 && d.pts.length >= 3) return this.finishDraft();
    this.lastClick = { t: now, x: p.x, y: p.y };
    d.pts.push([Math.round(w.x), Math.round(w.y)]); this.drawOverlay(w); renderFloat();
  }
  undoDraftPoint() { if (this.draft) { this.draft.pts.pop(); if (!this.draft.pts.length) this.draft = null; this.drawOverlay(); renderFloat(); } }
  cancelDraft(silent) { this.draft = null; if (this.ovG) this.drawOverlay(); if (!silent) renderFloat(); }
  finishDraft() {
    const d = this.draft; if (!d) return;
    if (d.pts.length < 3) return this.cancelDraft();
    const e = newEntity(d.typeId, { points: d.pts });
    this.draft = null; S.tool = 'select'; if(!window.AvronMaterials?.adopt?.('entity',e))S.world.entities.push(e);
    changed({ select: e.id }); renderTools();
  }
}
