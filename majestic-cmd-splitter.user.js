// ==UserScript==
// @name         Majestic Admin Command Splitter
// @namespace    https://admin.majestic-files.net/
// @version      1.2.0
// @description  Автоматическое разбиение команд консоли при нарушении лимитов
// @match        https://admin.majestic-files.net/console*
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ── CSS ──
  const style = document.createElement('style');
  style.textContent = `
    @keyframes mcs-scaleIn {
      from { opacity: 0; transform: scale(0.95); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes mcs-backdropIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes mcs-badgeIn {
      from { opacity: 0; transform: translateY(4px) scale(0.95); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes mcs-badgeOut {
      from { opacity: 1; transform: translateY(0) scale(1); }
      to   { opacity: 0; transform: translateY(4px) scale(0.95); }
    }
    #mcs-info-badge {
      position: absolute;
      bottom: 8px;
      right: 8px;
      font-size: 11px;
      font-family: 'Consolas', 'Courier New', monospace;
      padding: 3px 10px;
      border-radius: 4px;
      pointer-events: none;
      z-index: 30;
      white-space: nowrap;
      letter-spacing: 0.3px;
      display: none;
    }
    #mcs-info-badge.mcs-warn {
      display: block;
      background: rgba(248,113,113,0.08);
      color: #f87171;
      border: 1px solid rgba(248,113,113,0.15);
      animation: mcs-badgeIn 0.25s ease forwards;
    }
    #mcs-info-badge.mcs-ok {
      display: block;
      background: rgba(74,222,128,0.08);
      color: #4ade80;
      border: 1px solid rgba(74,222,128,0.15);
      animation: mcs-badgeIn 0.25s ease forwards;
    }
    #mcs-info-badge.mcs-hiding {
      animation: mcs-badgeOut 0.2s ease forwards;
    }
    #mcs-sum-badge {
      position: absolute;
      bottom: 8px;
      left: 8px;
      font-size: 10px;
      font-family: 'Consolas', 'Courier New', monospace;
      padding: 3px 8px;
      border-radius: 4px;
      pointer-events: none;
      z-index: 30;
      white-space: nowrap;
      letter-spacing: 0.3px;
      opacity: 0;
      background: rgba(96,165,250,0.08);
      color: #60a5fa;
      border: 1px solid rgba(96,165,250,0.15);
      max-width: 60%;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: opacity 0.25s ease, transform 0.25s ease;
      transform: translateY(4px);
    }
    #mcs-sum-badge.mcs-sum-visible {
      opacity: 1;
      transform: translateY(0);
    }
    .mcs-textarea-warn {
      caret-color: #f87171 !important;
    }
    #mcs-bar {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      border-radius: 2px;
      pointer-events: none;
      z-index: 20;
      opacity: 0;
      background: transparent;
      box-shadow: none;
      transition: opacity 0.3s ease, background-color 0.5s ease, box-shadow 0.5s ease;
    }
    #mcs-settings-btn {
      transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
    }
    #mcs-settings-btn:hover {
      transform: rotate(45deg) scale(1.1);
      background: #3f3f46 !important;
      border-color: #52525b !important;
      color: #e4e4e7 !important;
    }
    #mcs-settings-modal {
      animation: mcs-backdropIn 0.2s ease;
    }
    #mcs-settings-panel {
      animation: mcs-scaleIn 0.25s cubic-bezier(0.4,0,0.2,1);
    }
    .mcs-row {
      transition: background 0.15s ease;
      border-radius: 4px;
      padding: 2px 4px;
      margin: 0 -4px;
    }
    .mcs-row:hover { background: rgba(255,255,255,0.03); }
    .mcs-input {
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .mcs-input:focus {
      border-color: #3b82f6 !important;
      box-shadow: 0 0 0 2px rgba(59,130,246,0.15);
      outline: none;
    }
    .mcs-btn { transition: all 0.2s ease; }
    .mcs-btn:hover { filter: brightness(1.15); transform: translateY(-1px); }
    .mcs-btn:active { transform: translateY(0); }
    #mcs-autocomplete {
      display: none;
      flex-direction: row;
      gap: 4px;
      align-items: center;
      z-index: 40;
      margin-left: 6px;
      pointer-events: auto;
    }
    #mcs-autocomplete.mcs-ac-visible {
      display: inline-flex;
    }
    .mcs-ac-option {
      background: rgba(96,165,250,0.1);
      color: #60a5fa;
      border: 1px solid rgba(96,165,250,0.2);
      border-radius: 4px;
      padding: 2px 10px;
      font-size: 11px;
      font-family: 'Consolas', 'Courier New', monospace;
      cursor: pointer;
      pointer-events: auto;
      user-select: none;
      -webkit-user-select: none;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .mcs-ac-option:hover {
      background: rgba(96,165,250,0.2);
      border-color: rgba(96,165,250,0.4);
    }
    .mcs-ac-hint {
      color: #52525b;
      font-size: 10px;
      align-self: center;
      padding: 0 4px;
    }
    .mcs-close-btn { transition: color 0.2s ease, transform 0.2s ease; }
    .mcs-close-btn:hover { color: #e4e4e7 !important; transform: rotate(90deg); }
    .mcs-delete-btn { transition: all 0.2s ease; opacity: 0; }
    .mcs-row:hover .mcs-delete-btn { opacity: 1; }
    .mcs-delete-btn:hover { color: #f87171 !important; }
  `;
  document.head.appendChild(style);

  // ── Лимиты ──
  const DEFAULT_LIMITS = {
    givemoney:  { limit: 5000000,  argIndex: 2 },
    givebank:   { limit: 5000000,  argIndex: 2 },
    takemoney:  { limit: 5000000,  argIndex: 2 },
    takebank:   { limit: 5000000,  argIndex: 2 },
    givedonate: { limit: 20000,    argIndex: 2 },
    takedonate: { limit: 20000,    argIndex: 2 },
    giveitem:   { limit: 1000,     argIndex: 3 },
    dgiveitem:  { limit: 1000,     argIndex: 3 },
    givechips:  { limit: 100000,   argIndex: 2 },
    takechips:  { limit: 100000,   argIndex: 2 },
    setvip:     { limit: 30,       argIndex: 2 },
    giveexp:    { limit: 20000,    argIndex: 2 },
    takeexp:    { limit: 20000,    argIndex: 2 },
    givecrystals:    { limit: 20000, argIndex: 2 },
    takecrystals:    { limit: 20000, argIndex: 2 },
    givespringcoins: { limit: 20000, argIndex: 2 },
    takespringcoins: { limit: 20000, argIndex: 2 },
  };

  function loadLimits() {
    try {
      const saved = GM_getValue('cmdLimits', null);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return JSON.parse(JSON.stringify(DEFAULT_LIMITS));
  }
  function saveLimits(limits) { GM_setValue('cmdLimits', JSON.stringify(limits)); }
  let LIMITS = loadLimits();
  let strictMode = GM_getValue('mcsStrictMode', false);

  // ── Логика ──
  function parseLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return null;
    const parts = trimmed.split(/\s+/);
    return { cmd: parts[0].toLowerCase(), parts, raw: trimmed };
  }

  function checkLimit(parsed) {
    if (!parsed) return null;
    const rule = LIMITS[parsed.cmd];
    if (!rule) return null;
    const idx = rule.argIndex;
    if (parsed.parts.length <= idx) return null;
    const val = parseInt(parsed.parts[idx], 10);
    if (isNaN(val) || val <= rule.limit) return null;
    return { value: val, limit: rule.limit, argIndex: idx };
  }

  function splitCommand(parsed, violation) {
    const { limit, argIndex } = violation;
    let remaining = violation.value;
    const lines = [];
    while (remaining > 0) {
      const chunk = Math.min(remaining, limit);
      const newParts = [...parsed.parts];
      newParts[argIndex] = String(chunk);
      lines.push(newParts.join(' '));
      remaining -= chunk;
    }
    return lines;
  }

  function analyzeText(text) {
    const lines = text.split('\n');
    const violations = [];
    for (let i = 0; i < lines.length; i++) {
      const parsed = parseLine(lines[i]);
      const v = checkLimit(parsed);
      if (v) violations.push({ line: i, parsed, violation: v });
    }
    return violations;
  }

  // ── Автозаполнение ──
  const AUTOCOMPLETE = {
    setskill: {
      // После ввода "setskill <id>" предложить варианты для арг 2, и автоподставить арг 3
      trigger: 2,  // показать когда parts.length === 2 (cmd + id)
      options: [
        { label: 'stamina', fill: 'stamina 100' },
        { label: 'strength', fill: 'strength 100' },
      ]
    }
  };

  let acPopup = null;

  function ensureAcPopup(textarea) {
    // Вставляем в placeholder-div сайта (серый текст с подсказками аргументов)
    const wrapper = textarea.parentElement;
    if (!wrapper) return;
    const placeholderDiv = wrapper.querySelector('.absolute.inset-0');
    const target = placeholderDiv || wrapper;

    let existing = target.querySelector('#mcs-autocomplete');
    if (existing) { acPopup = existing; return; }

    acPopup = document.createElement('span');
    acPopup.id = 'mcs-autocomplete';
    target.appendChild(acPopup);
  }

  function updateAutocomplete(textarea) {
    ensureAcPopup(textarea);
    if (!acPopup) return;

    // Берём только текущую строку (последнюю)
    const lines = textarea.value.split('\n');
    const currentLine = lines[lines.length - 1] || '';
    const parts = currentLine.trim().split(/\s+/);
    const cmd = (parts[0] || '').toLowerCase();

    const rule = AUTOCOMPLETE[cmd];
    if (!rule || parts.length !== rule.trigger || !currentLine.endsWith(' ')) {
      acPopup.classList.remove('mcs-ac-visible');
      return;
    }

    // Уже есть больше аргументов чем trigger — не показываем
    // parts.length === trigger + 1 значит cmd + id введены, ждём следующий арг

    acPopup.innerHTML = '';
    rule.options.forEach((opt, i) => {
      const btn = document.createElement('span');
      btn.className = 'mcs-ac-option';
      btn.textContent = opt.label;
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        applyAutocomplete(textarea, opt.fill);
      });
      acPopup.appendChild(btn);
    });
    acPopup.classList.add('mcs-ac-visible');
  }

  function applyAutocomplete(textarea, fill) {
    const lines = textarea.value.split('\n');
    const lastLine = lines[lines.length - 1];
    lines[lines.length - 1] = lastLine.trimEnd() + ' ' + fill;

    const nativeSet = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    nativeSet.call(textarea, lines.join('\n'));
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.focus();

    // Курсор в конец
    const len = textarea.value.length;
    textarea.setSelectionRange(len, len);

    if (acPopup) acPopup.classList.remove('mcs-ac-visible');
  }

  // ── Бейдж ──
  let infoBadge = null;
  let sumBadge = null;
  let hideTimer = null;
  let bar = null;

  function ensureBar(textarea) {
    // Всегда удаляем старые bar'ы чтобы не было дубликатов
    document.querySelectorAll('#mcs-bar').forEach(el => {
      if (el !== bar || !document.body.contains(bar)) el.remove();
    });

    if (bar && document.body.contains(bar)) return;

    // Вставляем bar в тот же контейнер что и textarea
    const wrapper = textarea.parentElement; // div.relative
    if (!wrapper) return;
    wrapper.style.position = 'relative';
    bar = document.createElement('div');
    bar.id = 'mcs-bar';
    wrapper.appendChild(bar);
  }

  function setBarState(textarea, state) {
    ensureBar(textarea);
    if (!bar) return;

    if (state === 'warn') {
      bar.style.transition = 'none';
      bar.style.opacity = '1';
      bar.style.background = '#f87171';
      bar.style.boxShadow = '0 0 10px 2px rgba(248,113,113,0.4)';
    } else if (state === 'success') {
      // Зелёная полоска идентичная красной, но с автопропаданием
      bar.style.transition = 'background-color 0.4s ease, box-shadow 0.4s ease';
      bar.style.opacity = '1';
      bar.style.background = '#4ade80';
      bar.style.boxShadow = '0 0 10px 2px rgba(74,222,128,0.4)';
      // Плавное исчезновение через 1.5s
      setTimeout(() => {
        if (bar && document.body.contains(bar)) {
          bar.style.transition = 'opacity 0.6s ease';
          bar.style.opacity = '0';
        }
      }, 1500);
    } else {
      bar.style.transition = 'opacity 0.3s ease';
      bar.style.opacity = '0';
    }
  }

  function ensureBadge(textarea) {
    // Удаляем дубликаты
    document.querySelectorAll('#mcs-info-badge').forEach(el => {
      if (el !== infoBadge || !document.body.contains(infoBadge)) el.remove();
    });
    document.querySelectorAll('#mcs-sum-badge').forEach(el => {
      if (el !== sumBadge || !document.body.contains(sumBadge)) el.remove();
    });

    const terminal = textarea.closest('.console-terminal');
    if (!terminal) return;
    terminal.style.position = 'relative';

    if (!infoBadge || !document.body.contains(infoBadge)) {
      infoBadge = document.createElement('div');
      infoBadge.id = 'mcs-info-badge';
      terminal.appendChild(infoBadge);
    }
    if (!sumBadge || !document.body.contains(sumBadge)) {
      sumBadge = document.createElement('div');
      sumBadge.id = 'mcs-sum-badge';
      terminal.appendChild(sumBadge);
    }
  }

  function calcSums(text) {
    const lines = text.split('\n');
    // Группируем по "команда + staticId"
    const sums = {};
    for (const line of lines) {
      const parsed = parseLine(line);
      if (!parsed) continue;
      const rule = LIMITS[parsed.cmd];
      if (!rule) continue;
      const idx = rule.argIndex;
      if (parsed.parts.length <= idx) continue;
      const val = parseInt(parsed.parts[idx], 10);
      if (isNaN(val)) continue;
      const staticId = parsed.parts[1] || '?';
      const key = `${parsed.cmd} #${staticId}`;
      sums[key] = (sums[key] || 0) + val;
    }
    return sums;
  }

  function updateSumBadge(textarea) {
    if (!sumBadge) return;
    const text = textarea.value;
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) {
      sumBadge.classList.remove('mcs-sum-visible');
      return;
    }

    const sums = calcSums(text);
    const entries = Object.entries(sums);
    if (entries.length === 0) {
      sumBadge.classList.remove('mcs-sum-visible');
      return;
    }

    const parts = entries.map(([key, val]) => `${key}: ${val.toLocaleString()}`);
    sumBadge.textContent = `Σ ${parts.join(' · ')}`;
    sumBadge.classList.add('mcs-sum-visible');
  }

  function showBadge(textarea, violations) {
    ensureBadge(textarea);
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }

    if (violations.length === 0) {
      if (infoBadge.classList.contains('mcs-warn') || infoBadge.classList.contains('mcs-ok')) {
        infoBadge.className = 'mcs-hiding';
        hideTimer = setTimeout(() => { infoBadge.className = ''; infoBadge.style.display = 'none'; }, 200);
      }
      textarea.classList.remove('mcs-textarea-warn');
      setBarState(textarea, '');
      updateSumBadge(textarea);
      return;
    }

    textarea.classList.add('mcs-textarea-warn');
    setBarState(textarea, 'warn');

    // Собираем инфо + считаем на сколько разобьётся
    const total = violations.length;
    const v = violations[0].violation;
    const cmd = violations[0].parsed.cmd;

    // Подсчёт итоговых команд после сплита
    let resultCount = 0;
    const allLines = textarea.value.split('\n');
    for (const line of allLines) {
      const p = parseLine(line);
      const viol = checkLimit(p);
      if (viol) {
        resultCount += Math.ceil(viol.value / viol.limit);
      } else if (line.trim()) {
        resultCount += 1;
      }
    }

    let text;
    if (total === 1) {
      text = `${cmd}: ${v.value.toLocaleString()} → макс ${v.limit.toLocaleString()} · → ${resultCount} команд`;
    } else {
      text = `${total} нарушений · → ${resultCount} команд`;
    }

    infoBadge.textContent = text;
    infoBadge.style.display = 'block';
    infoBadge.className = 'mcs-warn';

    updateSumBadge(textarea);
  }

  function showSplitBadge(textarea, count) {
    ensureBadge(textarea);
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    textarea.classList.remove('mcs-textarea-warn');
    infoBadge.textContent = `✓ разбито на ${count} команд`;
    infoBadge.style.display = 'block';
    infoBadge.className = 'mcs-ok';
    hideTimer = setTimeout(() => {
      infoBadge.className = 'mcs-hiding';
      setTimeout(() => { infoBadge.className = ''; infoBadge.style.display = 'none'; }, 200);
    }, 2000);
  }

  // ── Перехват Enter ──
  function handleKeydown(e) {
    if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.altKey) return;
    const textarea = e.target;
    if (!textarea || textarea.tagName !== 'TEXTAREA') return;
    if (!textarea.closest('.console-terminal')) return;

    const violations = analyzeText(textarea.value);
    if (violations.length === 0) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    // Жёсткий режим — просто блокируем, не сплитим
    if (strictMode) {
      showBadge(textarea, violations);
      // Встряска textarea
      textarea.style.transition = 'transform 0.05s ease';
      textarea.style.transform = 'translateX(-3px)';
      setTimeout(() => { textarea.style.transform = 'translateX(3px)'; }, 50);
      setTimeout(() => { textarea.style.transform = 'translateX(-2px)'; }, 100);
      setTimeout(() => { textarea.style.transform = 'translateX(2px)'; }, 150);
      setTimeout(() => { textarea.style.transform = ''; textarea.style.transition = ''; }, 200);
      return;
    }

    const lines = textarea.value.split('\n');
    const newLines = [];
    for (const line of lines) {
      const parsed = parseLine(line);
      const v = checkLimit(parsed);
      if (v) {
        newLines.push(...splitCommand(parsed, v));
      } else if (line.trim()) {
        newLines.push(line.trim());
      }
    }

    const nativeSet = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    nativeSet.call(textarea, newLines.join('\n'));
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    textarea.setAttribute('rows', String(Math.max(newLines.length, 1)));

    // Фокус обратно на textarea чтобы React не потерял состояние
    textarea.focus();

    textarea.classList.remove('mcs-textarea-warn');
    setBarState(textarea, 'success');

    showSplitBadge(textarea, newLines.length);
  }

  // ── Input слушатель ──
  function handleInput(e) {
    const textarea = e.target;
    if (!textarea || textarea.tagName !== 'TEXTAREA') return;
    if (!textarea.closest('.console-terminal')) return;
    const violations = analyzeText(textarea.value);
    showBadge(textarea, violations);
    updateSumBadge(textarea);
    updateAutocomplete(textarea);
  }

  // ── Настройки ──
  function createSettingsUI() {
    const btn = document.createElement('button');
    btn.id = 'mcs-settings-btn';
    btn.textContent = '⚙';
    btn.title = 'Настройки лимитов';
    btn.style.cssText = `
      position:fixed; bottom:16px; right:16px; z-index:99999;
      width:34px; height:34px; border-radius:50%;
      border:1px solid #3f3f46; background:#27272a; color:#71717a;
      font-size:16px; cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
    `;
    btn.addEventListener('click', openSettings);
    document.body.appendChild(btn);
  }

  function openSettings() {
    const existing = document.getElementById('mcs-settings-modal');
    if (existing) { closeModal(existing); return; }

    const modal = document.createElement('div');
    modal.id = 'mcs-settings-modal';
    modal.style.cssText = `
      position:fixed; inset:0; z-index:100000;
      display:flex; align-items:center; justify-content:center;
      background:rgba(0,0,0,0.5); backdrop-filter:blur(6px);
    `;

    const panel = document.createElement('div');
    panel.id = 'mcs-settings-panel';
    panel.style.cssText = `
      background:#18181b; border:1px solid #27272a; border-radius:12px;
      padding:20px 24px; width:500px; max-height:80vh; overflow-y:auto;
      color:#e4e4e7; font-family:'Consolas','Courier New',monospace; font-size:13px;
      box-shadow:0 24px 48px rgba(0,0,0,0.4);
    `;

    let html = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <span style="font-size:14px;font-weight:600;color:#a1a1aa;letter-spacing:0.5px;">ЛИМИТЫ КОМАНД</span>
        <button id="mcs-close" class="mcs-close-btn" style="background:none;border:none;color:#52525b;font-size:18px;cursor:pointer;padding:4px;">✕</button>
      </div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;padding:8px 10px;background:rgba(255,255,255,0.02);border-radius:6px;border:1px solid #1e1e1e;">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;flex:1;">
          <input type="checkbox" id="mcs-strict" ${strictMode ? 'checked' : ''} style="accent-color:#f87171;width:14px;height:14px;cursor:pointer;">
          <span style="color:#e4e4e7;font-size:12px;">Жёсткий режим</span>
        </label>
        <span style="color:#52525b;font-size:10px;">блокировать отправку без сплита</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 90px 60px 24px;gap:6px;margin-bottom:6px;padding:0 4px;">
        <span style="color:#52525b;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Команда</span>
        <span style="color:#52525b;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Лимит</span>
        <span style="color:#52525b;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Арг</span>
        <span></span>
      </div>`;

    for (const cmd of Object.keys(LIMITS).sort()) {
      const r = LIMITS[cmd];
      html += `
        <div class="mcs-row" style="display:grid;grid-template-columns:1fr 90px 60px 24px;gap:6px;align-items:center;">
          <span style="color:#4ade80;font-size:12px;">${cmd}</span>
          <input data-cmd="${cmd}" data-field="limit" value="${r.limit}" class="mcs-input"
            style="background:#0a0a0a;border:1px solid #27272a;border-radius:4px;color:#e4e4e7;padding:3px 6px;font-size:12px;width:100%;font-family:inherit;">
          <input data-cmd="${cmd}" data-field="argIndex" value="${r.argIndex}" class="mcs-input"
            style="background:#0a0a0a;border:1px solid #27272a;border-radius:4px;color:#e4e4e7;padding:3px 6px;font-size:12px;width:100%;font-family:inherit;">
          <button class="mcs-delete-btn" data-del="${cmd}" style="background:none;border:none;color:#52525b;cursor:pointer;font-size:14px;padding:0;">×</button>
        </div>`;
    }

    html += `
      <div style="border-top:1px solid #1e1e1e;margin-top:16px;padding-top:14px;">
        <div style="color:#52525b;margin-bottom:8px;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Новая команда</div>
        <div style="display:grid;grid-template-columns:1fr 90px 60px auto;gap:6px;">
          <input id="mcs-new-cmd" placeholder="имя" class="mcs-input" style="background:#0a0a0a;border:1px solid #27272a;border-radius:4px;color:#e4e4e7;padding:3px 6px;font-size:12px;font-family:inherit;">
          <input id="mcs-new-limit" placeholder="лимит" class="mcs-input" style="background:#0a0a0a;border:1px solid #27272a;border-radius:4px;color:#e4e4e7;padding:3px 6px;font-size:12px;font-family:inherit;">
          <input id="mcs-new-arg" placeholder="арг" value="2" class="mcs-input" style="background:#0a0a0a;border:1px solid #27272a;border-radius:4px;color:#e4e4e7;padding:3px 6px;font-size:12px;font-family:inherit;">
          <button id="mcs-add" class="mcs-btn" style="background:#22c55e;color:#000;border:none;border-radius:4px;padding:3px 12px;cursor:pointer;font-size:13px;font-weight:600;">+</button>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:18px;">
        <button id="mcs-save" class="mcs-btn" style="flex:1;background:#3b82f6;color:#fff;border:none;border-radius:6px;padding:8px;cursor:pointer;font-size:12px;letter-spacing:0.5px;">СОХРАНИТЬ</button>
        <button id="mcs-reset" class="mcs-btn" style="background:#1e1e1e;color:#71717a;border:1px solid #27272a;border-radius:6px;padding:8px 16px;cursor:pointer;font-size:12px;">СБРОС</button>
      </div>`;

    panel.innerHTML = html;
    modal.appendChild(panel);
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(modal); });
    document.getElementById('mcs-close').addEventListener('click', () => closeModal(modal));

    panel.querySelectorAll('.mcs-delete-btn').forEach(b => {
      b.addEventListener('click', () => {
        delete LIMITS[b.dataset.del];
        saveLimits(LIMITS);
        const row = b.closest('.mcs-row');
        row.style.transition = 'opacity 0.2s, transform 0.2s';
        row.style.opacity = '0';
        row.style.transform = 'translateX(10px)';
        setTimeout(() => row.remove(), 200);
      });
    });

    document.getElementById('mcs-add').addEventListener('click', () => {
      const cmd = document.getElementById('mcs-new-cmd').value.trim().toLowerCase();
      const limit = parseInt(document.getElementById('mcs-new-limit').value, 10);
      const argIndex = parseInt(document.getElementById('mcs-new-arg').value, 10);
      if (cmd && !isNaN(limit) && !isNaN(argIndex)) {
        LIMITS[cmd] = { limit, argIndex };
        saveLimits(LIMITS);
        closeModal(modal);
        setTimeout(openSettings, 170);
      }
    });

    document.getElementById('mcs-save').addEventListener('click', () => {
      panel.querySelectorAll('input[data-cmd]').forEach(inp => {
        const val = parseInt(inp.value, 10);
        if (!isNaN(val) && LIMITS[inp.dataset.cmd]) LIMITS[inp.dataset.cmd][inp.dataset.field] = val;
      });
      strictMode = document.getElementById('mcs-strict').checked;
      GM_setValue('mcsStrictMode', strictMode);
      saveLimits(LIMITS);
      closeModal(modal);
    });

    document.getElementById('mcs-reset').addEventListener('click', () => {
      LIMITS = JSON.parse(JSON.stringify(DEFAULT_LIMITS));
      saveLimits(LIMITS);
      closeModal(modal);
      setTimeout(openSettings, 170);
    });
  }

  function closeModal(modal) {
    modal.style.animation = 'mcs-backdropIn 0.15s ease reverse';
    const p = modal.querySelector('#mcs-settings-panel');
    if (p) p.style.animation = 'mcs-scaleIn 0.15s ease reverse';
    setTimeout(() => modal.remove(), 150);
  }

  // ── Init ──
  let lastTextareaValue = '';
  let pollInterval = null;

  function pollTextarea() {
    const terminal = document.querySelector('.console-terminal');
    if (!terminal) return;
    const ta = terminal.querySelector('textarea');
    if (!ta) return;

    const val = ta.value;
    if (val !== lastTextareaValue) {
      lastTextareaValue = val;
      const violations = analyzeText(val);
      showBadge(ta, violations);
      updateSumBadge(ta);
      updateAutocomplete(ta);
    }
  }

  function init() {
    createSettingsUI();

    // Capture-фаза keydown — перехватываем до React
    document.addEventListener('keydown', handleKeydown, true);

    // Input event как дополнение
    document.addEventListener('input', handleInput, true);

    // Polling каждые 300ms — надёжная проверка даже если React пересоздаёт textarea
    pollInterval = setInterval(pollTextarea, 300);

    // Также слушаем keydown напрямую на каждой новой textarea
    const observer = new MutationObserver(() => {
      const terminal = document.querySelector('.console-terminal');
      if (!terminal) return;
      const ta = terminal.querySelector('textarea');
      if (ta && !ta.dataset.mcsKeydown) {
        ta.dataset.mcsKeydown = '1';
        ta.addEventListener('keydown', handleKeydown, true);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);

})();
