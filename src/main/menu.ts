import { app, Menu, type BrowserWindow } from "electron";

function send(win: BrowserWindow, action: string): void {
  win.webContents.send("orinos:menu", { action });
}

export function buildMenu(win: BrowserWindow): void {
  const isMac = process.platform === "darwin";
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: "Orinos",
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              {
                label: "Settings…",
                accelerator: "Cmd+,",
                click: () => send(win, "settings"),
              },
              { type: "separator" as const },
              { role: "services" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "New Chat",
          accelerator: "CmdOrCtrl+N",
          click: () => send(win, "new-chat"),
        },
        {
          label: "Command Palette…",
          accelerator: "CmdOrCtrl+K",
          click: () => send(win, "command-palette"),
        },
        {
          label: "Toggle Terminal",
          accelerator: "CmdOrCtrl+J",
          click: () => send(win, "toggle-terminal"),
        },
        { type: "separator" },
        ...(isMac ? [{ role: "close" as const }] : [{ role: "quit" as const }]),
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        {
          label: "Toggle Sidebar",
          accelerator: "CmdOrCtrl+B",
          click: () => send(win, "toggle-sidebar"),
        },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "zoom" }, ...(isMac ? [{ type: "separator" as const }, { role: "front" as const }] : [])],
    },
    {
      role: "help",
      submenu: [
        {
          label: "Orinos Help",
          click: () => send(win, "settings"),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
