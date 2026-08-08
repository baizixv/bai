export interface BenchmarkTestContext {
  game: HTMLElement | null;
  playScreen: HTMLElement | null;
  controls: HTMLElement | null;
  busy: boolean;
  cleanup: (() => void) | undefined;
  finish: (value: number, message: string) => void;
  clearControls: () => void;
  setPrompt: (status: string, prompt: string) => void;
  createButton: (text: string, className?: string) => HTMLButtonElement;
}
