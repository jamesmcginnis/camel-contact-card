/**
 * Camel Contact Card
 * Compact pill card showing how many contact sensors are open at a glance.
 * Tap pill → sensor overview popup with per-sensor state and 24-hour history
 * GitHub: https://github.com/jamesmcginnis/camel-contact-card
 */

// ─── Editor: Colour field definitions ────────────────────────────────────────
const CAMEL_COLOUR_FIELDS = [
  { key: 'pill_bg',      label: 'Pill Background', desc: 'Background colour of the main pill card.',                   default: '#1c1c1e' },
  { key: 'text_color',   label: 'Text',             desc: 'Primary text colour for labels and values.',                 default: '#ffffff' },
  { key: 'accent_color', label: 'Accent',           desc: 'Highlight colour used for active states and controls.',      default: '#30D158' },
  { key: 'fill_color',   label: 'Pill Fill',        desc: 'Colour of the fill bar shown when sensors are open.',        default: '#FF453A' },
  { key: 'open_color',   label: 'Open',             desc: 'Colour used to indicate a contact sensor is open.',          default: '#FF453A' },
  { key: 'closed_color', label: 'Closed',           desc: 'Colour used to indicate a contact sensor is closed.',        default: '#48484A' },
  { key: 'popup_bg',     label: 'Popup Background', desc: 'Background colour of all popup dialogs.',                   default: '#1c1c1e' },
  { key: 'icon_color',   label: 'Sensor Icon',      desc: 'Colour of the contact icon on the pill card.',              default: '#30D158' },
];

// ─── SVG paths ────────────────────────────────────────────────────────────────
// Closed door icon (used on pill and when sensor is closed)
const CAMEL_DOOR_CLOSED_PATH = 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14c-.55 0-1-.45-1-1V8c0-.55.45-1 1-1s1 .45 1 1v8c0 .55-.45 1-1 1z';
// Open door icon (used when sensor is open)
const CAMEL_DOOR_OPEN_PATH   = 'M17 3c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h1v2H7v14h10V5h-1V3h1zm-3 0v2h-4V3h4zm-2 7c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z';

// ─────────────────────────────────────────────────────────────────────────────
//  Main Card
// ─────────────────────────────────────────────────────────────────────────────
class CamelContactCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._popupOverlay   = null;
    this._sensorPopup    = null;
  }

  static getConfigElement() {
    return document.createElement('camel-contact-card-editor');
  }

  static getStubConfig() {
    return {
      type:          'custom:camel-contact-card',
      entities:      [],
      title:         '',
      group_by_area: false,
      accent_color:  '#30D158',
      fill_color:    '#FF453A',
      open_color:    '#FF453A',
      closed_color:  '#48484A',
      pill_bg:       '#1c1c1e',
      text_color:    '#ffffff',
      popup_bg:      '#1c1c1e',
      icon_color:    '#30D158',
    };
  }

  setConfig(config) {
    this._config = {
      title:         '',
      group_by_area: false,
      accent_color:  '#30D158',
      fill_color:    '#FF453A',
      open_color:    '#FF453A',
      closed_color:  '#48484A',
      pill_bg:       '#1c1c1e',
      text_color:    '#ffffff',
      popup_bg:      '#1c1c1e',
      icon_color:    '#30D158',
      ...config
    };
    if (this.shadowRoot.innerHTML) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.shadowRoot.innerHTML) this._render();
    else {
      this._update();
      if (this._refreshOverview)    this._refreshOverview();
      if (this._refreshSensorPopup) this._refreshSensorPopup();
    }
  }

  connectedCallback() {}
  disconnectedCallback() {}
  getCardSize() { return 1; }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _entities() {
    return (this._config.entities || []).filter(e => e && this._hass?.states[e]);
  }

  // contact sensor: on = open, off = closed
  _isOpen(entityId) {
    return this._hass?.states[entityId]?.state === 'on';
  }

  _deviceClass(entityId) {
    return this._hass?.states[entityId]?.attributes?.device_class || null;
  }

  _name(entityId) {
    const fn = this._config.friendly_names?.[entityId];
    if (fn) return fn;
    const s = this._hass?.states[entityId];
    if (!s) return entityId;
    return s.attributes?.friendly_name || entityId.split('.').pop().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  _getAreaForEntity(entityId) {
    if (!this._hass) return null;
    const entityReg = this._hass.entities?.[entityId];
    if (!entityReg) return null;
    let areaId = entityReg.area_id;
    if (!areaId && entityReg.device_id) {
      areaId = this._hass.devices?.[entityReg.device_id]?.area_id;
    }
    if (!areaId) return null;
    return this._hass.areas?.[areaId]?.name || areaId;
  }

  _hexToRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : '48,209,88';
  }

  _haFont() {
    return getComputedStyle(this).fontFamily || 'inherit';
  }

  _timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ${mins % 60}m ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  // ── Render main pill card ─────────────────────────────────────────────────

  _render() {
    const cfg = this._config;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; font-family: inherit; }
        ha-card {
          height: 56px;
          border-radius: 28px;
          background: ${cfg.pill_bg || '#1c1c1e'};
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 0 18px;
          gap: 12px;
          overflow: hidden;
          position: relative;
          box-sizing: border-box;
          transition: transform 0.15s ease;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 2px 12px rgba(0,0,0,0.35);
        }
        ha-card:active { transform: scale(0.97); }
        #pill-fill {
          position: absolute; left: 0; top: 0; bottom: 0;
          border-radius: 28px 0 0 28px; pointer-events: none; width: 0%;
          background: rgba(${this._hexToRgb(cfg.fill_color || '#FF453A')}, 0.22);
          transition: width 0.5s cubic-bezier(0.4,0,0.2,1), border-radius 0.3s ease;
        }
        .icon-wrap {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: rgba(${this._hexToRgb(cfg.icon_color || '#30D158')}, 0.15);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          pointer-events: none;
        }
        .icon-wrap svg { display: block; }
        .content { flex: 1; min-width: 0; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .label { font-size: 13px; color: ${cfg.text_color || '#fff'}; opacity: 0.55; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; }
        .count { font-size: 14px; color: ${cfg.text_color || '#fff'}; white-space: nowrap; letter-spacing: -0.3px; }
        .no-entities { font-size: 12px; color: rgba(255,255,255,0.35); }
      </style>
      <ha-card id="mainCard">
        <div id="pill-fill"></div>
        <div class="icon-wrap">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="${cfg.icon_color || '#30D158'}">
            <path d="${CAMEL_DOOR_CLOSED_PATH}"/>
          </svg>
        </div>
        <div class="content" id="content">
          <span class="no-entities">Select entities in editor</span>
        </div>
      </ha-card>`;

    this.shadowRoot.getElementById('mainCard').addEventListener('click', () => this._openOverviewPopup());
    this._update();
  }

  _update() {
    const content  = this.shadowRoot.getElementById('content');
    if (!content) return;
    const entities = this._entities();
    const cfg      = this._config;

    if (!entities.length) {
      content.innerHTML = `<span class="no-entities">Select entities in editor</span>`;
      return;
    }

    const openCount = entities.filter(e => this._isOpen(e)).length;
    const total     = entities.length;
    const label     = (cfg.title || '').trim();
    const countTxt  = openCount === 0
      ? 'All Closed'
      : openCount === total
        ? 'All Open'
        : `${openCount} of ${total} Open`;

    content.innerHTML = label
      ? `<span class="label">${label}</span><span class="count">${countTxt}</span>`
      : `<span class="count">${countTxt}</span>`;

    const fillEl = this.shadowRoot.getElementById('pill-fill');
    if (fillEl) {
      fillEl.style.width        = `${Math.round((openCount / total) * 100)}%`;
      fillEl.style.borderRadius = openCount === total ? '28px' : '28px 0 0 28px';
    }
  }

  // ── Overview Popup ────────────────────────────────────────────────────────

  _openOverviewPopup() {
    if (this._popupOverlay) return;
    const entities = this._entities();
    const cfg      = this._config;
    if (!entities.length) return;

    const popupBg  = cfg.popup_bg      || '#1c1c1e';
    const accent   = cfg.accent_color  || '#30D158';
    const textCol  = cfg.text_color    || '#ffffff';
    const openCol  = cfg.open_color    || '#FF453A';

    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;inset:0;z-index:9999;display:flex;align-items:flex-end;justify-content:center;padding:16px;background:rgba(0,0,0,0.55);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);`;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes camelFadeIn  { from{opacity:0} to{opacity:1} }
      @keyframes camelSlideUp { from{transform:translateY(24px) scale(0.97);opacity:0} to{transform:none;opacity:1} }
      .camel-popup   { animation: camelSlideUp 0.28s cubic-bezier(0.34,1.28,0.64,1); }
      #camel-overlay { animation: camelFadeIn 0.2s ease; }
      .camel-sensor-pill {
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        padding: 14px 10px; border-radius: 20px; cursor: pointer;
        background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
        transition: transform 0.15s ease, background 0.15s ease, border-color 0.2s, opacity 0.2s;
        min-width: 0; flex: 1; gap: 6px; position: relative;
        user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
        touch-action: none;
        font-family: var(--primary-font-family, inherit);
      }
      .camel-sensor-pill.is-open { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.3); }
      .camel-sensor-pill.pressing { transform: scale(0.93); }
      .camel-pill-name { font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.45); text-align: center; letter-spacing: 0.02em; line-height: 1.3; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .camel-close-btn:hover { background:rgba(255,255,255,0.22)!important; }
      .camel-stat-pill { flex:1; cursor:pointer; transition:background 0.15s,border-color 0.15s; }
    `;

    const popup = document.createElement('div');
    popup.className = 'camel-popup';
    popup.style.cssText = `background:${popupBg};backdrop-filter:blur(40px) saturate(180%);-webkit-backdrop-filter:blur(40px) saturate(180%);border:1px solid rgba(255,255,255,0.13);border-radius:28px;box-shadow:0 28px 72px rgba(0,0,0,0.65);padding:20px;width:100%;max-width:420px;max-height:85vh;overflow-y:auto;-webkit-overflow-scrolling:touch;color:${textCol};font-family:${this._haFont()};`;

    // ── Header ────────────────────────────────────────────────────────────
    const headerRow = document.createElement('div');
    headerRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;';
    headerRow.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:28px;height:28px;border-radius:50%;background:${accent}22;display:flex;align-items:center;justify-content:center;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="${accent}"><path d="${CAMEL_DOOR_CLOSED_PATH}"/></svg>
        </div>
        <span style="font-size:15px;font-weight:700;color:${textCol};">${cfg.title || 'Contact Sensors'}</span>
      </div>
      <button class="camel-close-btn" style="background:rgba(255,255,255,0.1);border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.65);font-size:16px;line-height:1;padding:0;transition:background 0.15s;flex-shrink:0;">✕</button>`;
    headerRow.querySelector('.camel-close-btn').addEventListener('click', () => this._closeOverviewPopup());

    // ── Pill map ──────────────────────────────────────────────────────────
    const pillMap = new Map(); // entityId → { pill, svg, stateEl }

    // ── Stats row ─────────────────────────────────────────────────────────
    const openStatValueEl   = document.createElement('div');
    const closedStatValueEl = document.createElement('div');
    openStatValueEl.style.cssText   = `font-size:17px;font-weight:700;letter-spacing:-0.3px;color:${textCol};`;
    closedStatValueEl.style.cssText = `font-size:17px;font-weight:700;letter-spacing:-0.3px;color:${textCol};`;

    const statsRow = document.createElement('div');
    statsRow.style.cssText = 'display:flex;gap:8px;margin-bottom:18px;';
    let activeFilter = null;

    const highlightPills = (mode) => {
      pillMap.forEach(({ pill }, entityId) => {
        const open  = this._isOpen(entityId);
        const match = mode === null || (mode === 'open' && open) || (mode === 'closed' && !open);
        pill.style.outline       = (mode !== null && match) ? `2px solid ${accent}` : '';
        pill.style.outlineOffset = (mode !== null && match) ? '-2px' : '';
        pill.style.opacity       = (mode !== null && !match) ? '0.3' : '';
      });
    };

    const makeStatPill = (label, valueEl, mode) => {
      const el = document.createElement('div');
      el.style.cssText = `flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:10px 8px;text-align:center;cursor:pointer;transition:background 0.15s,border-color 0.15s;`;
      const labelDiv = document.createElement('div');
      labelDiv.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.4);font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px;';
      labelDiv.textContent = label;
      el.appendChild(labelDiv);
      el.appendChild(valueEl);
      el.classList.add('camel-stat-pill');
      el.dataset.mode = mode;
      el.addEventListener('mouseenter', () => { if (activeFilter !== mode) el.style.background = 'rgba(255,255,255,0.1)'; });
      el.addEventListener('mouseleave', () => { if (activeFilter !== mode) el.style.background = 'rgba(255,255,255,0.06)'; });
      el.addEventListener('click', ev => {
        ev.stopPropagation();
        const newMode = activeFilter === mode ? null : mode;
        activeFilter = newMode;
        statsRow.querySelectorAll('.camel-stat-pill').forEach(p => {
          const active = p.dataset.mode === activeFilter;
          p.style.background  = active ? `${accent}33` : 'rgba(255,255,255,0.06)';
          p.style.borderColor = active ? accent          : 'rgba(255,255,255,0.08)';
        });
        highlightPills(activeFilter);
      });
      return el;
    };

    // ── Live refresh ──────────────────────────────────────────────────────
    const refreshOverview = () => {
      const openCount   = entities.filter(e => this._isOpen(e)).length;
      const closedCount = entities.length - openCount;
      openStatValueEl.textContent   = `${openCount} / ${entities.length}`;
      closedStatValueEl.textContent = `${closedCount} / ${entities.length}`;

      pillMap.forEach(({ pill, svg, stateEl }, entityId) => {
        const open = this._isOpen(entityId);
        pill.classList.toggle('is-open', open);
        pill.style.background  = open ? 'rgba(255,255,255,0.1)' : '';
        pill.style.borderColor = open ? 'rgba(255,255,255,0.3)' : '';
        svg.setAttribute('fill', open ? openCol : 'rgba(255,255,255,0.2)');
        // swap icon path
        const pathEl = svg.querySelector('path');
        if (pathEl) pathEl.setAttribute('d', open ? CAMEL_DOOR_OPEN_PATH : CAMEL_DOOR_CLOSED_PATH);
        stateEl.style.color = open ? openCol : 'rgba(255,255,255,0.25)';
        stateEl.textContent = open ? 'Open' : 'Closed';
      });
    };
    this._refreshOverview = refreshOverview;

    const openCount   = entities.filter(e => this._isOpen(e)).length;
    const closedCount = entities.length - openCount;
    openStatValueEl.textContent   = `${openCount} / ${entities.length}`;
    closedStatValueEl.textContent = `${closedCount} / ${entities.length}`;

    statsRow.appendChild(makeStatPill('Open',   openStatValueEl,   'open'));
    statsRow.appendChild(makeStatPill('Closed', closedStatValueEl, 'closed'));

    // ── Pills label ───────────────────────────────────────────────────────
    const pillsLabel = document.createElement('div');
    pillsLabel.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:rgba(255,255,255,0.3);margin-bottom:10px;';
    pillsLabel.textContent = `${entities.length} Sensor${entities.length !== 1 ? 's' : ''}`;

    // ── Build a single sensor pill ────────────────────────────────────────
    const buildPill = (entityId) => {
      const open = this._isOpen(entityId);
      const name = this._name(entityId);

      const pill = document.createElement('div');
      pill.className = `camel-sensor-pill${open ? ' is-open' : ''}`;
      if (open) { pill.style.background = 'rgba(255,255,255,0.1)'; pill.style.borderColor = 'rgba(255,255,255,0.3)'; }

      const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgEl.setAttribute('width', '22'); svgEl.setAttribute('height', '22');
      svgEl.setAttribute('viewBox', '0 0 24 24');
      svgEl.setAttribute('fill', open ? openCol : 'rgba(255,255,255,0.2)');
      svgEl.style.cssText = 'display:block;flex-shrink:0;';
      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathEl.setAttribute('d', open ? CAMEL_DOOR_OPEN_PATH : CAMEL_DOOR_CLOSED_PATH);
      svgEl.appendChild(pathEl);

      const stateEl = document.createElement('div');
      stateEl.style.cssText = `font-size:12px;font-weight:700;color:${open ? openCol : 'rgba(255,255,255,0.25)'};line-height:1;`;
      stateEl.textContent = open ? 'Open' : 'Closed';

      const nameEl = document.createElement('div');
      nameEl.className = 'camel-pill-name';
      nameEl.textContent = name;

      pill.appendChild(svgEl);
      pill.appendChild(stateEl);
      pill.appendChild(nameEl);
      pill.dataset.entityId = entityId;

      pillMap.set(entityId, { pill, svg: svgEl, stateEl });

      pill.addEventListener('mousedown', () => pill.classList.add('pressing'));
      pill.addEventListener('mouseleave', () => pill.classList.remove('pressing'));
      pill.addEventListener('mouseup', (e) => {
        e.stopPropagation();
        pill.classList.remove('pressing');
        this._openSensorPopup(entityId);
      });

      return pill;
    };

    // ── Pills container (flat or grouped by area) ─────────────────────────
    const pillsContainer = document.createElement('div');
    pillsContainer.style.cssText = 'margin-bottom:10px;';

    if (cfg.group_by_area) {
      const areaMap   = new Map();
      const ungrouped = [];
      entities.forEach(entityId => {
        const areaName = this._getAreaForEntity(entityId);
        if (areaName) {
          if (!areaMap.has(areaName)) areaMap.set(areaName, []);
          areaMap.get(areaName).push(entityId);
        } else {
          ungrouped.push(entityId);
        }
      });
      const sortedAreas = [...areaMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      if (ungrouped.length) sortedAreas.push(['No Area', ungrouped]);

      sortedAreas.forEach(([areaName, areaEntities], groupIdx) => {
        const areaHeader = document.createElement('div');
        areaHeader.style.cssText = `font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:rgba(255,255,255,0.3);margin-bottom:8px;${groupIdx > 0 ? 'margin-top:16px;' : ''}`;
        areaHeader.textContent = areaName;
        pillsContainer.appendChild(areaHeader);
        const areaGrid = document.createElement('div');
        areaGrid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:10px;';
        areaEntities.forEach(entityId => areaGrid.appendChild(buildPill(entityId)));
        pillsContainer.appendChild(areaGrid);
      });
    } else {
      const pillsGrid = document.createElement('div');
      pillsGrid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:10px;';
      entities.forEach(entityId => pillsGrid.appendChild(buildPill(entityId)));
      pillsContainer.appendChild(pillsGrid);
    }

    // ── Delegated touch handler ───────────────────────────────────────────
    let activePill        = null;
    let activeTouchStartY = 0;
    let activeLastTouchY  = 0;
    let activeTouchMoved  = false;

    pillsContainer.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      const el    = document.elementFromPoint(touch.clientX, touch.clientY);
      activePill  = el?.closest('[data-entity-id]');
      if (!activePill) return;
      activeTouchMoved  = false;
      activeTouchStartY = touch.clientY;
      activeLastTouchY  = touch.clientY;
      activePill.classList.add('pressing');
    }, { passive: true });

    pillsContainer.addEventListener('touchmove', (e) => {
      if (!activePill) return;
      const currentY = e.touches[0].clientY;
      const dy       = currentY - activeLastTouchY;
      activeLastTouchY = currentY;
      if (Math.abs(currentY - activeTouchStartY) > 8) {
        activeTouchMoved = true;
        activePill.classList.remove('pressing');
        popup.scrollTop -= dy;
      }
    }, { passive: true });

    pillsContainer.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (activePill) {
        activePill.classList.remove('pressing');
        if (!activeTouchMoved) {
          this._openSensorPopup(activePill.dataset.entityId);
        }
        activePill = null;
      }
    }, { passive: false });

    pillsContainer.addEventListener('touchcancel', () => {
      if (activePill) { activePill.classList.remove('pressing'); activePill = null; }
      activeTouchMoved = false;
    }, { passive: true });

    popup.appendChild(style);
    popup.appendChild(headerRow);
    popup.appendChild(statsRow);
    popup.appendChild(pillsLabel);
    popup.appendChild(pillsContainer);

    overlay.id = 'camel-overlay';
    overlay.appendChild(popup);
    overlay.addEventListener('click', e => { if (e.target === overlay) this._closeOverviewPopup(); });

    this._blockBodyScroll = (e) => {
      if (!popup.contains(e.target)) e.preventDefault();
    };
    document.addEventListener('touchmove', this._blockBodyScroll, { passive: false });

    document.body.appendChild(overlay);
    this._popupOverlay = overlay;
  }

  _closeOverviewPopup() {
    if (!this._popupOverlay) return;
    this._refreshOverview = null;
    document.removeEventListener('touchmove', this._blockBodyScroll);
    this._blockBodyScroll = null;
    this._popupOverlay.style.transition = 'opacity 0.18s ease';
    this._popupOverlay.style.opacity    = '0';
    setTimeout(() => {
      if (this._popupOverlay?.parentNode) this._popupOverlay.parentNode.removeChild(this._popupOverlay);
      this._popupOverlay = null;
    }, 180);
  }

  // ── Individual Sensor Detail Popup ────────────────────────────────────────

  _openSensorPopup(entityId) {
    if (this._sensorPopup) {
      if (this._sensorPopup.parentNode) this._sensorPopup.parentNode.removeChild(this._sensorPopup);
      this._sensorPopup = null;
    }

    const cfg       = this._config;
    const popupBg   = cfg.popup_bg      || '#1c1c1e';
    const accent    = cfg.accent_color  || '#30D158';
    const textCol   = cfg.text_color    || '#ffffff';
    const openCol   = cfg.open_color    || '#FF453A';
    const closedCol = cfg.closed_color  || '#48484A';
    const name      = this._name(entityId);

    const sensorOverlay = document.createElement('div');
    sensorOverlay.style.cssText = `position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,0.45);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);user-select:none;-webkit-user-select:none;`;

    const closeSensorPopup = () => {
      this._refreshSensorPopup = null;
      sensorOverlay.style.transition = 'opacity 0.15s ease';
      sensorOverlay.style.opacity    = '0';
      setTimeout(() => {
        if (sensorOverlay.parentNode) sensorOverlay.parentNode.removeChild(sensorOverlay);
        this._sensorPopup = null;
      }, 150);
    };

    const style = document.createElement('style');
    style.textContent = `
      @keyframes camelSensorUp { from{transform:translateY(30px) scale(0.96);opacity:0} to{transform:none;opacity:1} }
      .camel-sensor-popup { animation: camelSensorUp 0.32s cubic-bezier(0.34,1.2,0.64,1); user-select:none; -webkit-user-select:none; }
      .camel-hk-row { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; cursor:default; }
      .camel-hk-row.tappable { cursor:pointer; }
      .camel-hk-row.tappable:active { background:rgba(255,255,255,0.05); }
      .camel-hk-row-label { font-size:15px; font-weight:500; color:rgba(255,255,255,0.85); }
      .camel-hk-row-value { font-size:15px; font-weight:500; color:rgba(255,255,255,0.4); display:flex; align-items:center; gap:6px; }
      .camel-hk-chevron { font-size:13px; color:rgba(255,255,255,0.25); }
    `;

    const popup = document.createElement('div');
    popup.className = 'camel-sensor-popup';
    popup.style.cssText = `background:${popupBg};backdrop-filter:blur(60px) saturate(200%);-webkit-backdrop-filter:blur(60px) saturate(200%);border:1px solid rgba(255,255,255,0.1);border-radius:32px;box-shadow:0 40px 80px rgba(0,0,0,0.7);padding:24px;width:100%;max-width:340px;color:${textCol};font-family:${this._haFont()};user-select:none;-webkit-user-select:none;`;

    const getState       = () => this._hass?.states[entityId];
    const getIsOpen      = () => getState()?.state === 'on';
    const getLastChanged = () => getState()?.last_changed || getState()?.last_updated;

    // ── Header: name + close ──────────────────────────────────────────────
    const headerRow = document.createElement('div');
    headerRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;';
    const nameLine = document.createElement('span');
    nameLine.style.cssText = `font-size:17px;font-weight:700;color:${textCol};letter-spacing:-0.3px;`;
    nameLine.textContent = name;
    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = `background:rgba(255,255,255,0.1);border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.6);padding:0;transition:background 0.15s;flex-shrink:0;`;
    closeBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 12 12"><path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>`;
    closeBtn.addEventListener('click', closeSensorPopup);
    closeBtn.addEventListener('mouseenter', () => { closeBtn.style.background = 'rgba(255,255,255,0.18)'; });
    closeBtn.addEventListener('mouseleave', () => { closeBtn.style.background = 'rgba(255,255,255,0.1)'; });
    headerRow.appendChild(nameLine);
    headerRow.appendChild(closeBtn);

    // ── State circle + label ──────────────────────────────────────────────
    const stateWrap = document.createElement('div');
    stateWrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;margin:0 0 24px;';

    const stateCircle = document.createElement('div');
    const applyStateCircle = (isOpen) => {
      const col = isOpen ? openCol : closedCol;
      stateCircle.style.cssText = `width:80px;height:80px;border-radius:50%;background:${isOpen ? `${col}22` : 'rgba(255,255,255,0.07)'};border:2.5px solid ${col};display:flex;align-items:center;justify-content:center;transition:background 0.25s,border-color 0.25s;box-shadow:${isOpen ? `0 4px 24px ${col}55` : 'none'};`;
      stateCircle.innerHTML = `<svg width="38" height="38" viewBox="0 0 24 24" fill="${col}" style="opacity:${isOpen ? '1' : '0.4'}"><path d="${isOpen ? CAMEL_DOOR_OPEN_PATH : CAMEL_DOOR_CLOSED_PATH}"/></svg>`;
    };
    applyStateCircle(getIsOpen());

    const stateLabel = document.createElement('div');
    const applyStateLabel = (isOpen) => {
      stateLabel.style.cssText = `font-size:20px;font-weight:700;color:${isOpen ? openCol : 'rgba(255,255,255,0.35)'};letter-spacing:-0.5px;`;
      stateLabel.textContent = isOpen ? 'Open' : 'Closed';
    };
    applyStateLabel(getIsOpen());

    stateWrap.appendChild(stateCircle);
    stateWrap.appendChild(stateLabel);

    // ── Info card ─────────────────────────────────────────────────────────
    const listCard = document.createElement('div');
    listCard.style.cssText = `background:rgba(255,255,255,0.06);border-radius:18px;overflow:hidden;`;

    const addSep = () => {
      const sep = document.createElement('div');
      sep.style.cssText = 'height:1px;background:rgba(255,255,255,0.07);margin:0 16px;';
      listCard.appendChild(sep);
    };

    let rowCount = 0;

    // Device class row
    const dc = this._deviceClass(entityId);
    if (dc) {
      const dcRow = document.createElement('div');
      dcRow.className = 'camel-hk-row';
      const dcLbl = document.createElement('span');
      dcLbl.className = 'camel-hk-row-label';
      dcLbl.textContent = 'Type';
      const dcVal = document.createElement('span');
      dcVal.className = 'camel-hk-row-value';
      dcVal.textContent = dc.charAt(0).toUpperCase() + dc.slice(1);
      dcRow.appendChild(dcLbl); dcRow.appendChild(dcVal);
      listCard.appendChild(dcRow);
      rowCount++;
    }

    // Last changed row
    if (rowCount) addSep();
    const lastRow = document.createElement('div');
    lastRow.className = 'camel-hk-row tappable';
    const lastLbl = document.createElement('span');
    lastLbl.className = 'camel-hk-row-label';
    lastLbl.textContent = 'Last changed';
    const lastRight = document.createElement('div');
    lastRight.className = 'camel-hk-row-value';
    const lastValSpan = document.createElement('span');
    lastValSpan.textContent = this._timeAgo(getLastChanged());
    const chev = document.createElement('span');
    chev.className = 'camel-hk-chevron'; chev.textContent = '›';
    lastRight.appendChild(lastValSpan); lastRight.appendChild(chev);
    lastRow.appendChild(lastLbl); lastRow.appendChild(lastRight);
    lastRow.addEventListener('click', ev => {
      ev.stopPropagation();
      this._openHistoryPopup(entityId, name, accent, popupBg, textCol);
    });
    listCard.appendChild(lastRow);

    // ── Live refresh ──────────────────────────────────────────────────────
    this._refreshSensorPopup = () => {
      const isOpen = getIsOpen();
      applyStateCircle(isOpen);
      applyStateLabel(isOpen);
      lastValSpan.textContent = this._timeAgo(getLastChanged());
    };

    popup.appendChild(style);
    popup.appendChild(headerRow);
    popup.appendChild(stateWrap);
    popup.appendChild(listCard);

    sensorOverlay.appendChild(popup);
    sensorOverlay.addEventListener('click', e => { if (e.target === sensorOverlay) closeSensorPopup(); });
    document.body.appendChild(sensorOverlay);
    this._sensorPopup = sensorOverlay;
  }

  // ── History Popup ─────────────────────────────────────────────────────────

  async _openHistoryPopup(entityId, name, accent, popupBg, textCol) {
    const existing = document.getElementById('camel-history-sheet');
    if (existing) existing.remove();

    const sheet = document.createElement('div');
    sheet.id = 'camel-history-sheet';
    sheet.style.cssText = `position:fixed;inset:0;z-index:11000;display:flex;align-items:flex-end;justify-content:center;padding:16px;background:rgba(0,0,0,0.5);backdrop-filter:blur(8px);`;

    const inner = document.createElement('div');
    inner.style.cssText = `background:${popupBg};border:1px solid rgba(255,255,255,0.13);border-radius:22px;padding:18px;width:100%;max-width:380px;max-height:70vh;overflow-y:auto;font-family:${this._haFont()};color:${textCol};`;

    const titleRow = document.createElement('div');
    titleRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;';
    titleRow.innerHTML = `
      <div style="font-size:13px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.06em;">Recent History</div>
      <button style="background:rgba(255,255,255,0.1);border:none;border-radius:50%;width:26px;height:26px;cursor:pointer;color:rgba(255,255,255,0.65);font-size:14px;display:flex;align-items:center;justify-content:center;padding:0;font-family:inherit;">✕</button>`;
    titleRow.querySelector('button').addEventListener('click', () => sheet.remove());
    inner.appendChild(titleRow);

    const loadingEl = document.createElement('div');
    loadingEl.style.cssText = 'text-align:center;padding:20px;color:rgba(255,255,255,0.25);font-size:13px;';
    loadingEl.textContent = 'Loading…';
    inner.appendChild(loadingEl);

    sheet.appendChild(inner);
    sheet.addEventListener('click', e => { if (e.target === sheet) sheet.remove(); });
    document.body.appendChild(sheet);

    try {
      const end   = new Date();
      const start = new Date(end - 24 * 3600000);
      const resp  = await this._hass.callApi('GET',
        `history/period/${start.toISOString()}?filter_entity_id=${entityId}&end_time=${end.toISOString()}&minimal_response=true&no_attributes=true`
      );
      const raw = (resp?.[0] || []).filter(s => s.state === 'on' || s.state === 'off');

      loadingEl.remove();

      if (!raw.length) {
        const emptyEl = document.createElement('div');
        emptyEl.style.cssText = 'text-align:center;padding:20px;color:rgba(255,255,255,0.25);font-size:13px;';
        emptyEl.textContent = 'No history in the last 24 hours';
        inner.appendChild(emptyEl);
        return;
      }

      const items = [...raw].reverse();
      items.forEach((entry, idx) => {
        const isOpen  = entry.state === 'on';
        const ts      = new Date(entry.last_changed || entry.last_updated);
        const timeStr = `${ts.getHours().toString().padStart(2,'0')}:${ts.getMinutes().toString().padStart(2,'0')}`;
        const dateStr = ts.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

        let durationStr = '';
        if (idx < items.length - 1) {
          const nextTs  = new Date(items[idx + 1].last_changed || items[idx + 1].last_updated);
          const diffMin = Math.round((ts - nextTs) / 60000);
          durationStr   = diffMin < 60
            ? `${diffMin}m`
            : `${Math.floor(diffMin / 60)}h ${diffMin % 60}m`;
        }

        const row = document.createElement('div');
        row.style.cssText = `display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);${idx === 0 ? 'border-top:1px solid rgba(255,255,255,0.06);' : ''}`;

        const dot = document.createElement('div');
        dot.style.cssText = `width:10px;height:10px;border-radius:50%;flex-shrink:0;background:${isOpen ? accent : 'rgba(255,255,255,0.2)'};`;

        const info = document.createElement('div');
        info.style.cssText = 'flex:1;min-width:0;';
        info.innerHTML = `
          <div style="font-size:13px;font-weight:600;color:${isOpen ? accent : 'rgba(255,255,255,0.45)'};">${isOpen ? 'Opened' : 'Closed'}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.3);margin-top:2px;">${dateStr} · ${timeStr}</div>`;

        row.appendChild(dot);
        row.appendChild(info);

        if (durationStr) {
          const dur = document.createElement('div');
          dur.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.3);flex-shrink:0;';
          dur.textContent = durationStr;
          row.appendChild(dur);
        }

        inner.appendChild(row);
      });
    } catch(e) {
      loadingEl.textContent = 'Could not load history';
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Visual Editor
// ─────────────────────────────────────────────────────────────────────────────
class CamelContactCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config      = {};
    this._hass        = null;
    this._searchTerm  = '';
    this._allEntities = [];
    this._rendered    = false;
  }

  set hass(hass) {
    this._hass = hass;
    if (this._config && Object.keys(this._config).length) {
      if (!this._rendered) this._renderEditor();
    }
  }

  setConfig(config) {
    const prev = this._config;
    this._config = { ...config };
    if (!this._rendered) {
      if (this._hass) this._renderEditor();
      return;
    }
    this._syncFieldValues(prev);
  }

  _syncFieldValues(prev) {
    const cfg     = this._config;
    const root    = this.shadowRoot;
    const focused = root.activeElement || document.activeElement;

    const maybeSet = (el, val) => {
      if (!el || el === focused || el.contains(focused)) return;
      el.value = val;
    };

    maybeSet(root.getElementById('title'), cfg.title || '');

    const groupByArea = root.getElementById('group-by-area');
    if (groupByArea && groupByArea !== focused) groupByArea.checked = !!cfg.group_by_area;

    CAMEL_COLOUR_FIELDS.forEach(field => {
      const card = root.querySelector(`.colour-card[data-key="${field.key}"]`);
      if (!card) return;
      const val = cfg[field.key] || field.default;
      if (prev[field.key] === val) return;
      const preview = card.querySelector('.colour-swatch-preview');
      const dot     = card.querySelector('.colour-dot');
      const picker  = card.querySelector('input[type=color]');
      const hexIn   = card.querySelector('.colour-hex');
      if (preview) preview.style.background = val;
      if (dot)     dot.style.background     = val;
      if (picker && picker !== focused) picker.value = val;
      if (hexIn  && hexIn  !== focused) hexIn.value  = val;
    });

    if (JSON.stringify(prev.entities) !== JSON.stringify(cfg.entities)) {
      this._syncEntityChecks();
    }
  }

  _syncEntityChecks() {
    const root     = this.shadowRoot;
    const selected = this._config.entities || [];
    const fn       = this._config.friendly_names || {};
    root.querySelectorAll('.check-item').forEach(item => {
      const id  = item.dataset.id;
      const cb  = item.querySelector('input[type=checkbox]');
      if (cb) cb.checked = selected.includes(id);
      item.draggable = selected.includes(id);
      const fnInput = item.querySelector('.fn-input');
      if (fnInput && fnInput !== root.activeElement) fnInput.value = fn[id] || '';
    });
  }

  _allContactEntities() {
    if (!this._hass) return [];
    // Contact-relevant device classes listed first with a badge
    const RELEVANT = new Set(['door', 'garage_door', 'window', 'lock', 'opening', 'contact']);
    return Object.keys(this._hass.states)
      .filter(id => id.split('.')[0] === 'binary_sensor')
      .sort((a, b) => {
        const aClass = this._hass.states[a]?.attributes?.device_class || '';
        const bClass = this._hass.states[b]?.attributes?.device_class || '';
        const aRel   = RELEVANT.has(aClass) ? 0 : 1;
        const bRel   = RELEVANT.has(bClass) ? 0 : 1;
        if (aRel !== bRel) return aRel - bRel;
        const na = this._hass.states[a]?.attributes?.friendly_name || a;
        const nb = this._hass.states[b]?.attributes?.friendly_name || b;
        return na.localeCompare(nb);
      });
  }

  _renderEditor() {
    this._rendered    = true;
    this._allEntities = this._allContactEntities();
    const cfg         = this._config;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; font-family: var(--primary-font-family, inherit); }
        .section { margin-bottom: 16px; }
        .section-title { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--secondary-text-color); margin-bottom: 8px; padding: 0 2px; display:flex;align-items:center;gap:6px; }
        .card-block { background: var(--card-background-color); border-radius: 12px; overflow: hidden; border: 1px solid var(--divider-color, rgba(0,0,0,0.1)); }
        .field-row { padding: 10px 14px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--divider-color, rgba(0,0,0,0.07)); }
        .field-row:last-child { border-bottom: none; }
        .field-label { flex: 1; font-size: 13px; font-weight: 500; color: var(--primary-text-color); }
        .field-desc  { font-size: 11px; color: var(--secondary-text-color); margin-top: 1px; }
        .text-input { padding: 8px 10px; border: 1px solid var(--divider-color, rgba(0,0,0,0.15)); border-radius: 8px; background: var(--secondary-background-color); color: var(--primary-text-color); font-size: 14px; font-family: inherit; flex: 1; min-width: 0; outline: none; -webkit-appearance: none; }
        .text-input:focus { border-color: #30D158; }
        .search-wrap { padding: 8px 10px; border-bottom: 1px solid var(--divider-color, rgba(0,0,0,0.07)); }
        .search-box { width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid var(--divider-color, rgba(0,0,0,0.15)); border-radius: 8px; background: var(--secondary-background-color); color: var(--primary-text-color); font-size: 14px; font-family: inherit; outline: none; -webkit-appearance: none; }
        .search-box::placeholder { color: var(--secondary-text-color); }
        .search-box:focus { border-color: #30D158; }
        .checklist { max-height: 340px; overflow-y: auto; -webkit-overflow-scrolling: touch; }
        .check-item { display: flex; flex-direction: column; padding: 10px 12px; border-bottom: 1px solid var(--divider-color, rgba(0,0,0,0.06)); background: var(--card-background-color); gap: 6px; user-select: none; }
        .check-item:last-child { border-bottom: none; }
        .check-item.dragging { opacity: 0.45; background: var(--secondary-background-color) !important; }
        .check-item-row { display: flex; align-items: center; gap: 8px; min-height: 36px; }
        .drag-handle { cursor: grab; padding: 4px 6px; color: var(--secondary-text-color); flex-shrink: 0; touch-action: none; line-height: 1; }
        .drag-handle:active { cursor: grabbing; }
        .entity-name { font-size: 13px; font-weight: 500; color: var(--primary-text-color); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .entity-id   { font-size: 10px; color: var(--secondary-text-color); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .entity-state { font-size: 12px; font-weight: 600; white-space: nowrap; flex-shrink: 0; }
        .entity-meta { flex: 1; min-width: 0; }
        .dc-badge { font-size: 9px; background: rgba(48,209,88,0.15); color: #30D158; border: 1px solid rgba(48,209,88,0.3); border-radius: 5px; padding: 1px 5px; font-weight: 700; text-transform: capitalize; vertical-align: middle; margin-left: 4px; }
        .fn-row { display: none; padding: 0 2px 2px 32px; }
        .fn-row.visible { display: flex; align-items: center; gap: 6px; }
        .fn-label { font-size: 11px; color: var(--secondary-text-color); white-space: nowrap; flex-shrink: 0; }
        .fn-input { flex: 1; padding: 5px 8px; border: 1px solid var(--divider-color, rgba(0,0,0,0.15)); border-radius: 7px; background: var(--secondary-background-color); color: var(--primary-text-color); font-size: 12px; font-family: inherit; outline: none; -webkit-appearance: none; min-width: 0; }
        .fn-input:focus { border-color: #30D158; }
        .fn-input::placeholder { color: var(--secondary-text-color); opacity: 0.7; }
        .toggle-switch { position: relative; width: 44px; height: 26px; flex-shrink: 0; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; position: absolute; }
        .toggle-track { position: absolute; inset: 0; border-radius: 26px; background: rgba(120,120,128,0.32); cursor: pointer; transition: background 0.25s ease; }
        .toggle-track::after { content: ''; position: absolute; width: 22px; height: 22px; border-radius: 50%; background: #fff; top: 2px; left: 2px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); transition: transform 0.25s ease; }
        .toggle-switch input:checked + .toggle-track { background: #34C759; }
        .toggle-switch input:checked + .toggle-track::after { transform: translateX(18px); }
        .colour-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 10px; }
        .colour-card  { background: var(--secondary-background-color); border-radius: 10px; padding: 10px; display: flex; gap: 10px; align-items: flex-start; }
        .colour-swatch { display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; }
        .colour-swatch-preview { width: 36px; height: 36px; border-radius: 50%; border: 2px solid rgba(0,0,0,0.15); flex-shrink: 0; }
        .colour-swatch input[type=color] { opacity: 0; width: 0; height: 0; position: absolute; }
        .colour-info  { flex: 1; min-width: 0; }
        .colour-label { font-size: 12px; font-weight: 600; color: var(--primary-text-color); }
        .colour-desc  { font-size: 10px; color: var(--secondary-text-color); margin: 2px 0 4px; line-height: 1.3; }
        .colour-hex-row { display: flex; align-items: center; gap: 4px; }
        .colour-dot   { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .colour-hex   { font-size: 11px; border: 1px solid var(--divider-color); border-radius: 5px; padding: 3px 5px; background: var(--card-background-color); color: var(--primary-text-color); font-family: monospace; width: 70px; outline: none; -webkit-appearance: none; }
        .colour-hex:focus { border-color: #30D158; }
        .colour-edit-icon { font-size: 12px; color: var(--secondary-text-color); }
        .auto-badge { font-size: 9px; background: #34C75922; color: #34C759; border: 1px solid #34C75944; border-radius: 6px; padding: 1px 6px; font-weight: 700; }
      </style>

      <!-- Card Settings -->
      <div class="section">
        <div class="section-title">Card Settings</div>
        <div class="card-block">
          <div class="field-row">
            <div>
              <div class="field-label">Title <span style="font-size:10px;color:var(--secondary-text-color);font-weight:400;">(optional)</span></div>
              <div class="field-desc">Label shown on the pill card. Leave blank to hide.</div>
            </div>
            <input class="text-input" id="title" type="text" value="${cfg.title || ''}" placeholder="e.g. Doors &amp; Windows" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
          </div>
          <div class="field-row">
            <div>
              <div class="field-label">Group by Area</div>
              <div class="field-desc">Group sensors by their Home Assistant area in the popup.</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="group-by-area" ${cfg.group_by_area ? 'checked' : ''}>
              <span class="toggle-track"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- Contact Sensors -->
      <div class="section">
        <div class="section-title">
          Contact Sensors
          <span class="auto-badge">AUTO-DETECTED</span>
        </div>
        <div class="card-block">
          <div class="search-wrap">
            <input class="search-box" id="entity-search" type="search" placeholder="Search sensors…" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
          </div>
          <div class="checklist" id="entity-list"></div>
        </div>
        <div style="font-size:10px;color:var(--secondary-text-color);padding:4px 2px;">
          Shows all binary_sensor entities. Door, window, and contact types are listed first. Toggle to select, drag grip to reorder.
        </div>
      </div>

      <!-- Colours -->
      <div class="section">
        <div class="section-title">Colours</div>
        <div class="card-block">
          <div class="colour-grid" id="colour-grid"></div>
        </div>
      </div>
    `;

    const titleEl = this.shadowRoot.getElementById('title');
    titleEl.addEventListener('blur',    () => this._commitConfig('title', titleEl.value.trim()));
    titleEl.addEventListener('keydown', e => { if (e.key === 'Enter') titleEl.blur(); });

    const groupByAreaEl = this.shadowRoot.getElementById('group-by-area');
    groupByAreaEl.addEventListener('change', () => this._commitConfig('group_by_area', groupByAreaEl.checked));

    const searchEl = this.shadowRoot.getElementById('entity-search');
    searchEl.addEventListener('input', () => {
      this._searchTerm = searchEl.value;
      this._filterEntityList();
    });

    this._renderEntityList();
    this._buildColourGrid();
    this._setupReordering();
  }

  _renderEntityList() {
    const list     = this.shadowRoot.getElementById('entity-list');
    if (!list) return;
    const selected = this._config.entities      || [];
    const fn       = this._config.friendly_names || {};
    const all      = this._allEntities;
    const RELEVANT = new Set(['door', 'garage_door', 'window', 'lock', 'opening', 'contact']);

    list.innerHTML = '';

    if (!all.length) {
      list.innerHTML = `<div style="padding:14px;font-size:12px;color:var(--secondary-text-color);">No binary_sensor entities found in Home Assistant.</div>`;
      return;
    }

    const selectedInOrder = selected.filter(id => all.includes(id));
    const unselected      = all.filter(id => !selected.includes(id));
    const ordered         = [...selectedInOrder, ...unselected];

    ordered.forEach(entityId => {
      const isChecked = selected.includes(entityId);
      const stateObj  = this._hass?.states[entityId];
      const haName    = stateObj?.attributes?.friendly_name || entityId.split('.').pop().replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
      const isOn      = stateObj?.state === 'on';
      const dc        = stateObj?.attributes?.device_class || '';
      const isRel     = RELEVANT.has(dc);
      const savedFn   = fn[entityId] || '';
      const searchKey = (haName + ' ' + entityId + ' ' + dc).toLowerCase();

      const item = document.createElement('div');
      item.className      = 'check-item';
      item.dataset.id     = entityId;
      item.dataset.search = searchKey;
      item.draggable      = isChecked;

      item.innerHTML = `
        <div class="check-item-row">
          <div class="drag-handle" title="Drag to reorder">
            <svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:currentColor;display:block;"><path d="M9,3H11V5H9V3M13,3H15V5H13V3M9,7H11V9H9V7M13,7H15V9H13V7M9,11H11V13H9V11M13,11H15V13H13V11M9,15H11V17H9V15M13,15H15V17H13V15M9,19H11V21H9V19M13,19H15V21H13V19Z"/></svg>
          </div>
          <div class="entity-meta">
            <div class="entity-name">${haName}${isRel ? `<span class="dc-badge">${dc}</span>` : ''}</div>
            <div class="entity-id">${entityId}</div>
          </div>
          <span class="entity-state" style="color:${isOn ? '#FF453A' : 'rgba(255,255,255,0.3)'};">${isOn ? 'Open' : 'Closed'}</span>
          <label class="toggle-switch">
            <input type="checkbox" ${isChecked ? 'checked' : ''} data-id="${entityId}">
            <span class="toggle-track"></span>
          </label>
        </div>
        <div class="fn-row ${isChecked ? 'visible' : ''}">
          <span class="fn-label">Display name</span>
          <input class="fn-input" type="text" value="${savedFn}" placeholder="${haName}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
        </div>`;

      item.querySelector('input[type=checkbox]').addEventListener('change', e => {
        const current = [...(this._config.entities || [])];
        const id      = e.target.dataset.id;
        const fnRow   = item.querySelector('.fn-row');
        if (e.target.checked) {
          if (!current.includes(id)) current.push(id);
          item.draggable = true;
          if (fnRow) fnRow.classList.add('visible');
        } else {
          const idx = current.indexOf(id);
          if (idx !== -1) current.splice(idx, 1);
          item.draggable = false;
          if (fnRow) fnRow.classList.remove('visible');
        }
        this._commitConfig('entities', current);
      });

      const fnInput = item.querySelector('.fn-input');
      fnInput.addEventListener('blur', () => {
        const names = { ...(this._config.friendly_names || {}) };
        const val   = fnInput.value.trim();
        if (val) names[entityId] = val;
        else     delete names[entityId];
        this._commitConfig('friendly_names', names);
      });
      fnInput.addEventListener('keydown', e => { if (e.key === 'Enter') fnInput.blur(); });

      list.appendChild(item);
    });

    this._filterEntityList();
  }

  _filterEntityList() {
    const list = this.shadowRoot.getElementById('entity-list');
    if (!list) return;
    const term = this._searchTerm.toLowerCase().trim();
    list.querySelectorAll('.check-item').forEach(item => {
      item.style.display = (!term || item.dataset.search.includes(term)) ? 'flex' : 'none';
    });
  }

  _setupReordering() {
    const list = this.shadowRoot.getElementById('entity-list');
    if (!list) return;
    let draggedItem = null;

    list.addEventListener('dragstart', e => {
      draggedItem = e.target.closest('.check-item');
      if (!draggedItem?.draggable || !draggedItem.querySelector('input[type=checkbox]')?.checked) {
        e.preventDefault(); draggedItem = null; return;
      }
      setTimeout(() => draggedItem?.classList.add('dragging'), 0);
    });
    list.addEventListener('dragover', e => {
      e.preventDefault();
      if (!draggedItem) return;
      const after = this._dragAfterElement(list, e.clientY);
      if (after == null) list.appendChild(draggedItem);
      else list.insertBefore(draggedItem, after);
    });
    list.addEventListener('dragend', () => {
      draggedItem?.classList.remove('dragging');
      draggedItem = null;
      this._saveOrder();
    });

    list.addEventListener('touchstart', e => {
      const handle = e.target.closest('.drag-handle');
      if (!handle) return;
      const item = handle.closest('.check-item');
      if (!item?.querySelector('input[type=checkbox]')?.checked) return;
      draggedItem = item;
      draggedItem.classList.add('dragging');
    }, { passive: true });
    list.addEventListener('touchmove', e => {
      if (!draggedItem) return;
      e.preventDefault();
      const after = this._dragAfterElement(list, e.touches[0].clientY);
      if (after == null) list.appendChild(draggedItem);
      else list.insertBefore(draggedItem, after);
    }, { passive: false });
    list.addEventListener('touchend', () => {
      if (!draggedItem) return;
      draggedItem.classList.remove('dragging');
      draggedItem = null;
      this._saveOrder();
    });
  }

  _dragAfterElement(container, y) {
    const items = [...container.querySelectorAll('.check-item:not(.dragging)')].filter(i => i.style.display !== 'none');
    return items.reduce((closest, child) => {
      const box    = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset, element: child };
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  _saveOrder() {
    const list = this.shadowRoot.getElementById('entity-list');
    if (!list) return;
    const newOrder = [...list.querySelectorAll('.check-item')]
      .filter(i => i.querySelector('input[type=checkbox]')?.checked)
      .map(i => i.dataset.id);
    this._commitConfig('entities', newOrder);
  }

  _buildColourGrid() {
    const grid = this.shadowRoot.getElementById('colour-grid');
    if (!grid) return;
    grid.innerHTML = '';

    CAMEL_COLOUR_FIELDS.forEach(field => {
      const savedVal = this._config[field.key] || field.default;

      const card = document.createElement('div');
      card.className   = 'colour-card';
      card.dataset.key = field.key;
      card.innerHTML = `
        <label class="colour-swatch">
          <div class="colour-swatch-preview" style="background:${savedVal}"></div>
          <input type="color" value="${savedVal}">
        </label>
        <div class="colour-info">
          <div class="colour-label">${field.label}</div>
          <div class="colour-desc">${field.desc}</div>
          <div class="colour-hex-row">
            <div class="colour-dot" style="background:${savedVal}"></div>
            <input class="colour-hex" type="text" value="${savedVal}" maxlength="7" placeholder="${field.default}" spellcheck="false" autocomplete="off">
            <span class="colour-edit-icon">✎</span>
          </div>
        </div>`;

      const picker  = card.querySelector('input[type=color]');
      const hexIn   = card.querySelector('.colour-hex');
      const preview = card.querySelector('.colour-swatch-preview');
      const dot     = card.querySelector('.colour-dot');

      const applyVisual = hex => {
        preview.style.background = hex;
        dot.style.background     = hex;
        picker.value             = hex;
        hexIn.value              = hex;
      };

      picker.addEventListener('input',  () => applyVisual(picker.value));
      picker.addEventListener('change', () => { applyVisual(picker.value); this._commitConfig(field.key, picker.value); });

      hexIn.addEventListener('input', () => {
        const v = hexIn.value.trim();
        if (/^#[0-9a-fA-F]{6}$/.test(v)) applyVisual(v);
      });
      hexIn.addEventListener('blur', () => {
        const v = hexIn.value.trim();
        if (/^#[0-9a-fA-F]{6}$/.test(v)) this._commitConfig(field.key, v);
        else hexIn.value = this._config[field.key] || field.default;
      });
      hexIn.addEventListener('keydown', e => { if (e.key === 'Enter') hexIn.blur(); });

      grid.appendChild(card);
    });
  }

  _commitConfig(key, value) {
    this._config = { ...this._config, [key]: value, type: 'custom:camel-contact-card' };
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail:   { config: this._config },
      bubbles:  true,
      composed: true,
    }));
  }
}

// ─── Registration ─────────────────────────────────────────────────────────────
if (!customElements.get('camel-contact-card')) {
  customElements.define('camel-contact-card', CamelContactCard);
}
if (!customElements.get('camel-contact-card-editor')) {
  customElements.define('camel-contact-card-editor', CamelContactCardEditor);
}

window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === 'camel-contact-card')) {
  window.customCards.push({
    type:        'camel-contact-card',
    name:        'Camel Contact Card',
    preview:     true,
    description: 'Compact pill card showing how many contact sensors are open, with a full overview popup and 24-hour history for each sensor.',
  });
}
