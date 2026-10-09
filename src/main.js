import { SIGNAL_FLOORS } from "./config.js";
import { CatSession } from "./cat/CatSession.js";
import { BleTransport } from "./transport/BleTransport.js";

const $ = (id) => document.getElementById(id);
const ui = {
  status:$("status"), detail:$("connection-detail"), connect:$("connect"), disconnect:$("disconnect"),
  refresh:$("refresh"), clear:$("clear"), terminal:$("terminal"), form:$("send-form"),
  command:$("command"), send:$("send"), activity:$("cat-activity"), light:$("light-mode"), dark:$("dark-mode"),
  vfo:$("vfo"), mode:$("mode"), channel:$("channel"), group:$("group"), rx:$("rx-frequency"),
  tx:$("tx-frequency"), modulation:$("modulation"), bandwidth:$("bandwidth"), power:$("tx-power"),
  squelch:$("squelch-state"), signal:$("signal-value"), signalMeter:$("signal-meter"),
  signalS:$("signal-s-unit"), noise:$("noise-value"), noiseMeter:$("noise-meter"), ptt:$("ptt"), keypad:$("keypad"),
};
const transport = new BleTransport();
const radio = { vfo:"A", mode:0, rxHz:null, txHz:null, channel:1, group:"A" };
const session = new CatSession(transport, appendLog, handleRadioLine, handleTransaction, (message) => {
  ui.activity.textContent = message;
});
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
let manualTheme = false;

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  ui.light.setAttribute("aria-pressed", String(theme === "light"));
  ui.dark.setAttribute("aria-pressed", String(theme === "dark"));
}
try {
  const saved = localStorage.getItem("nicfw950-theme");
  if (saved === "light" || saved === "dark") { manualTheme = true; setTheme(saved); }
  else setTheme(systemTheme.matches ? "dark" : "light");
} catch { setTheme(systemTheme.matches ? "dark" : "light"); }
systemTheme.addEventListener("change", (event) => {
  if (!manualTheme) setTheme(event.matches ? "dark" : "light");
});
ui.light.addEventListener("click", () => saveTheme("light"));
ui.dark.addEventListener("click", () => saveTheme("dark"));
function saveTheme(theme) {
  manualTheme = true;
  setTheme(theme);
  try { localStorage.setItem("nicfw950-theme", theme); } catch {}
}

for (let number = 0; number <= 9; number += 1) addKey(String(number));
for (const key of ["G","R","U","D","*","#","S","T","E"]) addKey(key);
transport.onStateChange = (state, message) => {
  renderConnection(state, message);
  if (state === "connected") { setControlsEnabled(true); session.start(); }
  else { session.stop(); setControlsEnabled(false); }
};

function renderConnection(state, message) {
  const labels = { disconnected:"Disconnected", connecting:"Connecting…", connected:"Connected" };
  ui.status.textContent = labels[state];
  ui.status.className = "status " + state;
  ui.connect.disabled = state !== "disconnected";
  ui.connect.textContent = state === "connecting" ? "Connecting…" : "Connect";
  ui.disconnect.disabled = state !== "connected";
  if (message) ui.detail.textContent = message;
}
function setControlsEnabled(enabled) {
  for (const element of document.querySelectorAll("#radio-controls select, #radio-controls input, #ptt, #keypad button, #refresh, #command, #send")) element.disabled = !enabled;
  if (enabled) updateModeControls();
}
function appendLog(message) {
  const stick = ui.terminal.scrollTop + ui.terminal.clientHeight >= ui.terminal.scrollHeight - 4;
  ui.terminal.appendChild(document.createTextNode(message + "\n"));
  if (stick) ui.terminal.scrollTop = ui.terminal.scrollHeight;
}
function queue(command) {
  if (transport.state === "connected") session.enqueue(command);
}
function handleRadioLine(line) {
  const parts = line.trim().split(/\s+/);
  const command = parts[0];
  if (command === "E") return;
  if (command === "V" && /^[ABC]$/.test(parts[1] || "")) {
    radio.vfo = parts[1]; ui.vfo.value = radio.vfo;
  } else if (command === "M" && /^[012]$/.test(parts[1] || "")) {
    radio.mode = Number(parts[1]); ui.mode.value = String(radio.mode); updateModeControls();
  } else if (command === "F" && /^\d{10}$/.test(parts[1] || "")) {
    radio.rxHz = Number(parts[1]); ui.rx.value = (radio.rxHz / 1e6).toFixed(6); updateSignalDisplay();
  } else if (command === "T" && /^\d{10}$/.test(parts[1] || "")) {
    radio.txHz = Number(parts[1]); ui.tx.value = (radio.txHz / 1e6).toFixed(6);
  } else if (command === "C" && /^\d{3}$/.test(parts[1] || "")) {
    radio.channel = Number(parts[1]); ui.channel.value = String(radio.channel);
  } else if (command === "G" && /^[A-Z]$/.test(parts[1] || "")) {
    radio.group = parts[1]; ui.group.value = radio.group;
  } else if (command === "Q" && /^[012]$/.test(parts[1] || "")) {
    ui.modulation.value = parts[2] === "A" ? "3" : parts[1];
  } else if (command === "B" && /^[WN]$/.test(parts[1] || "")) {
    ui.bandwidth.value = parts[2] === "A" ? "A" : parts[1];
  } else if (command === "Y" && /^[0-6]$/.test(parts[1] || "")) {
    ui.power.value = parts[1];
  } else if (command === "S" && /^[01]$/.test(parts[1] || "")) {
    renderSquelch(parts[1]);
  } else if (command === "D" && /^\d{3}$/.test(parts[1] || "") && /^\d{3}$/.test(parts[2] || "")) {
    renderLevels(Number(parts[1]), Number(parts[2]));
  } else if (command === "Z" && /^[01]$/.test(parts[1] || "") && /^\d{3}$/.test(parts[2] || "") && /^\d{3}$/.test(parts[3] || "")) {
    renderSquelch(parts[1]); renderLevels(Number(parts[2]), Number(parts[3]));
  } else if (command === "X" && /^[01]$/.test(parts[1] || "")) {
    ui.ptt.classList.toggle("active", parts[1] === "1");
    ui.ptt.setAttribute("aria-pressed", String(parts[1] === "1"));
  }
}
function handleTransaction(item, response) {
  if (!response) return;
  if (item.command.startsWith("F ")) queue("T");
  if (item.command.startsWith("V ")) for (const command of ["M","F","T","Q","B","Y"]) queue(command);
  if (item.key === "M") {
    if (radio.mode === 1) queue("C");
    if (radio.mode === 2) queue("G");
  }
}
function updateModeControls() {
  ui.channel.disabled = transport.state !== "connected" || radio.mode === 0;
  ui.group.disabled = transport.state !== "connected" || radio.mode !== 2;
}
function formatFrequency(input) {
  const mhz = Number(input.value);
  if (!Number.isFinite(mhz) || mhz < 18 || mhz > 1300) throw new Error("Frequency must be between 18 and 1300 MHz.");
  return String(Math.round(mhz * 1e6)).padStart(10, "0");
}
function setFrequency(prefix, input) {
  try { queue(prefix + " " + formatFrequency(input)); }
  catch (error) { appendLog("! " + error.message); }
}

ui.connect.addEventListener("click", async () => {
  try { await transport.connect(); } catch (error) { appendLog("! " + error.message); }
});
ui.disconnect.addEventListener("click", async () => {
  try { await transport.disconnect(); } catch (error) { appendLog("! " + error.message); }
});
ui.refresh.addEventListener("click", () => session.refresh());
ui.clear.addEventListener("click", () => { ui.terminal.textContent = ""; });
ui.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const command = ui.command.value.trim();
  if (!command) return;
  if (/[^\x20-\x7e]/.test(command)) { appendLog("! CAT commands accept printable ASCII only."); return; }
  queue(command);
  ui.command.value = "";
});
ui.vfo.addEventListener("change", () => queue("V " + ui.vfo.value));
ui.mode.addEventListener("change", () => queue("M " + ui.mode.value));
ui.channel.addEventListener("change", () => {
  const value = Number(ui.channel.value);
  if (!Number.isInteger(value) || value < 1 || value > 999) { appendLog("! Channel must be from 001 to 999."); return; }
  queue("C " + String(value).padStart(3, "0"));
});
ui.group.addEventListener("change", () => queue("G " + ui.group.value));
ui.rx.addEventListener("change", () => setFrequency("F", ui.rx));
ui.tx.addEventListener("change", () => setFrequency("T", ui.tx));
ui.modulation.addEventListener("change", () => queue("Q " + ui.modulation.value));
ui.bandwidth.addEventListener("change", () => queue("B " + ui.bandwidth.value));
ui.power.addEventListener("change", () => queue("Y " + ui.power.value));

function renderSquelch(value) {
  ui.squelch.textContent = value === "1" ? "Open" : "Closed";
  ui.squelch.className = "squelch " + (value === "1" ? "open" : "closed");
}
function rawToDbm(raw) { return raw / 2 - 160; }
function signalFloor() {
  const mhz = (radio.rxHz || 0) / 1e6;
  for (const [upper, floor] of SIGNAL_FLOORS) if (mhz < upper) return floor;
  return -135;
}
function updateSignalDisplay() {
  if (ui.signal.dataset.raw !== undefined) renderLevels(Number(ui.signal.dataset.raw), Number(ui.noise.dataset.raw || 0));
}
function renderLevels(signalRaw, noiseRaw) {
  const dbm = rawToDbm(signalRaw);
  const floor = signalFloor();
  const units = Math.max(0, Math.min(9, Math.floor((dbm - floor) / 6)));
  ui.signal.dataset.raw = String(signalRaw);
  ui.noise.dataset.raw = String(noiseRaw);
  ui.signal.textContent = dbm.toFixed(1) + " dBm";
  ui.signalMeter.value = units;
  ui.signalS.textContent = "S" + units + " · radio floor " + floor + " dBm";
  ui.noise.textContent = rawToDbm(noiseRaw).toFixed(1) + " dBm";
  ui.noiseMeter.value = noiseRaw;
}
function addKey(key) {
  const button = document.createElement("button");
  button.type = "button"; button.textContent = key;
  button.setAttribute("aria-label", "Radio key " + key);
  button.dataset.key = key; ui.keypad.appendChild(button);
}
let heldKey = null;
let heldKeyAt = 0;
function releaseKey() {
  if (!heldKey) return;
  heldKey = null;
  setTimeout(() => queue("P X"), Math.max(0, 100 - (Date.now() - heldKeyAt)));
}
ui.keypad.addEventListener("pointerdown", (event) => {
  const button = event.target.closest("button[data-key]");
  if (!button || heldKey) return;
  event.preventDefault(); heldKey = button; heldKeyAt = Date.now();
  try { button.setPointerCapture(event.pointerId); } catch {}
  queue("P " + button.dataset.key);
});
ui.keypad.addEventListener("pointerup", releaseKey);
ui.keypad.addEventListener("pointercancel", releaseKey);
ui.keypad.addEventListener("lostpointercapture", releaseKey);
window.addEventListener("blur", releaseKey);

let pttHeld = false;
function pressPtt() {
  if (pttHeld || transport.state !== "connected") return;
  pttHeld = true; queue("X 1");
}
function releasePtt() {
  if (!pttHeld) return;
  pttHeld = false; queue("X 0");
}
ui.ptt.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  try { ui.ptt.setPointerCapture(event.pointerId); } catch {}
  pressPtt();
});
ui.ptt.addEventListener("pointerup", releasePtt);
ui.ptt.addEventListener("pointercancel", releasePtt);
ui.ptt.addEventListener("lostpointercapture", releasePtt);
ui.ptt.addEventListener("keydown", (event) => {
  if ((event.key === " " || event.key === "Enter") && !event.repeat) { event.preventDefault(); pressPtt(); }
});
ui.ptt.addEventListener("keyup", (event) => {
  if (event.key === " " || event.key === "Enter") releasePtt();
});
window.addEventListener("blur", releasePtt);

for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
  const option = document.createElement("option");
  option.value = letter; option.textContent = "Group " + letter; ui.group.appendChild(option);
}
renderConnection("disconnected", "Disconnected. Select Connect to choose the radio.");
if (!navigator.bluetooth) {
  const message = "Web Bluetooth unavailable. Open this page in Chrome or Edge over HTTPS or localhost.";
  renderConnection("disconnected", message); appendLog("! " + message);
}
