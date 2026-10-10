# nicFW950 BTLE CAT Interface

A browser radio front end for the radio CAT protocol over Bluetooth Low Energy. It keeps the working console's layout and adds controls for VFO, mode, frequencies, channel/group, modulation, bandwidth, TX power, PTT, keypad, squelch, and signal/noise.

## Transmitting warning

**WARNING:** When transmitting, use a suitable external antenna and position it well away from the phone or computer running this CAT interface. A handheld antenna close to the device can expose it to very strong RF energy, which may overwhelm or interfere with the much weaker Bluetooth Low Energy signal and interrupt the connection. Keep the antenna separated from the device during transmission.

## Protocol reference

The complete command list and device behavior are documented in [cat_command_protocol.md](./cat_command_protocol.md).

Implemented wire details:

- BLE service FFE0 and characteristic FFE1 for writes and notifications.
- Commands are printable ASCII and terminated by CR only (ASCII 13).
- Responses use CRLF; the parser treats CR as the record boundary and ignores LF.
- The cmd: prompt is four characters when replies are set to E 2.
- On connection, the app sends a blank CR communication check and enables E 2.
- The radio sends no unsolicited data. The app polls the combined Z command for squelch, signal, and external noise.
- CAT requests are serialized, spaced by at least 100 ms, and time out after one second. Polling pauses while another request is active.

## Requirements

Use Chrome or Edge with Web Bluetooth enabled, Bluetooth on, and the radio advertising service FFE0. Web Bluetooth requires a secure context: http://localhost is allowed for local development; deployed sites must use HTTPS. Other browsers may not expose Web Bluetooth.

The protocol specifies 9,600 baud over BTLE. BLE GATT does not expose a browser baud-rate setting; the radio firmware/bridge must provide the CAT UART behavior.

## Run live

https://nicsure.github.io/nicFW950_BTLE_CAT_Interface/

## Run locally

No Node.js, package installation, bundler, or build step is needed.

Windows: run py -m http.server 8000 from the repository root.

macOS/Linux: run python3 -m http.server 8000 from the repository root.

Then open http://localhost:8000 in a supported browser.

## Deploy

This is a static site. Publish the repository root with GitHub Pages or another HTTPS static host. Asset paths are relative.

## Front-end notes

- Replies from the radio are authoritative; controls update from returned values.
- After setting RX frequency, the app queries TX frequency because the radio may adjust it while preserving an offset.
- Signal values use the protocol conversion (raw / 2 - 160 dBm). The S-unit readout uses the documented band floor and 6 dB steps as an approximation.
- PTT is momentary: hold to transmit and release to send the off command. Keypad buttons send P <key> and release with P X; holding for at least 0.8 seconds requests a long press.
- Raw CAT commands can be entered at the bottom. E 0 disables all radio replies, so E 2 is sent again on each connection.
- Generic W setting writes are available through the command field; use them only with a documented offset and value.

The UI is intentionally limited to documented CAT functions. It does not implement codeplug management, firmware flashing, or serial-port transport.
