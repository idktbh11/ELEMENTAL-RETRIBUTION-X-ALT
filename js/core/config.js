/*
 * ELEMENTAL RETRIBUTION X — global configuration.
 *
 * Every script attaches itself to the single global namespace `ERX`.
 * Scripts are plain (non-module) files so the game runs by simply
 * double-clicking index.html — no build step, no local server required.
 */
(function (ERX) {
  'use strict';

  const params = new URLSearchParams(window.location.search);

  ERX.Config = {
    TITLE: 'ELEMENTAL RETRIBUTION X',
    VERSION: 'v1.1',
    BUILD_NAME: 'MAIN MENU MILESTONE',

    // Pixel scaling: the game renders to a small internal canvas at least
    // MIN_HEIGHT pixels tall, scaled up by the largest whole-number factor
    // that fits (1080p -> 4x = 480x270, 1440p -> 5x, 4K -> 8x, ...).
    MIN_HEIGHT: 250,
    MIN_WIDTH: 320,

    // Frame timing
    MAX_DT: 1 / 15,

    // Persistence
    STORAGE_PREFIX: 'erx.',
    SETTINGS_VERSION: 1,

    // Developer switches (URL query string):
    //   ?scene=sky|village|tree|peaks   force a menu environment
    //   ?debug                          show debug overlay + extra logging
    //   ?seed=1234                      force the world-generation seed
    DEBUG: params.has('debug'),
    FORCE_SCENE: params.get('scene'),
    FORCE_SEED: params.has('seed') ? (parseInt(params.get('seed'), 10) >>> 0) : null,
    params,
  };

  /*
   * Centralised asset paths. Everything the game loads from disk is listed
   * here so assets can be swapped without hunting through code.
   *
   * Audio entries are optional: leave them `null` to use the built-in
   * procedural (code-generated) music/ambience, or point them at your own
   * .ogg/.mp3 files to override a track.
   */
  ERX.AssetPaths = {
    images: {
      logo: 'assets/images/logo.png',
    },
    music: {
      sky: null,
      village: null,
      tree: null,
      peaks: null,
      // Neon Jam (type "neonjam" on the main menu): Boss Battle first, then Boss Protocol Engaged, round and round
      neonjam: ['assets/audio/neonjam-1-boss-battle.mp3', 'assets/audio/neonjam-2-boss-protocol-engaged.mp3'],
    },
    ambience: {
      sky: null,
      village: null,
      tree: null,
      peaks: null,
    },
  };
})(window.ERX = window.ERX || {});
