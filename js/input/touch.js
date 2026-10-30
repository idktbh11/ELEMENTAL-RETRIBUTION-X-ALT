/*
 * TOUCH — phones and tablets.
 *
 *   - In gameplay: on-screen controls (move pad, JUMP / HIT / DASH / BLOCK /
 *     USE, plus pause, bag and skill tree). They feed the same actions as
 *     the keyboard: ERX.Keybinds.isDown('jump') is true while JUMP is held.
 *   - Everywhere else (menus, dialogue, cutscenes): a tap is a mouse click.
 *   - Name entry: tapping the name box opens the phone's keyboard (through a
 *     hidden text field).
 *   - Held sideways is best: in portrait, a "turn your phone" notice shows.
 *
 * Touch turns on by itself the first time the screen is touched.
 */
(function (ERX) {
  'use strict';

  const F = () => ERX.Font;

  // what each action is called on its button (also used in on-screen hints)
  const LABELS = {
    moveLeft: '←', moveRight: '→', jump: 'JUMP', attack: 'HIT', block: 'BLOCK',
    dash: 'DASH', use: 'USE', inventory: 'BAG', skills: 'SKILLS', zoomIn: '+', zoomOut: '-',
    ability1: '1', ability2: '2', ability3: '3', ability4: '4', ability5: '5', ultimate: 'ULT', awaken: 'AWK',
  };

  const Touch = {
    enabled: false,
    down: new Set(),       // actions held right now
    pressed: new Set(),    // actions pressed this frame
    owned: new Map(),      // pointerId -> button id (touches the controls own)
    buttons: [],
    layoutKey: '',
    fullscreenTried: false,

    /** Called by Input for every touch pointer. Returns true if the controls took it. */
    pointerDown(e, p) {
      this.enabled = true;
      this._maybeFullscreen();
      if (ERX.Input.textMode) this._maybeKeyboard(p);
      if (!this.visible()) return false;
      const b = this._hit(p.x, p.y);
      if (!b) return true;                 // a stray tap on the game itself does nothing
      this.owned.set(e.pointerId, b.id);
      this._press(b, p);
      return true;
    },
    pointerMove(e, p) {
      const id = this.owned.get(e.pointerId);
      if (!id) return false;
      // the move pad: slide your thumb between left and right
      if (id === 'pad') this._padAt(p.x);
      return true;
    },
    pointerUp(e) {
      const id = this.owned.get(e.pointerId);
      if (!id) return false;
      this.owned.delete(e.pointerId);
      const b = this.buttons.find((x) => x.id === id);
      if (id === 'pad') { this.down.delete('moveLeft'); this.down.delete('moveRight'); }
      else if (b && b.action && !this._ownedBy(id)) this.down.delete(b.action);
      return true;
    },
    _ownedBy(id) { for (const v of this.owned.values()) if (v === id) return true; return false; },

    _press(b, p) {
      if (b.id === 'pad') { this._padAt(p.x); return; }
      if (b.id === 'pause') { ERX.Input.actions.push('back'); ERX.Audio.playSfx('select'); return; }
      this.down.add(b.action);
      this.pressed.add(b.action);
    },
    _padAt(x) {
      const pad = this.buttons.find((b) => b.id === 'pad');
      const left = x < pad.x;
      const was = this.down.has('moveLeft') ? 'moveLeft' : this.down.has('moveRight') ? 'moveRight' : null;
      const now = left ? 'moveLeft' : 'moveRight';
      if (was !== now) {
        this.down.delete('moveLeft'); this.down.delete('moveRight');
        this.down.add(now);
        this.pressed.add(now);
      }
    },

    isDown(action) { return this.down.has(action); },
    wasPressed(action) { return this.pressed.has(action); },
    endFrame() { this.pressed.clear(); },
    label(action) { return LABELS[action] || null; },

    /** The gameplay controls show while you're actually playing (not in menus, dialogue or cutscenes). */
    visible() {
      if (!this.enabled || ERX.Scenes.busy) return false;
      const top = ERX.Scenes.top();
      if (!top || top.id !== 'game') return false;
      return top.state === 'play' && !top.dialogue.active && !top.cine;
    },

    // ------------------------------------------------------------- layout
    /** Safe-area insets (notches) in internal pixels. */
    _insets() {
      if (!this.probe) {
        // a hidden element padded by the safe-area insets, so they can be measured
        this.probe = document.createElement('div');
        this.probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:0 var(--sar) var(--sab) var(--sal);';
        document.body.appendChild(this.probe);
      }
      const cs = getComputedStyle(this.probe);
      const D = ERX.Display, k = (window.devicePixelRatio || 1) / (D.scale || 1);
      return { l: (parseFloat(cs.paddingLeft) || 0) * k, r: (parseFloat(cs.paddingRight) || 0) * k, b: (parseFloat(cs.paddingBottom) || 0) * k };
    },
    _layout(W, H) {
      const key = W + 'x' + H;
      if (key === this.layoutKey) return;
      this.layoutKey = key;
      const ins = this._insets();
      const L = 10 + ins.l, R = W - 10 - ins.r, B = H - 8 - ins.b;
      this.buttons = [
        { id: 'pad', x: L + 46, y: B - 26, r: 34, wide: true },
        { id: 'jump', action: 'jump', x: R - 28, y: B - 28, r: 24 },
        { id: 'attack', action: 'attack', x: R - 82, y: B - 18, r: 19 },
        { id: 'dash', action: 'dash', x: R - 28, y: B - 80, r: 16 },
        { id: 'block', action: 'block', x: R - 130, y: B - 16, r: 16 },
        { id: 'use', action: 'use', x: R - 84, y: B - 64, r: 14 },
        { id: 'ability1', action: 'ability1', x: R - 170, y: B - 16, r: 13, element: true, slot: 's1' },
        { id: 'ability2', action: 'ability2', x: R - 166, y: B - 48, r: 13, element: true, slot: 's2' },
        { id: 'ability3', action: 'ability3', x: R - 146, y: B - 78, r: 13, element: true, slot: 's3' },
        { id: 'ability4', action: 'ability4', x: R - 116, y: B - 100, r: 13, element: true, slot: 's4' },
        { id: 'ability5', action: 'ability5', x: R - 80, y: B - 112, r: 13, element: true, slot: 's5' },
        { id: 'ultimate', action: 'ultimate', x: R - 40, y: B - 124, r: 15, element: true, slot: 'ult' },
        { id: 'awaken', action: 'awaken', x: R - 40, y: B - 160, r: 12, element: true, slot: 'awk' },
        { id: 'pause', x: W - 14 - ins.r, y: 14, r: 10 },
        { id: 'inventory', action: 'inventory', x: W - 40 - ins.r, y: 14, r: 10 },
        { id: 'skills', action: 'skills', x: W - 66 - ins.r, y: 14, r: 10 },
      ];
    },
    _hasElement() { const g = ERX.Scenes.top(); return !!(g && g.player && g.player.kit && g.player.kit()); },
    /** The AWAKEN button only shows once Awakening is earned (or the admin has it going). */
    _awkShown() { const g = ERX.Scenes.top(), ab = g && g.player && g.player.ab; return !!ab && (ERX.Awakening.unlocked(g) || ab.awakened() || ab.awk > 0); },
    _hit(x, y) {
      let best = null, bd = Infinity;
      const el = this._hasElement();
      for (const b of this.buttons) {
        if (b.element && !el) continue;
        if (b.slot === 'awk' && !this._awkShown()) continue;
        const dx = (x - b.x) / (b.wide ? 1.5 : 1), dy = y - b.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < b.r + 8 && d - b.r < bd) { best = b; bd = d - b.r; }
      }
      return best;
    },

    // ------------------------------------------------------------- render
    render(ctx, W, H) {
      if (!this.enabled) return;
      this._layout(W, H);
      if (W < H) { this._renderRotate(ctx, W, H); return; }
      if (!this.visible()) {
        if (this.down.size) this.down.clear();
        this.owned.clear();
        return;
      }
      const g = ERX.Scenes.top();
      const hasEl = this._hasElement();
      for (const b of this.buttons) {
        if (b.element && !hasEl) continue;
        if (b.slot === 'awk' && !this._awkShown()) continue;
        if (b.element) { this._renderAbility(ctx, b, g); continue; }
        const held = b.id === 'pad' ? false : b.action ? this.down.has(b.action) : false;
        const glow = b.id === 'use' && !!g.prompt;
        if (b.id === 'pad') { this._renderPad(ctx, b); continue; }
        this._circle(ctx, b.x, b.y, b.r, held, glow);
        const text = b.id === 'pause' ? 'II' : b.id === 'skills' ? '★' : LABELS[b.action];
        F().draw(ctx, text, Math.round(b.x), Math.round(b.y - 3), { color: held ? '#120c1a' : glow ? '#ffd34d' : '#ffffff', align: 'center', alpha: held ? 1 : 0.85 });
      }
    },
    /** An ability button: the move's symbol + its cooldown; ULT = your element's symbol filling with energy. */
    _renderAbility(ctx, b, g) {
      if (b.slot === 'awk') { this._renderAwaken(ctx, b, g); return; }
      const ab = g.player.ab, r = ab.ready(b.slot), held = this.down.has(b.action), el = g.element(), t = g.t, Sy = ERX.Symbols;
      const ult = b.slot === 'ult', full = ult && ab.ult >= 100;
      this._circle(ctx, b.x, b.y, b.r, held, full && r === 'ok');
      ctx.save();
      if (ult && ab.ult > 0) {
        // the energy filling the button
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 1, 0, Math.PI * 2); ctx.clip();
        ctx.globalAlpha = full ? 0.5 + 0.15 * Math.sin(t * 6) : 0.4;
        ctx.fillStyle = el.color;
        const h = Math.round(2 * b.r * Math.min(1, ab.ult / 100));
        ctx.fillRect(b.x - b.r, b.y + b.r - h, b.r * 2, h);
      } else if (!ult && ab.cd[b.slot] > 0) {
        const k = ab.cdFrac(b.slot);
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.arc(b.x, b.y, b.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.closePath();
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fill();
      }
      ctx.restore();
      const dim = r === 'locked', ak = g.player.awk && g.player.awk(), col = ak ? ak.color : null;
      if (ult) Sy.element(ctx, el.id, b.x, b.y, 2, { dim, glow: full && !dim ? 0.55 + 0.45 * Math.sin(t * 7) : 0, t, color: col });
      else Sy.move(ctx, el.id, b.slot, b.x, b.y, 2, { dim, t, awakened: !!ak, color: col });
      if (r === 'mana') { ctx.save(); ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.strokeStyle = '#3a8aff'; ctx.stroke(); ctx.restore(); }
    },
    /** The AWAKEN button: a ring that fills as you fight; glows when you can awaken. */
    _renderAwaken(ctx, b, g) {
      const p = g.player, ab = p.ab, el = g.element(), kit = ERX.Awakening.kit(el.id);
      if (!kit) return;
      const ak = ab.awakened(), ready = !ak && ab.awk >= 100, held = this.down.has(b.action), t = g.t;
      this._circle(ctx, b.x, b.y, b.r, held, ready);
      const frac = ak ? ab.awakenT / ERX.Awakening.TIME : ab.awk / 100;
      ctx.save();
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 1, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
      ctx.strokeStyle = kit.color; ctx.lineWidth = 2; ctx.globalAlpha = ready || ak ? 0.75 + 0.25 * Math.sin(t * 8) : 0.6; ctx.stroke();
      ctx.restore();
      ERX.Symbols.element(ctx, el.id, b.x, b.y, 1, { dim: !ready && !ak, color: kit.color, glow: ready ? 0.6 + 0.4 * Math.sin(t * 7) : 0, t });
    },
    _circle(ctx, x, y, r, held, glow) {
      x = Math.round(x); y = Math.round(y);
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = held ? 'rgba(255,255,255,0.75)' : glow ? 'rgba(90,60,10,0.55)' : 'rgba(10,8,24,0.42)';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = glow ? 'rgba(255,211,77,0.95)' : 'rgba(255,255,255,0.45)';
      ctx.stroke();
      ctx.restore();
    },
    _renderPad(ctx, b) {
      const l = this.down.has('moveLeft'), r = this.down.has('moveRight');
      const w = Math.round(b.r * 1.5);
      this._circle(ctx, b.x - w / 2, b.y, b.r * 0.7, l, false);
      this._circle(ctx, b.x + w / 2, b.y, b.r * 0.7, r, false);
      F().draw(ctx, '←', Math.round(b.x - w / 2), Math.round(b.y - 3), { color: l ? '#120c1a' : '#ffffff', align: 'center', scale: 2 });
      F().draw(ctx, '→', Math.round(b.x + w / 2), Math.round(b.y - 3), { color: r ? '#120c1a' : '#ffffff', align: 'center', scale: 2 });
    },
    _renderRotate(ctx, W, H) {
      ctx.fillStyle = 'rgba(5,6,12,0.92)';
      ctx.fillRect(0, 0, W, H);
      const t = performance.now() / 1000;
      const cx = Math.round(W / 2), cy = Math.round(H / 2) - 30;
      // a little phone, tipping sideways
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-Math.PI / 2 * Math.min(1, Math.max(0, (Math.sin(t * 2) + 0.4))));
      ctx.fillStyle = '#d4daf5'; ctx.fillRect(-12, -20, 24, 40);
      ctx.fillStyle = '#1c2348'; ctx.fillRect(-10, -16, 20, 30);
      ctx.restore();
      F().draw(ctx, 'TURN YOUR PHONE', cx, cy + 36, { color: '#ffffff', align: 'center', scale: 2 });
      F().draw(ctx, 'SIDEWAYS', cx, cy + 56, { color: '#ffffff', align: 'center', scale: 2 });
      F().draw(ctx, 'The elements need room.', cx, cy + 80, { color: '#9aa3cf', align: 'center' });
    },

    // ------------------------------------------------------------- extras
    /** First touch: go fullscreen (hides the browser bars) and prefer landscape. */
    _maybeFullscreen() {
      if (this.fullscreenTried) return;
      this.fullscreenTried = true;
      if (/Electron/.test(navigator.userAgent)) return;   // the desktop app has its own window (F11)
      try {
        const el = document.documentElement;
        if (!document.fullscreenElement && el.requestFullscreen) {
          const p = el.requestFullscreen({ navigationUI: 'hide' });
          if (p && p.then) p.then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* ignore */ } }).catch(() => {});
        }
      } catch (e) { /* not supported (iPhone): fine */ }
    },

    /** Name entry: a tap on the text box (or empty space) opens the phone keyboard. */
    _maybeKeyboard(p) {
      const top = ERX.Scenes.top();
      const hit = top && top.group && top.group.hit ? top.group.hit(p.x, p.y) : null;
      if (hit && hit !== top.textBox) return;
      const el = this._field();
      el.value = '';
      el.focus({ preventScroll: true });
    },
    _field() {
      if (this.field) return this.field;
      const el = document.createElement('input');
      el.type = 'text';
      el.autocomplete = 'off';
      el.autocapitalize = 'words';
      el.spellcheck = false;
      el.setAttribute('aria-label', 'Character name');
      el.style.cssText = 'position:fixed;left:0;bottom:0;width:1px;height:1px;opacity:0;border:0;padding:0;font-size:16px;';
      // text arrives here and is handed to the game as if it were typed
      el.addEventListener('beforeinput', (e) => {
        if (!ERX.Input.textMode) return;
        if (e.inputType === 'insertText' && e.data) for (const ch of e.data) ERX.Input.text.push(ch);
        else if (e.inputType === 'deleteContentBackward') ERX.Input.text.push('\b');
        else if (e.inputType === 'insertLineBreak') ERX.Input.actions.push('confirm');
        e.preventDefault();
      });
      el.addEventListener('blur', () => { el.value = ''; });
      document.body.appendChild(el);
      this.field = el;
      return el;
    },
    /** Called every frame: close the keyboard once text entry ends. */
    update() {
      if (this.field && !ERX.Input.textMode && document.activeElement === this.field) {
        this.field.blur();
        ERX.Display.canvas.focus({ preventScroll: true });
      }
    },
  };

  ERX.Touch = Touch;
})(window.ERX = window.ERX || {});
