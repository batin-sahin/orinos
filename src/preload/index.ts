import { contextBridge, ipcRenderer } from "electron";
import type { OrinosApi } from "../shared/ipc.js";

function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: T) => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const api: OrinosApi = {
  bootstrap: () => ipcRenderer.invoke("orinos:bootstrap"),
  listSessions: () => ipcRenderer.invoke("orinos:session:list"),
  loadSession: (id) => ipcRenderer.invoke("orinos:session:load", id),
  newSession: (opts) => ipcRenderer.invoke("orinos:session:new", opts),
  deleteSession: (id) => ipcRenderer.invoke("orinos:session:delete", id),
  renameSession: (id, title) => ipcRenderer.invoke("orinos:session:rename", id, title),

  sendMessage: (input) => ipcRenderer.invoke("orinos:chat:send", input),
  abort: (sessionId) => ipcRenderer.invoke("orinos:chat:abort", sessionId),
  onAgentEvent: (cb) => subscribe("orinos:event", cb),

  getConfig: () => ipcRenderer.invoke("orinos:config:get"),
  setConfig: (patch) => ipcRenderer.invoke("orinos:config:set", patch),
  setApiKey: (providerId, key) => ipcRenderer.invoke("orinos:auth:set", providerId, key),
  removeApiKey: (providerId) => ipcRenderer.invoke("orinos:auth:remove", providerId),
  addCustomProvider: (input) => ipcRenderer.invoke("orinos:provider:add", input),
  removeCustomProvider: (id) => ipcRenderer.invoke("orinos:provider:remove", id),

  listSkills: () => ipcRenderer.invoke("orinos:skills:list"),
  getSkill: (name) => ipcRenderer.invoke("orinos:skills:get", name),

  respondApproval: (id, approved) => ipcRenderer.invoke("orinos:approval:respond", id, approved),
  onApproval: (cb) => subscribe("orinos:approval", cb),

  runCommand: (input) => ipcRenderer.invoke("orinos:command:run", input),
  killCommand: (runId) => ipcRenderer.invoke("orinos:command:kill", runId),
  onCommandOutput: (cb) => subscribe("orinos:command", cb),

  chooseFiles: () => ipcRenderer.invoke("orinos:dialog:files"),
  chooseDirectory: () => ipcRenderer.invoke("orinos:dialog:directory"),
  openExternal: (url) => ipcRenderer.invoke("orinos:open-external", url),
  onMenu: (cb) => subscribe("orinos:menu", cb),
};

contextBridge.exposeInMainWorld("orinos", api);
