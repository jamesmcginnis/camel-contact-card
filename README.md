# Camel Contact Card

A compact pill card for Home Assistant that shows how many contact sensors are open at a glance. Tap to open a full overview popup — see each sensor's current state and tap any sensor to view its 24-hour history timeline.

![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2024.1+-blue)
![HACS](https://img.shields.io/badge/HACS-Custom-orange)
![License](https://img.shields.io/badge/license-MIT-green)

[![Open your Home Assistant instance and add this repository to HACS.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=jamesmcginnis&repository=camel-contact-card&category=plugin)

---

## ✨ Features

### Pill Card
- **Compact pill design** — a slim 56px card shows how many of your sensors are currently open (e.g. *2 of 5 Open*, *All Closed*, *All Open*)
- **Pill fill bar** — a proportional tinted fill behind the card grows from left to right as more sensors are detected open; colour is independently configurable
- **Optional title** — show a label on the pill, or leave it blank to show just the count
- **Frosted-glass popups** — smooth slide-up and scale animations, fully customisable colours
- **Mobile optimised** — touch-friendly tap targets designed for iPhone dashboards

### Sensor Overview Popup
- **Stats bar** — shows Open and Closed counts across all configured sensors; tap either pill to highlight matching sensors in the grid
- **Sensor pills** — each sensor is shown as its own tappable pill with its current state; open sensors display in your configured open colour, closed sensors are dimmed
- **Live door icons** — each sensor pill shows an open or closed door icon reflecting the real-time state
- **Group by Area** — optionally group sensors by their Home Assistant area, with a labelled section per area
- **Tap to open detail** — tap any sensor pill to open its individual detail popup

### Individual Sensor Detail Popup
- **State circle** — large indicator reflecting the sensor's current state; filled and glowing when open, dimmed when closed
- **State label** — prominent *Open* or *Closed* text that updates in real time as Home Assistant reports state changes
- **Type row** — shows the sensor's Home Assistant device class (Door, Window, Contact, etc.)
- **Last changed row** — shows how long ago the sensor last changed state; tap it to open a 24-hour history timeline
- **Live updates** — the popup reflects state changes from Home Assistant in real time without needing to be reopened

### Sensor History
- Tap the *Last changed* row in the detail popup to open a 24-hour history timeline
- History is fetched live from the Home Assistant history API
- Each entry shows whether the sensor was opened or closed, the date and time, and how long it stayed in that state
- Entries are shown most recent first

### Visual Editor
- **Auto-detected sensors** — all `binary_sensor` entities in your Home Assistant instance are shown automatically; door, window, contact and opening types are listed first with a type badge
- **Search and filter** — type to instantly filter the sensor list
- **Toggle to select** — tap the toggle next to any sensor to add or remove it
- **Drag-to-reorder** — drag selected sensors using the grip handle to set the order they appear in the popup
- **Friendly names** — expand any selected sensor to set a custom display name
- **Colour control** — eight colour pickers: Pill Background, Text, Accent, Pill Fill, Open, Closed, Popup Background and Sensor Icon

---

## 🚀 Installation

### HACS (Recommended)

[![Open your Home Assistant instance and add this repository to HACS.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=jamesmcginnis&repository=camel-contact-card&category=plugin)

1. Open **HACS** in your Home Assistant instance
2. Click **Frontend**
3. Click the ⋮ menu → **Custom repositories**
4. Paste `https://github.com/jamesmcginnis/camel-contact-card` and set the category to **Dashboard**
5. Click **Download**
6. Restart Home Assistant

### Manual Installation

1. Download `camel-contact-card.js`
2. Copy it into your `config/www/` folder
3. Add the resource in your Lovelace configuration:

```yaml
lovelace:
  resources:
    - url: /local/camel-contact-card.js
      type: module
```

4. Restart Home Assistant

---

## ⚙️ Configuration

### Quick Start

1. Edit your dashboard and click **Add Card**
2. Search for **Camel Contact**
3. Use the **visual editor** to select your sensors and configure colours
4. Hit **Save** — done!

### YAML Example

```yaml
type: custom:camel-contact-card
entities:
  - binary_sensor.front_door
  - binary_sensor.back_door
  - binary_sensor.living_room_window
  - binary_sensor.bedroom_window
title: Doors & Windows
accent_color: '#30D158'
fill_color: '#FF453A'
open_color: '#FF453A'
closed_color: '#48484A'
icon_color: '#30D158'
pill_bg: '#1c1c1e'
text_color: '#ffffff'
popup_bg: '#1c1c1e'
friendly_names:
  binary_sensor.front_door: Front Door
  binary_sensor.living_room_window: Living Room Window
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `entities` | list | `[]` | List of binary_sensor entity IDs to display, in display order |
| `title` | string | _(blank)_ | Label shown on the pill card. Leave blank to hide |
| `group_by_area` | boolean | `false` | Group sensors by their Home Assistant area in the overview popup |
| `accent_color` | string | `#30D158` | Highlight colour for active states and controls |
| `fill_color` | string | `#FF453A` | Colour of the proportional fill bar when sensors are open |
| `open_color` | string | `#FF453A` | Colour used to indicate a sensor is open |
| `closed_color` | string | `#48484A` | Colour used to indicate a sensor is closed |
| `icon_color` | string | `#30D158` | Colour of the contact icon on the pill card |
| `pill_bg` | string | `#1c1c1e` | Background colour of the main pill card |
| `text_color` | string | `#ffffff` | Primary text colour |
| `popup_bg` | string | `#1c1c1e` | Background colour of all popup dialogs |
| `friendly_names` | map | `{}` | Custom display names keyed by entity ID |

---

## 🎨 Colour System

| Field | Default | What it affects |
|-------|---------|----------------|
| **Pill Background** | `#1c1c1e` | The background of the main pill card |
| **Text** | `#ffffff` | Labels and count text |
| **Accent** | `#30D158` | Stat pill highlight, active filters |
| **Pill Fill** | `#FF453A` | The proportional tinted fill bar that grows as sensors are detected open |
| **Open** | `#FF453A` | Pill icon and state text when a sensor is open |
| **Closed** | `#48484A` | State circle border when a sensor is closed |
| **Popup Background** | `#1c1c1e` | The background of the overview and detail popups |
| **Sensor Icon** | `#30D158` | The contact icon on the pill card |

---

## 💡 How It Works

### Pill Fill
A tinted bar sits behind the pill card content and grows proportionally as more sensors are detected open — empty when all sensors are closed, full when all sensors are open. The fill colour is set independently via `fill_color`.

### Sensor Overview
Tap the pill card to open the full overview popup. Each sensor is displayed as a pill showing its current state with a live open/closed door icon. Tap the **Open** or **Closed** stat pill at the top to filter and highlight sensors in the grid. Tap any sensor pill to open its detail popup.

### Sensor Detail
The detail popup shows the sensor's current state with a large indicator circle, its device class type, and when it last changed. The popup updates live as Home Assistant reports state changes — no need to reopen it.

### Sensor History
Tap the *Last changed* row in any sensor's detail popup to fetch and display the last 24 hours of state changes directly from the Home Assistant history API. Entries are shown most recent first with timestamps and duration.

### Group by Area
Enable the **Group by Area** toggle in the editor to group sensors by their Home Assistant area in the overview popup. Sensors not assigned to an area appear under a *No Area* section.

### Auto-Detection
The visual editor automatically discovers all `binary_sensor` entities from your Home Assistant instance. Sensors with device classes of `door`, `garage_door`, `window`, `lock`, `opening`, or `contact` are sorted to the top of the list and shown with a type badge. All binary sensors can be selected regardless of device class.

---

## 🔍 Supported Sensor Types

While any `binary_sensor` entity can be used, the card is best suited to sensors with these device classes:

- `door` — door contact sensors
- `garage_door` — garage door sensors
- `window` — window contact sensors
- `lock` — lock sensors (on = unlocked/open)
- `opening` — generic opening sensors
- `contact` — generic contact sensors

---

## 🔧 Troubleshooting

**Card doesn't appear after installation**
- Add the resource to Lovelace (see Installation above) and hard-refresh: `Ctrl+Shift+R` / `Cmd+Shift+R`

**No sensors appear in the editor**
- Ensure your entities are in the `binary_sensor` domain (entity IDs starting with `binary_sensor.`)

**A sensor shows as Open when I expect it to be Closed**
- Check the raw state of the entity in Home Assistant's Developer Tools → States. The card uses `on` = Open and `off` = Closed, matching the standard `binary_sensor` convention

**History popup shows "No history in the last 24 hours"**
- Ensure the HA history integration is enabled and configured to record the entity. Check **Settings → System → Storage** for recorder configuration

**Popup doesn't open when tapping the pill**
- Ensure at least one entity is configured and that the entity exists in your Home Assistant instance

**Keyboard closes while typing on iPhone**
- All text fields save on blur rather than on every keystroke, which prevents HA from rebuilding the editor mid-input. Tap the field, type, then tap elsewhere to save

---

## 📄 License

MIT License — free to use, modify and distribute.

---

## ⭐ Support

If this card is useful to you, please **star the repository** and share it with the community!

For bugs or feature requests, use the [GitHub Issues](../../issues) page.
