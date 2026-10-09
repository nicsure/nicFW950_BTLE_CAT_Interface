// CAT framing and BLE settings from the repository protocol document.
export const COMMAND_TERMINATOR = "\r";
export const BLE_SERVICE_UUID = "0000ffe0-0000-1000-8000-00805f9b34fb";
export const BLE_CHARACTERISTIC_UUID = "0000ffe1-0000-1000-8000-00805f9b34fb";
export const BLE_WRITE_CHUNK_SIZE = 20;
export const COMMAND_GAP_MS = 100;
export const RESPONSE_TIMEOUT_MS = 1000;
export const POLL_INTERVAL_MS = 500;
export const SIGNAL_FLOORS = [
  [107, -115], [137, -105], [173, -110], [350, -126],
  [400, -123], [470, -124], [671, -129], [Infinity, -135],
];
