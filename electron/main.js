const { app, BrowserWindow, ipcMain, screen, session } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");

let mainWindow = null;
let internalServer = null;
let isPinnedOnTop = true;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

/**
 * Starts an in-process, self-contained loopback server on 127.0.0.1 with an
 * ephemeral OS-assigned port. This removes all dependencies on external web servers.
 */
function startInternalAppServer(outDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const rawPath = decodeURI(req.url.split("?")[0]);
        let safePath = rawPath === "/" || rawPath === "" ? "/index.html" : rawPath;

        let targetPath = path.join(outDir, safePath);

        if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
          targetPath = path.join(targetPath, "index.html");
        } else if (!fs.existsSync(targetPath) && fs.existsSync(`${targetPath}.html`)) {
          targetPath = `${targetPath}.html`;
        }

        if (!fs.existsSync(targetPath)) {
          targetPath = path.join(outDir, "index.html");
        }

        const ext = path.extname(targetPath).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";

        fs.readFile(targetPath, (err, data) => {
          if (err) {
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end("Internal Server Error");
          } else {
            res.writeHead(200, {
              "Content-Type": contentType,
              "Cache-Control": "no-cache",
            });
            res.end(data);
          }
        });
      } catch (err) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Server Error");
      }
    });

    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      resolve({ server, port, url: `http://127.0.0.1:${port}` });
    });

    server.on("error", (err) => reject(err));
  });
}

async function getAppEntryUrl() {
  const outDir = path.join(__dirname, "../out");

  if (fs.existsSync(path.join(outDir, "index.html"))) {
    try {
      const { server, url } = await startInternalAppServer(outDir);
      internalServer = server;
      console.log(`[CyberHeart App] Internal desktop app server active at ${url}`);
      return url;
    } catch (err) {
      console.error("[CyberHeart App] Failed to start internal server:", err);
    }
  }

  if (process.env.ELECTRON_START_URL) {
    return process.env.ELECTRON_START_URL;
  }
  return "http://localhost:3001";
}

async function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { workArea } = primaryDisplay;

  // Compact floating popup window dimensions
  const winWidth = 440;
  const winHeight = 620;

  // Position centrally on the user's primary monitor
  const x = Math.max(workArea.x, Math.round(workArea.x + (workArea.width - winWidth) / 2));
  const y = Math.max(workArea.y, Math.round(workArea.y + (workArea.height - winHeight) / 2));

  mainWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: x,
    y: y,
    frame: true,
    show: false,
    skipTaskbar: false,
    backgroundColor: "#000000",
    alwaysOnTop: true,
    resizable: true,
    minimizable: true,
    closable: true,
    maximizable: true,
    minWidth: 320,
    minHeight: 440,
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

  mainWindow.webContents.on("console-message", (event, level, message) => {
    console.log(`[Renderer Console L${level}] ${message}`);
  });

  const showAndElevateWindow = () => {
    if (!mainWindow) return;
    mainWindow.show();
    mainWindow.focus();
    mainWindow.setAlwaysOnTop(true); // Direct Win32 HWND_TOPMOST without macOS level strings
    mainWindow.moveTop();
    mainWindow.flashFrame(true);
    console.log(`[CyberHeart App] Popup window VISIBLE and TOPMOST at (${x}, ${y}) [${winWidth}x${winHeight}].`);
  };

  mainWindow.once("ready-to-show", () => {
    showAndElevateWindow();

    // Diagnostic screenshot proof
    setTimeout(async () => {
      try {
        if (!mainWindow) return;
        const image = await mainWindow.capturePage();
        const proofPath = "C:\\Users\\jishn\\.gemini\\antigravity-ide\\brain\\29aa076b-9d21-444f-856c-94395269980a\\desktop_app_proof.png";
        fs.writeFileSync(proofPath, image.toPNG());
        console.log(`[CyberHeart App] DESKTOP_PROOF_SAVED: ${proofPath}`);
      } catch (err) {
        console.error("[CyberHeart App] Error capturing screenshot:", err);
      }
    }, 2000);
  });

  mainWindow.webContents.on("did-finish-load", () => {
    console.log("[CyberHeart App] Native desktop app interface loaded.");
    if (mainWindow && !mainWindow.isVisible()) {
      showAndElevateWindow();
    }
  });

  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
    console.error(`[CyberHeart App] Failed to load: ${errorCode} - ${errorDescription}`);
  });

  const url = await getAppEntryUrl();
  console.log(`[CyberHeart App] Loading ${url}`);
  mainWindow.loadURL(url);

  mainWindow.on("closed", () => {
    mainWindow = null;
    if (internalServer) {
      internalServer.close();
      internalServer = null;
    }
  });
}

ipcMain.handle("get-always-on-top", () => {
  return mainWindow ? mainWindow.isAlwaysOnTop() : isPinnedOnTop;
});

ipcMain.handle("set-always-on-top", (event, flag) => {
  if (mainWindow) {
    isPinnedOnTop = Boolean(flag);
    mainWindow.setAlwaysOnTop(isPinnedOnTop); // Standard Win32 HWND_TOPMOST
    if (isPinnedOnTop) {
      mainWindow.moveTop();
    }
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

process.on("uncaughtException", (err) => {
  fs.appendFileSync(path.join(__dirname, "../electron_exit.log"), `[UncaughtException] ${err.stack || err}\n`);
});

process.on("unhandledRejection", (reason) => {
  fs.appendFileSync(path.join(__dirname, "../electron_exit.log"), `[UnhandledRejection] ${reason}\n`);
});

app.on("before-quit", () => {
  fs.appendFileSync(path.join(__dirname, "../electron_exit.log"), `[AppBeforeQuit] event triggered\n`);
});

app.on("will-quit", () => {
  fs.appendFileSync(path.join(__dirname, "../electron_exit.log"), `[AppWillQuit] event triggered\n`);
});

app.whenReady().then(() => {
  fs.appendFileSync(path.join(__dirname, "../electron_exit.log"), `[AppReady] started\n`);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  fs.appendFileSync(path.join(__dirname, "../electron_exit.log"), `[WindowAllClosed] event triggered\n`);
  if (process.platform !== "darwin") {
    app.quit();
  }
});
