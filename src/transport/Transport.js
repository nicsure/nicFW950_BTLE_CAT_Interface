/** Minimal byte-stream transport contract for BLE now and future transports. */
export class Transport {
  constructor() {
    this.state = "disconnected";
    this.onData = null;
    this.onStateChange = null;
  }
  setState(state, message = "") {
    this.state = state;
    this.onStateChange?.(state, message);
  }
  async connect() { throw new Error("connect() is not implemented."); }
  async disconnect() { throw new Error("disconnect() is not implemented."); }
  async send(_bytes) { throw new Error("send() is not implemented."); }
}
