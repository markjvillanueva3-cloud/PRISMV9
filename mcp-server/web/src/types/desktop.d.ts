// Desktop-shell bridge marker exposed by electron/preload.cjs (QX5).
// On the web build this global is undefined; code must treat it as optional.
export {};

declare global {
  interface Window {
    prismDesktop?: {
      isDesktop?: boolean;
      platform?: string;
    };
  }
}
