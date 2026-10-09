import { COMMAND_GAP_MS, COMMAND_TERMINATOR, POLL_INTERVAL_MS, RESPONSE_TIMEOUT_MS } from "../config.js";
const asciiEncoder = new TextEncoder();

export class CatSession {
  constructor(transport, onLog, onLine, onTransaction) {
    this.transport = transport;
    this.onLog = onLog;
    this.onLine = onLine;
    this.onTransaction = onTransaction;
    this.running = false;
    this.queue = [];
    this.pending = null;
    this.pendingTimer = null;
    this.pumpTimer = null;
    this.pollTimer = null;
    this.lastSentAt = 0;
    this.receiveBuffer = "";
    transport.onData = (bytes) => this.receive(bytes);
  }

  async start() {
    this.running = true;
    this.onLog("> <CR> (communication check)");
    try {
      await this.transport.send(asciiEncoder.encode(COMMAND_TERMINATOR));
      await delay(COMMAND_GAP_MS);
      this.onLog("> E 2 (enable replies and prompt)");
      await this.transport.send(asciiEncoder.encode("E 2" + COMMAND_TERMINATOR));
      this.lastSentAt = Date.now();
      this.refresh();
      this.pollTimer = setInterval(() => this.pollIfIdle(), POLL_INTERVAL_MS);
    } catch (error) {
      this.onLog("! CAT startup failed: " + errorMessage(error));
    }
  }

  stop() {
    this.running = false;
    this.queue.length = 0;
    this.pending = null;
    clearTimeout(this.pendingTimer);
    clearTimeout(this.pumpTimer);
    clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  refresh() {
    for (const command of ["V", "M", "F", "T", "Q", "B", "Y", "Z"]) this.enqueue(command);
  }

  enqueue(command) {
    if (!this.running) return;
    const normalized = command.trim();
    const key = normalized ? normalized.split(/\s+/, 1)[0].toUpperCase() : "cmd";
    this.queue.push({
      command: normalized,
      key,
      wire: (normalized ? normalized : "") + COMMAND_TERMINATOR,
      noReply: key === "E",
    });
    this.pump();
  }

  pollIfIdle() {
    if (this.running && !this.pending && !this.queue.length) this.enqueue("Z");
  }

  pump() {
    if (!this.running || this.pending || !this.queue.length || this.pumpTimer) return;
    const wait = Math.max(0, COMMAND_GAP_MS - (Date.now() - this.lastSentAt));
    this.pumpTimer = setTimeout(async () => {
      this.pumpTimer = null;
      if (!this.running || this.pending || !this.queue.length) return;
      const item = this.queue.shift();
      this.pending = item;
      this.lastSentAt = Date.now();
      this.onLog("> " + (item.command || "<CR>"));
      try {
        await this.transport.send(asciiEncoder.encode(item.wire));
      } catch (error) {
        this.onLog("! " + errorMessage(error));
        this.finishPending(false);
        return;
      }
      if (item.noReply) {
        this.pendingTimer = setTimeout(() => this.finishPending(true), COMMAND_GAP_MS);
      } else {
        this.pendingTimer = setTimeout(() => {
          const itemWaiting = this.pending;
          if (!itemWaiting) return;
          this.onLog("! No reply to " + (itemWaiting.command || "communication check") + " within 1 second.");
          this.finishPending(false);
        }, RESPONSE_TIMEOUT_MS);
      }
    }, wait);
  }

  receive(bytes) {
    for (const byte of bytes) {
      if (byte === 13) {
        const line = this.receiveBuffer.trim();
        this.receiveBuffer = "";
        if (line) this.handleLine(line);
      } else if (byte === 10) {
        // LF is for terminal friendliness; CR alone ends the response.
      } else if (byte >= 32 && byte <= 126) {
        this.receiveBuffer += String.fromCharCode(byte);
        if (this.receiveBuffer === "cmd:") {
          this.receiveBuffer = "";
          this.onLog("< cmd:");
          if (this.pending?.key === "cmd") this.finishPending(true);
        }
      }
    }
  }

  handleLine(line) {
    this.onLog("< " + line);
    this.onLine(line);
    const item = this.pending;
    if (!item) return;
    const isError = /^E(?:\s|$)/.test(line);
    const responseKey = line.split(/\s+/, 1)[0].toUpperCase();
    if (isError || responseKey === item.key) {
      this.onTransaction(item, line);
      this.finishPending(true);
    }
  }

  finishPending(replied) {
    clearTimeout(this.pendingTimer);
    this.pendingTimer = null;
    const item = this.pending;
    this.pending = null;
    if (item && !replied) this.onTransaction(item, null);
    if (this.running) {
      this.pumpTimer = setTimeout(() => {
        this.pumpTimer = null;
        this.pump();
      }, COMMAND_GAP_MS);
    }
  }

}
function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function errorMessage(error) { return error instanceof Error ? error.message : String(error); }
