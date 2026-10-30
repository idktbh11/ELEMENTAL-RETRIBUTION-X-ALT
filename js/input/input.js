/*
 * Input manager — keyboard, mouse/pointer, touch and gamepad.
 * (Touch: in gameplay, touches go to the on-screen controls in touch.js;
 * everywhere else a tap behaves like a mouse click.)
 *
 * Two layers:
 *   1. Raw state (which keys/buttons are down, pressed this frame, ...).
 *   2. UI actions ('up', 'down', 'left', 'right', 'confirm', 'back',
 *      'nextTab', 'prevTab', ...) produced from fixed menu keys, so the
 *      menus can never be broken by a bad keybind.
 *
 * Gameplay actions (jump, attack, ...) are mapped on top of the raw layer
 * by ERX.Keybinds.
 */
(function (ERX) {
  'use strict';

  const UI_KEYS = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    Enter: 'confirm', NumpadEnter: 'confirm', Space: 'confirm',
    Escape: 'back', Backspace: 'back',
    KeyQ: 'prevTab', KeyE: 'nextTab',
    PageUp: 'pageUp', PageDown: 'pageDown',
    Home: 'home', End: 'end',
    Delete: 'delete',
  };

  // Keys whose default browser behaviour (scrolling, focus change, back
  // navigation) must be suppressed while the game has focus.
  const PREVENT = new Set([
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab', 'Backspace',
    'Enter', 'NumpadEnter', 'PageUp', 'PageDown', 'Home', 'End', 'Quote', 'Slash',
  ]);

  const PAD = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
  const REPEAT_DELAY = 0.38, REPEAT_RATE = 0.09;

  const Input = {
    down: new Set(),
    pressed: new Set(),
    released: new Set(),
    actions: [],
    mouse: {
      x: -100, y: -100,
      down: [false, false, false],
      pressed: [false, false, false],
      released: [false, false, false],
      wheel: 0,
      moved: false,
      present: false,
    },
    lastDevice: 'keyboard',
    typed: '',
    capture: null,
    pad: { index: -1, prev: [], heldDir: null, heldTime: 0, nextRepeat: 0 },
    gestureSeen: false,
    textMode: false,   // set by screens with a text field
    text: [],          // characters typed this frame (backslash-b = backspace)

    init(canvas) {
      this.canvas = canvas;
      window.addEventListener('keydown', (e) => this._onKeyDown(e));
      window.addEventListener('keyup', (e) => this._onKeyUp(e));
      window.addEventListener('blur', () => this._clearAll());
      document.addEventListener('visibilitychange', () => { if (document.hidden) this._clearAll(); });

      canvas.addEventListener('pointermove', (e) => this._onPointerMove(e));
      canvas.addEventListener('pointerdown', (e) => this._onPointerDown(e));
      window.addEventListener('pointerup', (e) => this._onPointerUp(e));
      window.addEventListener('pointercancel', (e) => this._onPointerUp(e));
      canvas.addEventListener('pointerleave', () => { this.mouse.present = false; });
      canvas.addEventListener('pointerenter', () => { this.mouse.present = true; });
      canvas.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());

      window.addEventListener('gamepadconnected', (e) => {
        this.pad.index = e.gamepad.index;
        ERX.Toast && ERX.Toast.show('Gamepad connected. Fancy.', { color: '#a8f0ff' });
      });
      window.addEventListener('gamepaddisconnected', (e) => {
        if (this.pad.index === e.gamepad.index) this.pad.index = -1;
      });
    },

    _gesture() {
      if (!this.gestureSeen) {
        this.gestureSeen = true;
      }
      ERX.Events.emit('input:gesture');
    },

    _clearAll() {
      this.down.clear();
      this.mouse.down = [false, false, false];
      this.pad.heldDir = null;
    },

    _onKeyDown(e) {
      const code = e.code || e.key;
      // Leave browser/OS shortcuts alone (reload, devtools, copy, ...).
      if (code === 'F5' || code === 'F11' || code === 'F12') return;
      if ((e.ctrlKey || e.metaKey) && code !== 'Enter') return;

      if (e.altKey && (code === 'Enter' || code === 'NumpadEnter')) {
        e.preventDefault();
        if (!e.repeat) ERX.Display.toggleFullscreen();
        return;
      }

      if (ERX.Touch && ERX.Touch.field && e.target === ERX.Touch.field) {
        if (code === 'Enter' || code === 'NumpadEnter') { e.preventDefault(); if (!e.repeat) this.actions.push('confirm'); }
        return;
      }
      if (PREVENT.has(code) || this.capture) e.preventDefault();
      this.lastDevice = 'keyboard';
      this._gesture();

      if (this.capture) {
        if (!e.repeat && this.capture.armed) {
          if (code === 'Escape') this._finishCapture(null, 'cancel');
          else if (code === 'Delete') this._finishCapture(null, 'clear');
          else this._finishCapture(code, 'bound');
        }
        this.down.add(code);
        return;
      }

      // Text entry (e.g. naming a character): printable keys become text,
      // only Enter / Esc / arrows / Tab still act as menu controls.
      if (this.textMode) {
        e.preventDefault();
        if (!e.repeat) { this.down.add(code); this.pressed.add(code); }
        if (code === 'Backspace') this.text.push('\b');
        else if (e.key && e.key.length === 1) this.text.push(e.key);
        else if (code === 'Enter' || code === 'NumpadEnter') { if (!e.repeat) this.actions.push('confirm'); }
        else if (code === 'Escape') { if (!e.repeat) this.actions.push('back'); }
        else if (code === 'ArrowUp') this.actions.push('up');
        else if (code === 'ArrowDown' || code === 'Tab') this.actions.push(e.shiftKey ? 'up' : 'down');
        else if (code === 'ArrowLeft') this.actions.push('left');
        else if (code === 'ArrowRight') this.actions.push('right');
        return;
      }

      if (!e.repeat) {
        this.down.add(code);
        this.pressed.add(code);
        if (e.key && e.key.length === 1) this.typed = (this.typed + e.key.toLowerCase()).slice(-24);
      }

      if (code === 'Tab') this.actions.push(e.shiftKey ? 'prevTab' : 'nextTab');
      else if (UI_KEYS[code]) this.actions.push(UI_KEYS[code]);
    },

    _onKeyUp(e) {
      const code = e.code || e.key;
      if (this.down.has(code)) {
        this.down.delete(code);
        this.released.add(code);
      }
    },

    _onPointerMove(e) {
      const p = ERX.Display.toInternal(e.clientX, e.clientY);
      if (e.pointerType === 'touch' && ERX.Touch && ERX.Touch.pointerMove(e, p)) return;
      if (Math.abs(p.x - this.mouse.x) >= 0.5 || Math.abs(p.y - this.mouse.y) >= 0.5) {
        this.mouse.moved = true;
        this.lastDevice = 'mouse';
      }
      this.mouse.x = p.x;
      this.mouse.y = p.y;
      this.mouse.present = true;
      if (e.pointerType === 'touch') this.lastDevice = 'touch';
    },

    _onPointerDown(e) {
      this._gesture();
      if (e.pointerType === 'touch' && ERX.Touch) {
        this.lastDevice = 'touch';
        e.preventDefault();
        if (ERX.Touch.pointerDown(e, ERX.Display.toInternal(e.clientX, e.clientY))) return;
      }
      this._onPointerMove(e);
      this.lastDevice = e.pointerType === 'touch' ? 'touch' : 'mouse';
      const b = e.button | 0;
      if (b > 2) return;
      try { this.canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      if (this.capture) {
        if (this.capture.armed) this._finishCapture('Mouse' + b, 'bound');
        this.mouse.down[b] = true;
        this.mouse.swallow = true;
        return;
      }
      this.mouse.down[b] = true;
      this.mouse.pressed[b] = true;
      this.mouse.moved = true; // treat as hover update
    },

    _onPointerUp(e) {
      if (e.pointerType === 'touch') {
        this._gesture();   // some phones only allow sound to start on touch-up
        if (ERX.Touch && ERX.Touch.pointerUp(e)) return;
      }
      const b = e.button | 0;
      if (b > 2) return;
      if (this.mouse.down[b]) {
        this.mouse.down[b] = false;
        if (this.mouse.swallow) {
          this.mouse.swallow = false;
          return;
        }
        this.mouse.released[b] = true;
      }
    },

    _onWheel(e) {
      e.preventDefault();
      if (e.deltaY === 0) return;
      if (this.capture) {
        if (this.capture.armed) this._finishCapture(e.deltaY < 0 ? 'WheelUp' : 'WheelDown', 'bound');
        return;
      }
      this.mouse.wheel += e.deltaY > 0 ? 1 : -1;
    },

    /**
     * Rebinding support: the next key / mouse button / wheel notch is routed
     * to `cb(code, reason)` instead of the UI. reason: 'bound'|'cancel'|'clear'.
     * Capture only arms once every currently-held input is released, so the
     * Enter/click that started the rebind is never captured by mistake.
     */
    beginCapture(cb) {
      this.capture = { cb, armed: false };
    },

    cancelCapture() {
      if (this.capture) this._finishCapture(null, 'cancel');
    },

    get capturing() {
      return !!this.capture;
    },

    _finishCapture(code, reason) {
      const cb = this.capture.cb;
      this.capture = null;
      cb(code, reason);
    },

    _pollGamepad(dt) {
      if (!navigator.getGamepads) return;
      const pads = navigator.getGamepads();
      let gp = this.pad.index >= 0 ? pads[this.pad.index] : null;
      if (!gp) {
        for (const p of pads) if (p && p.connected) { gp = p; this.pad.index = p.index; break; }
      }
      if (!gp) return;

      const pressed = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
      const edge = (i) => pressed(i) && !this.pad.prev[i];
      const any = gp.buttons.some((b) => b && b.pressed);
      if (any) { this.lastDevice = 'gamepad'; this._gesture(); }

      if (!this.capture) {
        if (edge(PAD.A) || edge(PAD.START)) this.actions.push('confirm');
        if (edge(PAD.B)) this.actions.push('back');
        if (edge(PAD.LB)) this.actions.push('prevTab');
        if (edge(PAD.RB)) this.actions.push('nextTab');

        const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
        let dir = null;
        if (pressed(PAD.UP) || ay < -0.55) dir = 'up';
        else if (pressed(PAD.DOWN) || ay > 0.55) dir = 'down';
        else if (pressed(PAD.LEFT) || ax < -0.55) dir = 'left';
        else if (pressed(PAD.RIGHT) || ax > 0.55) dir = 'right';

        if (dir) {
          this.lastDevice = 'gamepad';
          if (dir !== this.pad.heldDir) {
            this.pad.heldDir = dir;
            this.pad.heldTime = 0;
            this.pad.nextRepeat = REPEAT_DELAY;
            this.actions.push(dir);
            this._gesture();
          } else {
            this.pad.heldTime += dt;
            if (this.pad.heldTime >= this.pad.nextRepeat) {
              this.pad.nextRepeat += REPEAT_RATE;
              this.actions.push(dir);
            }
          }
        } else {
          this.pad.heldDir = null;
        }
      }
      this.pad.prev = gp.buttons.map((b) => !!(b && b.pressed));
    },

    /** Called once per frame before game logic. */
    update(dt) {
      this._pollGamepad(dt);
      if (this.capture && !this.capture.armed) {
        const anyMouse = this.mouse.down[0] || this.mouse.down[1] || this.mouse.down[2];
        if (this.down.size === 0 && !anyMouse) this.capture.armed = true;
      }
    },

    /** Called once per frame after game logic. */
    endFrame() {
      this.pressed.clear();
      this.released.clear();
      this.actions.length = 0;
      this.text.length = 0;
      this.mouse.pressed = [false, false, false];
      this.mouse.released = [false, false, false];
      this.mouse.wheel = 0;
      this.mouse.moved = false;
      if (ERX.Touch) ERX.Touch.endFrame();
    },

    hasAction(name) {
      return this.actions.indexOf(name) !== -1;
    },

    /** Remove an action so lower layers don't also react to it. */
    consumeAction(name) {
      const i = this.actions.indexOf(name);
      if (i !== -1) this.actions.splice(i, 1);
    },

    // ---- raw code queries (used by Keybinds / future gameplay) ----
    isCodeDown(code) {
      if (!code) return false;
      if (code.indexOf('Mouse') === 0) return !!this.mouse.down[+code.slice(5)];
      if (code === 'WheelUp') return this.mouse.wheel < 0;
      if (code === 'WheelDown') return this.mouse.wheel > 0;
      return this.down.has(code);
    },

    wasCodePressed(code) {
      if (!code) return false;
      if (code.indexOf('Mouse') === 0) return !!this.mouse.pressed[+code.slice(5)];
      if (code === 'WheelUp') return this.mouse.wheel < 0;
      if (code === 'WheelDown') return this.mouse.wheel > 0;
      return this.pressed.has(code);
    },
  };

  ERX.Input = Input;
})(window.ERX = window.ERX || {});
