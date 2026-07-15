const paths = {
  dashboard:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  today:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4m8-4v4M3 10h18"/>',
  cycle:'<path d="M20 11a8 8 0 1 0-2.34 5.66"/><path d="M20 4v7h-7"/>',
  history:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5m4-1v5l3 2"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l-2.83 2.83A1.7 1.7 0 0 0 15 19.4 1.7 1.7 0 0 0 13.6 21h-3.2A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.91.31l-2.8-2.8A1.7 1.7 0 0 0 4.6 15 1.7 1.7 0 0 0 3 13.6v-3.2A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.31-1.91l2.8-2.8A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10.4 3h3.2A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.91-.31l2.8 2.8A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.6 1.4v3.2A1.7 1.7 0 0 0 19.4 15Z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  sunrise:'<path d="M4 18h16M6 14a6 6 0 0 1 12 0M12 3v3M4.2 7.2l2.1 2.1m13.5-2.1-2.1 2.1"/>',
  temple:'<path d="m4 10 8-6 8 6M5 10h14v10H5Zm4 0v10m6-10v10M3 20h18"/>',
  coffee:'<path d="M5 8h12v6a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5Zm12 2h1a3 3 0 0 1 0 6h-2M8 3v2m4-2v2"/>',
  orange:'<circle cx="12" cy="13" r="7"/><path d="M12 6c0-2 1.5-3.5 4-4m-4 4c-2-2-4-2-6-1"/>',
  physio:'<path d="M12 3v18M8 5c3 2 5 2 8 0M8 10c3 2 5 2 8 0M8 15c3 2 5 2 8 0M8 20c3-2 5-2 8 0"/>',
  leaf:'<path d="M20 4C11 4 5 8 5 15c0 3 2 5 5 5 7 0 10-7 10-16Z"/><path d="M5 20c3-5 7-8 12-11"/>',
  drop:'<path d="M12 3S5 11 5 16a7 7 0 0 0 14 0c0-5-7-13-7-13Z"/><path d="M9 17c.5 1.2 1.5 2 3 2"/>',
  dumbbell:'<path d="M6 7v10M3 9v6m15-8v10m3-8v6M6 12h12"/>',
  bowl:'<path d="M4 11h16a8 8 0 0 1-16 0Zm4-4c0-2 2-2 2-4m4 4c0-2 2-2 2-4"/>',
  utensils:'<path d="M7 3v8m-3-8v5a3 3 0 0 0 6 0V3M7 11v10m9-18v18m0-18c3 2 4 6 0 9"/>',
  nutrition:'<path d="M12 21c5-3 8-7 8-12-4-1-7 0-8 3-1-3-4-4-8-3 0 5 3 9 8 12Z"/><path d="M12 12v6"/>',
  activity:'<path d="M3 12h4l2-6 4 12 2-6h6"/>',
  book:'<path d="M4 5a3 3 0 0 1 3-2h5v17H7a3 3 0 0 0-3 2Zm16 0a3 3 0 0 0-3-2h-5v17h5a3 3 0 0 1 3 2Z"/>',
  spark:'<path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5Zm6 11 .8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8Z"/>',
  footsteps:'<path d="M8 5c1.7 0 3 2 3 4.5S9.7 14 8 14s-3-2-3-4.5S6.3 5 8 5Zm8 5c1.7 0 3 2 3 4.5S17.7 19 16 19s-3-2-3-4.5S14.3 10 16 10Z"/>',
  shield:'<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-5"/>',
  scale:'<path d="M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z"/><path d="M9 9a3 3 0 0 1 6 0l-3 2Z"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  note:'<path d="M4 4h16v16H4Z"/><path d="M8 9h8m-8 4h8m-8 4h5"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  chevron:'<path d="m9 18 6-6-6-6"/>',
  arrowLeft:'<path d="m15 18-6-6 6-6"/>',
  arrowRight:'<path d="m9 18 6-6-6-6"/>',
  arrowUp:'<path d="m6 15 6-6 6 6"/>',
  arrowDown:'<path d="m6 9 6 6 6-6"/>',
  eyeOff:'<path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.5 10.5 0 0 1 21 12a11.7 11.7 0 0 1-3 4.2M6.2 6.2A11.8 11.8 0 0 0 3 12s3.5 6 9 6a8 8 0 0 0 2.2-.3"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M5 21h14"/>',
  upload:'<path d="M12 21V9m-5 5 5-5 5 5M5 3h14"/>',
  archive:'<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M5 3h14v3M9 11h6"/>',
  edit:'<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  alert:'<path d="M12 3 2 21h20Zm0 6v5m0 3h.01"/>',
  trend:'<path d="m3 17 6-6 4 4 8-9"/><path d="M15 6h6v6"/>'
};

export function icon(name, className="") {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.check}</svg>`;
}

export const ICON_NAMES = Object.keys(paths).filter(name=>!["dashboard","today","cycle","history","settings","chevron","arrowLeft","arrowRight","arrowUp","arrowDown"].includes(name));
