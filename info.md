# Camel Contact Card

A compact pill card for Home Assistant that shows how many contact sensors are open at a glance. Tap to open a full overview popup — see each sensor's current state and tap any sensor to view its 24-hour history.

## Key Features

- **Compact pill design** — a slim 56px card shows the current contact state at a glance (e.g. *2 of 5 Open*, *All Closed*); optional title label
- **Pill fill bar** — a proportional fill behind the pill grows as more sensors are detected open, with a configurable fill colour
- **Auto-detection** — automatically finds all `binary_sensor` domain entities in your Home Assistant instance; door, window and contact types are listed first in the editor
- **Sensor overview popup** — tap the pill to open a popup showing each sensor as its own pill with its current state; tap the Open or Closed stat pill to highlight matching sensors in the grid
- **Sensor detail popup** — tap any sensor pill in the overview to open its individual detail popup, showing current state, sensor type and last-changed time
- **Live history** — tap the *Last changed* row in the detail popup to view a 24-hour state timeline showing when each sensor was opened or closed
- **Group by Area** — optionally group sensors into their Home Assistant areas in the overview popup
- **Friendly names** — assign a custom display name to any sensor directly in the visual editor
- **Drag-to-reorder** — drag selected sensors in the visual editor to set the order they appear in the popup
- **Full colour control** — eight colour pickers: Pill Background, Text, Accent, Pill Fill, Open, Closed, Popup Background and Sensor Icon

## Quick Start

```yaml
type: custom:camel-contact-card
entities:
  - binary_sensor.front_door
  - binary_sensor.back_door
  - binary_sensor.living_room_window
title: Doors & Windows
accent_color: '#30D158'
fill_color: '#FF453A'
open_color: '#FF453A'
```

All settings can be configured through the built-in visual editor — no YAML editing required!
