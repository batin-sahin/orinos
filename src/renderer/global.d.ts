import type { OrinosApi } from "../shared/ipc";

declare global {
  interface Window {
    orinos: OrinosApi;
  }
}

export {};
