import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ProcessWatcher {
  private timer: NodeJS.Timeout | null = null;
  private isGameRunning = false;
  private listeners: ((running: boolean) => void)[] = [];
  private pollIntervalMs = 4000;
  private targetProcess = 'Warhammer3.exe';

  constructor(targetProcess = 'Warhammer3.exe', pollIntervalMs = 4000) {
    this.targetProcess = targetProcess;
    this.pollIntervalMs = pollIntervalMs;
  }

  public async checkRunning(): Promise<boolean> {
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execAsync(`tasklist /FI "IMAGENAME eq ${this.targetProcess}" /FO CSV /NH`);
        // If process is running, output contains "Warhammer3.exe"
        const running = stdout.toLowerCase().includes(this.targetProcess.toLowerCase());
        this.updateState(running);
        return running;
      } else {
        // Fallback for unix/testing
        const { stdout } = await execAsync(`pgrep -f "${this.targetProcess}" || true`);
        const running = stdout.trim().length > 0;
        this.updateState(running);
        return running;
      }
    } catch {
      this.updateState(false);
      return false;
    }
  }

  private updateState(running: boolean) {
    if (this.isGameRunning !== running) {
      this.isGameRunning = running;
      for (const listener of this.listeners) {
        try {
          listener(running);
        } catch (e) {
          console.error('Error in process listener:', e);
        }
      }
    }
  }

  public start() {
    if (this.timer) return;
    // Immediate check
    this.checkRunning();
    this.timer = setInterval(() => {
      this.checkRunning();
    }, this.pollIntervalMs);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public onStatusChange(callback: (running: boolean) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  public isRunning(): boolean {
    return this.isGameRunning;
  }
}
