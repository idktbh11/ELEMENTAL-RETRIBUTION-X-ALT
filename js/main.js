/*
 * Boot + main loop. Wires every system together in the right order.
 */
(function (ERX) {
  'use strict';

  const Game = {
    running: false,
    last: 0,
    time: 0,
    ready: false,
  };

  function drawLoading(ctx, W, H, t) {
    ctx.fillStyle = '#05060c';
    ctx.fillRect(0, 0, W, H);
    const dots = '...'.slice(0, 1 + (Math.floor(t * 3) % 3));
    ERX.Font.draw(ctx, 'SUMMONING PIXELS' + dots, W / 2 - 46, H / 2 - 4, { color: '#9aa3cf' });
  }

  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - Game.last) / 1000;
    Game.last = now;
    if (!(dt > 0)) dt = 0;
    dt = Math.min(dt, ERX.Config.MAX_DT);
    Game.time += dt;

    const D = ERX.Display, ctx = D.ctx, W = D.width, H = D.height;
    const input = ERX.Input;

    if (!Game.ready) {
      drawLoading(ctx, W, H, Game.time);
      input.endFrame();
      return;
    }

    // ---- update ----
    input.update(dt);
    ERX.Touch.update();
    ERX.FX.update(dt);
    if (!ERX.Scenes.worldHidden) ERX.Backgrounds.update(dt, input);
    ERX.Scenes.update(dt, input);
    ERX.Toast.update(dt);
    ERX.Achievements.update(dt);
    ERX.Cursor.update(dt, input);
    ERX.Audio.update(dt);
    ERX.Fps.update(dt);

    // ---- render ----
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#05060c';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(ERX.FX.x, ERX.FX.y);
    // Neon Jam: the whole screen thumps to the beat, and now and then spins round or flips upside down and back
    const jam = ERX.NeonJam && ERX.NeonJam.screen();
    if (jam) { ctx.translate(W / 2, H / 2); ctx.rotate(jam.rot); ctx.scale(jam.scale, jam.scale * jam.fy); ctx.translate(-W / 2, -H / 2); }
    if (!ERX.Scenes.worldHidden) ERX.Backgrounds.render(ctx);
    ERX.Scenes.render(ctx);
    ctx.restore();
    ERX.Touch.render(ctx, W, H);
    ERX.Toast.render(ctx, W, H);
    ERX.Achievements.render(ctx, W, H);
    ERX.Scenes.renderTransition(ctx, W, H);
    ERX.Fps.render(ctx);
    if (ERX.Config.DEBUG) drawDebug(ctx, W, H);
    ERX.Cursor.render(ctx, input);

    input.endFrame();
  }

  function drawDebug(ctx, W, H) {
    const lines = [
      'SCREEN ' + W + 'x' + H + ' @' + ERX.Display.scale + 'x',
      'WORLD ' + (ERX.Backgrounds.current ? ERX.Backgrounds.current.id : '-') + ' SEED ' + ERX.Backgrounds.seed,
      'STACK ' + ERX.Scenes.stack.map((s) => s.id).join(' > '),
      'AUDIO ' + (ERX.Audio.ctx ? ERX.Audio.ctx.state : 'locked'),
    ];
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(2, 14, 150, lines.length * 10 + 4);
    lines.forEach((l, i) => ERX.Font.draw(ctx, l, 5, 16 + i * 10, { color: '#72e05a' }));
  }

  function boot() {
    const canvas = document.getElementById('game');
    ERX.Display.init(canvas);
    ERX.Font.init();
    ERX.Sprites.init();
    ERX.Settings.load();
    ERX.Admin.load();
    ERX.Keybinds.init();
    ERX.Input.init(canvas);
    ERX.Audio.init();
    ERX.Backgrounds.init();

    Game.last = performance.now();
    requestAnimationFrame(frame);

    ERX.Assets.loadAll().then(() => {
      ERX.Backgrounds.start(ERX.Backgrounds.pick());
      ERX.Scenes.push('mainMenu');
      ERX.Scenes.transition('dissolve', 1.4, null, { revealOnly: true, silent: true });
      Game.ready = true;
      canvas.focus();
    });
  }

  ERX.Game = Game;
  boot();
})(window.ERX = window.ERX || {});
