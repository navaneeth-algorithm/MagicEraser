const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const https = require('https');
const path = require('path');

const port = 8080;
const settingsPath = () => path.join(app.getPath('userData'), 'settings.json');
let serverProcess;
let mainWindow;
let serverLog;
let isQuitting = false;

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

function projectDirectory() {
  return __dirname;
}

function requiredModels(modelFolder) {
  const checkpoints = path.join(modelFolder, 'torch', 'hub', 'checkpoints');
  return {
    folder: modelFolder,
    checkpoints,
    lama: path.join(checkpoints, 'big-lama.pt'),
    interactiveSeg: path.join(checkpoints, 'sam_vit_l_0b3195.pth')
  };
}

function modelStatus(modelFolder) {
  const models = requiredModels(modelFolder || '');
  return {
    folder: modelFolder || '',
    lama: Boolean(modelFolder && fs.existsSync(models.lama)),
    interactiveSeg: Boolean(modelFolder && fs.existsSync(models.interactiveSeg)),
    ready: Boolean(modelFolder && fs.existsSync(models.lama) && fs.existsSync(models.interactiveSeg))
  };
}

function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsPath(), 'utf8'));
  } catch {
    return {};
  }
}

function saveModelFolder(modelFolder) {
  fs.mkdirSync(app.getPath('userData'), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify({ modelFolder }, null, 2));
  return modelStatus(modelFolder);
}

function downloadModel(url, modelFolder) {
  const filename = path.basename(new URL(url).pathname);
  if (!filename || !/\.(pt|pth)$/i.test(filename)) {
    throw new Error('The URL must point directly to a .pt or .pth model file.');
  }
  const destination = path.join(requiredModels(modelFolder).checkpoints, filename);
  fs.mkdirSync(path.dirname(destination), { recursive: true });

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(destination);
    const request = https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        output.close();
        fs.unlinkSync(destination);
        downloadModel(response.headers.location, modelFolder).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        output.close();
        fs.unlinkSync(destination);
        reject(new Error(`Download failed with HTTP ${response.statusCode}.`));
        return;
      }
      response.pipe(output);
      output.on('finish', () => output.close(() => resolve(modelStatus(modelFolder))));
    });
    request.on('error', (error) => {
      output.close();
      if (fs.existsSync(destination)) fs.unlinkSync(destination);
      reject(error);
    });
  });
}

function waitForServer(attempts = 120) {
  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get(`http://127.0.0.1:${port}/`, (response) => {
        response.resume();
        if (response.statusCode >= 200 && response.statusCode < 500) {
          resolve();
        } else {
          retry();
        }
      });
      request.on('error', retry);
      request.setTimeout(1000, () => request.destroy());
    };
    const retry = () => {
      if (attempts <= 0) {
        reject(new Error('Magic Eraser did not start on port 8080.'));
        return;
      }
      attempts -= 1;
      setTimeout(check, 1000);
    };
    check();
  });
}

function startServer() {
  if (serverProcess && !serverProcess.killed) return;

  const projectDir = projectDirectory();
  const runtime = app.isPackaged
    ? path.join(process.resourcesPath, 'MagicEraserRuntime', 'MagicEraserRuntime')
    : path.join(projectDir, 'venv', 'bin', 'python');
  const entrypoint = app.isPackaged
    ? []
    : [path.join(__dirname, 'server_entry.py')];
  const args = [
    ...entrypoint,
    '--model=lama',
    '--device=cpu',
    `--port=${port}`,
    '--enable-interactive-seg',
    '--interactive-seg-device=mps'
  ];

  serverLog = path.join(app.getPath('userData'), 'lama-cleaner.log');
  const log = fs.openSync(serverLog, 'a');
  serverProcess = spawn(runtime, args, {
    cwd: projectDir,
    env: {
      ...process.env,
      OMP_NUM_THREADS: '1',
      XDG_CACHE_HOME: loadSettings().modelFolder
    },
    stdio: ['ignore', log, log]
  });
  serverProcess.on('error', (error) => {
    dialog.showErrorBox('Magic Eraser could not start', `${error.message}\n\nLog: ${serverLog}`);
  });
  serverProcess.on('exit', (code, signal) => {
    serverProcess = undefined;
    if (!isQuitting && mainWindow && !mainWindow.isDestroyed()) {
      dialog.showErrorBox(
        'Magic Eraser backend stopped',
        `The local backend stopped (code ${code ?? 'unknown'}, signal ${signal ?? 'none'}).\n\nLog: ${serverLog}`
      );
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 900,
    minHeight: 650,
    title: 'Magic Eraser',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const settings = loadSettings();
  if (!modelStatus(settings.modelFolder).ready) {
    mainWindow.loadFile(path.join(__dirname, 'setup.html'));
    return;
  }

  startServer();
  waitForServer(300).then(() => mainWindow.loadURL(`http://127.0.0.1:${port}`)).catch((error) => {
    dialog.showErrorBox('Magic Eraser could not start', error.message);
    app.quit();
  });
}

ipcMain.handle('get-model-status', () => modelStatus(loadSettings().modelFolder));
ipcMain.handle('choose-model-folder', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
  if (result.canceled || !result.filePaths[0]) return modelStatus(loadSettings().modelFolder);
  return saveModelFolder(result.filePaths[0]);
});
ipcMain.handle('download-model', async (_event, url) => {
  const modelFolder = loadSettings().modelFolder;
  if (!modelFolder) throw new Error('Choose a model folder first.');
  return downloadModel(url, modelFolder);
});
ipcMain.handle('launch-editor', async () => {
  const status = modelStatus(loadSettings().modelFolder);
  if (!status.ready) throw new Error('Both model files are required before launching.');
  startServer();
  await waitForServer(300);
  await mainWindow.loadURL(`http://127.0.0.1:${port}`);
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => {
  isQuitting = true;
  if (serverProcess && !serverProcess.killed) serverProcess.kill('SIGTERM');
});