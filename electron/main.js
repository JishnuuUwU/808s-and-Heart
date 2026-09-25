const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen, session } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");

let mainWindow = null;
let tray = null;
let internalServer = null;
let isPinnedOnTop = true;

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      mainWindow.setAlwaysOnTop(isPinnedOnTop);
      mainWindow.moveTop();
    }
  });
}

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
 * In-process HTTP loopback server serving the static Next.js production build.
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
      return url;
    } catch (err) {
      console.error("[CyberHeart App] Server start failed:", err);
    }
  }

  if (process.env.ELECTRON_START_URL) {
    return process.env.ELECTRON_START_URL;
  }
  return "http://localhost:3000";
}

function updateTrayMenu() {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Cyber-Heart Specimen",
      enabled: false,
    },
    { type: "separator" },
    {
      label: "Show Specimen (Pop Up On Top)",
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
          mainWindow.setAlwaysOnTop(isPinnedOnTop);
          mainWindow.moveTop();
        }
      },
    },
    {
      label: "Always On Top",
      type: "checkbox",
      checked: isPinnedOnTop,
      click: (item) => {
        isPinnedOnTop = item.checked;
        if (mainWindow) {
          mainWindow.setAlwaysOnTop(isPinnedOnTop);
          if (isPinnedOnTop) mainWindow.moveTop();
        }
      },
    },
    {
      label: "Expand (Maximize / Restore)",
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
          } else {
            mainWindow.maximize();
          }
        }
      },
    },
    {
      label: "Minimize to Status Bar",
      click: () => {
        if (mainWindow) mainWindow.minimize();
      },
    },
    { type: "separator" },
    {
      label: "Exit Application",
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip(`Cyber-Heart Specimen (Always-On-Top: ${isPinnedOnTop ? "ON" : "OFF"})`);
}

function createTrayIcon() {
  const icoPath = path.join(__dirname, "tray-icon.ico");
  const pngPath = path.join(__dirname, "tray-icon.png");

  let trayImage;
  if (fs.existsSync(icoPath)) {
    trayImage = nativeImage.createFromPath(icoPath);
  } else if (fs.existsSync(pngPath)) {
    trayImage = nativeImage.createFromPath(pngPath);
  } else {
    trayImage = nativeImage.createEmpty();
  }

  try {
    tray = new Tray(trayImage);
    updateTrayMenu();

    // Clicking tray icon restores & brings app to front
    tray.on("click", () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.show();
        mainWindow.focus();
        mainWindow.setAlwaysOnTop(isPinnedOnTop);
        mainWindow.moveTop();
      }
    });

    tray.on("double-click", () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (err) {
    console.warn("[CyberHeart App] Could not create system tray icon:", err);
  }
}

async function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { workArea } = primaryDisplay;

  // Window geometry
  const winWidth = 460;
  const winHeight = 660;

  // Center on screen
  const x = Math.max(workArea.x, Math.round(workArea.x + (workArea.width - winWidth) / 2));
  const y = Math.max(workArea.y, Math.round(workArea.y + (workArea.height - winHeight) / 2));

  const appIconPath = path.join(__dirname, "icon.ico");

  mainWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: x,
    y: y,
    frame: true, // Standard native Windows app frame
    show: true,  // Immediately visible on launch
    alwaysOnTop: isPinnedOnTop, // Standard Win32 HWND_TOPMOST
    resizable: true,
    minimizable: true,
    maximizable: true,
    closable: true,
    minWidth: 360,
    minHeight: 460,
    title: "Cyber-Heart // Biomechanical Specimen",
    backgroundColor: "#000000",
    icon: fs.existsSync(appIconPath) ? appIconPath : undefined,
    skipTaskbar: false, // Visible in Windows Taskbar
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Force foreground focus & elevation on creation
  mainWindow.setAlwaysOnTop(true);
  mainWindow.moveTop();
  mainWindow.focus();

  // Allow display media / desktop audio loopback capture
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.setAlwaysOnTop(isPinnedOnTop);
    mainWindow.moveTop();
    mainWindow.flashFrame(true);
  });

  mainWindow.webContents.on("did-finish-load", () => {
    if (mainWindow) {
      mainWindow.setAlwaysOnTop(isPinnedOnTop);
      mainWindow.moveTop();
    }
  });

  const url = await getAppEntryUrl();
  mainWindow.loadURL(url);

  mainWindow.on("closed", () => {
    mainWindow = null;
    if (internalServer) {
      internalServer.close();
      internalServer = null;
    }
  });
}

// IPC Handlers
ipcMain.handle("get-always-on-top", () => {
  return isPinnedOnTop;
});

ipcMain.handle("set-always-on-top", (event, flag) => {
  isPinnedOnTop = Boolean(flag);
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(isPinnedOnTop);
    if (isPinnedOnTop) mainWindow.moveTop();
  }
  updateTrayMenu();
  return isPinnedOnTop;
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
  createTrayIcon();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (tray) {
      tray.destroy();
      tray = null;
    }
    app.quit();
  }
});
