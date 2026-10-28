import readline from "node:readline";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const ITALIC = "\x1b[3m";

export const NO_COLOR = Boolean(process.env.NO_COLOR) || !process.stdout.isTTY;

function rgb(r: number, g: number, b: number): string {
  return `\x1b[38;2;${r};${g};${b}m`;
}

function mix(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
}

export const c = {
  reset: NO_COLOR ? "" : RESET,
  bold: NO_COLOR ? "" : BOLD,
  dim: NO_COLOR ? "" : DIM,
  italic: NO_COLOR ? "" : ITALIC,
  violet: NO_COLOR ? "" : rgb(167, 139, 250),
  blue: NO_COLOR ? "" : rgb(96, 165, 250),
  cyan: NO_COLOR ? "" : rgb(34, 211, 238),
  green: NO_COLOR ? "" : rgb(52, 211, 153),
  yellow: NO_COLOR ? "" : rgb(251, 191, 36),
  red: NO_COLOR ? "" : rgb(248, 113, 113),
  gray: NO_COLOR ? "" : rgb(148, 163, 184),
  faint: NO_COLOR ? "" : rgb(100, 116, 139),
  white: NO_COLOR ? "" : rgb(226, 232, 240),
};

const LOGO = [
  " ██████╗ ██████╗ ██╗███╗   ██╗ ██████╗ ███████╗",
  "██╔═══██╗██╔══██╗██║████╗  ██║██╔═══██╗██╔════╝",
  "██║   ██║██████╔╝██║██╔██╗ ██║██║   ██║███████╗",
  "██║   ██║██╔══██╗██║██║╚██╗██║██║   ██║╚════██║",
  "╚██████╔╝██║  ██║██║██║ ╚████║╚██████╔╝███████║",
  " ╚═════╝ ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚══════╝",
];

export function gradient(text: string, from: [number, number, number], to: [number, number, number]): string {
  if (NO_COLOR) return text;
  return [...text]
    .map((ch, i) => {
      const t = text.length <= 1 ? 0 : i / (text.length - 1);
      const [r, g, b] = mix(from, to, t);
      return `${rgb(r, g, b)}${ch}`;
    })
    .join("") + RESET;
}

export function banner(): string {
  const art = LOGO.map((line) => gradient(line, [139, 92, 246], [34, 211, 238])).join("\n");
  return `\n${art}\n\n  ${c.gray}AI agent harness${c.reset} ${c.faint}·${c.reset} ${c.gray}terminal${c.reset} ${c.faint}·${c.reset} ${c.gray}desktop${c.reset}\n`;
}

export class Spinner {
  private timer: NodeJS.Timeout | null = null;
  private frame = 0;
  private label = "";
  private started = 0;
  private visible = false;
  private readonly frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

  start(label: string): void {
    if (!process.stdout.isTTY || NO_COLOR) return;
    if (this.timer) {
      this.label = label;
      return;
    }
    this.label = label;
    this.started = Date.now();
    this.visible = true;
    this.timer = setInterval(() => this.draw(), 90);
    this.draw();
  }

  update(label: string): void {
    if (this.timer) {
      this.label = label;
      this.draw();
    } else {
      this.start(label);
    }
  }

  private draw(): void {
    if (!this.visible) return;
    const elapsed = ((Date.now() - this.started) / 1000).toFixed(0);
    const line = `  ${c.violet}${this.frames[this.frame++ % this.frames.length]}${c.reset} ${c.gray}${this.label}${c.reset} ${c.faint}${elapsed}s${c.reset}`;
    process.stdout.write(`\r\x1b[2K${line}`);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.visible) process.stdout.write("\r\x1b[2K");
    this.visible = false;
  }
}

export class UI {
  private atLineStart = true;
  private spinner = new Spinner();

  get tty(): boolean {
    return Boolean(process.stdout.isTTY);
  }

  write(text: string): void {
    process.stdout.write(text);
    if (text.length) this.atLineStart = text.endsWith("\n");
  }

  newline(): void {
    if (!this.atLineStart) {
      process.stdout.write("\n");
      this.atLineStart = true;
    }
  }

  status(text: string): void {
    if (!text) {
      this.spinner.stop();
      return;
    }
    this.spinner.start(text);
  }

  stream(text: string): void {
    this.spinner.stop();
    this.write(text);
  }

  error(text: string): void {
    this.spinner.stop();
    this.newline();
    this.write(`${c.red}${text}${c.reset}\n`);
    this.atLineStart = true;
  }

  warn(text: string): void {
    this.spinner.stop();
    this.newline();
    this.write(`${c.yellow}${text}${c.reset}\n`);
    this.atLineStart = true;
  }

  info(text: string): void {
    this.spinner.stop();
    this.newline();
    this.write(`${c.gray}${text}${c.reset}\n`);
    this.atLineStart = true;
  }

  toolStart(name: string, summary: string): void {
    this.spinner.stop();
    this.newline();
    const label = name === "terminal" ? `${c.green}◆${c.reset} ${c.bold}${name}${c.reset}` : `${c.violet}◆${c.reset} ${c.bold}${name}${c.reset}`;
    this.write(`${label} ${c.gray}${oneLine(summary, 140)}${c.reset}\n`);
    this.atLineStart = true;
  }

  toolEnd(name: string, ok: boolean, output: string, durationMs: number): void {
    const mark = ok ? `${c.green}✓${c.reset}` : `${c.red}✕${c.reset}`;
    const ms = durationMs < 1000 ? `${Math.round(durationMs)}ms` : `${(durationMs / 1000).toFixed(1)}s`;
    const lines = output.split("\n").filter((l) => l.trim());
    const preview = lines.slice(0, 4).map((l) => `  ${c.faint}│${c.reset} ${c.gray}${oneLine(l, 150)}${c.reset}`);
    this.write(`${mark} ${c.faint}${name} · ${ms}${c.reset}\n`);
    if (preview.length) this.write(`${preview.join("\n")}\n`);
    if (lines.length > 4) this.write(`  ${c.faint}│ … ${lines.length - 4} more lines${c.reset}\n`);
    this.atLineStart = true;
  }

  usage(text: string): void {
    this.spinner.stop();
    this.newline();
    this.write(`${c.faint}${text}${c.reset}\n`);
    this.atLineStart = true;
  }
}

export function oneLine(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer));
  });
}
