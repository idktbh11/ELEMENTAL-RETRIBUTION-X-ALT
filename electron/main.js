/*
 * Runs ELEMENTAL RETRIBUTION X as a desktop app with Electron.
 *
 *   npm start          normal window (keyboard / mouse / gamepad)
 *   npm run phone      phone-sized window where mouse clicks act as TOUCHES,
 *                      to try the mobile controls on a PC (drag the window
 *                      taller than it is wide to see the portrait notice)
 *
 *   F11 fullscreen, F12 developer tools, Ctrl+R reload
 */
const { app, BrowserWindow } = require('electron');
const path = require('path');

const PHONE = process.argv.includes('--phone');

function createWindow() {
  const win = new BrowserWindow({
    width: PHONE ? 844 : 1280,
    height: PHONE ? 390 : 720,
    useContentSize: true,
    minWidth: 320,
    minHeight: 250,
    backgroundColor: '#05060c',
    title: 'ELEMENTAL RETRIBUTION X' + (PHONE ? ' (phone mode)' : ''),
    icon: path.join(__dirname, '..', 'assets', 'images', 'favicon.png'),
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true },
  });

  if (PHONE) {
    // pretend to be a touch-screen phone: every mouse click becomes a tap
    const dbg = win.webContents.debugger;
    dbg.attach('1.3');
    dbg.sendCommand('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    dbg.sendCommand('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    // ...with a phone's dense screen (3 device pixels per CSS pixel), so the
    // game picks the same chunky pixel scale it would on a real phone
    const fit = () => {
      const [w, h] = win.getContentSize();
      return dbg.sendCommand('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 3, mobile: true }).catch(() => {});
    };
    // (applied once the page exists, then reloaded so the game starts up as a phone)
    win.webContents.once('dom-ready', () => { fit().then(() => win.webContents.reload()); win.on('resize', fit); });
  }

  // the game leaves F11 / F12 to "the browser" — here, that's us
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    else if (input.key === 'F12') { win.webContents.toggleDevTools(); e.preventDefault(); }
    else if (input.control && input.key.toLowerCase() === 'r') { win.webContents.reload(); e.preventDefault(); }
  });

  win.loadFile(path.join(__dirname, '..', 'index.html'));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
