import { app, BrowserWindow, shell } from "electron";
import path from "node:path";
import fs from "node:fs";
import { cleanupSessions, registerIpc, setWindow } from "./ipc.js";
import { buildMenu } from "./menu.js";

const smoke = process.argv.includes("--smoke");
const openDevtools = process.argv.includes("--devtools");
const devServer = process.env.ORINOS_DEV_SERVER || "";

app.setName("Orinos");
if (process.platform === "win32") app.setAppUserModelId("com.orinos.app");

let win: BrowserWindow | null = null;

function createWindow(): void {
  win = new BrowserWindow({
    width: 1380,
    height: 900,
    minWidth: 980,
    minHeight: 640,
    show: false,
    title: "Orinos",
    backgroundColor: "#07080c",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    trafficLightPosition: { x: 18, y: 20 },
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });

  setWindow(win);
  buildMenu(win);

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });

  win.once("ready-to-show", () => {
    win?.show();
    if (openDevtools) win?.webContents.openDevTools({ mode: "detach" });
  });

  win.on("closed", () => {
    win = null;
  });

  if (devServer) {
    void win.loadURL(devServer);
  } else {
    void win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  if (smoke) {
    win.webContents.once("did-finish-load", () => {
      setTimeout(async () => {
        try {
          const script = process.env.ORINOS_SMOKE_JS;
          if (script) {
            await win!.webContents.executeJavaScript(script, true);
            await new Promise((resolve) => setTimeout(resolve, 650));
          }
          const image = await win!.webContents.capturePage();
          const out = path.join(app.getPath("temp"), "orinos-smoke.png");
          fs.writeFileSync(out, image.toPNG());
          console.log(`SMOKE_OK ${out}`);
        } catch (err: any) {
          console.error(`SMOKE_FAIL ${err?.message || err}`);
        } finally {
          app.quit();
        }
      }, 2200);
    });
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    registerIpc();
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin" || smoke) app.quit();
  });

  app.on("before-quit", () => {
    cleanupSessions();
  });
}
