const { app, BrowserWindow, ipcMain, screen, session } = require("electron");
const path = require("path");
const fs = require("fs");
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
  if (await checkUrlAvailable("http://localhost:3001")) {
    return "http://localhost:3001/popup";
  }
  if (await checkUrlAvailable("http://localhost:3000")) {
    return "http://localhost:3000/popup";
  }
  return "http://localhost:3001/popup";
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 640,
    x: 80,
    y: 80,
    frame: true,
    show: true,
    skipTaskbar: false,
    backgroundColor: "#000000",
    alwaysOnTop: isPinnedOnTop,
    resizable: true,
    minWidth: 380,
    minHeight: 480,
    title: "CYBER_HEART // SPECIMEN_01",
    autoHideMenuBar: true,
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

  // Pipe Renderer console to Electron stdout
  mainWindow.webContents.on("console-message", (event, level, message, line, sourceId) => {
    console.log(`[Renderer Console L${level}] ${message}`);
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    mainWindow.moveTop();
    if (isPinnedOnTop) {
      mainWindow.setAlwaysOnTop(true, "floating");
    }
    mainWindow.flashFrame(true);
    console.log("[CyberHeart Electron] Window is now VISIBLE and FOCUSED on user desktop.");

    // Capture diagnostic screenshot proof
    setTimeout(async () => {
      try {
        const image = await mainWindow.capturePage();
        const proofPath = "C:\\Users\\jishn\\.gemini\\antigravity-ide\\brain\\29aa076b-9d21-444f-856c-94395269980a\\electron_proof.png";
        fs.writeFileSync(proofPath, image.toPNG());
        console.log(`[CyberHeart Electron] PROOF_SAVED: ${proofPath}`);
      } catch (err) {
        console.error("[CyberHeart Electron] Error capturing screenshot:", err);
      }
    }, 2000);
  });

  mainWindow.webContents.on("did-finish-load", () => {
    console.log("[CyberHeart Electron] WebContents finished loading.");
  });

  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
    console.error(`[CyberHeart Electron] Failed to load: ${errorCode} - ${errorDescription}`);
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
    mainWindow.setAlwaysOnTop(isPinnedOnTop, "floating");
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
