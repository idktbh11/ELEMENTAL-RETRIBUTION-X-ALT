// Starts Electron (used by `npm start` / `npm run phone`).
// VS Code terminals set ELECTRON_RUN_AS_NODE=1, which would make Electron
// behave like plain Node and never open a window, so it is removed here.
const { spawn } = require('child_process');
const path = require('path');
const electron = require('electron');   // from plain Node, this is the path to electron.exe

const env = Object.assign({}, process.env);
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(electron, [path.join(__dirname, 'main.js')].concat(process.argv.slice(2)), { stdio: 'inherit', env });
child.on('close', (code) => process.exit(code || 0));
