// Style Guide Maker — D&Z  |  Figma Plugin
// ─────────────────────────────────────────

figma.showUI(__html__, { width: 400, height: 660, title: 'Style Guide Maker — D&Z' });

// ── FONTS: detect installed fonts + build styles map ──
var _fontStylesMap = {}; // family → [styles]

(async () => {
  try {
    const fonts = await figma.listAvailableFontsAsync();
    // Build map: family → list of available styles
    for (var i = 0; i < fonts.length; i++) {
      var fam = fonts[i].fontName.family;
      var sty = fonts[i].fontName.style;
      if (!_fontStylesMap[fam]) _fontStylesMap[fam] = [];
      _fontStylesMap[fam].push(sty);
    }
    const families = Object.keys(_fontStylesMap).sort();
    figma.ui.postMessage({ type: 'FONTS_LOADED', fonts: families });
  } catch (_) {
    figma.ui.postMessage({ type: 'FONTS_LOADED', fonts: [] });
  }
})();

// ── HELPERS ───────────────────────────────────────

function hexToRGB(hex) {
  // Strip everything except hex chars
  hex = String(hex || '').replace(/[^0-9a-fA-F]/g, '');
  // Expand 3-char shorthand
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  // Pad or truncate to exactly 6 chars
  if (hex.length < 6) hex = (hex + '000000').slice(0, 6);
  if (hex.length > 6) hex = hex.slice(0, 6);
  var r = parseInt(hex.slice(0, 2), 16) / 255;
  var g = parseInt(hex.slice(2, 4), 16) / 255;
  var b = parseInt(hex.slice(4, 6), 16) / 255;
  // Final safety: if still NaN, return black
  return {
    r: isNaN(r) ? 0 : r,
    g: isNaN(g) ? 0 : g,
    b: isNaN(b) ? 0 : b,
  };
}

function fill(hex, a) {
  if (!hex) return [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
  const c = hexToRGB(hex);
  const p = { type: 'SOLID', color: c };
  if (a !== undefined) p.opacity = a;
  return [p];
}

function prog(text, pct, dot) {
  figma.ui.postMessage({ type: 'PROGRESS', text, pct, dot: dot || null });
}

function decodeBase64(b64) {
  try {
    if (typeof figma.base64Decode === 'function') return figma.base64Decode(b64);
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch (_) { return null; }
}

async function loadF(family, style) {
  // 1. Try exact match
  try { await figma.loadFontAsync({ family, style }); return { family, style }; } catch (_) {}

  // 2. If this family has available styles in our map, try style aliases
  var available = _fontStylesMap[family];
  if (available && available.length > 0) {
    // Build candidate list by weight category
    var isBold     = /bold/i.test(style) && !/semi|demi/i.test(style);
    var isSemi     = /semi.*bold|demi/i.test(style) || style === 'SemiBold';
    var isMedium   = /^medium$/i.test(style);
    var isLight    = /^light$/i.test(style);
    var isXLight   = /extra.*light|extralight|thin/i.test(style);
    var isBlack    = /black|heavy/i.test(style);
    var isItalic   = /italic/i.test(style);

    var candidates;
    if (isXLight)     candidates = ['ExtraLight','Thin','35 Thin','Ultra Light','200','100','Light'];
    else if (isLight) candidates = ['Light','45 Light','300','Book Light'];
    else if (isMedium)candidates = ['Medium','65 Medium','500','Book'];
    else if (isSemi)  candidates = ['SemiBold','65 Medium','Demi Bold','DemiBold','600'];
    else if (isBold)  candidates = ['Bold','75 Bold','Heavy','700','ExtraBold','Black'];
    else if (isBlack) candidates = ['Black','95 Black','Heavy','900','ExtraBold'];
    else              candidates = ['Regular','55 Roman','Roman','Book','Normal','400','Rg','Plain','W01 Regular'];

    if (isItalic) {
      var italicCands = candidates.map(function(c){ return c + ' Italic'; })
                                   .concat(candidates.map(function(c){ return c + ' Oblique'; }));
      candidates = italicCands.concat(candidates);
    }

    for (var ci = 0; ci < candidates.length; ci++) {
      if (available.indexOf(candidates[ci]) !== -1) {
        try { await figma.loadFontAsync({ family, style: candidates[ci] }); return { family, style: candidates[ci] }; } catch (_) {}
      }
    }
    // Try any non-italic style as last resort
    for (var ai = 0; ai < available.length; ai++) {
      if (!isItalic && /italic|oblique/i.test(available[ai])) continue;
      try { await figma.loadFontAsync({ family, style: available[ai] }); return { family, style: available[ai] }; } catch (_) {}
    }
  }

  // 3. Fall back to Inter
  var fbStyle = /bold/i.test(style) && !/semi/i.test(style) ? 'Bold'
    : /semi|demi/i.test(style) ? 'SemiBold'
    : /medium/i.test(style) ? 'Medium'
    : /light/i.test(style) ? 'Light'
    : 'Regular';
  try { await figma.loadFontAsync({ family: 'Inter', style: fbStyle }); return { family: 'Inter', style: fbStyle }; } catch (_) {}
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  return { family: 'Inter', style: 'Regular' };
}

function isLight(hex) {
  const c = hexToRGB(hex || '#000000');
  return (c.r * 0.299 + c.g * 0.587 + c.b * 0.114) > 0.65;
}

// ── AUTO-LAYOUT FRAME FACTORY ─────────────────────
// mode: 'VERTICAL' | 'HORIZONTAL' | null
// For VERTICAL: width is fixed, height is auto
// For HORIZONTAL: both dimensions auto unless overridden
function af({ name = 'Frame', w, h, mode, gap = 0, pl = 0, pr, pt = 0, pb, bg, r, clip = false } = {}) {
  const f = figma.createFrame();
  f.name = name;
  f.clipsContent = clip;
  if (mode) {
    f.layoutMode = mode;
    f.primaryAxisSizingMode = 'AUTO';
    f.counterAxisSizingMode = mode === 'VERTICAL' ? 'FIXED' : 'AUTO';
    if (mode === 'VERTICAL' && w) f.resize(w, h || 100);
    if (mode === 'HORIZONTAL' && w) { f.counterAxisSizingMode = 'FIXED'; f.resize(w, h || 100); }
  } else {
    if (w && h) f.resize(w, h);
    else if (w) f.resize(w, 100);
  }
  f.itemSpacing = gap;
  f.paddingLeft = pl;
  f.paddingRight = pr !== undefined ? pr : pl;
  f.paddingTop = pt;
  f.paddingBottom = pb !== undefined ? pb : pt;
  f.fills = bg ? fill(bg) : [];
  if (r !== undefined) f.cornerRadius = r;
  return f;
}

// Create rect (no x/y — positions via auto layout or set manually)
function mkR(w, h, bg, r, strokeHex, strokeW) {
  const n = figma.createRectangle();
  n.resize(w, h);
  n.fills = bg ? fill(bg) : [];
  if (r !== undefined) n.cornerRadius = r;
  if (strokeHex) {
    n.strokes = fill(strokeHex);
    n.strokeWeight = strokeW || 1;
    n.strokeAlign = 'INSIDE';
  }
  return n;
}

// Text node for auto-layout
async function mkT({ text = '', size = 16, family = 'Inter', style = 'Regular', color = '#111111', w, lh, align } = {}) {
  const fn = await loadF(family, style);
  const n = figma.createText();
  n.fontName = fn;
  n.fontSize = size;
  n.fills = fill(color);
  if (lh) n.lineHeight = { value: lh, unit: 'PIXELS' };
  if (align) n.textAlignHorizontal = align;
  if (w) { n.textAutoResize = 'HEIGHT'; n.resize(w, 100); }
  else n.textAutoResize = 'WIDTH_AND_HEIGHT';
  n.characters = String(text);
  return n;
}

// Invisible spacer for breathing room in auto layout
function sp(h, w = 1) {
  const n = figma.createRectangle();
  n.name = '_sp'; n.resize(w, h);
  n.fills = []; n.opacity = 0;
  return n;
}

// ── LOGO (cached) ─────────────────────────────────
let _logoHash = null;
async function logoHash(d) {
  if (_logoHash) return _logoHash;
  if (d.project && d.project.logo) {
    try {
      const bytes = decodeBase64(d.project.logo.replace(/^data:[^;]+;base64,/, ''));
      if (bytes) { _logoHash = figma.createImage(bytes).hash; return _logoHash; }
    } catch (_) {}
  }
  return null;
}

// ── HEADER BAR ────────────────────────────────────
async function mkHeader(parent, title, primary, d, ff) {
  const header = af({ name: 'Header', w: 1920, h: 140, mode: 'HORIZONTAL', pl: 80, pr: 80, bg: primary });
  header.primaryAxisSizingMode = 'FIXED';
  header.counterAxisSizingMode = 'FIXED';
  header.primaryAxisAlignItems = 'SPACE_BETWEEN';
  header.counterAxisAlignItems = 'CENTER';

  const lh = await logoHash(d);
  if (lh) {
    const lr = mkR(180, 68, null);
    lr.name = 'Logo';
    lr.fills = [{ type: 'IMAGE', scaleMode: 'FIT', imageHash: lh }];
    header.appendChild(lr);
  } else {
    header.appendChild(await mkT({ text: (d.project && d.project.name) || 'Style Guide', size: 22, style: 'Bold', color: '#FFFFFF' }));
  }

  header.appendChild(await mkT({ text: title, size: 42, style: 'Bold', color: '#FFFFFF', align: 'RIGHT' }));
  parent.appendChild(header);
}

// Section divider line
function divider(w = 1760) { return mkR(w, 1, '#EEEEEE'); }

// ── CREATE FIGMA STYLES ───────────────────────────
async function createFigmaStyles(d, ff) {
  // Read line heights (px absolute; ≤5 = old ratio format, backward compat)
  var _lhHr = (d.typography && d.typography.lineHeightHead) || 64;
  var _lhBr = (d.typography && d.typography.lineHeightBody) || 32;
  var lhHb = _lhHr <= 5 ? Math.round(52 * _lhHr) : _lhHr;
  var lhBb = _lhBr <= 5 ? Math.round(20 * _lhBr) : _lhBr;
  const lh = function(size, baseSize, baseLH) { return Math.max(Math.round(baseLH * size / baseSize), size + 2); };

  // Read font sizes from JSON (with defaults)
  var _fs = (d.typography && d.typography.fontSizes) || {};
  var szH1  = _fs.h1      || 52;
  var szH2  = _fs.h2      || 44;
  var szH3  = _fs.h3      || 36;
  var szH4  = _fs.h4      || 28;
  var szH5  = _fs.h5      || 22;
  var szH6  = _fs.h6      || 20;
  var szBL  = _fs.bodyL   || 20;
  var szBM  = _fs.bodyM   || 18;
  var szBS  = _fs.bodyS   || 16;
  var szBtn = _fs.button  || 16;
  var szLbl = _fs.label   || 16;
  var szCap = _fs.caption || 12;

  // ── Text styles under "Textos/"
  const textSpecs = [
    { name: 'Textos/H1',      size: szH1,  style: 'Bold',     lh: lhHb },
    { name: 'Textos/H2',      size: szH2,  style: 'Bold',     lh: lh(szH2,  szH1, lhHb) },
    { name: 'Textos/H3',      size: szH3,  style: 'Regular',  lh: lh(szH3,  szH1, lhHb) },
    { name: 'Textos/H4',      size: szH4,  style: 'Bold',     lh: lh(szH4,  szH1, lhHb) },
    { name: 'Textos/H5',      size: szH5,  style: 'Bold',     lh: lh(szH5,  szH1, lhHb) },
    { name: 'Textos/H6',      size: szH6,  style: 'Regular',  lh: lh(szH6,  szH1, lhHb) },
    { name: 'Textos/Body L',  size: szBL,  style: 'Regular',  lh: lhBb },
    { name: 'Textos/Body M',  size: szBM,  style: 'Regular',  lh: lh(szBM,  szBL, lhBb) },
    { name: 'Textos/Body S',  size: szBS,  style: 'Regular',  lh: lh(szBS,  szBL, lhBb) },
    { name: 'Textos/Button',  size: szBtn, style: 'SemiBold', lh: lh(szBtn, szBL, lhBb) },
    { name: 'Textos/Label',   size: szLbl, style: 'Medium',   lh: lh(szLbl, szBL, lhBb) },
    { name: 'Textos/Caption', size: szCap, style: 'Regular',  lh: lh(szCap, szBL, lhBb) },
  ];
  for (const s of textSpecs) {
    try {
      const fn = await loadF(ff, s.style);
      const ts = figma.createTextStyle();
      ts.name = s.name; ts.fontName = fn; ts.fontSize = s.size;
      if (s.lh) ts.lineHeight = { value: s.lh, unit: 'PIXELS' };
    } catch (_) {}
  }

  // ── Color styles under "Cores/{ColorName}/"
  const shadeNames = ['Light', 'Light Hover', 'Light Active', 'Normal', 'Normal Hover', 'Normal Active', 'Dark', 'Dark Hover', 'Dark Active', 'Darker'];
  for (const c of (d.colors || [])) {
    try {
      const ps = figma.createPaintStyle();
      ps.name = `Cores/${c.name}/Base`;
      ps.paints = fill(c.hex);
    } catch (_) {}
    if (c.shades) {
      const vals = Object.values(c.shades);
      for (let i = 0; i < Math.min(vals.length, shadeNames.length); i++) {
        try {
          const ps = figma.createPaintStyle();
          ps.name = `Cores/${c.name}/${shadeNames[i]}`;
          ps.paints = fill(vals[i]);
        } catch (_) {}
      }
    }
  }
}

// ── FRAME 1 — PROJECT INTRODUCTION ───────────────
async function buildIntro(d, primary) {
  const f = figma.createFrame();
  f.name = 'Project Introduction';
  f.resize(1920, 1080);
  f.clipsContent = true;

  // Background
  let hasBg = false;
  if (d.project && d.project.background) {
    try {
      const bytes = decodeBase64(d.project.background.replace(/^data:[^;]+;base64,/, ''));
      if (bytes) {
        const bg = mkR(1920, 1080, null);
        bg.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: figma.createImage(bytes).hash }];
        f.appendChild(bg); hasBg = true;
      }
    } catch (_) {}
  }
  if (!hasBg) { const bg = mkR(1920, 1080, primary); f.appendChild(bg); }

  // Overlay
  const ov = mkR(1920, 1080, '#000000'); ov.opacity = 0.45; f.appendChild(ov);

  // Logo top-left
  const lh = await logoHash(d);
  if (lh) {
    const lr = mkR(300, 88, null); lr.x = 80; lr.y = 44;
    lr.fills = [{ type: 'IMAGE', scaleMode: 'FIT', imageHash: lh }];
    f.appendChild(lr);
  } else {
    const lt = await mkT({ text: (d.project && d.project.name) || 'Logo', size: 26, style: 'Bold', color: '#FFFFFF' });
    lt.x = 80; lt.y = 56; f.appendChild(lt);
  }

  // Project name + tagline
  const nameT = await mkT({ text: (d.project && d.project.name) || 'Project Name', size: 96, style: 'Bold', color: '#FFFFFF', w: 1400, lh: 104 });
  nameT.x = 80; nameT.y = 620; f.appendChild(nameT);
  if (d.project && d.project.tagline) {
    const tagT = await mkT({ text: d.project.tagline, size: 36, color: 'rgba(255,255,255,0.85)', w: 1100, lh: 52 });
    tagT.x = 80; tagT.y = 840; f.appendChild(tagT);
  }
  return f;
}

// ── FRAME 2 — FONT WEIGHT ─────────────────────────
async function buildFontWeight(d, primary, ff) {
  const f = af({ name: 'Font Weight', w: 1920, mode: 'VERTICAL', bg: '#FFFFFF' });
  await mkHeader(f, 'Font Weight', primary, d, ff);

  const content = af({ name: 'Content', w: 1920, mode: 'VERTICAL', gap: 48, pl: 80, pr: 80, pt: 64, pb: 80 });
  content.fills = [];

  // Font family name large
  const fn = await loadF(ff, 'Bold');
  const bigName = figma.createText();
  bigName.fontName = fn; bigName.fontSize = 80;
  bigName.fills = fill('#111111');
  bigName.textAutoResize = 'WIDTH_AND_HEIGHT';
  bigName.characters = ff;
  content.appendChild(bigName);

  content.appendChild(await mkT({ text: 'Família tipográfica', size: 16, color: '#999999' }));
  content.appendChild(sp(8, 1760));

  // Weight grid — 3 columns × 3 rows
  const weights = [
    { label: 'Thin',       style: 'Thin',       num: '100' },
    { label: 'ExtraLight', style: 'ExtraLight',  num: '200' },
    { label: 'Light',      style: 'Light',       num: '300' },
    { label: 'Regular',    style: 'Regular',     num: '400' },
    { label: 'Medium',     style: 'Medium',      num: '500' },
    { label: 'SemiBold',   style: 'SemiBold',    num: '600' },
    { label: 'Bold',       style: 'Bold',        num: '700' },
    { label: 'ExtraBold',  style: 'ExtraBold',   num: '800' },
    { label: 'Black',      style: 'Black',       num: '900' },
  ];

  for (let r = 0; r < 3; r++) {
    const row = af({ name: `Row ${r + 1}`, mode: 'HORIZONTAL', gap: 24 });
    row.fills = [];

    for (let c = 0; c < 3; c++) {
      const w = weights[r * 3 + c];
      const card = af({ name: w.label, w: 565, mode: 'VERTICAL', gap: 12, pl: 28, pr: 28, pt: 24, pb: 24, bg: '#F8F9FA', r: 12 });
      card.clipsContent = false;

      // Top row: label + weight number
      const topRow = af({ name: 'LabelRow', mode: 'HORIZONTAL', gap: 0 });
      topRow.fills = []; topRow.primaryAxisAlignItems = 'SPACE_BETWEEN'; topRow.counterAxisAlignItems = 'CENTER';
      topRow.counterAxisSizingMode = 'AUTO';
      topRow.appendChild(await mkT({ text: w.label, size: 14, style: 'Medium', color: '#666666' }));
      topRow.appendChild(await mkT({ text: w.num, size: 14, color: '#BBBBBB' }));
      card.appendChild(topRow);

      // "Aa" display
      const aFont = await loadF(ff, w.style);
      const aa = figma.createText();
      aa.fontName = aFont; aa.fontSize = 64;
      aa.fills = fill('#111111');
      aa.textAutoResize = 'WIDTH_AND_HEIGHT';
      aa.characters = 'Aa';
      card.appendChild(aa);

      // Alphabet sample
      const alphaNode = figma.createText();
      alphaNode.fontName = aFont; alphaNode.fontSize = 13;
      alphaNode.fills = fill('#777777');
      alphaNode.textAutoResize = 'HEIGHT'; alphaNode.resize(509, 40);
      alphaNode.characters = 'Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp';
      card.appendChild(alphaNode);

      row.appendChild(card);
    }
    content.appendChild(row);
  }

  f.appendChild(content);
  return f;
}

// ── FRAME 3 — FONT SIZES ──────────────────────────
async function buildFontSizes(d, primary, ff) {
  const f = af({ name: 'Font Sizes', w: 1920, mode: 'VERTICAL', bg: '#FFFFFF' });
  await mkHeader(f, 'Font Sizes', primary, d, ff);

  const content = af({ name: 'Content', w: 1920, mode: 'VERTICAL', gap: 0, pl: 80, pr: 80, pt: 64, pb: 80 });
  content.fills = [];

  // Read line heights from JSON
  // Values > 5 = absolute px (new format); values ≤ 5 = ratio (old format, backward compat)
  var _lhHraw = (d.typography && d.typography.lineHeightHead) || 64;
  var _lhBraw = (d.typography && d.typography.lineHeightBody) || 32;
  var lhHeadBase = _lhHraw <= 5 ? Math.round(52 * _lhHraw) : _lhHraw;
  var lhBodyBase = _lhBraw <= 5 ? Math.round(20 * _lhBraw) : _lhBraw;
  // Proportional: scale LH to each font size
  const lh = function(size, baseSize, baseLH) { return Math.max(Math.round(baseLH * size / baseSize), size + 2); };

  // Read font sizes from JSON (with defaults)
  var _fsz = (d.typography && d.typography.fontSizes) || {};
  var szH1  = _fsz.h1      || 52;
  var szH2  = _fsz.h2      || 44;
  var szH3  = _fsz.h3      || 36;
  var szH4  = _fsz.h4      || 28;
  var szH5  = _fsz.h5      || 22;
  var szH6  = _fsz.h6      || 20;
  var szBL  = _fsz.bodyL   || 20;
  var szBM  = _fsz.bodyM   || 18;
  var szBS  = _fsz.bodyS   || 16;
  var szBtn = _fsz.button  || 16;
  var szLbl = _fsz.label   || 16;
  var szCap = _fsz.caption || 12;

  const lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer tristique orci est.';

  async function addSection(title, specs) {
    content.appendChild(await mkT({ text: title, size: 30, style: 'Bold', w: 1760 }));
    content.appendChild(sp(20, 1760));
    for (var si = 0; si < specs.length; si++) {
      var h = specs[si];
      const fn = await loadF(ff, h.style);

      const row = af({ name: h.label + ' Row', mode: 'HORIZONTAL', gap: 0 });
      row.fills = []; row.primaryAxisAlignItems = 'SPACE_BETWEEN'; row.counterAxisAlignItems = 'CENTER';

      const t = figma.createText();
      t.fontName = fn; t.fontSize = h.size;
      t.lineHeight = { value: h.lh, unit: 'PIXELS' };
      t.fills = fill('#111111');
      t.textAutoResize = 'HEIGHT'; t.resize(1380, 100);
      t.characters = h.label + ' — ' + lorem.slice(0, h.size > 30 ? 30 : 55);
      row.appendChild(t);

      row.appendChild(await mkT({ text: h.size + 'px · ' + h.style + ' · LH ' + h.lh + 'px', size: 13, color: '#AAAAAA', align: 'RIGHT' }));
      content.appendChild(row);
      content.appendChild(divider(1760));
      content.appendChild(sp(20, 1760));
    }
    content.appendChild(sp(32, 1760));
  }

  await addSection('Headers', [
    { label: 'H1', size: szH1, style: 'Bold',    lh: lhHeadBase },
    { label: 'H2', size: szH2, style: 'Bold',    lh: lh(szH2, szH1, lhHeadBase) },
    { label: 'H3', size: szH3, style: 'Regular', lh: lh(szH3, szH1, lhHeadBase) },
    { label: 'H4', size: szH4, style: 'Bold',    lh: lh(szH4, szH1, lhHeadBase) },
    { label: 'H5', size: szH5, style: 'Bold',    lh: lh(szH5, szH1, lhHeadBase) },
    { label: 'H6', size: szH6, style: 'Regular', lh: lh(szH6, szH1, lhHeadBase) },
  ]);
  await addSection('Body', [
    { label: 'Body L', size: szBL, style: 'Regular', lh: lhBodyBase },
    { label: 'Body M', size: szBM, style: 'Regular', lh: lh(szBM, szBL, lhBodyBase) },
    { label: 'Body S', size: szBS, style: 'Regular', lh: lh(szBS, szBL, lhBodyBase) },
  ]);
  await addSection('Buttons & Labels', [
    { label: 'Button',  size: szBtn, style: 'SemiBold', lh: lh(szBtn, szBL, lhBodyBase) },
    { label: 'Label',   size: szLbl, style: 'Medium',   lh: lh(szLbl, szBL, lhBodyBase) },
    { label: 'Caption', size: szCap, style: 'Regular',  lh: lh(szCap, szBL, lhBodyBase) },
  ]);

  f.appendChild(content);
  return f;
}

// ── FRAME 4 — STYLES ──────────────────────────────
async function buildStyles(d, primary, ff) {
  const f = af({ name: 'Styles', w: 1920, mode: 'VERTICAL', bg: '#FFFFFF' });
  await mkHeader(f, 'Styles', primary, d, ff);

  const content = af({ name: 'Content', w: 1920, mode: 'VERTICAL', gap: 56, pl: 80, pr: 80, pt: 64, pb: 80 });
  content.fills = [];

  const br = (d.styles && d.styles.borderRadius) || { S: 20, M: 32, L: 54 };
  const st = (d.styles && d.styles.stroke)       || { S: 0.5, M: 1, L: 2 };
  const ds = (d.styles && d.styles.dropShadow)   || { blur: 16, y: 4, x: 0, color: '#000000', opacity: 0.16 };

  // ── Border Radius
  content.appendChild(await mkT({ text: 'Border Radius', size: 30, style: 'Bold', w: 1760 }));
  const brRow = af({ name: 'BR Row', mode: 'HORIZONTAL', gap: 32 }); brRow.fills = [];
  for (const [key, val] of [['S', br.S], ['M', br.M], ['L', br.L]]) {
    const card = af({ name: `BR ${key}`, mode: 'VERTICAL', gap: 16, pl: 0, pt: 0, bg: null });
    card.fills = [];
    card.appendChild(mkR(200, 200, '#F0F2F4', Number(val) || 0, '#E2E8F0', 1));
    card.appendChild(await mkT({ text: `Radius ${key}  ·  ${val}px`, size: 16, color: '#444444' }));
    brRow.appendChild(card);
  }
  content.appendChild(brRow);

  // ── Stroke
  content.appendChild(divider(1760));
  content.appendChild(await mkT({ text: 'Stroke', size: 30, style: 'Bold', w: 1760 }));
  const stRow = af({ name: 'Stroke Row', mode: 'HORIZONTAL', gap: 32 }); stRow.fills = [];
  for (const [key, val] of [['S', st.S], ['M', st.M], ['L', st.L]]) {
    const card = af({ name: `St ${key}`, mode: 'VERTICAL', gap: 16, pt: 0, bg: null });
    card.fills = [];
    card.appendChild(mkR(200, 200, null, 12, '#111111', Number(val) || 1));
    card.appendChild(await mkT({ text: `Stroke ${key}  ·  ${val}px`, size: 16, color: '#444444' }));
    stRow.appendChild(card);
  }
  content.appendChild(stRow);

  // ── Drop Shadow
  content.appendChild(divider(1760));
  content.appendChild(await mkT({ text: 'Drop Shadow', size: 30, style: 'Bold', w: 1760 }));
  const dsRow = af({ name: 'DS Row', mode: 'HORIZONTAL', gap: 48 }); dsRow.fills = [];
  const shadowBox = mkR(200, 200, '#FFFFFF', 16);
  const sc = hexToRGB(ds.color || '#000000');
  shadowBox.effects = [{ type: 'DROP_SHADOW', color: { r: sc.r, g: sc.g, b: sc.b, a: ds.opacity || 0.16 }, offset: { x: ds.x || 0, y: ds.y || 4 }, radius: ds.blur || 16, visible: true, blendMode: 'NORMAL', showShadowBehindNode: false }];
  const dsInfo = af({ name: 'DS Info', mode: 'VERTICAL', gap: 8, pt: 0, bg: null }); dsInfo.fills = [];
  dsInfo.appendChild(shadowBox);
  dsInfo.appendChild(await mkT({ text: `Drop Shadow\nBlur: ${ds.blur}px   Y: ${ds.y}px   X: ${ds.x}px\nOpacity: ${Math.round((ds.opacity || 0.16) * 100)}%`, size: 16, color: '#444444', lh: 26 }));
  dsRow.appendChild(dsInfo);
  content.appendChild(dsRow);

  f.appendChild(content);
  return f;
}

// ── FRAME 5 — SPACING ─────────────────────────────
async function buildSpacing(d, primary, ff) {
  const f = af({ name: 'Spacing', w: 1920, mode: 'VERTICAL', bg: '#FFFFFF' });
  await mkHeader(f, 'Spacing', primary, d, ff);

  const content = af({ name: 'Content', w: 1920, mode: 'VERTICAL', gap: 56, pl: 80, pr: 80, pt: 64, pb: 80 });
  content.fills = [];

  content.appendChild(await mkT({ text: 'Spacing', size: 30, style: 'Bold', w: 1760 }));
  content.appendChild(sp(8, 1760));

  const spacings = [4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 56, 64, 72, 80, 96, 112, 120, 128, 140];
  const half = Math.ceil(spacings.length / 2); // split into 2 columns

  // 2-column grid
  const grid = af({ name: 'Spacing Grid', mode: 'HORIZONTAL', gap: 120 });
  grid.fills = [];

  for (var col = 0; col < 2; col++) {
    const column = af({ name: 'Column ' + (col + 1), mode: 'VERTICAL', gap: 0 });
    column.fills = [];

    var start = col * half;
    var end = Math.min(start + half, spacings.length);

    for (var si = start; si < end; si++) {
      var s = spacings[si];
      var num = si < 9 ? '0' + (si + 1) : String(si + 1);
      var boxSize = Math.min(Math.round(s * 0.65), 100);
      if (boxSize < 4) boxSize = 4;

      const row = af({ name: 'Spacing ' + num, mode: 'HORIZONTAL', gap: 0, pt: 14, pb: 14 });
      row.fills = []; row.counterAxisAlignItems = 'CENTER';
      row.primaryAxisAlignItems = 'SPACE_BETWEEN';

      const label = await mkT({ text: 'Spacing ' + num + ': ' + s + 'px', size: 15, color: '#333333', w: 260 });
      row.appendChild(label);

      const box = mkR(boxSize, boxSize, '#CCCCCC', 2);
      row.appendChild(box);

      column.appendChild(row);
      column.appendChild(mkR(600, 1, '#F0F0F0')); // separator
    }
    grid.appendChild(column);
  }
  content.appendChild(grid);

  // Spacing Design Notes
  content.appendChild(divider(1760));

  const notesSection = af({ name: 'Notes', mode: 'VERTICAL', gap: 12, pt: 0 });
  notesSection.fills = [];
  notesSection.appendChild(await mkT({ text: 'Spacing Design Notes', size: 22, style: 'Bold', w: 1760 }));
  notesSection.appendChild(sp(4, 1760));

  var notes = [
    'Recommended Gutter: 20px',
    'Recommended Padding at the Top and Bottom of Each Section: 120px',
    'Recommended Padding at the Top and Bottom for Smaller Sections: 96px',
    '**For spacing between elements we can use the graph above. Very important to only use even numbers. NO ODD NUMBERS.',
  ];
  for (var ni = 0; ni < notes.length; ni++) {
    notesSection.appendChild(await mkT({ text: notes[ni], size: 15, color: '#555555', w: 1760, lh: 24 }));
  }
  content.appendChild(notesSection);

  f.appendChild(content);
  return f;
}

// ── FRAME 6 — COLORS ──────────────────────────────
async function buildColors(d, primary, ff) {
  const f = af({ name: 'Colors', w: 1920, mode: 'VERTICAL', bg: '#FFFFFF' });
  await mkHeader(f, 'Colors', primary, d, ff);

  const content = af({ name: 'Content', w: 1920, mode: 'VERTICAL', gap: 0, pl: 80, pr: 80, pt: 64, pb: 80 });
  content.fills = [];

  const colors = (d.colors || []).slice(0, 8);
  const shadeLabels = ['Light', 'Light :hover', 'Light :active', 'Normal', 'Normal :hover', 'Normal :active', 'Dark', 'Dark :hover', 'Dark :active', 'Darker'];

  // ── Baseline circles
  content.appendChild(await mkT({ text: 'Baseline Colors', size: 30, style: 'Bold', w: 1760 }));
  content.appendChild(sp(24, 1760));

  const circleRow = af({ name: 'Circles', mode: 'HORIZONTAL', gap: 28 });
  circleRow.fills = []; circleRow.counterAxisSizingMode = 'AUTO';
  for (const c of colors) {
    const col = af({ name: c.name, w: 140, mode: 'VERTICAL', gap: 10, pt: 0 });
    col.fills = []; col.counterAxisSizingMode = 'FIXED';

    const ell = figma.createEllipse();
    ell.resize(120, 120);
    ell.fills = fill(c.hex);
    if ((c.hex || '').replace('#', '').toUpperCase() === 'FFFFFF') {
      ell.strokes = fill('#DDDDDD'); ell.strokeWeight = 1;
    }
    col.appendChild(ell);
    col.appendChild(await mkT({ text: c.name || '', size: 14, style: 'SemiBold', w: 140 }));
    col.appendChild(await mkT({ text: (c.hex || '').toUpperCase(), size: 13, color: '#777777', w: 140 }));
    circleRow.appendChild(col);
  }
  content.appendChild(circleRow);
  content.appendChild(sp(56, 1760));

  // ── Color palettes — 4 per row
  content.appendChild(await mkT({ text: 'Color Palette', size: 30, style: 'Bold', w: 1760 }));
  content.appendChild(sp(24, 1760));

  const cols = 4;
  for (let ri = 0; ri < Math.ceil(colors.length / cols); ri++) {
    const palRow = af({ name: `Palette Row ${ri + 1}`, mode: 'HORIZONTAL', gap: 24 });
    palRow.fills = [];

    for (let ci = 0; ci < cols; ci++) {
      const idx = ri * cols + ci;
      if (idx >= colors.length) break;
      const c = colors[idx];
      const shades = c.shades ? Object.values(c.shades) : [];

      const card = af({ name: c.name, w: 404, mode: 'VERTICAL', gap: 0, bg: '#F8F9FA', r: 12, clip: true });
      card.primaryAxisSizingMode = 'AUTO';

      // Color header
      const cHdr = af({ name: 'Color Header', w: 404, h: 84, mode: 'HORIZONTAL', pl: 18, pr: 18, bg: c.hex });
      cHdr.primaryAxisSizingMode = 'FIXED'; cHdr.counterAxisSizingMode = 'FIXED';
      cHdr.primaryAxisAlignItems = 'SPACE_BETWEEN'; cHdr.counterAxisAlignItems = 'CENTER';
      const tc = isLight(c.hex) ? '#111111' : '#FFFFFF';
      cHdr.appendChild(await mkT({ text: c.name || '', size: 18, style: 'Bold', color: tc }));
      cHdr.appendChild(await mkT({ text: (c.hex || '').toUpperCase(), size: 13, color: tc, align: 'RIGHT' }));
      card.appendChild(cHdr);

      // Shades
      const shCont = af({ name: 'Shades', w: 404, mode: 'VERTICAL', gap: 0, pl: 16, pr: 16, pt: 12, pb: 12, bg: '#FFFFFF' });
      for (let si = 0; si < Math.min(shades.length, 10); si++) {
        const sRow = af({ name: `Shade ${si}`, mode: 'HORIZONTAL', gap: 0, pt: 6, pb: 6 });
        sRow.fills = []; sRow.primaryAxisAlignItems = 'SPACE_BETWEEN'; sRow.counterAxisAlignItems = 'CENTER';

        const swatch = mkR(28, 28, shades[si], 6);
        sRow.appendChild(swatch);
        sRow.appendChild(await mkT({ text: shadeLabels[si] || '', size: 12, color: '#555555' }));
        sRow.appendChild(await mkT({ text: (shades[si] || '').toUpperCase(), size: 12, color: '#AAAAAA', align: 'RIGHT' }));
        shCont.appendChild(sRow);
      }
      card.appendChild(shCont);
      palRow.appendChild(card);
    }
    content.appendChild(palRow);
    content.appendChild(sp(24, 1760));
  }

  f.appendChild(content);
  return f;
}

// ── FRAME 7 — BUTTONS ─────────────────────────────
async function buildButtons(d, primary, ff) {
  const f = af({ name: 'Buttons', w: 1920, mode: 'VERTICAL', bg: '#FFFFFF' });
  await mkHeader(f, 'Buttons', primary, d, ff);

  const content = af({ name: 'Content', w: 1920, mode: 'VERTICAL', gap: 0, pl: 80, pr: 80, pt: 64, pb: 80 });
  content.fills = [];

  const brM = (d.styles && d.styles.borderRadius && d.styles.borderRadius.M) || 12;

  const sections = [
    { label: 'Primary',   info: 'Ação principal do sistema' },
    { label: 'Secondary', info: 'Ação secundária / alternativa' },
    { label: 'Link',      info: 'Ação de texto / link inline' },
  ];

  for (const sec of sections) {
    content.appendChild(await mkT({ text: sec.label, size: 30, style: 'Bold', w: 1760 }));
    content.appendChild(await mkT({ text: sec.info, size: 15, color: '#888888', w: 1760 }));
    content.appendChild(sp(16, 1760));

    const row = af({ name: `${sec.label} Variants`, mode: 'HORIZONTAL', gap: 40 });
    row.fills = [];

    // Light BG card
    const light = af({ name: 'Light BG', w: 560, mode: 'VERTICAL', gap: 16, pl: 32, pr: 32, pt: 28, pb: 28, bg: '#FFFFFF', r: 14 });
    light.strokes = fill('#E2E8F0'); light.strokeWeight = 1;
    light.appendChild(await mkT({ text: 'Light Background', size: 11, style: 'Medium', color: '#AAAAAA' }));

    // Dark BG card
    const dark = af({ name: 'Dark BG', w: 560, mode: 'VERTICAL', gap: 16, pl: 32, pr: 32, pt: 28, pb: 28, bg: '#1E293B', r: 14 });
    dark.appendChild(await mkT({ text: 'Dark Background', size: 11, style: 'Medium', color: 'rgba(255,255,255,0.4)' }));

    if (sec.label === 'Primary') {
      const btn1 = af({ name: 'Filled', mode: 'HORIZONTAL', pl: 24, pr: 24, pt: 13, pb: 13, bg: primary, r: brM });
      btn1.counterAxisSizingMode = 'AUTO'; btn1.primaryAxisAlignItems = 'CENTER'; btn1.counterAxisAlignItems = 'CENTER';
      btn1.appendChild(await mkT({ text: 'Primary Button', size: 16, family: ff, style: 'SemiBold', color: '#FFFFFF' }));

      const btn2 = af({ name: 'Outline', mode: 'HORIZONTAL', pl: 24, pr: 24, pt: 13, pb: 13, r: brM });
      btn2.counterAxisSizingMode = 'AUTO'; btn2.primaryAxisAlignItems = 'CENTER'; btn2.counterAxisAlignItems = 'CENTER';
      btn2.strokes = fill(primary); btn2.strokeWeight = 1.5;
      btn2.appendChild(await mkT({ text: 'Primary Button', size: 16, family: ff, style: 'SemiBold', color: primary }));

      light.appendChild(btn1); light.appendChild(btn2);

      const btn3 = af({ name: 'Filled Dark', mode: 'HORIZONTAL', pl: 24, pr: 24, pt: 13, pb: 13, bg: primary, r: brM });
      btn3.counterAxisSizingMode = 'AUTO'; btn3.primaryAxisAlignItems = 'CENTER'; btn3.counterAxisAlignItems = 'CENTER';
      btn3.appendChild(await mkT({ text: 'Primary Button', size: 16, family: ff, style: 'SemiBold', color: '#FFFFFF' }));

      const btn4 = af({ name: 'Outline Dark', mode: 'HORIZONTAL', pl: 24, pr: 24, pt: 13, pb: 13, r: brM });
      btn4.counterAxisSizingMode = 'AUTO'; btn4.primaryAxisAlignItems = 'CENTER'; btn4.counterAxisAlignItems = 'CENTER';
      btn4.strokes = fill('#FFFFFF'); btn4.strokeWeight = 1.5;
      btn4.appendChild(await mkT({ text: 'Primary Button', size: 16, family: ff, style: 'SemiBold', color: '#FFFFFF' }));

      dark.appendChild(btn3); dark.appendChild(btn4);

    } else if (sec.label === 'Secondary') {
      const btn1 = af({ name: 'Outline', mode: 'HORIZONTAL', pl: 24, pr: 24, pt: 13, pb: 13, r: brM });
      btn1.counterAxisSizingMode = 'AUTO'; btn1.primaryAxisAlignItems = 'CENTER'; btn1.counterAxisAlignItems = 'CENTER';
      btn1.strokes = fill(primary); btn1.strokeWeight = 1.5;
      btn1.appendChild(await mkT({ text: 'Secondary Button', size: 16, family: ff, style: 'SemiBold', color: primary }));

      const btn2 = af({ name: 'Ghost', mode: 'HORIZONTAL', pl: 24, pr: 24, pt: 13, pb: 13, bg: '#FFFFFF', r: brM });
      btn2.counterAxisSizingMode = 'AUTO'; btn2.primaryAxisAlignItems = 'CENTER'; btn2.counterAxisAlignItems = 'CENTER';
      btn2.opacity = 0.15;
      btn2.appendChild(await mkT({ text: 'Secondary Button', size: 16, family: ff, style: 'SemiBold', color: '#111111' }));

      light.appendChild(btn1); light.appendChild(btn2);

      const btn3 = af({ name: 'Outline Dark', mode: 'HORIZONTAL', pl: 24, pr: 24, pt: 13, pb: 13, r: brM });
      btn3.counterAxisSizingMode = 'AUTO'; btn3.primaryAxisAlignItems = 'CENTER'; btn3.counterAxisAlignItems = 'CENTER';
      btn3.strokes = fill('#FFFFFF'); btn3.strokeWeight = 1.5;
      btn3.appendChild(await mkT({ text: 'Secondary Button', size: 16, family: ff, style: 'SemiBold', color: '#FFFFFF' }));

      dark.appendChild(btn3);

    } else { // Link
      light.appendChild(await mkT({ text: 'Ver mais →', size: 16, family: ff, style: 'SemiBold', color: '#111111' }));
      light.appendChild(await mkT({ text: 'Ver mais →', size: 16, family: ff, style: 'SemiBold', color: primary }));
      dark.appendChild(await mkT({ text: 'Ver mais →', size: 16, family: ff, style: 'SemiBold', color: '#FFFFFF' }));
      dark.appendChild(await mkT({ text: 'Ver mais →', size: 16, family: ff, style: 'SemiBold', color: primary }));
    }

    row.appendChild(light); row.appendChild(dark);
    content.appendChild(row);
    content.appendChild(divider(1760));
    content.appendChild(sp(48, 1760));
  }

  f.appendChild(content);
  return f;
}

// ── FRAME 8 — IMAGES ──────────────────────────────
async function buildImages(d, primary, ff) {
  const f = af({ name: 'Images', w: 1920, mode: 'VERTICAL', bg: '#FFFFFF' });
  await mkHeader(f, 'Images', primary, d, ff);

  const content = af({ name: 'Content', w: 1920, mode: 'VERTICAL', gap: 0, pl: 80, pr: 80, pt: 64, pb: 80 });
  content.fills = [];

  const images = d.images || [];
  if (images.length === 0) {
    content.appendChild(await mkT({ text: 'Nenhuma imagem adicionada.', size: 22, color: '#CCCCCC', w: 1760 }));
    f.appendChild(content); return f;
  }

  content.appendChild(await mkT({ text: 'Imagens do Projeto', size: 30, style: 'Bold', w: 1760 }));
  content.appendChild(sp(24, 1760));

  const imgW = 558, imgH = 400, cols = 3;
  for (let r = 0; r < Math.ceil(images.length / cols); r++) {
    const rowF = af({ name: `Row ${r + 1}`, mode: 'HORIZONTAL', gap: 24 });
    rowF.fills = [];

    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (i >= images.length) break;
      const imgData = images[i];
      let placed = false;

      if (typeof imgData === 'string' && imgData.includes('base64,')) {
        try {
          const bytes = decodeBase64(imgData.replace(/^data:[^;]+;base64,/, ''));
          if (bytes) {
            const rect = mkR(imgW, imgH, null, 10);
            rect.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: figma.createImage(bytes).hash }];
            rowF.appendChild(rect); placed = true;
          }
        } catch (_) {}
      }
      if (!placed) {
        const ph = af({ name: `Img ${i + 1}`, w: imgW, h: imgH, mode: 'VERTICAL', bg: '#F0F0F0', r: 10 });
        ph.primaryAxisSizingMode = 'FIXED'; ph.counterAxisSizingMode = 'FIXED';
        ph.primaryAxisAlignItems = 'CENTER'; ph.counterAxisAlignItems = 'CENTER';
        ph.appendChild(await mkT({ text: `Imagem ${i + 1}`, size: 16, color: '#AAAAAA' }));
        rowF.appendChild(ph);
      }
    }
    content.appendChild(rowF);
    content.appendChild(sp(24, 1760));
  }

  f.appendChild(content);
  return f;
}

// ── FRAME 9 — COMPONENTS ──────────────────────────
async function buildComponents(d, primary, ff) {
  const f = af({ name: 'Components', w: 1920, mode: 'VERTICAL', bg: '#FFFFFF' });
  await mkHeader(f, 'Components', primary, d, ff);

  const content = af({ name: 'Content', w: 1920, mode: 'VERTICAL', gap: 24, pl: 80, pr: 80, pt: 64, pb: 80 });
  content.fills = [];

  content.appendChild(await mkT({ text: 'Components', size: 30, style: 'Bold', w: 1760 }));
  content.appendChild(await mkT({ text: 'Adicione os componentes do projeto diretamente neste frame no Figma.', size: 20, color: '#BBBBBB', w: 1760 }));

  f.appendChild(content);
  return f;
}

// ── MAIN ──────────────────────────────────────────
figma.ui.onmessage = async (message) => {
  if (message.type !== 'CREATE') return;

  _logoHash = null; // reset logo cache for each run

  const d = message.data;
  const ff = message.fontOverride || (d.typography && (d.typography.font || d.typography.primaryFont)) || 'Inter';
  const primary = (d.colors && d.colors[0] && d.colors[0].hex) || '#2078BA';

  figma.notify('⏳ Criando Style Guide…');

  try {
    let page;
    try {
      page = figma.createPage();
      page.name = 'Style Guide — ' + ((d.project && d.project.name) || 'D&Z');
      figma.currentPage = page;
    } catch (_) { page = figma.currentPage; }

    prog('Criando estilos Figma…', 3, null);
    await createFigmaStyles(d, ff);

    let x = 0, count = 0;
    const add = (frame) => { frame.x = x; frame.y = 0; page.appendChild(frame); x += frame.width + 120; count++; };

    prog('Project Introduction…', 8, 'intro'); add(await buildIntro(d, primary));
    prog('Font Weight…',          20, 'fw');   add(await buildFontWeight(d, primary, ff));
    prog('Font Sizes…',           32, 'fs');   add(await buildFontSizes(d, primary, ff));
    prog('Styles…',               44, 'st');   add(await buildStyles(d, primary, ff));
    prog('Spacing…',              55, 'sp');   add(await buildSpacing(d, primary, ff));
    prog('Colors…',               66, 'co');   add(await buildColors(d, primary, ff));
    prog('Buttons…',              77, 'bt');   add(await buildButtons(d, primary, ff));
    prog('Images…',               88, 'im');   add(await buildImages(d, primary, ff));
    prog('Components…',           96, 'cm');   add(await buildComponents(d, primary, ff));

    figma.viewport.scrollAndZoomIntoView(page.children);
    figma.ui.postMessage({ type: 'DONE', count });
    figma.notify('✅ ' + count + ' frames + estilos criados!');

  } catch (err) {
    const errMsg = (err && err.message) ? err.message : String(err);
    figma.ui.postMessage({ type: 'ERROR', text: errMsg });
    figma.notify('❌ Erro: ' + errMsg, { error: true, timeout: 8000 });
    console.error(err);
  }
};
