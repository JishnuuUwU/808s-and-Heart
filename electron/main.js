const { app, BrowserWindow, ipcMain, screen, session } = require("electron");
const path = require("path");
const http = require("http");

let mainWindow = null;
let isPinnedOnTop = true;

function checkUrlAvailable(url) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const req = http.get(
        {
          hostname: u.hostname,
          port: u.port,
          path: "/popup",
          timeout: 1000,
        },
        (res) => {
          resolve(res.statusCode >= 200 && res.statusCode < 400);
        }
      );
      req.on("error", () => resolve(false));
      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

async function getStartupUrl() {
  if (process.env.ELECTRON_START_URL) {
    return process.env.ELECTRON_START_URL;
  }
  // Check 3001 first (since 3000 was in use), then 3000
  if (await checkUrlAvailable("http://localhost:3001")) {
    return "http://localhost:3001/popup";
  }
  if (await checkUrlAvailable("http://localhost:3000")) {
    return "http://localhost:3000/popup";
  }
  return "http://localhost:3001/popup";
}

async function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const winWidth = 460;
  const winHeight = 580;

  mainWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: width - winWidth - 30,
    y: height - winHeight - 30,
    frame: false,
    transparent: false,
    backgroundColor: "#000000",
    alwaysOnTop: isPinnedOnTop,
    resizable: true,
    minWidth: 360,
    minHeight: 440,
    title: "CYBER_HEART // SPECIMEN_01",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Enable display media / desktop audio capture permission
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (
      permission === "media" ||
      permission === "display-capture" ||
      permission === "audio-capture"
    ) {
      callback(true);
      return;
    }
    callback(true);
  });

  const url = await getStartupUrl();
  console.log(`[CyberHeart Electron] Loading ${url}`);
  mainWindow.loadURL(url);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

ipcMain.handle("get-always-on-top", () => {
  return mainWindow ? mainWindow.isAlwaysOnTop() : isPinnedOnTop;
});

ipcMain.handle("set-always-on-top", (event, flag) => {
  if (mainWindow) {
    isPinnedOnTop = Boolean(flag);
    mainWindow.setAlwaysOnTop(isPinnedOnTop, "screen-saver");
    return isPinnedOnTop;
  }
  return false;
});

ipcMain.on("minimize-window", () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on("close-window", () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on("maximize-window", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
