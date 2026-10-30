/*
 * Character saves. Each character stores only what the player chose:
 * name + appearance (+ bookkeeping). The element is NOT chosen here: the
 * `element` field only appears after the reveal in the sealed chamber,
 * where it is assigned at random (see GameScreen.startReveal).
 *
 * Future progress (inventory, quests, location...) can be added to each
 * record; bump VERSION and migrate in load() when that happens.
 */
(function (ERX) {
  'use strict';

  const KEY = 'characters';
  const VERSION = 1;

  const Saves = {
    characters: [],

    load() {
      const raw = ERX.Storage.load(KEY, null);
      const list = raw && raw.version === VERSION && Array.isArray(raw.list) ? raw.list : [];
      this.characters = list.filter((c) => c && typeof c.name === 'string' && c.look).map((c) => Object.assign({}, c, {
        look: this.sanitizeLook(c.look),
        progress: c.progress && typeof c.progress.stage === 'string' ? c.progress : { stage: 'new' },
        skills: Object.assign({ vitality: 0, focus: 0, agility: 0 }, c.skills || {}),
        skillPoints: Number.isInteger(c.skillPoints) ? c.skillPoints : 0,
        gold: Number.isInteger(c.gold) && c.gold > 0 ? c.gold : 0,
        elementSkills: c.elementSkills && typeof c.elementSkills === 'object' ? Object.fromEntries(Object.entries(c.elementSkills).filter(([k, v]) => /^(m1|s[1-5]|ult|block|dash|potency)$/.test(k) && Number.isInteger(v) && v >= 0 && v <= 3)) : {},
        armor: ERX.Armor && ERX.Armor.get(c.armor) ? c.armor : null,
        armorOwned: Array.isArray(c.armorOwned) ? c.armorOwned.filter((id) => ERX.Armor && ERX.Armor.get(id)) : [],
      }));
      // the element only ever comes from the reveal; drop anything invalid
      for (const c of this.characters) if (!(ERX.Elements && ERX.Elements.get(c.element))) delete c.element;
      // a saved bag with anything broken in it gets tidied (older saves move into the bag when it's first used)
      for (const c of this.characters) if (ERX.Inventory) ERX.Inventory.clean(c);
      return this.characters;
    },

    save() {
      ERX.Storage.save(KEY, { version: VERSION, list: this.characters });
    },

    /** Clamp every appearance index into range (protects against old/corrupt saves). */
    sanitizeLook(look) {
      const D = ERX.Data.character;
      const clampIdx = (v, arr) => (Number.isInteger(v) && v >= 0 && v < arr.length ? v : 0);
      return {
        gender: clampIdx(look.gender, D.genders),
        skin: clampIdx(look.skin, D.skins),
        hair: clampIdx(look.hair, D.hairStyles),
        hairColor: clampIdx(look.hairColor, D.hairColors),
        eyes: clampIdx(look.eyes, D.eyeColors),
        outfit: clampIdx(look.outfit, D.outfits),
        outfitColor: clampIdx(look.outfitColor, D.outfitColors),
        pants: clampIdx(look.pants, D.pantsColors),
      };
    },

    randomLook() {
      const D = ERX.Data.character;
      const r = (arr) => Math.floor(Math.random() * arr.length);
      const pick = (arr) => arr[r(arr)];
      const gender = r(D.genders);
      return {
        gender,
        skin: r(D.skins.slice(0, 7)), // the green one is a fun surprise, not a default
        hair: gender === 1 ? pick([2, 3, 4, 6, 7]) : pick([0, 1, 5, 6, 7]),
        hairColor: r(D.hairColors),
        eyes: r(D.eyeColors),
        outfit: r(D.outfits),
        outfitColor: r(D.outfitColors),
        pants: r(D.pantsColors),
      };
    },

    get full() {
      return this.characters.length >= ERX.Data.character.MAX_CHARACTERS;
    },

    create(name, look) {
      const c = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name,
        look: this.sanitizeLook(look),
        created: Date.now(),
        lastPlayed: null,
        playTime: 0,
        level: 1,
        progress: { stage: 'new' },          // 'new' -> 'tutorialDone' -> 'reachedEnd'
        skills: { vitality: 0, focus: 0, agility: 0 },
        skillPoints: 0,
        gold: 0,                             // dropped by monsters, spent at the HQ
        elementSkills: {},                   // element skill tree ranks (js/screens/skill-tree.js)
        armor: null,                         // equipped armour id (see js/data/armor.js)
        armorOwned: [],
      };
      this.characters.push(c);
      this.save();
      return c;
    },

    remove(id) {
      this.characters = this.characters.filter((c) => c.id !== id);
      this.save();
    },

    get(id) {
      return this.characters.find((c) => c.id === id) || null;
    },

    /** Persist changes made to a character object (progress, skills...). */
    update(c) {
      const i = this.characters.findIndex((x) => x.id === c.id);
      if (i !== -1) { this.characters[i] = c; this.save(); }
    },

    touch(id) {
      const c = this.get(id);
      if (c) {
        c.lastPlayed = Date.now();
        this.save();
      }
    },
  };

  ERX.Saves = Saves;
})(window.ERX = window.ERX || {});
