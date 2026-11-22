import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog, session } from 'electron';
import path from 'path';
import fs from 'fs';
import { ProcessWatcher } from './processWatcher';
import { SaveWatcher } from './saveWatcher';
import { ReplayInspector } from './replayInspector';

// Ensure consistent userData path across development and production
const appDataEnv = process.env.APPDATA || '';
if (appDataEnv) {
  app.setPath('userData', path.join(appDataEnv, 'total-tracking'));
}

// Global crash logging
process.on('uncaughtException', (error) => {
  try {
    const logPath = path.join(app.getPath('userData'), 'crash.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] Uncaught Exception: ${error?.stack || error}\n`);
  } catch {}
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
  try {
    const logPath = path.join(app.getPath('userData'), 'crash.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] Unhandled Rejection: ${reason}\n`);
  } catch {}
  console.error('Unhandled Rejection:', reason);
});

// Single instance lock: prevent duplicate processes from colliding on LevelDB database
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

const processWatcher = new ProcessWatcher('Warhammer3.exe', 4000);
const saveWatcher = new SaveWatcher();
const replayInspector = new ReplayInspector();

const devServerUrl = process.env.VITE_DEV_SERVER_URL;

async function loadApp(window: BrowserWindow) {
  if (devServerUrl) {
    try {
      await window.loadURL(devServerUrl);
      return;
    } catch (e) {
      console.warn('Failed to connect to dev server, loading local files...');
    }
  }

  const distPath = path.join(__dirname, '../dist/index.html');
  try {
    await window.loadFile(distPath);
  } catch (err) {
    const fallback = path.join(app.getAppPath(), 'dist', 'index.html');
    await window.loadFile(fallback);
  }

  window.show();
  window.focus();
}

function shouldMinimizeToTray(): boolean {
  try {
    const storagePath = path.join(app.getPath('userData'), 'storage.json');
    if (fs.existsSync(storagePath)) {
      const data = JSON.parse(fs.readFileSync(storagePath, 'utf8'));
      if (data?.settings?.minimizeToTray === false) {
        return false;
      }
    }
  } catch {}
  return true;
}

function createWindow() {
  const iconPath = path.join(__dirname, 'assets', 'icon.ico');

  mainWindow = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1080,
    minHeight: 700,
    backgroundColor: '#070709',
    autoHideMenuBar: true,
    title: 'Total Tracking — Total War: WARHAMMER III',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  loadApp(mainWindow);

  // Minimize to tray on close only if tray is active, minimizeToTray is enabled, and not explicitly quitting
  mainWindow.on('close', (event) => {
    if (tray && !isQuitting && shouldMinimizeToTray()) {
      event.preventDefault();
      mainWindow?.hide();
      return false;
    }
    isQuitting = true;
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const TRAY_ICON_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAV0lEQVR4nO3OwQ0AEBBE0S1CxWrSi3K4iyDs4PAnmfN/Zow1K9mK+lNAikF2AAAAAAAAAMD/ABVkOaxAbMW9EEfxE4hbeAchia8ipPER5Fq4h3gSZ+a0ClVI00xofVHrAAAAAElFTkSuQmCC';

function createTray() {
  try {
    const trayPng = path.join(__dirname, 'assets', 'tray-icon.png');
    const icoPath = path.join(__dirname, 'assets', 'icon.ico');
    let icon: any = null;

    if (fs.existsSync(trayPng)) {
      icon = nativeImage.createFromBuffer(fs.readFileSync(trayPng));
    } else if (fs.existsSync(icoPath)) {
      icon = nativeImage.createFromBuffer(fs.readFileSync(icoPath));
    } else {
      icon = nativeImage.createFromBuffer(Buffer.from(TRAY_ICON_BASE64, 'base64'));
    }

    if (!icon || icon.isEmpty()) {
      return;
    }

    tray = new Tray(icon);
    tray.setToolTip('Total Tracking — Total War Companion');

    updateTrayMenu();

    tray.on('double-click', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        if (!mainWindow.isVisible()) mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (err) {
    console.warn('Tray creation warning, running without tray:', err);
    tray = null;
  }
}

function updateTrayMenu() {
  if (!tray) return;

  const isRunning = processWatcher.isRunning();
  const contextMenu = Menu.buildFromTemplate([
    { label: '⚔️ Total Tracking', enabled: false },
    {
      label: isRunning ? '🟢 Warhammer 3: Em Execução' : '⚪ Warhammer 3: Fechado',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Abrir Painel',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    {
      label: 'Minimizar para a Bandeja',
      click: () => {
        mainWindow?.hide();
      },
    },
    { type: 'separator' },
    {
      label: 'Sair Completamente',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

// Focus existing window when second instance is launched
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
});

// App lifecycle
app.whenReady().then(() => {
  app.setAppUserModelId('com.totaltracking.app');

  // Intercept fandom/wikia image requests to attach Referer and bypass 403 Forbidden
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['*://*.wikia.nocookie.net/*', '*://*.fandom.com/*'] },
    (details, callback) => {
      details.requestHeaders['Referer'] = 'https://totalwarwarhammer.fandom.com/';
      details.requestHeaders['User-Agent'] =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      callback({ requestHeaders: details.requestHeaders });
    }
  );

  createWindow();
  createTray();

  // Start background services
  processWatcher.start();
  saveWatcher.start();

  // Watcher event forwarders to renderer
  processWatcher.onStatusChange((running) => {
    updateTrayMenu();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('process-status-changed', running);
    }
  });

  saveWatcher.onSaveDetected((save) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('save-detected', save);
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  processWatcher.stop();
  saveWatcher.stop();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Keep running in tray only if tray is active and user enabled minimizeToTray
    if (isQuitting || !tray || !shouldMinimizeToTray()) {
      app.quit();
    }
  }
});

// IPC Handlers
ipcMain.handle('get-process-status', async () => {
  return await processWatcher.checkRunning();
});

ipcMain.handle('get-saves-list', async (_event, customPath?: string) => {
  return saveWatcher.scanExistingSaves(customPath);
});

ipcMain.handle('get-replays-list', async (_event, customPath?: string) => {
  return replayInspector.scanReplays(customPath);
});

ipcMain.handle('browse-folder', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle('create-desktop-shortcut', async () => {
  try {
    const desktop = path.join(process.env.USERPROFILE || '', 'Desktop', 'Total Tracking.lnk');
    const exePath = app.getPath('exe');
    const workDir = path.dirname(exePath);
    const ps = `$s=(New-Object -ComObject WScript.Shell).CreateShortcut('${desktop}');$s.TargetPath='${exePath}';$s.WorkingDirectory='${workDir}';$s.Save()`;
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    await execPromise(`powershell -NoProfile -Command "${ps}"`);
    return { success: true, message: 'Atalho criado na Área de Trabalho com sucesso!' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Erro ao criar atalho' };
  }
});

ipcMain.handle('load-storage-file', async () => {
  try {
    const userData = app.getPath('userData');
    const storagePath = path.join(userData, 'storage.json');
    if (fs.existsSync(storagePath)) {
      return fs.readFileSync(storagePath, 'utf8');
    }
    const backupPath = path.join(userData, 'recovered_backup.json');
    if (fs.existsSync(backupPath)) {
      return fs.readFileSync(backupPath, 'utf8');
    }
  } catch (e) {
    console.error('Error loading storage file in main:', e);
  }
  return null;
});

ipcMain.handle('save-storage-file', async (_event, jsonContent: string) => {
  try {
    const storagePath = path.join(app.getPath('userData'), 'storage.json');
    fs.writeFileSync(storagePath, jsonContent, 'utf8');
    return true;
  } catch (e) {
    console.error('Error saving storage file in main:', e);
    return false;
  }
});

ipcMain.on('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window-close', () => {
  mainWindow?.close();
});
