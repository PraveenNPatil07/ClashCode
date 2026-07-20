export {};

declare global {
  interface Window {
    puter?: {
      ai?: {
        chat: (message: string, options?: { model?: string }) => Promise<unknown>;
      };
    };
  }
}
