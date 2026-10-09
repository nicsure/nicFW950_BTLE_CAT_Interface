# CAT Commands

## Overview

**CAT (Computer Aided Transceiver)** allows a radio to be remotely controlled by a host machine over a serial/BTLE connection using structured command/response messages.

This is distinct from the **Remote** tab of the RMS, which functions as a screen and keypad mirroring system. CAT operates using a command-driven control paradigm instead.

## Connection and framing

Commands are sent as plain text at **38,400 baud** over the standard programming interface or at **9,600 baud** over BTLE, and **must** be terminated with _**ONLY**_ a `<CR>` (carriage return, ASCII 13).

## Responses and prompt

Each command returns a text response that is one of the following:

- an **error**
- an **acknowledgement**
- a **reply** to a query

Responses are terminated with `<CR><LF>` (ASCII 13, 10) and followed by the command prompt (if `E 2` is active):

`cmd:`  
The command prompt is not followed by a CRLF, it is just the 4 ASCII characters 'c','m','d',':'

Each command described below documents its expected responses.

## Communication check

Sending a single `<CR>` with no command returns only the prompt (providing `E 2` is active):

`cmd: `

Implementations are encouraged to do this to confirm valid communication before sending commands.

## General info

Unless otherwise stated, all numerical values are decimal. Numerical values must always have the correct number of digits, left side zero padding must be used when the value has less digits than the amount required.  
  
Implementations are encouraged to use the detection of a CR (ASCII 13) **ONLY** to detect the end of a response string. At all other times both CR and LF character should be ignored. They are sent to make operation via a terminal emulator more visually friendly.  
  
All text communication is plain 8 bit ASCII, only characters from 'Space' (ASCII 32) to '~' (ASCII 126) and 'CR' (ASCII 13) are accepted.  

Implementations are encouraged NOT to wait for replies, but to process incoming data as it arrives and then update any elements based on incoming data. BTLE in particular may drop data, so the system may be left waiting for a reply that will never come. Commands can be sent before the reply to a previous command arrives, however it is recommended to use a state variable that is set when a command is sent and cleared when the reply arrives. If this state variable is set when a command is needing to be sent, a small delay of 100 ms should occur before sending and the state variable reset conditions and timeout values updated. The state variable should be cleared if no reply arrives within one second.

---

> ⚠️ Note: The list below documents all currently available CAT commands.  
> Additional commands may be introduced in future revisions based on user requests.
> It is also worth noting that responses to commands and to queries are authoritative, the sent command parameters are NOT, the radio may send different responses to the ones requested in the command.

## RX Frequency

**Command Format:**  
- `F [MMMMKKKHHH]`

**Command Responses:**
- `F MMMMKKKHHH`  
To indicate the actual frequency that was tuned or the reply to a query. Sometimes it can be changed by frequency limits.
- `E Invalid Frequency`  
If the frequency was incorrectly formatted or outside the valid range of 18 to 1300 MHz

Sets or queries the currently active VFO's **receive frequency** in Hz.

### Setting the RX Frequency

- If the VFO is in **Channel** or **Group** mode, the selected pre-programmed channel’s RX frequency will be permanently updated to the specified value.
- The **TX frequency automatically follows** the RX frequency and preserves any configured offset. Implementations need to take this into account. It is recommended that after an RX frequency being set, the TX frequency is subsequently queried and updated appropriately.
- The frequency **must** be supplied in the exact format shown.
- Leading and trailing zeros are required.

**Example:**

```
F 0435546000
```

Sets the VFO receive frequency to **435.546 MHz**.

### Querying the RX Frequency

To query the active VFO receive frequency, send:

```
F
```

---

## TX Frequency

**Command Format:**  
- `T [MMMMKKKHHH]`

**Command Responses:**
- `T MMMMKKKHHH`  
To indicate the actual frequency that was tuned or the reply to a query. Sometimes it can be changed by frequency limits.
- `E Invalid Frequency`  
If the frequency was incorrectly formatted or outside the valid range of 18 to 1300 MHz

Sets or queries the currently active VFO's **transmit frequency** in Hz.

### Setting the TX Frequency

- If the VFO is in **Channel** or **Group** mode, the selected pre-programmed channel’s TX frequency will be permanently updated.
- The frequency **must** be supplied in the exact format shown.
- Leading and trailing zeros are required.

**Example:**

```
T 0443123500
```

Sets the VFO transmit frequency to **443.1235 MHz**.

### Querying the TX Frequency

To query the active VFO transmit frequency, send:

```
T
```

---

## Active VFO

**Command Format:**  
- `V [1,2,3 or A,B,C]`

**Command Responses:**
- `V X`  
Where X is the VFO actually switched to ('A', 'B' or 'C') or the reply to a query. Sometimes the system may not allow a switch to a particular VFO.
- `E Invalid VFO`  
If the VFO number was incorrectly formatted or outside the valid range of 1 to 3

Sets or queries the currently active VFO.  
Note that while 1,2,3 and A,B,C can be used as valid parameters, the response is always A,B or C.

### Setting the Active VFO

The active VFO may be selected using either numeric or letter identifiers, however the response is always a letter:

- `1` or `A` → VFO-A  
- `2` or `B` → VFO-B  
- `3` or `C` → VFO-C  

**Examples:**

```
V 2
```

Switches to **VFO-B**.

```
V A
```

Switches to **VFO-A**.

### Querying the Active VFO

To query the currently active VFO, send:

```
V
```

---

## Active VFO Mode

**Command Format:**  
`M [0,1,2 or V,C,G]`

**Command Responses:**
- `M X`  
Where X is the actual mode switched to (0, 1 or 2) or the response to a query.
- `E Invalid Mode`  
If the mode was incorrectly formatted or outside the valid range of 0 to 2.

Sets or queries the operating mode of the currently active VFO.

### Setting the mode

The active VFO's mode may be set using either numeric or letter identifiers, however the response is always a number:

- `0` or `V` → Frequency Mode  
- `1` or `C` → Channel Mode  
- `2` or `G` → Group Mode

**Examples:**

```
M 2
```

Sets the active VFO to Group Mode.

```
M V
```

Sets the active VFO to Frequency Mode.  

Note: The radio may sometimes refuse to switch to a particular mode. This can happen for example if no channels/groups are programmed into the radio, thus it cannot switch to channel or group modes in this case. The reply will indicate if the mode switch succeeded or not.

### Querying the Active VFO's Mode

To query the currently active VFO's operating mode, send:

```
M
```

---

## Active VFO Channel Number

**Command Format:**  
- `C [001 to 999]`

**Command Responses:**
- `C XXX`  
Where XXX is the actual channel switched to (001 to 999) or the response to a query.
- `E Invalid Channel Number`  
If the channel number was incorrectly formatted or outside the valid range of 001 to 999.
- `E Invalid Mode`  
If the active VFO is in Frequency Mode.

Sets or queries the channel number of the currently active VFO.  
This command functions only when the VFO is in Channel Mode or Group Mode.  
If the specified channel number is not programmed, the nearest valid channel will be selected.  
When in Group Mode, the specified channel must belong to the currently selected group; otherwise, the nearest channel within that group will be selected.

### Setting the Channel Number

The active VFO’s channel may be set using a three-digit number with leading zeros.

**Examples:**

```
C 007
```

Sets the active VFO to Channel 7.

```
C 172
```

Sets the active VFO to Channel 172.

### Querying the Active VFO's Channel

To query the currently active VFO’s channel number, send:

```
C
```

---

## Active VFO Modulation

**Command Format:**  
- `Q [0 to 3]`

**Command Responses:**
- `Q X [A]`  
Where:  
X is the actual modulation switched to (0 to 2) or the response to a query.  
A is appended when the modulation was selected automatically by the radio, otherwise if the modulation mode is set explicitly, the A is not present.  
Note: The radio may disallow certain modulation modes in some cases. If this happens the reply will return a different modulation value from the one selected.  

- `E Invalid Modulation Mode`  
If the input was incorrectly formatted or outside the valid range of 0 to 3.
- `E Invalid Modulation`  
If the input was malformed.

Sets or queries the modulation mode of the currently active VFO.  

### Setting the modulation

The active VFO’s modulation may be set using a single number from `0` to `3`.

| Value | Modulation |
|---|---|
| 0 | FM |
| 1 | AM |
| 2 | DSB |
| 3 | Automatic |

* Note: When set to 3 (Automatic) the radio will select the modulation defined in the Band Plan for the RX Frequency.  
Queries and replies will report this modulation (0 to 2).  
See: [Main Menu → Band Plan](https://github.com/nicsure/RMS880/wiki/Band-Plan-Menu) & [RMS → Band Plan](https://github.com/nicsure/RMS880/wiki/Band-Plan-Tab)

**Examples:**

```
Q 0
```

Sets the active VFO to FM.


### Querying the Active VFO's modulation

To query the currently active VFO’s modulation, send:

```
Q
```

---

## Active VFO Bandwidth

**Command Format:**  
- `B [W, N, A]`

**Command Responses:**
- `B X [A]`  
Where:  
X is the actual bandwidth switched to (W or N) or the response to a query.
A is appended when the bandwidth was selected automatically by the radio, otherwise if the bandwidth is set explicitly, the A is not present.  
Note: The radio may disallow certain bandwidth settings in some cases. If this happens the reply will return a different bandwidth value from the one selected.  
- `E Invalid Bandwidth Value`  
If the input was incorrectly formatted or outside the valid values (W, N, A)
- `E Invalid Bandwidth Syntax`  
If the input was malformed.

Sets or queries the bandwidth of the currently active VFO.  

### Setting the bandwidth

The active VFO’s bandwidth may be set using a single letter.

| Value | Bandwidth |
|---|---|
| W | Wide |
| N | Narrow |
| A | Automatic |

* Note: When set to A (Automatic) the radio will select the bandwidth defined in the Band Plan for the RX Frequency.  
Queries and replies will report this bandwidth (W or N).  
See: [Main Menu → Band Plan](https://github.com/nicsure/RMS880/wiki/Band-Plan-Menu) & [RMS → Band Plan](https://github.com/nicsure/RMS880/wiki/Band-Plan-Tab)

**Examples:**

```
B W
```

Sets the active VFO to Wide bandwidth.


### Querying the Active VFO's bandwidth

To query the currently active VFO’s bandwidth, send:

```
B
```

---

## Active VFO TX Power

**Command Format:**  
- `Y [0 to 6]`

**Command Responses:**
- `Y X`  
Where X is the actual TX Power switched to (0 to 6) or the response to a query.
- `E Invalid TX Power Value`  
If the input was incorrectly formatted or outside the valid range (0 to 6)
- `E Invalid TX Power Syntax`  
If the input was malformed.

Sets or queries the transmit power of the currently active VFO.  

### Setting the power

The active VFO’s transmit power may be set using a number from 0 to 6.

| Value | Power |
|---|---|
| 0 | Transmit Disabled |
| 1 | Zero Power |
| 2 | Very Low |
| 3 | Low |
| 4 | Medium |
| 5 | High |
| 6 | Very High |

* Note: TX Power can be overridden by the Band Plan, replies and queries will report the overridden value.  
See: [Main Menu → Band Plan](https://github.com/nicsure/RMS880/wiki/Band-Plan-Menu) & [RMS → Band Plan](https://github.com/nicsure/RMS880/wiki/Band-Plan-Tab)

**Examples:**

```
Y 5
```

Sets the active VFO TX Power to High.


### Querying the Active VFO's TX Power

To query the currently active VFO’s transmit power, send:

```
Y
```

---

## Active VFO Group

**Command Format:**  
- `G [A to Z]`

**Command Responses:**
- `G X`  
Where X is the actual group switched to (A to Z) or the response to a query.
- `C XXX`  
Where XXX is the channel within the group that was switched to (001 to 999).
- `E Invalid Group`  
If the group letter was incorrectly formatted or outside the valid range of A to Z.
- `E Invalid Mode`  
If the active VFO is in Frequency or Channel Mode.

Sets or queries the group of the currently active VFO.  
This command functions only when the VFO is operating in Group Mode.  
If the specified group letter is not programmed, the nearest valid group will be selected.

### Setting the Group Letter

The active VFO’s group may be set using a single letter from `A` to `Z`.

**Example:**

```
G H
```

Sets the active VFO to Group H.

### Querying the Active VFO's Group

To query the currently active VFO’s group, send:

```
G
```

---

## PTT

**Command Format:**  
- `X [1 or 0]`

**Command Responses:**
- `X Y`  
Where Y is the actual PTT state.
- `E Invalid PTT State`  
If a value other than 0 or 1 was supplied
- `E Invalid PTT Syntax`  
If the command was malformed

Triggers (`X 1`) and Releases (`X 0`) the main PTT key.
- **Important Note:**  
The radio transmits significant RF energy, this can interfere with the USB Serial cable and cause it to malfunction or fail. It can also destroy nearby electronics. So if you transmit and then everything stops working THIS IS WHY!

---

## Key Press

**Command Format:**  
- `P [0-9,G,R,U,D,*,#,S,T,E,X]`

**Command Responses:**
- `P Y`  
Where Y is the actual key state.
- `E Invalid Key State`  
If a value other than those allowed was supplied.
- `E Invalid Key Syntax`  
If the command was malformed.

Triggers and Releases any of the keypad buttons.  
Short and Long presses are the duty of the implementing system with respect to timing. A long press should be held for 0.8 seconds at least before releasing. A single press should be held and released in 0.1 seconds.

> Note regarding Multi-PTT:
> - Use `P S` and `P T` to engage Multi-PTT on VFO-B and VFO-C if Multi-PTT is enabled. However it is recommended that single PTT mode be used with CAT control.
> - Use `P X` to release Multi-PTT on VFO-B and VFO-C.

| Value | Key |
|---|---|
| 0 to 9 | 0 to 9|
| G | GREEN |
| R | RED |
| U | UP |
| D | DOWN |
| * | STAR/ASTERISK |
| # | HASH/POUND |
| S | S1 |
| T | S2 |
| E | EMG |
| X | RELEASE KEY |
  
Key presses are intended as a stop-gap feature for implementations to define key macros for changing settings or activating functions not yet supported by the CAT system. Key macros are not always guaranteed to function due to the state of the radio and the lack of responses to verify the change. It is thus recommended that a particular function be requested for inclusion in the CAT protocol and this system be used only as a temporary work-around.

---

## Squelch

**Command Format:**  
- `S`

**Command Responses:**
- `S X`  
Where X is the current squelch state  
0 = Closed  
1 = Open 

Queries the current state of the radio's squelch.  
  
Note: This command does not set the Squelch level, only queries the squelch state. I.e. if there is a strong enough signal present to unmute the speaker.  
To change or query the Squelch level use the W command  
* Setting: `W 0004 2 00000` to `W 0004 2 00009` for squelch levels 0 to 9.
* Query: `W 0004 2` which will give the response `W 0004 2 0000X` where X is the current Squelch level.

---

## Signal & ExNoise

**Command Format:**  
- `D`

**Command Responses:**
- `D XXX YYY`  
Where XXX is the current signal level and YYY is the external noise level.  
Values are 3 digits with leading zeros.  
Units are in the BK4819's register format, these are half dBm units with a positive offset of 160.
* Divide by 2 then subtract 160 to convert to dBm
* Signal meter S-Units are defined as 6 dBm per S unit above the natural signal floor of the band.
  - 0 Mhz to 107 MHz : -115 dBm
  - 107 Mhz to 137 MHz : -105 dBm
  - 137 Mhz to 173 MHz : -110 dBm
  - 173 Mhz to 350 MHz : -126 dBm
  - 350 Mhz to 400 MHz : -123 dBm
  - 400 Mhz to 470 MHz : -124 dBm
  - 470 Mhz to 671 MHz : -129 dBm
  - 671 MHz and above : -135 dBm  
  
Queries the current signal and external noise levels being received by the radio.  

---

## Squelch, Signal & ExNoise

**Command Format:**  
- `Z`

**Command Responses:**
- `Z S XXX YYY`  
Where:  
S is the Squelch State  
XXX is the signal level  
YYY is the ex-noise level  
 
Response values are the same as the individual request formats for `Squelch` and `Signal & ExNoise` described above.

Since the protocol is fully transactional, the radio does not send unprompted data. This means that in order to keep track of Squelch state and the RSSI/Ex-Noise levels. It is necessary to continually poll the radio. Doing this with two separate commands is not ideal. This command combines both S and D commands into a single command to simplify polling.

---

## Changing Settings

**Command Format:**  
- `W AAAA C [VVVVV]`  
Where:  
AAAA is the settings offset.  
C is the byte count (1 = Single unsigned byte, 2 = 16 bit unsigned little endian)  
VVVVV is the value to change the setting to, if omitted, the command acts as a query of the setting offset.  
  
Note: All values must contain the correct number of digits, 4 for offset, 1 for byte count and 5 for value, use leading zeros. Values should be supplied in decimal. When the setting requires a signed negative value, the corresponding unsigned value should be sent. For example: -2 is 65534 for a 16 bit value. Responses also follow the same negative behaviour. Every multi-byte setting will have an offset value that is an integer multiple of the byte count. I.e. 16 bit settings will always have an even offset.
  
**Command Responses:**
- `W AAAA VVVVV` = Change Applied, also sent as a response to a query.
- `E Invalid parameters`
  
Changing settings can be dangerous. If the wrong offset, invalid values or incorrect byte count is used it will change unintended settings values and/or set values outside the valid range resulting in seemingly random problems.
  
As it is a large undertaking to document every setting offset, size and valid values, for now, please post requesting this information until a comprehensive list can be published.

---

## Command Replies

**Command Format:**
- `E [0, 1 or 2]`
- **Default:** `2`

**This command DOES NOT send any replies.**

Selects how the radio responds to commands.

| Value | Result |
|---|---|
| 2 | The radio sends replies, queries and errors to commands and also sends the `cmd:` prompt |
| 1 | The radio sends only replies, queries and errors to commands, but the `cmd:` prompt is NOT sent |
| 0 | The radio will send NOTHING back to the host at all, no errors, no replies, nothing. |
