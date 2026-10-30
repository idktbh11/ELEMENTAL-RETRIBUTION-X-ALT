/*
 * Keybinds — remappable gameplay actions.
 *
 * Each action has two slots (primary + alternate). A slot holds an input
 * code: a KeyboardEvent.code ('KeyA', 'Space', ...), 'Mouse0'..'Mouse2',
 * or 'WheelUp'/'WheelDown'.
 *
 * Future gameplay code reads input ONLY through this module:
 *   ERX.Keybinds.isDown('jump'), ERX.Keybinds.wasPressed('attack')
 */
(function (ERX) {
  'use strict';

  const ACTIONS = [
    { id: 'moveLeft', label: 'Move Left', defaults: ['KeyA', 'ArrowLeft'] },
    { id: 'moveRight', label: 'Move Right', defaults: ['KeyD', 'ArrowRight'] },
    { id: 'jump', label: 'Jump', defaults: ['Space', 'KeyW'] },
    { id: 'attack', label: 'Attack', defaults: ['KeyJ', 'Mouse0'] },
    { id: 'block', label: 'Block', defaults: ['KeyK', 'Mouse2'] },
    { id: 'dash', label: 'Dash', defaults: ['ShiftLeft', 'KeyL'] },
    { id: 'inventory', label: 'Inventory', defaults: ['KeyI', 'Tab'] },
    { id: 'use', label: 'Use', defaults: ['KeyE', 'KeyF'] },
    { id: 'zoomIn', label: 'Zoom In', defaults: ['Equal', 'WheelUp'] },
    { id: 'zoomOut', label: 'Zoom Out', defaults: ['Minus', 'WheelDown'] },
    { id: 'skills', label: 'Skill Tree', defaults: ['KeyT', null] },
    { id: 'ability1', label: 'Ability 1', defaults: ['KeyQ', 'Digit1'] },
    { id: 'ability2', label: 'Ability 2', defaults: ['KeyR', 'Digit2'] },
    { id: 'ability3', label: 'Ability 3', defaults: ['KeyC', 'Digit3'] },
    { id: 'ability4', label: 'Ability 4', defaults: ['KeyX', 'Digit4'] },
    { id: 'ability5', label: 'Ability 5', defaults: ['KeyZ', 'Digit5'] },
    { id: 'ultimate', label: 'Ultimate', defaults: ['KeyV', 'Digit6'] },
    { id: 'awaken', label: 'Awaken', defaults: ['KeyG', 'Digit7'] },
    { id: 'aimDown', label: 'Aim Down', defaults: ['KeyS', 'ArrowDown'] },
  ];

  // Inputs that can never be bound (ESC is the universal back/pause key).
  const RESERVED = {
    Escape: 'ESC is reserved. It has important back-button duties.',
    F5: 'F5 belongs to the browser. It reloads things. Violently.',
    F11: 'F11 belongs to your browser (fullscreen).',
    F12: 'F12 belongs to your browser (dev tools).',
    MetaLeft: 'The system key belongs to your operating system.',
    MetaRight: 'The system key belongs to your operating system.',
    OSLeft: 'The system key belongs to your operating system.',
    OSRight: 'The system key belongs to your operating system.',
    ContextMenu: 'That key summons the context menu. Leave it alone.',
  };

  const NAMES = {
    Space: 'SPACE', Enter: 'ENTER', NumpadEnter: 'NUM ENTER', Tab: 'TAB', Backspace: 'BACKSPACE',
    ShiftLeft: 'L-SHIFT', ShiftRight: 'R-SHIFT', ControlLeft: 'L-CTRL', ControlRight: 'R-CTRL',
    AltLeft: 'L-ALT', AltRight: 'R-ALT', CapsLock: 'CAPS',
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\',
    Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backquote: '~',
    Insert: 'INSERT', Delete: 'DELETE', Home: 'HOME', End: 'END', PageUp: 'PG UP', PageDown: 'PG DN',
    NumpadAdd: 'NUM +', NumpadSubtract: 'NUM -', NumpadMultiply: 'NUM *', NumpadDivide: 'NUM /',
    NumpadDecimal: 'NUM .', IntlBackslash: '\\', Pause: 'PAUSE', ScrollLock: 'SCR LK', PrintScreen: 'PRT SC',
    Mouse0: 'MOUSE L', Mouse1: 'MOUSE MID', Mouse2: 'MOUSE R',
    WheelUp: 'WHEEL ↑', WheelDown: 'WHEEL ↓',
  };

  function codeLabel(code) {
    if (!code) return '---';
    if (NAMES[code]) return NAMES[code];
    if (/^Key[A-Z]$/.test(code)) return code.slice(3);
    if (/^Digit\d$/.test(code)) return code.slice(5);
    if (/^Numpad\d$/.test(code)) return 'NUM ' + code.slice(6);
    if (/^F\d+$/.test(code)) return code;
    return code.toUpperCase().slice(0, 9);
  }

  const Keybinds = {
    ACTIONS,
    bindings: {},

    init() {
      const saved = ERX.Settings.get('controls.bindings');
      this.bindings = {};
      for (const a of ACTIONS) {
        const s = saved && Array.isArray(saved[a.id]) ? saved[a.id] : null; // new actions fall back to defaults
        this.bindings[a.id] = s
          ? [this._valid(s[0]) ? s[0] : null, this._valid(s[1]) ? s[1] : null]
          : a.defaults.slice();
      }
      this._dedupe();
    },

    _valid(code) {
      return typeof code === 'string' && code.length > 0 && !RESERVED[code];
    },

    // Guard against corrupted saves where one code ended up on two slots.
    _dedupe() {
      const seen = new Set();
      for (const a of ACTIONS) {
        const b = this.bindings[a.id];
        for (let i = 0; i < 2; i++) {
          if (!b[i]) continue;
          if (seen.has(b[i])) b[i] = null;
          else seen.add(b[i]);
        }
      }
    },

    save() {
      ERX.Settings.set('controls.bindings', JSON.parse(JSON.stringify(this.bindings)));
    },

    action(id) {
      return ACTIONS.find((a) => a.id === id);
    },

    get(id) {
      return (this.bindings[id] || [null, null]).slice();
    },

    findOwner(code) {
      for (const a of ACTIONS) {
        const b = this.bindings[a.id];
        for (let i = 0; i < 2; i++) if (b[i] === code) return { id: a.id, slot: i };
      }
      return null;
    },

    /**
     * Assign `code` to action `id`, slot `slot`. Conflicts are resolved by
     * SWAPPING: whoever owned the key receives this slot's previous key, so
     * no two actions ever share a key and nothing is silently lost.
     * Returns { ok, message, swappedWith }.
     */
    assign(id, slot, code) {
      if (RESERVED[code]) return { ok: false, message: RESERVED[code] };
      const b = this.bindings[id];
      const previous = b[slot];
      if (previous === code) return { ok: true, message: null };

      const owner = this.findOwner(code);
      let message = null;
      let swappedWith = null;
      if (owner) {
        if (owner.id === id) {
          // Same action, other slot: just swap the two slots.
          b[owner.slot] = previous;
        } else {
          this.bindings[owner.id][owner.slot] = previous;
          swappedWith = owner.id;
          const otherLabel = this.action(owner.id).label.toUpperCase();
          message = previous
            ? codeLabel(code) + ' was on ' + otherLabel + '. Swapped: ' + otherLabel + ' now uses ' + codeLabel(previous) + '.'
            : codeLabel(code) + ' was taken from ' + otherLabel + '.';
        }
      }
      b[slot] = code;
      this.save();
      return { ok: true, message, swappedWith };
    },

    clear(id, slot) {
      this.bindings[id][slot] = null;
      this.save();
    },

    resetDefaults() {
      for (const a of ACTIONS) this.bindings[a.id] = a.defaults.slice();
      this.save();
    },

    unboundActions() {
      return ACTIONS.filter((a) => !this.bindings[a.id][0] && !this.bindings[a.id][1]);
    },

    // ---- queries for future gameplay ----
    isDown(id) {
      const b = this.bindings[id];
      return (!!b && (ERX.Input.isCodeDown(b[0]) || ERX.Input.isCodeDown(b[1]))) || (!!ERX.Touch && ERX.Touch.isDown(id));
    },

    wasPressed(id) {
      const b = this.bindings[id];
      return (!!b && (ERX.Input.wasCodePressed(b[0]) || ERX.Input.wasCodePressed(b[1]))) || (!!ERX.Touch && ERX.Touch.wasPressed(id));
    },

    label(id, slot = 0) {
      return codeLabel((this.bindings[id] || [])[slot]);
    },

    codeLabel,
    RESERVED,
  };

  ERX.Keybinds = Keybinds;
})(window.ERX = window.ERX || {});
