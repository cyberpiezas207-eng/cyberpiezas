import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app, BrowserWindow, ipcMain, shell } from 'electron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = !app.isPackaged;
const devServerUrl = process.env.ELECTRON_RENDERER_URL || 'http://127.0.0.1:3210';
const desktopPort = process.env.DESKTOP_SERVER_PORT || '3610';

let mainWindow = null;
let serverProcess = null;
let resolvedServerUrl = null;

function getPreloadPath() {
  return path.join(__dirname, 'preload.mjs');
}

function getPackagedServerEntry() {
  const unpackedEntry = path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'index.js');
  if (fs.existsSync(unpackedEntry)) {
    return unpackedEntry;
  }

  return path.join(process.resourcesPath, 'app.asar', 'dist', 'index.js');
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1180,
    minHeight: 780,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
    title: 'Boutique POS Desktop',
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      partition: 'persist:boutique-pos',
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  await mainWindow.loadURL(
    'data:text/html;charset=utf-8,' +
      encodeURIComponent(`
        <html>
          <body style="margin:0;font-family:Segoe UI,Arial,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;">
            <div style="max-width:520px;padding:32px;text-align:center;">
              <h1 style="margin:0 0 12px;font-size:30px;">Boutique POS Desktop</h1>
              <p style="margin:0;font-size:16px;line-height:1.6;color:#cbd5e1;">Iniciando el sistema local. Esta ventana cambiará automáticamente cuando el punto de venta esté listo.</p>
            </div>
          </body>
        </html>
      `),
  );
}

async function loadRenderer(targetUrl) {
  if (!mainWindow) {
    await createMainWindow();
  }

  if (!mainWindow || resolvedServerUrl === targetUrl) {
    return;
  }

  resolvedServerUrl = targetUrl;
  await mainWindow.loadURL(targetUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

function stopLocalServer() {
  if (!serverProcess || serverProcess.killed) {
    return;
  }

  serverProcess.kill('SIGTERM');
  serverProcess = null;
}

function handleServerOutput(rawChunk) {
  const text = rawChunk.toString();
  process.stdout.write(`[desktop-server] ${text}`);

  const match = text.match(/Server running on (http:\/\/localhost:\d+\/?)/);
  if (match?.[1]) {
    loadRenderer(match[1]).catch((error) => {
      console.error('No se pudo cargar la interfaz del POS en Electron:', error);
    });
  }
}

function startLocalServerForProduction() {
  const serverEntry = getPackagedServerEntry();

  serverProcess = spawn(process.execPath, [serverEntry], {
    cwd: process.resourcesPath,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      PORT: desktopPort,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout.on('data', handleServerOutput);
  serverProcess.stderr.on('data', (chunk) => {
    process.stderr.write(`[desktop-server:error] ${chunk.toString()}`);
  });

  serverProcess.on('exit', (code) => {
    if (!app.isQuitting) {
      console.error(`El servidor local de escritorio terminó con código ${code ?? 'desconocido'}.`);
    }
  });
}

function registerDesktopIpc() {
  ipcMain.handle('desktop:is-online', () => true);
  ipcMain.handle('desktop:open-external', async (_event, url) => {
    await shell.openExternal(url);
    return true;
  });
}

async function bootstrapDesktop() {
  await app.whenReady();
  registerDesktopIpc();
  await createMainWindow();

  if (isDev) {
    await loadRenderer(devServerUrl);
  } else {
    startLocalServerForProduction();
  }

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
      if (isDev) {
        await loadRenderer(devServerUrl);
      } else if (resolvedServerUrl) {
        await loadRenderer(resolvedServerUrl);
      }
    }
  });
}

app.isQuitting = false;

app.on('before-quit', () => {
  app.isQuitting = true;
  stopLocalServer();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

bootstrapDesktop().catch((error) => {
  console.error('No fue posible iniciar Boutique POS Desktop:', error);
  app.quit();
});
