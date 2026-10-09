import { BLE_CHARACTERISTIC_UUID, BLE_SERVICE_UUID, BLE_WRITE_CHUNK_SIZE } from "../config.js";
import { Transport } from "./Transport.js";

export class BleTransport extends Transport {
  constructor() {
    super();
    this.device = null;
    this.characteristic = null;
    this.handleNotification = this.handleNotification.bind(this);
    this.handleDisconnected = this.handleDisconnected.bind(this);
  }
  handleNotification(event) {
    const value = event.target?.value;
    if (value) this.onData?.(new Uint8Array(value.buffer, value.byteOffset, value.byteLength).slice());
  }
  handleDisconnected() {
    this.cleanup();
    this.setState("disconnected", "Radio disconnected. Select Connect to reconnect.");
  }
  cleanup() {
    this.characteristic?.removeEventListener("characteristicvaluechanged", this.handleNotification);
    this.device?.removeEventListener("gattserverdisconnected", this.handleDisconnected);
    this.characteristic = null;
    this.device = null;
  }
  async connect() {
    if (this.state !== "disconnected") return;
    this.setState("connecting", "Waiting for radio selection…");
    if (!navigator.bluetooth) {
      const message = "Web Bluetooth is unavailable. Open this site in Chrome or Edge over HTTPS.";
      this.setState("disconnected", message);
      throw new Error(message);
    }
    let device;
    try {
      device = await navigator.bluetooth.requestDevice({ filters: [{ services: [BLE_SERVICE_UUID] }] });
    } catch (error) {
      const cancelled = error?.name === "NotFoundError" || error?.name === "AbortError";
      const message = cancelled ? "Radio selection cancelled. Select Connect to try again." : "Bluetooth chooser failed: " + errorMessage(error);
      this.setState("disconnected", message);
      throw new Error(message);
    }
    this.device = device;
    device.addEventListener("gattserverdisconnected", this.handleDisconnected);
    try {
      if (!device.gatt) throw new Error("The selected device has no GATT server.");
      this.setState("connecting", (device.name || "Radio") + " selected. Connecting to GATT…");
      const server = await device.gatt.connect();
      this.setState("connecting", "GATT connected. Discovering FFE0…");
      const service = await server.getPrimaryService(BLE_SERVICE_UUID);
      this.setState("connecting", "FFE0 found. Looking up FFE1…");
      this.characteristic = await service.getCharacteristic(BLE_CHARACTERISTIC_UUID);
      this.characteristic.addEventListener("characteristicvaluechanged", this.handleNotification);
      this.setState("connecting", "FFE1 found. Starting notifications…");
      await this.characteristic.startNotifications();
      this.setState("connected", (device.name || "Radio") + " connected; CAT notifications active.");
    } catch (error) {
      const failedDevice = this.device;
      this.cleanup();
      if (failedDevice?.gatt?.connected) failedDevice.gatt.disconnect();
      const message = "BLE connection failed: " + errorMessage(error);
      this.setState("disconnected", message);
      throw new Error(message);
    }
  }
  async disconnect() {
    const device = this.device;
    this.cleanup();
    if (device?.gatt?.connected) device.gatt.disconnect();
    this.setState("disconnected", "Disconnected. Select Connect to reconnect.");
  }
  async send(bytes) {
    const characteristic = this.characteristic;
    if (!characteristic || this.state !== "connected") throw new Error("Not connected.");
    try {
      for (let offset = 0; offset < bytes.length; offset += BLE_WRITE_CHUNK_SIZE) {
        await characteristic.writeValue(bytes.slice(offset, offset + BLE_WRITE_CHUNK_SIZE));
      }
    } catch (error) {
      throw new Error("BLE write failed: " + errorMessage(error));
    }
  }
}
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
