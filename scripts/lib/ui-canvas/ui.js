'use strict';

/**
 * UI Canvas browser shell: the chrome around the mockup iframe.
 *
 * Top bar: viewport presets (desktop, mobile, exact dimensions), edit versus
 * interact mode, agent presence, undo/redo, Save and Finish. Right rail:
 * inspector for the selected element (breadcrumb, size, style chips),
 * the pending edit log, and the conversation with the agent. The mockup
 * renders at its true CSS pixel size inside a sandboxed iframe and is scaled
 * down only when the stage is too small, so media queries behave exactly as
 * they would in production.
 *
 * Same design tokens as Plan Canvas and the ECC dashboard. Everything is
 * served inline; no CDNs.
 */

const path = require('path');

const { escapeHtml } = require('../plan-canvas/markdown');
const { TOKENS_CSS } = require('../plan-canvas/ui');
const { VIEWPORT_PRESETS } = require('./feedback');
const { FIELD_HELPERS_JS } = require('./fields');

const ICONS = {
  desktop: '<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3.5" width="16" height="10" rx="1.6"/><path d="M7 17h6M10 13.5V17"/></svg>',
  mobile: '<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5.5" y="2" width="9" height="16" rx="2"/><path d="M8.5 4.5h3"/><circle cx="10" cy="15.2" r=".6" fill="currentColor"/></svg>',
  custom: '<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17V7M3 17h10"/><path d="M3 7l2 2M3 7l-2 2M13 17l-2 2M13 17l-2-2"/><rect x="7" y="3" width="10" height="10" rx="1.2" stroke-dasharray="2 2"/></svg>',
  rotate: '<svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10a6 6 0 0 1 10.4-4.1M16 10a6 6 0 0 1-10.4 4.1"/><path d="M14.5 2.5v3.5H11M5.5 17.5V14H9"/></svg>',
  undo: '<svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 6H3v4"/><path d="M3.5 10A7 7 0 1 1 6 15.5"/></svg>',
  redo: '<svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M13 6h4v4"/><path d="M16.5 10A7 7 0 1 0 14 15.5"/></svg>',
  pause: '<svg class="i-pause" viewBox="0 0 20 20" width="13" height="13" fill="currentColor"><rect x="5" y="4" width="3.5" height="12" rx="1"/><rect x="11.5" y="4" width="3.5" height="12" rx="1"/></svg>',
  play: '<svg class="i-play" viewBox="0 0 20 20" width="13" height="13" fill="currentColor"><path d="M6 4.2v11.6a.8.8 0 0 0 1.2.7l9.3-5.8a.8.8 0 0 0 0-1.4L7.2 3.5A.8.8 0 0 0 6 4.2z"/></svg>',
  reload: '<svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M16 10a6 6 0 1 1-1.8-4.3"/><path d="M16.5 3v3.5H13"/></svg>',
  sun: '<svg class="i-sun" viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="10" cy="10" r="3.4"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4"/></svg>',
  moon: '<svg class="i-moon" viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 12.2A6.8 6.8 0 0 1 7.8 3.5a6.8 6.8 0 1 0 8.7 8.7z"/></svg>',
  check: '<svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5l4 4 8-9"/></svg>'
};

function uiCanvasCss() {
  return `${TOKENS_CSS}
  :root{--accent:#4acb8a;--accent-glow:rgba(74,203,138,0.15);--accent-dim:#2f9e68;--on-accent:#06130c}
  [data-theme="light"]{--accent:#15803d;--accent-glow:rgba(21,128,61,0.1);--accent-dim:#166534;--on-accent:#ffffff}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{height:100%}
  body{font-family:var(--font);background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased;line-height:1.4;overflow:hidden}
  ::selection{background:var(--accent);color:var(--on-accent)}
  ::-webkit-scrollbar{width:8px;height:8px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px}
  button,input,textarea{font-family:var(--font)}
  button{cursor:pointer}
  button:disabled{opacity:.45;cursor:default}
  code,.mono{font-family:var(--mono)}
  [hidden]{display:none!important}

  .bar{display:flex;align-items:center;gap:10px;height:54px;padding:0 14px;background:color-mix(in srgb,var(--bg2) 90%,transparent);border-bottom:1px solid var(--border);backdrop-filter:blur(16px)}
  .brand{display:flex;align-items:center;gap:9px;min-width:0;margin-right:6px}
  .brand .logo{width:26px;height:26px;flex:none;background:var(--bg3);border:1px solid var(--border-light);border-radius:7px;display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:13px;font-weight:700;color:var(--accent)}
  .brand .name{font-size:13.5px;font-weight:600;white-space:nowrap}
  .brand .file{font-size:11.5px;color:var(--text2);font-family:var(--mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:22vw}
  .bar .spacer{flex:1}
  .divider{width:1px;height:22px;background:var(--border)}

  .seg{display:inline-flex;align-items:center;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:2px;gap:2px}
  .seg button{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px;border:0;border-radius:6px;background:transparent;color:var(--text2);font-size:11.5px;font-weight:600;transition:all .12s}
  .seg button:hover{color:var(--text);background:var(--bg4)}
  .seg button[aria-pressed="true"]{background:var(--surface);color:var(--text);box-shadow:var(--shadow);outline:1px solid var(--border-light)}
  .seg.viewports button{padding:0 9px}
  .seg.viewports svg{display:block}

  .dims{display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--text2)}
  .dims input{width:58px;height:26px;border:1px solid var(--border);border-radius:6px;background:var(--bg3);color:var(--text);font-family:var(--mono);font-size:11.5px;text-align:center;outline:none;-moz-appearance:textfield}
  .dims input::-webkit-outer-spin-button,.dims input::-webkit-inner-spin-button{-webkit-appearance:none}
  .dims input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-glow)}
  .dims .x{color:var(--text3)}
  .dims .scale{font-family:var(--mono);font-size:10.5px;color:var(--teal);min-width:34px}
  .dims .icon-btn{height:26px;width:26px;padding:0;justify-content:center}

  .presence{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:500;color:var(--text2);background:var(--bg3);border:1px solid var(--border);border-radius:99px;padding:3px 10px 3px 8px;white-space:nowrap;max-width:260px}
  .presence .label{overflow:hidden;text-overflow:ellipsis}
  .presence .dot{width:7px;height:7px;flex:none;border-radius:99px;background:var(--text3)}
  .presence[data-state="listening"] .dot{background:var(--green);box-shadow:0 0 0 3px var(--green-glow);animation:pulse 2s infinite}
  .presence[data-state="thinking"] .dot,.presence[data-state="typing"] .dot{background:var(--teal);box-shadow:0 0 0 3px var(--teal-glow);animation:pulse 1.2s infinite}
  .presence[data-state="queued"] .dot{background:var(--orange);box-shadow:0 0 0 3px var(--orange-glow)}
  .presence[data-state="ended"] .dot{background:var(--text3)}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}

  .icon-btn{height:28px;padding:0 10px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text2);font-size:11.5px;font-weight:500;display:inline-flex;align-items:center;gap:5px;transition:all .12s;white-space:nowrap}
  .icon-btn:hover:not(:disabled){border-color:var(--border-light);color:var(--text);background:var(--bg4)}
  .icon-btn.danger:hover:not(:disabled){border-color:var(--red);color:var(--red);background:var(--red-glow)}
  .icon-btn[aria-pressed="true"]{border-color:var(--accent);color:var(--accent);background:var(--accent-glow)}
  .icon-btn.confirm{border-color:var(--orange);color:var(--orange);background:var(--orange-glow)}
  .icon-btn.square{width:28px;padding:0;justify-content:center}
  .primary{height:30px;padding:0 14px;border:1px solid var(--accent-dim);border-radius:7px;background:var(--accent);color:var(--on-accent);font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:7px;box-shadow:var(--shadow);transition:background .12s,transform .12s}
  .primary:hover:not(:disabled){background:color-mix(in srgb,var(--accent) 86%,#fff)}
  .primary:active:not(:disabled){transform:translateY(1px)}

  .layout{display:flex;height:calc(100% - 54px)}
  .stage{flex:1;min-width:0;position:relative;display:flex;flex-direction:column;background:var(--bg);background-image:radial-gradient(color-mix(in srgb,var(--border-light) 70%,transparent) 1px,transparent 1px);background-size:18px 18px}
  .stage .viewport{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;overflow:auto;padding:24px}
  .sizer{position:relative;flex:none}
  .device{position:absolute;top:0;left:0;transform-origin:top left;background:#fff;border-radius:6px;box-shadow:0 12px 40px rgba(0,0,0,.35),0 0 0 1px color-mix(in srgb,var(--border-light) 80%,transparent);overflow:hidden;transition:border-radius .15s}
  .device iframe{display:block;width:100%;height:100%;border:0;background:#fff}
  .device.mobile{border-radius:44px;border:12px solid #0b0c10;box-shadow:0 20px 60px rgba(0,0,0,.5),0 0 0 1px #2a2d38,inset 0 0 0 1px #000}
  .device.mobile iframe{border-radius:32px}
  .device.desktop{border-radius:8px}
  .stage[data-mode="interact"] .device{outline:2px solid color-mix(in srgb,var(--green) 55%,transparent);outline-offset:3px}

  .statusbar{height:30px;flex:none;display:flex;align-items:center;gap:14px;padding:0 14px;border-top:1px solid var(--border);background:color-mix(in srgb,var(--bg2) 85%,transparent);font-size:11px;color:var(--text2);white-space:nowrap;overflow:hidden}
  .statusbar .hint{flex:1;overflow:hidden;text-overflow:ellipsis}
  .statusbar .hint.live{color:var(--accent)}
  .statusbar kbd{font-family:var(--mono);font-size:10px;background:var(--bg3);border:1px solid var(--border);border-bottom-width:2px;border-radius:4px;padding:0 5px;color:var(--text)}
  .statusbar .readout{font-family:var(--mono);font-size:10.5px;color:var(--text3)}

  .panel{width:372px;flex:none;display:flex;flex-direction:column;border-left:1px solid var(--border);background:var(--bg2);min-height:0}
  .panel section{display:flex;flex-direction:column;min-height:0}
  .panel h2{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text3);padding:12px 14px 8px}
  .panel h2 .count{font-family:var(--mono);font-size:10px;color:var(--text2);background:var(--bg3);border:1px solid var(--border);border-radius:99px;padding:1px 7px;letter-spacing:0;text-transform:none}
  .panel h2 .grow{flex:1}
  .mini{height:22px;padding:0 8px;border-radius:5px;border:1px solid var(--border);background:var(--bg3);color:var(--text2);font-size:10.5px;font-weight:600;letter-spacing:0;text-transform:none;display:inline-flex;align-items:center;gap:4px}
  .mini:hover:not(:disabled){color:var(--text);border-color:var(--border-light)}
  .mini.danger:hover:not(:disabled){color:var(--red);border-color:var(--red);background:var(--red-glow)}
  .mini.go:not(:disabled){color:var(--accent);border-color:color-mix(in srgb,var(--accent) 55%,transparent);background:var(--accent-glow)}
  .mini.go:hover:not(:disabled){color:var(--on-accent);background:var(--accent);border-color:var(--accent)}
  .mini.confirm{color:var(--orange);border-color:var(--orange);background:var(--orange-glow)}

  .panel .inspector{flex:0 1 auto;min-height:140px;border-bottom:1px solid var(--border);max-height:56%;overflow-y:auto}
  .inspector .muted{padding:0 14px 14px;font-size:12px;color:var(--text3);line-height:1.55}
  .crumbs{display:flex;flex-wrap:wrap;gap:3px;padding:0 14px 8px}
  .crumbs button{height:20px;padding:0 7px;border-radius:4px;border:1px solid var(--border);background:var(--bg3);color:var(--text2);font-family:var(--mono);font-size:10px}
  .crumbs button:hover{color:var(--text);border-color:var(--border-light)}
  .crumbs button[aria-current="true"]{color:var(--accent);border-color:var(--accent);background:var(--accent-glow)}
  .crumbs .sep{color:var(--text3);font-size:10px;align-self:center}
  .selhead{display:flex;align-items:center;gap:8px;padding:0 14px 10px;min-width:0}
  .selhead .tag{font-family:var(--mono);font-size:12px;color:var(--accent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:0 1 auto}
  .selhead .snippet{font-size:11.5px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1}
  .selhead .mini{flex:none}
  .inspector .hint{padding:2px 14px 12px;font-size:10px;color:var(--text3);line-height:1.5}
  .inspector .hint.err{color:var(--red)}

  .groups{display:flex;flex-direction:column;padding:0 0 4px}
  .group{padding:6px 14px 8px;border-top:1px solid var(--border)}
  .group .gh{font-size:9.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--text3);padding:2px 0 6px}
  .field{display:grid;grid-template-columns:78px minmax(0,1fr) 56px 18px;align-items:center;gap:8px;min-height:26px}
  .field .flabel{font-size:11px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .field.set .flabel{color:var(--text)}
  .field.set .flabel::after{content:'';display:inline-block;width:5px;height:5px;margin:0 0 1px 5px;border-radius:99px;background:var(--accent);vertical-align:middle}
  .field.sub .flabel{padding-left:10px;color:var(--text3);font-family:var(--mono);font-size:10px}
  .field .ro{font-family:var(--mono);font-size:10.5px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .field .clear{width:18px;height:18px;padding:0;border:0;border-radius:4px;background:none;color:var(--text3);font-size:13px;line-height:1;visibility:hidden}
  .field:hover .clear.on,.field .clear.on:focus-visible{visibility:visible}
  .field .clear:hover{color:var(--red);background:var(--red-glow)}
  .csub{display:flex;flex-direction:column;gap:1px;margin:2px 0 6px 4px;padding:2px 0 2px 0;border-left:2px solid var(--border-light)}
  .cval{display:flex;align-items:center;gap:6px;min-width:0}
  .cval .num{flex:1;justify-content:flex-start}
  .num{height:22px;min-width:0;display:flex;align-items:center;justify-content:flex-end;padding:0 6px;border:1px solid transparent;border-radius:5px;font-family:var(--mono);font-size:10.5px;color:var(--text);cursor:text;user-select:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .num:hover,.num:focus-visible{border-color:var(--border);background:var(--bg3);outline:none}
  .num.mixed{color:var(--text2);font-style:italic}
  .numedit{height:22px;width:100%;min-width:0;border:1px solid var(--accent);border-radius:5px;background:var(--bg);color:var(--text);font-family:var(--mono);font-size:10.5px;text-align:right;padding:0 6px;outline:none;box-shadow:0 0 0 3px var(--accent-glow)}
  .cval .numedit,.field.text .numedit{text-align:left}
  .field.text{grid-template-columns:78px minmax(0,1fr) 18px}
  .field.text .num{justify-content:flex-start}
  .numedit.invalid{border-color:var(--red);box-shadow:0 0 0 3px var(--red-glow)}
  .swatch-btn{position:relative;width:22px;height:22px;flex:none;padding:0;border-radius:5px;border:1px solid var(--border-light);overflow:hidden;background-color:#fff;background-image:repeating-conic-gradient(#c9ccd3 0 25%,#fff 0 50%);background-size:8px 8px}
  .swatch-btn i{position:absolute;inset:0;display:block}
  .swatch-btn:hover{border-color:var(--text2)}
  .swatch-btn[aria-expanded="true"]{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-glow)}
  .range{-webkit-appearance:none;appearance:none;width:100%;height:18px;margin:0;background:transparent;cursor:pointer;--pct:0%;--fill:var(--accent);--track:linear-gradient(to right,var(--fill) var(--pct),var(--bg4) var(--pct))}
  .range:focus{outline:none}
  .range::-webkit-slider-runnable-track{height:4px;border-radius:99px;background:var(--track);box-shadow:inset 0 0 0 1px var(--border)}
  .range::-moz-range-track{height:4px;border-radius:99px;background:var(--track);box-shadow:inset 0 0 0 1px var(--border)}
  .range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:12px;height:12px;margin-top:-4px;border-radius:99px;background:var(--text);border:2px solid var(--bg2);box-shadow:0 0 0 1px var(--border-light),0 1px 3px rgba(0,0,0,.4)}
  .range::-moz-range-thumb{width:8px;height:8px;border-radius:99px;background:var(--text);border:2px solid var(--bg2);box-shadow:0 0 0 1px var(--border-light)}
  .range:hover::-webkit-slider-thumb{box-shadow:0 0 0 1px var(--accent),0 1px 3px rgba(0,0,0,.4)}
  .range:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 1px var(--accent),0 0 0 4px var(--accent-glow)}
  .range:focus-visible::-moz-range-thumb{box-shadow:0 0 0 1px var(--accent),0 0 0 4px var(--accent-glow)}
  .range.paint::-webkit-slider-runnable-track{height:8px}
  .range.paint::-moz-range-track{height:8px}
  .range.paint::-webkit-slider-thumb{margin-top:-2px}
  .range.hue{--track:linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)}
  .range.alpha{--track:linear-gradient(to right,transparent,var(--swatch)),repeating-conic-gradient(#c9ccd3 0 25%,#fff 0 50%) 0 0/8px 8px}
  .aligns{display:inline-flex;gap:2px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:2px;justify-self:start}
  .aligns button{width:24px;height:20px;padding:0;border:0;border-radius:4px;background:transparent;color:var(--text2);display:inline-flex;align-items:center;justify-content:center}
  .aligns button:hover{color:var(--text);background:var(--bg4)}
  .aligns button[aria-pressed="true"]{color:var(--accent);background:var(--accent-glow)}

  #themeBtn .i-moon,[data-theme="light"] #themeBtn .i-sun{display:none}
  [data-theme="light"] #themeBtn .i-moon{display:block}
  #pauseBtn .i-play,#pauseBtn[aria-pressed="true"] .i-pause{display:none}
  #pauseBtn[aria-pressed="true"] .i-play{display:block}

  .panel .edits{flex:0 1 auto;min-height:96px;border-bottom:1px solid var(--border);max-height:22%;display:flex;flex-direction:column}
  .editlist{overflow-y:auto;padding:0 14px 10px;display:flex;flex-direction:column;gap:5px}
  .editlist .empty{font-size:11.5px;color:var(--text3);line-height:1.5}
  .edit{display:flex;align-items:flex-start;gap:8px;padding:6px 8px;border-radius:6px;background:var(--bg3);border:1px solid var(--border);border-left:2px solid var(--teal);font-size:11px;line-height:1.45;color:var(--text2)}
  .edit .k{flex:none;font-family:var(--mono);font-size:9.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--teal);padding-top:2px;width:46px}
  .edit .s{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
  .edit.kind-remove{border-left-color:var(--red)}.edit.kind-remove .k{color:var(--red)}
  .edit.kind-text{border-left-color:var(--accent)}.edit.kind-text .k{color:var(--accent)}
  .edit.kind-style{border-left-color:var(--pink)}.edit.kind-style .k{color:var(--pink)}
  .edit.kind-move,.edit.kind-nudge{border-left-color:var(--orange)}.edit.kind-move .k,.edit.kind-nudge .k{color:var(--orange)}
  .edit.stale{opacity:.5;border-style:dashed}

  .panel .convo{flex:1 1 0;min-height:232px}
  .chat{flex:1;overflow-y:auto;padding:4px 14px 10px;display:flex;flex-direction:column;gap:8px}
  .msg{max-width:92%;padding:7px 10px;border-radius:10px;font-size:12.5px;white-space:pre-wrap;word-break:break-word}
  .msg.user{align-self:flex-end;background:var(--accent-glow);border:1px solid color-mix(in srgb,var(--accent) 35%,transparent);color:var(--text);border-bottom-right-radius:3px}
  .msg.agent{align-self:flex-start;background:var(--bg3);border:1px solid var(--border);color:var(--text);border-bottom-left-radius:3px}
  .msg .meta{display:block;font-size:9.5px;color:var(--text3);margin-top:3px}
  .msg.kind-edits,.msg.kind-finish{border-left:2px solid var(--green)}
  .chat .empty{color:var(--text3);font-size:12px;text-align:center;margin-top:18px;line-height:1.6;padding:0 10px}
  .typing{align-self:flex-start;display:none;align-items:center;gap:8px;background:var(--bg3);border:1px solid var(--border);border-bottom-left-radius:3px;border-radius:10px;padding:9px 12px}
  .typing.show{display:flex}
  .typing .dots{display:flex;align-items:center;gap:3px}
  .typing .dots i{width:6px;height:6px;border-radius:99px;background:var(--text2);animation:typing-bounce 1.4s infinite ease-in-out both}
  .typing .dots i:nth-child(1){animation-delay:-.32s}
  .typing .dots i:nth-child(2){animation-delay:-.16s}
  .typing .label{font-size:11px;color:var(--text3)}
  @keyframes typing-bounce{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-4px);opacity:1}}
  .stalled{align-self:flex-start;display:none;gap:8px;background:var(--orange-glow);border:1px solid color-mix(in srgb,var(--orange) 35%,transparent);border-radius:10px;padding:8px 11px;font-size:11.5px;color:var(--text2);line-height:1.5}
  .stalled.show{display:flex}
  @media (prefers-reduced-motion:reduce){.typing .dots i{animation:none;opacity:.7}.presence .dot{animation:none}}

  .composer{padding:10px 14px 14px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:8px}
  .anchor{display:flex;align-items:center;gap:6px;font-size:10.5px;color:var(--text3)}
  .anchor code{font-size:10.5px;color:var(--teal);background:var(--bg3);border:1px solid var(--border);border-radius:4px;padding:1px 6px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .anchor button{border:0;background:none;color:var(--text3);font-size:13px;line-height:1}
  .anchor button:hover{color:var(--red)}
  .composer textarea{width:100%;min-height:58px;max-height:160px;resize:vertical;background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:8px 10px;color:var(--text);font-size:12.5px;outline:none;transition:all .15s}
  .composer textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-glow)}
  .composer .row{display:flex;gap:8px;align-items:center}
  .composer .send{flex:1;height:32px;border:1px solid var(--border-light);border-radius:6px;background:var(--bg4);color:var(--text);font-size:12.5px;font-weight:600;transition:all .12s}
  .composer .send:hover:not(:disabled){border-color:var(--accent);color:var(--accent)}
  .composer .status{font-size:10.5px;color:var(--text3);min-height:14px}

  .overlay{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:color-mix(in srgb,var(--bg) 82%,transparent);backdrop-filter:blur(6px);z-index:50}
  .overlay.show{display:flex}
  .overlay .card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow-lg);padding:28px 34px;text-align:center;max-width:380px}
  .overlay .card .ok{width:40px;height:40px;margin:0 auto 12px;border-radius:99px;background:var(--green-glow);color:var(--green);display:flex;align-items:center;justify-content:center;border:1px solid color-mix(in srgb,var(--green) 40%,transparent)}
  .overlay .card h3{font-size:15px;margin-bottom:6px}
  .overlay .card p{font-size:12.5px;color:var(--text2);line-height:1.55}
  .overlay .card code{font-size:11px;color:var(--teal)}
  `;
}

// Client logic for the shell page (runs in the top window).
function uiClientJs() {
  return String.raw`'use strict';
(() => {
  const boot = JSON.parse(document.getElementById('uc-session').textContent);
  const key = boot.key;
  const PRESETS = boot.presets;
  const $ = id => document.getElementById(id);
  const frame = $('artifact');
  const device = $('device');
  const sizer = $('sizer');
  const stage = $('stage');
  const viewportEl = $('viewportArea');
  const chatLog = $('chatLog');
  const input = $('chatInput');
  const sendBtn = $('send');
  const statusEl = $('sendStatus');
  const presence = $('presence');
  const hintEl = $('hint');
  const readoutEl = $('readout');
  const STORE = 'ecc-ui-canvas:' + key;

  let ended = boot.status === 'ended';
  let sending = false;
  let mode = 'edit';
  let frameReady = false;
  let selection = null;
  let anchorEnabled = true;
  let lastScroll = { x: 0, y: 0 };
  let paused = false;
  let agent = boot.agent || null;
  let canUndo = false;
  let canRedo = false;
  let exportSeq = 0;
  const exportWaiters = new Map();
  const confirmTimers = new Map();

  // --- persisted shell state ------------------------------------------------
  function readStore() {
    try { return JSON.parse(sessionStorage.getItem(STORE) || 'null') || {}; } catch (_e) { return {}; }
  }
  function writeStore(patch) {
    try {
      const next = Object.assign(readStore(), patch);
      sessionStorage.setItem(STORE, JSON.stringify(next));
    } catch (_e) { /* storage blocked: the canvas still works for this page load */ }
  }
  const stored = readStore();
  let edits = Array.isArray(stored.edits) ? stored.edits : [];

  // --- theme --------------------------------------------------------------------
  const themeKey = 'ecc-plan-canvas:theme';
  function applyTheme(t) {
    if (t === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
    const label = t === 'light' ? 'Switch to dark theme' : 'Switch to light theme';
    $('themeBtn').title = label;
    $('themeBtn').setAttribute('aria-label', label);
  }
  let theme = (() => { try { return localStorage.getItem(themeKey); } catch (_e) { return null; } })() || 'dark';
  applyTheme(theme);
  $('themeBtn').addEventListener('click', () => {
    theme = theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem(themeKey, theme); } catch (_e) { /* blocked */ }
    applyTheme(theme);
  });

  // --- viewport ------------------------------------------------------------------
  function parseViewport(spec) {
    const custom = typeof spec === 'string' ? spec.match(/^(\d{2,5})x(\d{2,5})$/) : null;
    if (custom) return { preset: 'custom', width: Number(custom[1]), height: Number(custom[2]) };
    if (spec === 'mobile' || spec === 'custom') return { preset: spec, width: PRESETS[spec].width, height: PRESETS[spec].height };
    return { preset: 'desktop', width: PRESETS.desktop.width, height: PRESETS.desktop.height };
  }
  let vp = stored.viewport && stored.viewport.preset ? stored.viewport : parseViewport(boot.ui && boot.ui.viewport);
  let actual = { width: vp.width, height: vp.height, scale: 1 };

  function layoutStage() {
    const rect = viewportEl.getBoundingClientRect();
    const pad = 24;
    const availW = Math.max(120, rect.width - pad * 2);
    const availH = Math.max(120, rect.height - pad * 2);
    let width = vp.width;
    let height = vp.height;
    if (vp.preset === 'desktop') {
      width = Math.max(320, Math.floor(availW));
      height = Math.max(240, Math.floor(availH));
    }
    const bezel = vp.preset === 'mobile' ? 12 : 0;
    const outerW = width + bezel * 2;
    const outerH = height + bezel * 2;
    const scale = vp.preset === 'desktop' ? 1 : Math.min(1, availW / outerW, availH / outerH);
    device.className = 'device ' + vp.preset;
    device.style.width = outerW + 'px';
    device.style.height = outerH + 'px';
    device.style.transform = 'scale(' + scale + ')';
    sizer.style.width = Math.round(outerW * scale) + 'px';
    sizer.style.height = Math.round(outerH * scale) + 'px';
    actual = { width, height, scale };
    $('vpW').value = width;
    $('vpH').value = height;
    $('vpScale').textContent = scale < 0.995 ? Math.round(scale * 100) + '%' : '';
    readoutEl.textContent = width + ' × ' + height + (scale < 0.995 ? ' · shown at ' + Math.round(scale * 100) + '%' : '');
    document.querySelectorAll('.seg.viewports button').forEach(b => b.setAttribute('aria-pressed', String(b.getAttribute('data-vp') === vp.preset)));
    $('rotateBtn').disabled = vp.preset === 'desktop';
    writeStore({ viewport: vp });
  }
  document.querySelectorAll('.seg.viewports button').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.getAttribute('data-vp');
      if (preset === vp.preset) return;
      if (preset === 'custom') vp = { preset: 'custom', width: vp.preset === 'desktop' ? actual.width : vp.width, height: vp.preset === 'desktop' ? actual.height : vp.height };
      else vp = parseViewport(preset);
      layoutStage();
    });
  });
  function applyDims() {
    const width = Math.max(100, Math.min(20000, parseInt($('vpW').value, 10) || actual.width));
    const height = Math.max(100, Math.min(20000, parseInt($('vpH').value, 10) || actual.height));
    vp = { preset: 'custom', width, height };
    layoutStage();
  }
  [$('vpW'), $('vpH')].forEach(box => {
    box.addEventListener('input', () => {
      const clean = box.value.replace(/[^0-9]/g, '').slice(0, 5);
      if (clean !== box.value) box.value = clean;
    });
    box.addEventListener('change', applyDims);
    box.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); applyDims(); box.blur(); }
      else if (e.key === 'Escape') { e.preventDefault(); layoutStage(); box.blur(); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        box.value = String((parseInt(box.value, 10) || 0) + (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1));
        applyDims();
      }
    });
  });
  $('rotateBtn').addEventListener('click', () => {
    if (vp.preset === 'desktop') return;
    vp = { preset: vp.preset, width: vp.height, height: vp.width, rotated: !vp.rotated };
    layoutStage();
  });
  if (window.ResizeObserver) new ResizeObserver(() => layoutStage()).observe(viewportEl);
  window.addEventListener('resize', layoutStage);
  layoutStage();

  // --- mode -----------------------------------------------------------------------
  const HINTS = {
    edit: 'Click to select · double-click edits text · drag handles to resize · drag to reorder · Alt-drag or arrows nudge · Delete removes',
    interact: 'Interact mode: clicks, hovers and taps reach the component. Switch back to Edit to change things.'
  };
  function setMode(next) {
    mode = next === 'interact' ? 'interact' : 'edit';
    document.querySelectorAll('.seg.modes button').forEach(b => b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === mode)));
    stage.setAttribute('data-mode', mode);
    setHint('');
    postToFrame({ type: 'uc:set-mode', mode });
  }
  document.querySelectorAll('.seg.modes button').forEach(btn => btn.addEventListener('click', () => setMode(btn.getAttribute('data-mode'))));
  function setHint(text) {
    hintEl.classList.toggle('live', Boolean(text));
    hintEl.textContent = text || HINTS[mode];
  }
  setHint('');

  // --- frame bridge ----------------------------------------------------------------
  function postToFrame(msg) {
    if (frame.contentWindow) frame.contentWindow.postMessage(msg, '*');
  }
  function requestExport() {
    return new Promise((resolve, reject) => {
      const requestId = 'x' + (++exportSeq);
      exportWaiters.set(requestId, resolve);
      postToFrame({ type: 'uc:export', requestId });
      setTimeout(() => {
        if (exportWaiters.delete(requestId)) reject(new Error('the preview did not answer; reload and try again'));
      }, 5000);
    });
  }
  window.addEventListener('message', e => {
    if (e.source !== frame.contentWindow) return;
    const msg = e.data || {};
    if (typeof msg.type !== 'string') return;
    switch (msg.type) {
      case 'uc:ready':
        frameReady = true;
        postToFrame({ type: 'uc:set-mode', mode });
        postToFrame({ type: 'uc:restore', edits, scroll: lastScroll, selection: selection ? selection.selector : null });
        if (paused) postToFrame({ type: 'uc:pause-animations', paused: true });
        break;
      case 'uc:selection':
        selection = msg.selection || null;
        if (selection) anchorEnabled = true;
        renderInspector();
        renderAnchor();
        break;
      case 'uc:edits':
        edits = Array.isArray(msg.edits) ? msg.edits : [];
        canUndo = Boolean(msg.canUndo);
        canRedo = Boolean(msg.canRedo);
        writeStore({ edits });
        renderEdits();
        break;
      case 'uc:status': setHint(msg.text || ''); break;
      case 'uc:toggle-mode': setMode(mode === 'edit' ? 'interact' : 'edit'); break;
      case 'uc:scroll': lastScroll = { x: msg.x || 0, y: msg.y || 0 }; break;
      case 'uc:export': {
        const resolve = exportWaiters.get(msg.requestId);
        if (resolve) { exportWaiters.delete(msg.requestId); resolve(msg); }
        break;
      }
      default: break;
    }
  });
  viewportEl.addEventListener('mousedown', e => {
    if (e.target === viewportEl && mode === 'edit') postToFrame({ type: 'uc:deselect' });
  });

  // --- inspector ----------------------------------------------------------------------
  // Parse, sanitize and format helpers, shared verbatim with Node tests
  // (scripts/lib/ui-canvas/fields.js).
  ${FIELD_HELPERS_JS}

  const FIELD_HINT = 'Drag a slider or double-click a value to type one. Enter applies, Esc cancels, arrow keys step (Shift for 10).';
  const LENGTH_UNITS = ['px', 'rem', 'em', '%'];
  // step is typed-value precision (so 1.25rem survives); sliderStep is the drag increment.
  const NUMERIC = {
    'font-size': { label: 'Size', unit: 'px', units: LENGTH_UNITS, min: 1, max: 999, step: 0.01, slider: [6, 96], sliderStep: 1 },
    'font-weight': { label: 'Weight', unit: '', units: [''], min: 1, max: 1000, step: 1, slider: [100, 900], sliderStep: 100 },
    'line-height': { label: 'Line height', unit: '', units: ['', 'px', 'em', 'rem', '%'], min: 0, max: 999, step: 0.01, slider: [0.8, 3], sliderStep: 0.05 },
    'border-radius': { label: 'Radius', unit: 'px', units: LENGTH_UNITS, min: 0, max: 9999, step: 0.01, slider: [0, 64], sliderStep: 1, box: true },
    'opacity': { label: 'Opacity', ratio: true, min: 0, max: 1, step: 0.01, slider: [0, 1] },
    'padding': { label: 'Padding', unit: 'px', units: LENGTH_UNITS, min: 0, max: 9999, step: 0.01, slider: [0, 96], sliderStep: 1, box: true },
    'margin': { label: 'Margin', unit: 'px', units: LENGTH_UNITS, min: -9999, max: 9999, step: 0.01, slider: [0, 96], sliderStep: 1, box: true, allowAuto: true },
    'gap': { label: 'Gap', unit: 'px', units: LENGTH_UNITS, min: 0, max: 9999, step: 0.01, slider: [0, 96], sliderStep: 1, box: true, maxParts: 2 }
  };
  const ALIGN_ICONS = {
    left: '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2.5 4h11M2.5 8h7M2.5 12h9"/></svg>',
    center: '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2.5 4h11M4.5 8h7M3.5 12h9"/></svg>',
    right: '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2.5 4h11M6.5 8h7M4.5 12h9"/></svg>',
    justify: '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2.5 4h11M2.5 8h11M2.5 12h11"/></svg>'
  };
  let fields = [];
  let renderedKey = '';
  let current = {};
  const openColors = new Set();

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function styleMap(sel) {
    const out = {};
    (sel.styles || []).forEach(s => { out[s.property] = s; });
    return out;
  }
  function px(value) { const n = parseFloat(value); return Number.isFinite(n) ? n : 0; }
  function setStyle(property, value) { postToFrame({ type: 'uc:style', property, value }); }
  function isDefaultish(value) {
    return value === 'none' || value === 'normal' || value === 'start' || value === '1' || /^(0px ?)+$/.test(value + ' ') || /^0(px)?$/.test(value) || /rgba\(\s*\d+[, ]+\d+[, ]+\d+[, /]+0\)/.test(value);
  }
  let hintTimer = null;
  function fieldHint(text, isError) {
    const hint = $('fieldHint');
    hint.textContent = text || FIELD_HINT;
    hint.classList.toggle('err', Boolean(isError));
    clearTimeout(hintTimer);
    if (text) hintTimer = setTimeout(() => fieldHint(''), 4000);
  }
  let probe = null;
  // Any CSS color the browser accepts (names included), normalized to rgba parts.
  function resolveColor(text) {
    const direct = parseColor(text);
    if (direct) return direct;
    const clean = sanitizeCssText(text, 60);
    if (!clean.ok || !(window.CSS && CSS.supports('color', clean.css))) return null;
    if (!probe) { probe = el('span'); probe.hidden = true; document.body.appendChild(probe); }
    probe.style.color = '';
    probe.style.color = clean.css;
    return parseColor(getComputedStyle(probe).color);
  }

  // Double-click (or Enter on a focused value) swaps the value for a text box.
  // commit(text) returns an error to keep the box open, or '' once applied.
  function editableValue(span, field, getText, commit) {
    span.tabIndex = 0;
    span.title = 'Double-click to type a value';
    const begin = () => {
      if (ended || field.editing) return;
      field.editing = true;
      const box = el('input', 'numedit');
      box.type = 'text';
      box.spellcheck = false;
      box.autocomplete = 'off';
      box.value = getText();
      span.replaceWith(box);
      box.focus();
      box.select();
      let done = false;
      const finish = how => {
        if (done) return;
        if (how) {
          const error = commit(box.value);
          if (error) {
            box.classList.add('invalid');
            box.title = error;
            fieldHint(error, true);
            if (how === 'enter') return;
          } else fieldHint('');
        }
        done = true;
        field.editing = false;
        box.replaceWith(span);
        field.update(current);
        if (how !== 'blur') span.focus();
      };
      box.addEventListener('keydown', e => {
        e.stopPropagation();
        if (e.key === 'Enter') { e.preventDefault(); finish('enter'); }
        else if (e.key === 'Escape') { e.preventDefault(); finish(null); }
      });
      box.addEventListener('input', () => box.classList.remove('invalid'));
      box.addEventListener('blur', () => finish('blur'));
    };
    span.addEventListener('dblclick', e => { e.preventDefault(); begin(); });
    span.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); begin(); }
      else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && field.nudge) {
        e.preventDefault();
        field.nudge((e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1));
      }
    });
  }

  // One labelled row: slider, value (double-click to type) and a clear button.
  // opts.read(styles) -> { value, text, mixed, range: [min, max], set, clear }.
  function sliderField(opts) {
    const field = { busy: false, editing: false };
    const row = el('div', 'field' + (opts.sub ? ' sub' : ''));
    row.setAttribute('data-prop', opts.prop || '');
    const label = el('span', 'flabel', opts.label);
    label.title = opts.title || opts.prop || opts.label;
    const range = el('input', 'range' + (opts.rangeClass ? ' ' + opts.rangeClass : ''));
    range.type = 'range';
    range.step = String(opts.step);
    range.setAttribute('aria-label', opts.label);
    const num = el('span', 'num');
    const clear = el('button', 'clear', '×');
    clear.type = 'button';
    clear.title = 'Clear ' + (opts.prop || opts.label);
    clear.setAttribute('aria-label', clear.title);
    row.append(label, range, num, clear);
    let state = { value: 0, text: '' };
    const paint = () => {
      const min = Number(range.min), max = Number(range.max);
      const pct = max > min ? ((Number(range.value) - min) / (max - min)) * 100 : 0;
      range.style.setProperty('--pct', pct.toFixed(2) + '%');
      if (opts.paint) opts.paint(range);
    };
    field.update = styles => {
      if (field.busy || field.editing) return;
      state = opts.read(styles);
      const lo = Math.min(state.range[0], state.value);
      const hi = Math.max(state.range[1], state.value);
      range.min = String(lo);
      range.max = String(hi);
      range.value = String(state.value);
      num.textContent = state.text;
      num.classList.toggle('mixed', Boolean(state.mixed));
      row.classList.toggle('set', Boolean(state.set));
      clear.classList.toggle('on', Boolean(state.clear));
      range.disabled = ended;
      paint();
    };
    range.addEventListener('pointerdown', () => { field.busy = true; });
    const release = () => { if (!field.busy) return; field.busy = false; field.update(current); };
    range.addEventListener('pointerup', release);
    range.addEventListener('change', release);
    range.addEventListener('blur', release);
    range.addEventListener('input', () => {
      const value = Number(range.value);
      num.textContent = opts.format ? opts.format(value) : formatNumber(value);
      num.classList.remove('mixed');
      paint();
      opts.write(value);
    });
    field.nudge = delta => {
      const step = Number(range.step) || 1;
      const next = Number((state.value + delta * step).toFixed(4));
      opts.write(Math.max(opts.floor === undefined ? -Infinity : opts.floor, next));
    };
    editableValue(num, field, () => (opts.editText ? opts.editText(state) : state.text), text => opts.type(text));
    clear.addEventListener('click', () => { if (opts.clear) opts.clear(); });
    field.el = row;
    return field;
  }

  function numericField(prop) {
    const spec = NUMERIC[prop];
    return sliderField({
      label: spec.label,
      prop,
      step: spec.sliderStep || spec.step,
      floor: spec.min,
      read: styles => {
        const style = styles[prop];
        const raw = String(style.value);
        const out = { range: spec.slider, set: Boolean(style.inline), clear: style.resettable && !isDefaultish(raw) };
        if (spec.ratio) return Object.assign(out, { value: px(raw), text: Math.round(px(raw) * 100) + '%' });
        if (prop === 'line-height') {
          if (raw === 'normal') return Object.assign(out, { value: 1.2, text: 'normal', mixed: true });
          const size = styles['font-size'] ? px(styles['font-size'].value) : 16;
          const ratio = size ? px(raw) / size : 1;
          return Object.assign(out, { value: Number(ratio.toFixed(2)), text: formatNumber(ratio) });
        }
        if (spec.box) {
          const parts = raw.split(/\s+/).filter(p => p && p !== '/');
          const mixed = parts.some(p => p !== parts[0]);
          return Object.assign(out, { value: px(parts[0]), text: mixed ? parts.map(p => (/px$/.test(p) ? formatNumber(px(p)) : p)).join(' ') : formatNumber(px(parts[0])), mixed });
        }
        return Object.assign(out, { value: px(raw), text: formatNumber(px(raw)) });
      },
      format: value => (spec.ratio ? Math.round(value * 100) + '%' : formatNumber(value)),
      write: value => {
        if (spec.ratio || prop === 'line-height') setStyle(prop, formatNumber(value));
        else if (prop === 'font-weight') setStyle(prop, String(Math.round(value)));
        else setStyle(prop, formatNumber(value) + 'px');
      },
      type: text => {
        const word = String(text).trim().toLowerCase();
        if (prop === 'line-height' && word === 'normal') { setStyle(prop, 'normal'); return ''; }
        if (prop === 'font-weight' && (word === 'bold' || word === 'normal')) { setStyle(prop, word === 'bold' ? '700' : '400'); return ''; }
        const result = spec.box ? sanitizeBoxList(text, spec) : sanitizeNumber(text, spec);
        if (!result.ok) return result.error;
        setStyle(prop, result.css);
        return '';
      },
      clear: () => setStyle(prop, null)
    });
  }

  function sizeField(label, dim) {
    const spec = { unit: 'px', units: ['px'], min: 1, max: 20000, step: 1 };
    const send = value => postToFrame({ type: 'uc:size', width: dim === 'width' ? value : null, height: dim === 'height' ? value : null });
    return sliderField({
      label,
      prop: dim,
      title: dim + ' in CSS pixels',
      step: 1,
      floor: 1,
      read: () => {
        const value = selection.size[dim];
        const room = dim === 'width' ? actual.width : actual.height;
        return { value, text: String(value), range: [1, Math.max(room, Math.round(value * 1.5))] };
      },
      write: value => send(Math.max(1, Math.round(value))),
      type: text => {
        const result = sanitizeNumber(text, spec);
        if (!result.ok) return result.error;
        send(result.value);
        return '';
      }
    });
  }

  // Swatch + hex + alpha row; the swatch opens hue, saturation, lightness and
  // alpha sliders underneath. The exact color is kept beside its HSL view so
  // typed or incoming values never drift, and hue survives grays.
  function colorField(label, prop, getColor, setColor, clearable) {
    const wrap = el('div', 'cfield');
    const field = { editing: false };
    const row = el('div', 'field');
    row.setAttribute('data-prop', prop);
    const flabel = el('span', 'flabel', label);
    flabel.title = prop;
    const cval = el('div', 'cval');
    const swatch = el('button', 'swatch-btn');
    swatch.type = 'button';
    swatch.title = 'Adjust ' + label.toLowerCase() + ' with sliders';
    swatch.setAttribute('aria-label', swatch.title);
    const fill = el('i');
    swatch.appendChild(fill);
    const hex = el('span', 'num');
    cval.append(swatch, hex);
    const alpha = el('span', 'num');
    const clear = el('button', 'clear', '×');
    clear.type = 'button';
    clear.title = 'Clear ' + prop;
    clear.setAttribute('aria-label', clear.title);
    row.append(flabel, cval, alpha, clear);
    const sub = el('div', 'csub');
    wrap.append(row, sub);
    let hsl = { h: 0, s: 0, l: 0, a: 0 };
    let exact = { r: 0, g: 0, b: 0, a: 0 };
    let lastCss = '';
    const adopt = color => {
      const next = rgbToHsl(color);
      if (next.s === 0 && lastCss) next.h = hsl.h;
      hsl = next;
      exact = { r: color.r, g: color.g, b: color.b, a: color.a };
    };
    const hexField = { editing: false, update: () => field.update(current) };
    const alphaField = { editing: false, update: () => field.update(current) };
    const apply = fromSliders => {
      if (fromSliders) exact = hslToRgb(hsl);
      else exact.a = hsl.a;
      const css = formatColor(exact);
      lastCss = css;
      paint();
      setColor(css);
    };
    const channel = (name, max, rangeClass, key, unit) => sliderField({
      label: name,
      sub: true,
      step: 1,
      floor: 0,
      rangeClass,
      read: () => ({ value: key === 'a' ? Math.round(hsl.a * 100) : hsl[key], text: (key === 'a' ? Math.round(hsl.a * 100) : hsl[key]) + unit, range: [0, max] }),
      format: value => value + unit,
      write: value => {
        const next = Math.max(0, Math.min(max, Math.round(value)));
        if (key === 'a') hsl.a = next / 100;
        else { hsl[key] = next; if (hsl.a === 0) hsl.a = 1; }
        apply(key !== 'a');
      },
      type: text => {
        const result = sanitizeNumber(text, { unit: unit === '%' ? '%' : '', units: unit === '%' ? ['%', ''] : ['', 'deg'], min: 0, max, step: 1 });
        if (!result.ok) return result.error;
        if (key === 'a') hsl.a = result.value / 100;
        else { hsl[key] = result.value; if (hsl.a === 0) hsl.a = 1; }
        apply(key !== 'a');
        return '';
      },
      paint: range => {
        const h = hsl.h, s = hsl.s, l = hsl.l;
        if (key === 's') range.style.setProperty('--track', 'linear-gradient(to right,hsl(' + h + ',0%,' + l + '%),hsl(' + h + ',100%,' + l + '%))');
        if (key === 'l') range.style.setProperty('--track', 'linear-gradient(to right,#000,hsl(' + h + ',' + s + '%,50%),#fff)');
        if (key === 'a') range.style.setProperty('--swatch', formatColor(hslToRgb({ h, s, l, a: 1 })));
      }
    });
    const channels = [channel('H', 360, 'paint hue', 'h', '°'), channel('S', 100, 'paint', 's', '%'), channel('L', 100, 'paint', 'l', '%'), channel('A', 100, 'paint alpha', 'a', '%')];
    channels.forEach(c => sub.appendChild(c.el));
    const busy = () => field.editing || hexField.editing || alphaField.editing || channels.some(c => c.busy || c.editing);
    function paint() {
      fill.style.background = formatColor(exact);
      hex.textContent = hsl.a === 0 ? 'none' : colorHex(exact);
      hex.classList.toggle('mixed', hsl.a === 0);
      alpha.textContent = Math.round(hsl.a * 100) + '%';
      channels.forEach(c => { if (!c.busy && !c.editing) c.update(current); });
    }
    const setOpen = open => {
      if (open) openColors.add(prop); else openColors.delete(prop);
      sub.hidden = !open;
      swatch.setAttribute('aria-expanded', String(open));
    };
    swatch.addEventListener('click', () => setOpen(sub.hidden));
    setOpen(openColors.has(prop));
    field.update = styles => {
      const style = styles[prop] || {};
      row.classList.toggle('set', Boolean(style.inline));
      clear.classList.toggle('on', Boolean(clearable && style.resettable && !isDefaultish(String(style.value))));
      if (busy()) return;
      const color = getColor(styles) || { r: 0, g: 0, b: 0, a: 0 };
      const css = formatColor(color);
      if (css !== lastCss) {
        adopt(color);
        lastCss = css;
      }
      paint();
    };
    editableValue(hex, hexField, () => (hsl.a === 0 ? '' : colorHex(exact)), text => {
      const color = resolveColor(text);
      if (!color) return 'Use a hex like #16A34A, rgb(), or a color name';
      adopt(color);
      apply();
      return '';
    });
    editableValue(alpha, alphaField, () => String(Math.round(hsl.a * 100)), text => {
      const result = sanitizeNumber(text, { ratio: true, min: 0, max: 1, step: 0.01 });
      if (!result.ok) return result.error;
      hsl.a = result.value;
      apply();
      return '';
    });
    alphaField.nudge = delta => { hsl.a = Math.max(0, Math.min(1, Number((hsl.a + delta / 100).toFixed(2)))); apply(); };
    clear.addEventListener('click', () => setStyle(prop, null));
    field.el = wrap;
    return field;
  }

  function borderParts(styles) {
    const value = styles.border ? String(styles.border.value) : 'none';
    const match = value.match(/^([\d.]+)px\s+(\S+)\s+(.+)$/);
    if (!match) return { width: 0, style: 'solid', color: null };
    return { width: Number(match[1]), style: match[2] === 'none' ? 'solid' : match[2], color: parseColor(match[3]) };
  }
  function borderCss(width, style, color) {
    return width <= 0 ? 'none' : formatNumber(width) + 'px ' + style + ' ' + color;
  }
  function borderWidthField() {
    const spec = { unit: 'px', units: ['px'], min: 0, max: 64, step: 0.5 };
    const write = width => {
      const parts = borderParts(current);
      const color = parts.color ? formatColor(parts.color) : (current.color ? current.color.value : '#000000');
      setStyle('border', borderCss(width, parts.style, color));
    };
    return sliderField({
      label: 'Width',
      prop: 'border',
      title: 'border width',
      step: 1,
      floor: 0,
      read: styles => {
        const parts = borderParts(styles);
        return { value: parts.width, text: formatNumber(parts.width), range: [0, 16], set: Boolean(styles.border && styles.border.inline), clear: parts.width > 0 };
      },
      write,
      type: text => {
        const result = sanitizeNumber(text, spec);
        if (!result.ok) return result.error;
        write(result.value);
        return '';
      },
      clear: () => setStyle('border', null)
    });
  }

  function alignField() {
    const field = { editing: false };
    const row = el('div', 'field');
    row.setAttribute('data-prop', 'text-align');
    const label = el('span', 'flabel', 'Align');
    label.title = 'text-align';
    const group = el('div', 'aligns');
    group.style.gridColumn = 'span 2';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Text align');
    const buttons = Object.keys(ALIGN_ICONS).map(name => {
      const b = el('button');
      b.type = 'button';
      b.innerHTML = ALIGN_ICONS[name];
      b.title = 'Align ' + name;
      b.setAttribute('aria-label', b.title);
      b.addEventListener('click', () => setStyle('text-align', name));
      group.appendChild(b);
      return { name, b };
    });
    const spacer = el('span');
    row.append(label, group, spacer);
    field.update = styles => {
      const raw = styles['text-align'] ? String(styles['text-align'].value) : 'start';
      const value = raw === 'start' ? 'left' : raw === 'end' ? 'right' : raw;
      row.classList.toggle('set', Boolean(styles['text-align'] && styles['text-align'].inline));
      buttons.forEach(({ name, b }) => b.setAttribute('aria-pressed', String(name === value)));
    };
    field.el = row;
    return field;
  }

  // Free CSS such as box-shadow: shown truncated, typed in full.
  function textField(label, prop) {
    const field = { editing: false };
    const row = el('div', 'field text');
    row.setAttribute('data-prop', prop);
    const flabel = el('span', 'flabel', label);
    flabel.title = prop;
    const num = el('span', 'num');
    const clear = el('button', 'clear', '×');
    clear.type = 'button';
    clear.title = 'Clear ' + prop;
    clear.setAttribute('aria-label', clear.title);
    row.append(flabel, num, clear);
    let text = '';
    field.update = styles => {
      if (field.editing) return;
      const style = styles[prop] || { value: 'none' };
      text = String(style.value);
      num.textContent = shortValue(text);
      num.classList.toggle('mixed', text === 'none');
      row.classList.toggle('set', Boolean(style.inline));
      clear.classList.toggle('on', Boolean(style.resettable && text !== 'none'));
      num.title = text + '\nDouble-click to type a value';
    };
    editableValue(num, field, () => text, typed => {
      const result = sanitizeCssText(typed, 300);
      if (!result.ok) return result.error;
      if (window.CSS && !CSS.supports(prop, result.css)) return 'Not a valid ' + prop + ' value';
      setStyle(prop, result.css);
      return '';
    });
    clear.addEventListener('click', () => setStyle(prop, null));
    field.el = row;
    return field;
  }

  function readOnlyField(label, prop) {
    const row = el('div', 'field text');
    const flabel = el('span', 'flabel', label);
    flabel.title = prop + ' (read-only here; ask the agent to change layout)';
    const value = el('span', 'ro');
    row.append(flabel, value, el('span'));
    return { el: row, update: styles => { value.textContent = styles[prop] ? String(styles[prop].value) : ''; } };
  }

  function colorOf(prop) {
    return styles => (styles[prop] ? parseColor(styles[prop].value) : null);
  }
  function buildGroups(styles) {
    const has = prop => Boolean(styles[prop]);
    const plan = [
      ['Size', [sizeField('Width', 'width'), sizeField('Height', 'height')]],
      ['Fill', [
        has('background-color') && colorField('Background', 'background-color', colorOf('background-color'), css => setStyle('background-color', css), true),
        has('background-image') && textField('Image', 'background-image')
      ]],
      ['Text', [
        has('color') && colorField('Color', 'color', colorOf('color'), css => setStyle('color', css), true),
        has('font-size') && numericField('font-size'),
        has('font-weight') && numericField('font-weight'),
        has('line-height') && numericField('line-height'),
        has('text-align') && alignField()
      ]],
      ['Spacing', [has('padding') && numericField('padding'), has('margin') && numericField('margin'), has('gap') && numericField('gap')]],
      ['Border', [
        has('border') && borderWidthField(),
        has('border') && colorField('Color', 'border', s => borderParts(s).color, css => {
          const parts = borderParts(current);
          setStyle('border', borderCss(parts.width || 1, parts.style, css));
        }, false),
        has('border-radius') && numericField('border-radius')
      ]],
      ['Effects', [has('opacity') && numericField('opacity'), has('box-shadow') && textField('Shadow', 'box-shadow'), has('display') && readOnlyField('Display', 'display')]]
    ];
    const container = $('groups');
    container.innerHTML = '';
    fields = [];
    for (const [title, list] of plan) {
      const items = list.filter(Boolean);
      if (!items.length) continue;
      const group = el('div', 'group');
      group.appendChild(el('div', 'gh', title));
      items.forEach(f => { group.appendChild(f.el); fields.push(f); });
      container.appendChild(group);
    }
    fields.forEach(f => f.update(styles));
  }

  function shortValue(value) {
    return String(value).replace(/rgba?\([^)]*\)/g, m => { const c = parseColor(m); return c ? (c.a < 1 ? formatColor(c) : colorHex(c)) : m; }).replace(/(\d+\.\d{2})\d+/g, '$1');
  }
  function renderInspector() {
    const has = Boolean(selection);
    $('noSel').hidden = has;
    $('selBody').hidden = !has;
    $('deselectBtn').hidden = !has;
    if (!has) { renderedKey = ''; fields = []; current = {}; return; }
    current = styleMap(selection);
    const crumbs = $('crumbs');
    crumbs.innerHTML = '';
    (selection.breadcrumb || []).forEach((crumb, i, arr) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = crumb.label;
      b.title = crumb.selector;
      if (i === arr.length - 1) b.setAttribute('aria-current', 'true');
      b.addEventListener('click', () => postToFrame({ type: 'uc:select', selector: crumb.selector }));
      crumbs.appendChild(b);
      if (i < arr.length - 1) { const sep = document.createElement('span'); sep.className = 'sep'; sep.textContent = '›'; crumbs.appendChild(sep); }
    });
    $('selTag').textContent = '<' + selection.tag + '>' + (selection.id ? '#' + selection.id : '') + (selection.classes && selection.classes.length ? '.' + selection.classes.join('.') : '');
    $('selTag').title = selection.selector;
    $('selSnippet').textContent = selection.snippet || '';
    $('selSnippet').title = selection.snippet || '';
    $('editTextBtn').disabled = ended || !selection.editable;
    $('removeBtn').disabled = ended;
    const key = selection.selector + '|' + Object.keys(current).join(',');
    if (key === renderedKey) { fields.forEach(f => f.update(current)); return; }
    renderedKey = key;
    buildGroups(current);
  }
  $('editTextBtn').addEventListener('click', () => postToFrame({ type: 'uc:edit-text' }));
  $('removeBtn').addEventListener('click', () => postToFrame({ type: 'uc:remove' }));
  $('deselectBtn').addEventListener('click', () => postToFrame({ type: 'uc:deselect' }));
  fieldHint('');

  // --- edit log -----------------------------------------------------------------------
  function summarize(edit) {
    const target = edit.selector + (edit.snippet ? ' “' + edit.snippet.slice(0, 40) + (edit.snippet.length > 40 ? '…' : '') + '”' : '');
    switch (edit.kind) {
      case 'text': return target + ': “' + (edit.before || '').slice(0, 40) + '” → “' + (edit.after || '').slice(0, 60) + '”';
      case 'resize': return target + ' → ' + (edit.width !== undefined ? edit.width + 'w' : '') + (edit.width !== undefined && edit.height !== undefined ? ' × ' : '') + (edit.height !== undefined ? edit.height + 'h' : '') + (edit.before ? ' (was ' + edit.before.width + ' × ' + edit.before.height + ')' : '');
      case 'move': return target + ' → ' + (edit.to && edit.to.parent ? edit.to.parent : 'parent') + ' at ' + (edit.to ? edit.to.index : '?');
      case 'nudge': return target + ' by ' + edit.dx + ', ' + edit.dy + 'px';
      case 'remove': return target;
      case 'style': return target + ' ' + edit.property + (edit.after === null ? ' removed' : ' → ' + edit.after) + (edit.before ? ' (was ' + shortValue(edit.before) + ')' : '');
      default: return target;
    }
  }
  function renderEdits() {
    const list = $('editList');
    list.innerHTML = '';
    $('editCount').textContent = String(edits.length);
    $('undoBtn').disabled = ended || !canUndo;
    $('redoBtn').disabled = ended || !canRedo;
    $('applyBtn').disabled = ended || !edits.some(e => !e.stale);
    $('resetBtn').disabled = ended || !edits.length;
    if (!edits.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'Your changes to the preview collect here. Apply sends them to the agent to bake into the file; Save and Finish hands over the final design.';
      list.appendChild(empty);
      return;
    }
    for (const edit of edits) {
      const row = document.createElement('div');
      row.className = 'edit kind-' + edit.kind + (edit.stale ? ' stale' : '');
      const k = document.createElement('span');
      k.className = 'k';
      k.textContent = edit.kind;
      const s = document.createElement('span');
      s.className = 's';
      s.textContent = summarize(edit);
      row.title = (edit.stale ? 'Could not be re-applied after the last reload.\n' : '') + summarize(edit);
      row.append(k, s);
      list.appendChild(row);
    }
    list.scrollTop = list.scrollHeight;
  }
  $('undoBtn').addEventListener('click', () => postToFrame({ type: 'uc:undo' }));
  $('redoBtn').addEventListener('click', () => postToFrame({ type: 'uc:redo' }));
  function twoStep(btn, label, action) {
    if (confirmTimers.has(btn)) {
      clearTimeout(confirmTimers.get(btn));
      confirmTimers.delete(btn);
      btn.classList.remove('confirm');
      btn.textContent = btn.getAttribute('data-label');
      action();
      return;
    }
    btn.setAttribute('data-label', btn.textContent);
    btn.textContent = label;
    btn.classList.add('confirm');
    confirmTimers.set(btn, setTimeout(() => {
      confirmTimers.delete(btn);
      btn.classList.remove('confirm');
      btn.textContent = btn.getAttribute('data-label');
    }, 3000));
  }
  $('resetBtn').addEventListener('click', () => twoStep($('resetBtn'), 'Revert all?', () => postToFrame({ type: 'uc:reset' })));
  $('pauseBtn').addEventListener('click', () => {
    paused = !paused;
    $('pauseBtn').setAttribute('aria-pressed', String(paused));
    postToFrame({ type: 'uc:pause-animations', paused });
  });

  // --- conversation ---------------------------------------------------------------------
  const typingEl = document.createElement('div');
  typingEl.className = 'typing';
  typingEl.setAttribute('role', 'status');
  const dots = document.createElement('span');
  dots.className = 'dots';
  dots.append(document.createElement('i'), document.createElement('i'), document.createElement('i'));
  const typingLabel = document.createElement('span');
  typingLabel.className = 'label';
  typingEl.append(dots, typingLabel);
  const stalledEl = document.createElement('div');
  stalledEl.className = 'stalled';
  stalledEl.setAttribute('role', 'status');

  function agentName() { return (agent && agent.name) || 'agent'; }
  function renderActivity(state) {
    const typingText = state === 'thinking' ? agentName() + ' is working on it…' : state === 'typing' ? agentName() + ' is typing…' : '';
    typingEl.classList.toggle('show', Boolean(typingText));
    if (typingText) typingLabel.textContent = typingText;
    const stalled = state === 'queued';
    stalledEl.classList.toggle('show', stalled);
    if (stalled) stalledEl.textContent = 'Queued. ' + agentName() + ' is not listening right now and picks this up the moment it checks in.';
    if (typingText || stalled) scrollToEnd();
  }
  function atBottom() { return chatLog.scrollHeight - chatLog.scrollTop - chatLog.clientHeight < 40; }
  function scrollToEnd() { chatLog.scrollTop = chatLog.scrollHeight; }
  function renderChat(entries) {
    const pinned = atBottom();
    chatLog.innerHTML = '';
    if (!entries.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'Select something and describe the change, or just type. Your agent answers here and the preview updates when it edits the file.';
      chatLog.appendChild(empty);
    } else {
      for (const entry of entries) {
        const div = document.createElement('div');
        div.className = 'msg ' + (entry.role === 'agent' ? 'agent' : 'user') + ' kind-' + (entry.kind || 'chat');
        div.textContent = entry.text;
        const meta = document.createElement('span');
        meta.className = 'meta';
        meta.textContent = (entry.role === 'agent' ? agentName() : 'you') + ' · ' + new Date(entry.at).toLocaleTimeString();
        div.appendChild(meta);
        chatLog.appendChild(div);
      }
    }
    chatLog.appendChild(typingEl);
    chatLog.appendChild(stalledEl);
    if (pinned) scrollToEnd();
  }
  renderChat(boot.chat || []);

  function renderAnchor() {
    const show = Boolean(selection) && anchorEnabled;
    $('anchorChip').hidden = !show;
    if (show) $('anchorText').textContent = selection.selector;
    input.placeholder = show ? 'Describe the change to ' + selection.tag + (selection.snippet ? ' “' + selection.snippet.slice(0, 30) + '”' : '') + '…' : 'Ask your agent for a change… Enter to send, Shift+Enter for a new line';
  }
  $('anchorClear').addEventListener('click', () => { anchorEnabled = false; renderAnchor(); });

  async function postFeedback(items, endSession) {
    const res = await fetch('/api/session/' + key + '/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items, endSession: Boolean(endSession) })
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || ('HTTP ' + res.status));
    }
    return res.json().catch(() => ({}));
  }
  function pendingSummaries() {
    return edits.filter(e => !e.stale).slice(-30).map(summarize);
  }
  function describeDelivery(body) {
    return body.presence === 'thinking' || body.presence === 'typing' || body.presence === 'listening'
      ? 'Delivered. ' + agentName() + ' has it.'
      : 'Queued. ' + agentName() + ' picks this up the moment it checks in.';
  }
  async function sendChat() {
    if (ended || sending) return;
    const text = input.value.trim();
    if (!text) { statusEl.textContent = 'Type a message first.'; return; }
    const item = { kind: 'chat', text };
    if (selection && anchorEnabled) item.anchor = { selector: selection.selector, tag: selection.tag, snippet: selection.snippet, size: selection.size };
    const summaries = pendingSummaries();
    if (summaries.length) item.pendingEdits = summaries;
    sending = true;
    sendBtn.disabled = true;
    statusEl.textContent = 'Sending…';
    try {
      const body = await postFeedback([item], false);
      input.value = '';
      statusEl.textContent = describeDelivery(body);
      if (body.presence) applyPresence(body.presence, agent);
    } catch (err) {
      statusEl.textContent = 'Send failed (' + err.message + ').';
    } finally {
      sending = false;
      sendBtn.disabled = ended;
    }
  }
  sendBtn.addEventListener('click', sendChat);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
  });

  async function sendEdits(kind) {
    if (ended || sending) return;
    sending = true;
    sendBtn.disabled = true;
    $('applyBtn').disabled = true;
    $('finishBtn').disabled = true;
    statusEl.textContent = kind === 'finish' ? 'Saving the final design…' : 'Capturing the preview…';
    try {
      const snapshot = await requestExport();
      const item = { kind, edits: snapshot.edits || edits, html: snapshot.html, viewport: { preset: vp.preset, width: actual.width, height: actual.height } };
      const note = input.value.trim();
      if (note) item.text = note;
      const body = await postFeedback([item], kind === 'finish');
      input.value = '';
      if (kind === 'finish') {
        markEnded('finished');
      } else {
        postToFrame({ type: 'uc:forget' });
        edits = [];
        writeStore({ edits: [] });
        renderEdits();
        statusEl.textContent = describeDelivery(body) + ' The preview updates when it writes the file.';
        if (body.presence) applyPresence(body.presence, agent);
      }
    } catch (err) {
      statusEl.textContent = (kind === 'finish' ? 'Save failed (' : 'Apply failed (') + err.message + ').';
    } finally {
      sending = false;
      sendBtn.disabled = ended;
      $('finishBtn').disabled = ended;
      renderEdits();
    }
  }
  $('applyBtn').addEventListener('click', () => sendEdits('edits'));
  $('finishBtn').addEventListener('click', () => sendEdits('finish'));

  // --- session controls --------------------------------------------------------------------
  $('endBtn').addEventListener('click', () => twoStep($('endBtn'), 'End without saving?', async () => {
    try { await fetch('/api/session/' + key + '/end', { method: 'POST' }); } catch (_e) { /* server gone */ }
  }));
  function reloadArtifact() {
    frameReady = false;
    const base = frame.getAttribute('data-artifact-src');
    frame.src = base + '?t=' + Date.now();
  }
  $('reloadBtn').addEventListener('click', reloadArtifact);
  function markEnded(endedBy) {
    ended = true;
    sendBtn.disabled = true;
    input.disabled = true;
    $('finishBtn').disabled = true;
    $('applyBtn').disabled = true;
    renderActivity('ended');
    presence.setAttribute('data-state', 'ended');
    presence.querySelector('.label').textContent = 'session ended';
    const overlay = $('endedOverlay');
    overlay.classList.add('show');
    const finished = endedBy === 'finished';
    $('endedTitle').textContent = finished ? 'Saved and handed to ' + agentName() : 'Session ended';
    $('endedWho').textContent = finished
      ? 'Your edits and the final markup are on their way. The agent wires them into the real component next. You can close this tab.'
      : endedBy === 'agent' ? 'Your agent closed this preview.' : 'You ended this preview. Head back to your agent session.';
    $('endedIcon').hidden = !finished;
    postToFrame({ type: 'uc:set-mode', mode: 'interact' });
    if (finished) setTimeout(() => { try { window.close(); } catch (_e) { /* not script-opened */ } }, 900);
  }
  if (ended) markEnded(boot.endedBy);

  // --- server events ----------------------------------------------------------------------
  function presenceLabel(state) {
    const name = agentName();
    return {
      waiting: name === 'agent' ? 'agent not connected' : name + ' not connected',
      listening: name + ' listening',
      thinking: name + ' is working…',
      typing: name + ' is typing…',
      queued: 'queued for ' + name,
      ended: 'session ended'
    }[state] || state;
  }
  function applyPresence(state, who) {
    if (ended) return;
    if (who && who.name) agent = who;
    presence.setAttribute('data-state', state);
    presence.querySelector('.label').textContent = presenceLabel(state);
    presence.title = agent && agent.project ? agentName() + ' in ' + agent.project : '';
    renderActivity(state);
  }
  function connectEvents() {
    const es = new EventSource('/events/' + key);
    es.addEventListener('chat-sync', e => renderChat(JSON.parse(e.data).chat || []));
    es.addEventListener('presence', e => { const data = JSON.parse(e.data); applyPresence(data.state, data.agent); });
    es.addEventListener('reload', reloadArtifact);
    es.addEventListener('ended', e => { markEnded(JSON.parse(e.data).endedBy); es.close(); });
    es.onerror = () => {
      if (ended) return;
      renderActivity('offline');
      presence.setAttribute('data-state', 'waiting');
      presence.querySelector('.label').textContent = 'canvas server offline';
    };
  }
  connectEvents();

  // --- shell keyboard -------------------------------------------------------------------------
  document.addEventListener('keydown', e => {
    const tag = (e.target && e.target.tagName) || '';
    const typing = tag === 'INPUT' || tag === 'TEXTAREA';
    const meta = e.metaKey || e.ctrlKey;
    if (meta && e.key.toLowerCase() === 'i') { e.preventDefault(); setMode(mode === 'edit' ? 'interact' : 'edit'); return; }
    if (typing) return;
    if (meta && e.key.toLowerCase() === 'z') { e.preventDefault(); postToFrame({ type: e.shiftKey ? 'uc:redo' : 'uc:undo' }); return; }
  });

  renderInspector();
  renderEdits();
  renderAnchor();
})();`;
}

// The shell page: header bar, staged mockup iframe, inspector + edits + chat rail.
function renderUiCanvasHtml(session, { clientPath = '/ui-client.js', cssPath = '/ui-canvas.css' } = {}) {
  const name = path.basename(session.file);
  const title = session.ui && session.ui.title ? session.ui.title : name;
  const bootstrap = JSON.stringify({
    key: session.key,
    file: session.file,
    status: session.status,
    endedBy: session.endedBy || null,
    chat: session.chat,
    agent: session.agent || null,
    ui: session.ui || { viewport: 'desktop', title: '' },
    presets: VIEWPORT_PRESETS
  }).replace(/</g, '\\u003c');
  const artifactSrc = `/artifact/${session.key}/`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · UI Canvas</title>
<link rel="stylesheet" href="${cssPath}">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='22' fill='%2313161e'/><text x='50' y='68' font-size='52' font-weight='700' font-family='monospace' fill='%234acb8a' text-anchor='middle'>E</text></svg>">
</head>
<body>
<script id="uc-session" type="application/json">${bootstrap}</script>
<header class="bar">
  <div class="brand">
    <div class="logo">E</div>
    <span class="name">UI Canvas</span>
    <span class="file" title="${escapeHtml(session.file)}">${escapeHtml(name)}</span>
  </div>
  <div class="divider"></div>
  <div class="seg viewports" role="group" aria-label="Viewport">
    <button type="button" data-vp="desktop" aria-pressed="true" title="Desktop: fills the stage">${ICONS.desktop}</button>
    <button type="button" data-vp="mobile" aria-pressed="false" title="Mobile: ${VIEWPORT_PRESETS.mobile.width} × ${VIEWPORT_PRESETS.mobile.height} CSS px">${ICONS.mobile}</button>
    <button type="button" data-vp="custom" aria-pressed="false" title="Custom: exact width and height">${ICONS.custom}</button>
  </div>
  <div class="dims">
    <input id="vpW" type="text" inputmode="numeric" maxlength="5" autocomplete="off" spellcheck="false" title="Viewport width in CSS px (100 to 20000; arrow keys step)" aria-label="Viewport width"><span class="x">×</span><input id="vpH" type="text" inputmode="numeric" maxlength="5" autocomplete="off" spellcheck="false" title="Viewport height in CSS px (100 to 20000; arrow keys step)" aria-label="Viewport height">
    <button id="rotateBtn" class="icon-btn" type="button" title="Rotate (swap width and height)" aria-label="Rotate viewport">${ICONS.rotate}</button>
    <span id="vpScale" class="scale"></span>
  </div>
  <div class="divider"></div>
  <div class="seg modes" role="group" aria-label="Mode">
    <button type="button" data-mode="edit" aria-pressed="true" title="Edit: select, move, resize, edit text (Cmd/Ctrl+I toggles)">Edit</button>
    <button type="button" data-mode="interact" aria-pressed="false" title="Interact: clicks reach the component (Cmd/Ctrl+I toggles)">Interact</button>
  </div>
  <div class="spacer"></div>
  <div id="presence" class="presence" data-state="waiting"><span class="dot"></span><span class="label">agent not connected</span></div>
  <button id="undoBtn" class="icon-btn square" type="button" title="Undo (Cmd/Ctrl+Z)" aria-label="Undo" disabled>${ICONS.undo}</button>
  <button id="redoBtn" class="icon-btn square" type="button" title="Redo (Cmd/Ctrl+Shift+Z)" aria-label="Redo" disabled>${ICONS.redo}</button>
  <button id="pauseBtn" class="icon-btn square" type="button" aria-pressed="false" title="Pause animations and transitions in the preview" aria-label="Pause animations">${ICONS.pause}${ICONS.play}</button>
  <button id="reloadBtn" class="icon-btn square" type="button" title="Reload the preview (your edits are re-applied)" aria-label="Reload preview">${ICONS.reload}</button>
  <button id="themeBtn" class="icon-btn square" type="button" title="Switch to light theme" aria-label="Switch to light theme">${ICONS.sun}${ICONS.moon}</button>
  <div class="divider"></div>
  <button id="finishBtn" class="primary" type="button" title="Export the edited design to your agent and close the session">${ICONS.check} Save and Finish</button>
  <button id="endBtn" class="icon-btn danger" type="button" title="End the session without saving">End</button>
</header>
<div class="layout">
  <main class="stage" id="stage" data-mode="edit">
    <div class="viewport" id="viewportArea">
      <div class="sizer" id="sizer">
        <div class="device desktop" id="device">
          <iframe id="artifact" title="Component preview" src="${artifactSrc}" data-artifact-src="${artifactSrc}" sandbox="allow-scripts allow-forms allow-popups"></iframe>
        </div>
      </div>
    </div>
    <div class="statusbar">
      <span id="hint" class="hint"></span>
      <span class="readout" id="readout"></span>
      <span><kbd>⌘Z</kbd> undo</span><span><kbd>⌘I</kbd> mode</span><span><kbd>⌫</kbd> remove</span>
    </div>
    <div id="endedOverlay" class="overlay"><div class="card"><div id="endedIcon" class="ok" hidden>${ICONS.check}</div><h3 id="endedTitle">Session ended</h3><p id="endedWho"></p></div></div>
  </main>
  <aside class="panel">
    <section class="inspector">
      <h2>Selection<span class="grow"></span><button id="deselectBtn" class="mini" type="button" title="Clear the selection (Esc)" hidden>Deselect</button></h2>
      <div id="noSel" class="muted">Click anything in the preview to select it. Double-click edits its text, the corner handles resize it, dragging reorders it, and Delete removes it. Tap the background to select the whole component.</div>
      <div id="selBody" hidden>
        <div id="crumbs" class="crumbs"></div>
        <div class="selhead"><span id="selTag" class="tag"></span><span id="selSnippet" class="snippet"></span><button id="editTextBtn" class="mini" type="button" title="Edit this element's text in place (or double-click it)">Edit text</button><button id="removeBtn" class="mini danger" type="button" title="Remove this element (Delete)">Remove</button></div>
        <div id="groups" class="groups" aria-label="Style properties"></div>
        <div id="fieldHint" class="hint" role="status"></div>
      </div>
    </section>
    <section class="edits">
      <h2>Edits <span id="editCount" class="count">0</span><span class="grow"></span><button id="applyBtn" class="mini go" type="button" title="Send the edits so the agent writes them into the preview file now" disabled>Apply to file</button><button id="resetBtn" class="mini danger" type="button" title="Revert every edit in the preview" disabled>Reset</button></h2>
      <div id="editList" class="editlist"></div>
    </section>
    <section class="convo">
      <h2>Conversation</h2>
      <div id="chatLog" class="chat"></div>
      <div class="composer">
        <div id="anchorChip" class="anchor" hidden><span>About</span><code id="anchorText"></code><button id="anchorClear" type="button" title="Send without an anchor">×</button></div>
        <textarea id="chatInput" placeholder="Ask your agent for a change… Enter to send, Shift+Enter for a new line"></textarea>
        <div class="row"><button id="send" class="send" type="button">Send to agent</button></div>
        <div id="sendStatus" class="status"></div>
      </div>
    </section>
  </aside>
</div>
<script src="${clientPath}"></script>
</body>
</html>`;
}

module.exports = { ICONS, renderUiCanvasHtml, uiCanvasCss, uiClientJs };
