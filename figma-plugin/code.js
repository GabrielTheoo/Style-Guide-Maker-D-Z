// Style Guide Maker — D&Z  |  Figma Plugin
// ─────────────────────────────────────────

figma.showUI(__html__, { width: 380, height: 560, title: 'Style Guide Maker — D&Z' });

// ── HELPERS ──────────────────────────────────────

function hexToRGB(hex) {
  hex = (hex || '#000000').replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  return {
    r: parseInt(hex.slice(0, 2), 16) / 255,
    g: parseInt(hex.slice(2, 4), 16) / 255,
    b: parseInt(hex.slice(4, 6), 16) / 255,
  };
}

function fill(hex, opacity) {
  const c = hexToRGB(hex);
  const p = { type: 'SOLID', color: c };
  if (opacity !== undefined) p.opacity = opacity;
  return [p];
}

function prog(text, pct, dot) {
  figma.ui.postMessage({ type: 'PROGRESS', text, pct, dot: dot || null });
}

// Decode base64 image — tries figma.base64Decode first, falls back to manual
function decodeBase64(b64) {
  try {
    // Native Figma API (preferred)
    if (typeof figma.base64Decode === 'function') {
      return figma.base64Decode(b64);
    }
    // Manual fallback
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch (_) {
    return null;
  }
}

// Load a font; always fall back to Inter if unavailable
async function loadF(family, style) {
  try {
    await figma.loadFontAsync({ family, style });
    return { family, style };
  } catch (_) {
    const fallbackStyle = /bold/i.test(style) ? 'Bold'
      : /semi/i.test(style) ? 'SemiBold'
      : /medium/i.test(style) ? 'Medium'
      : 'Regular';
    try {
      await figma.loadFontAsync({ family: 'Inter', style: fallbackStyle });
      return { family: 'Inter', style: fallbackStyle };
    } catch (_) {
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      return { family: 'Inter', style: 'Regular' };
    }
  }
}

// Create a text node (always loads font first)
async function mkText({ text, x, y, size = 16, family = 'Inter', style = 'Regular', color = '#000000', w, lh }) {
  const fontName = await loadF(family, style);
  const node = figma.createText();
  node.fontName = fontName;
  node.fontSize = size;
  node.fills = fill(color);
  if (lh) node.lineHeight = { value: lh, unit: 'PIXELS' };
  node.characters = String(text || '');
  node.x = x; node.y = y;
  if (w) { node.textAutoResize = 'HEIGHT'; node.resize(w, 40); }
  return node;
}

// Create a rectangle
function mkRect(x, y, w, h, hexFill, radius, strokeHex, strokeW) {
  const node = figma.createRectangle();
  node.x = x; node.y = y; node.resize(w, h);
  node.fills = hexFill ? fill(hexFill) : [];
  if (radius) node.cornerRadius = radius;
  if (strokeHex) {
    node.strokes = fill(strokeHex);
    node.strokeWeight = strokeW || 1;
    node.strokeAlign = 'INSIDE';
  }
  return node;
}

// Add a full-width header bar (blue, with "Style Guide" + frame title)
async function mkHeader(frame, title, primary) {
  frame.appendChild(mkRect(0, 0, 1920, 140, primary));
  frame.appendChild(await mkText({ text: 'Style Guide', x: 80, y: 48, size: 32, style: 'Bold', color: '#FFFFFF' }));
  const t = await mkText({ text: title, x: 0, y: 44, size: 44, style: 'Bold', color: '#FFFFFF', w: 1920 });
  t.textAlignHorizontal = 'RIGHT';
  t.x = 0; t.resize(1840, 52);
  frame.appendChild(t);
}

function sep(frame, y) { frame.appendChild(mkRect(80, y, 1760, 1, '#eeeeee')); }

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
      const b64 = d.project.background.replace(/^data:[^;]+;base64,/, '');
      const bytes = decodeBase64(b64);
      if (bytes) {
        const img = figma.createImage(bytes);
        const bg = mkRect(0, 0, 1920, 1080, null);
        bg.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: img.hash }];
        f.appendChild(bg); hasBg = true;
      }
    } catch (_) {}
  }
  if (!hasBg) { f.appendChild(mkRect(0, 0, 1920, 1080, primary)); }

  // Dark overlay
  const ov = mkRect(0, 0, 1920, 1080, '#000000');
  ov.opacity = 0.45; f.appendChild(ov);

  // Logo
  if (d.project && d.project.logo) {
    try {
      const b64 = d.project.logo.replace(/^data:[^;]+;base64,/, '');
      const bytes = decodeBase64(b64);
      if (bytes) {
        const img = figma.createImage(bytes);
        const lr = mkRect(80, 40, 300, 80, null);
        lr.fills = [{ type: 'IMAGE', scaleMode: 'FIT', imageHash: img.hash }];
        f.appendChild(lr);
      }
    } catch (_) {
      f.appendChild(await mkText({ text: d.project.name || 'Logo', x: 80, y: 52, size: 28, style: 'Bold', color: '#FFFFFF' }));
    }
  }

  const projName = (d.project && d.project.name) || 'Project Name';
  const tagline  = (d.project && d.project.tagline) || '';
  f.appendChild(await mkText({ text: projName, x: 80, y: 660, size: 96, style: 'Bold', color: '#FFFFFF', w: 1400 }));
  if (tagline) f.appendChild(await mkText({ text: tagline, x: 80, y: 800, size: 36, color: '#FFFFFF', w: 1000, lh: 52 }));

  return f;
}

// ── FRAME 2 — FONT WEIGHT ─────────────────────────
async function buildFontWeight(d, primary) {
  // Support both 'font' and 'primaryFont' keys
  const fontFamily = (d.typography && (d.typography.font || d.typography.primaryFont)) || 'Inter';

  const f = figma.createFrame();
  f.name = 'Font Weight';
  f.resize(1920, 1323);
  f.fills = fill('#FFFFFF');
  f.clipsContent = true;
  await mkHeader(f, 'Font Weight', primary);

  f.appendChild(await mkText({ text: 'Font Weight', x: 80, y: 190, size: 40, style: 'Bold' }));
  f.appendChild(await mkText({ text: fontFamily, x: 80, y: 248, size: 20, color: '#59595B' }));

  const weights = [
    ['Thin',       'Thin',      '100'],
    ['Extra Light','ExtraLight','200'],
    ['Light',      'Light',     '300'],
    ['Regular',    'Regular',   '400'],
    ['Medium',     'Medium',    '500'],
    ['Semi Bold',  'SemiBold',  '600'],
    ['Bold',       'Bold',      '700'],
    ['Extra Bold', 'ExtraBold', '800'],
    ['Black',      'Black',     '900'],
  ];

  let y = 320;
  for (const [label, style, weight] of weights) {
    const fontName = await loadF(fontFamily, style);
    const t = figma.createText();
    t.fontName = fontName;
    t.fontSize = 44;
    t.fills = fill('#000000');
    t.characters = `${label} — Aa Bb Cc 0123`;
    t.x = 80; t.y = y;
    f.appendChild(t);
    f.appendChild(await mkText({ text: weight, x: 1800, y: y + 14, size: 16, color: '#aaaaaa' }));
    sep(f, y + 56);
    y += 94;
  }
  return f;
}

// ── FRAME 3 — FONT SIZES ─────────────────────────
async function buildFontSizes(d, primary) {
  const fontFamily = (d.typography && (d.typography.font || d.typography.primaryFont)) || 'Inter';
  const f = figma.createFrame();
  f.name = 'Font Sizes';
  f.resize(1920, 4644);
  f.fills = fill('#FFFFFF');
  f.clipsContent = true;
  await mkHeader(f, 'Font Sizes', primary);

  const lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer tristique orci est.';
  const hSpecs = [
    { label: 'H1', size: 52, style: 'Bold',    lh: 68 },
    { label: 'H2', size: 44, style: 'Bold',    lh: 56 },
    { label: 'H3', size: 36, style: 'Regular', lh: 44 },
    { label: 'H4', size: 28, style: 'Bold',    lh: 36 },
    { label: 'H5', size: 22, style: 'Bold',    lh: 28 },
    { label: 'H6', size: 20, style: 'Regular', lh: 24 },
  ];
  const bSpecs = [
    { label: 'Body L', size: 20, style: 'Regular', lh: 32 },
    { label: 'Body M', size: 18, style: 'Regular', lh: 28 },
    { label: 'Body S', size: 16, style: 'Regular', lh: 24 },
  ];
  const btnSpecs = [
    { label: 'Button', size: 16, style: 'SemiBold', lh: 20 },
    { label: 'Label',  size: 16, style: 'Medium',   lh: 24 },
  ];

  let y = 190;
  f.appendChild(await mkText({ text: 'Headers', x: 80, y, size: 40, style: 'Bold' })); y += 72;
  for (const h of hSpecs) {
    const fn = await loadF(fontFamily, h.style);
    const t = figma.createText();
    t.fontName = fn; t.fontSize = h.size;
    t.lineHeight = { value: h.lh, unit: 'PIXELS' };
    t.fills = fill('#000000');
    t.characters = `${h.label} — ${lorem.slice(0, 38)}`;
    t.x = 80; t.y = y; f.appendChild(t);
    f.appendChild(await mkText({ text: `${h.size}px · ${h.style}`, x: 1700, y: y + 4, size: 14, color: '#999999' }));
    sep(f, y + h.lh + 14); y += h.lh + 56;
  }

  y += 40;
  f.appendChild(await mkText({ text: 'Body', x: 80, y, size: 40, style: 'Bold' })); y += 72;
  for (const b of bSpecs) {
    const fn = await loadF(fontFamily, b.style);
    const t = figma.createText();
    t.fontName = fn; t.fontSize = b.size;
    t.lineHeight = { value: b.lh, unit: 'PIXELS' };
    t.textAutoResize = 'HEIGHT'; t.resize(1400, 200);
    t.fills = fill('#000000');
    t.characters = `${b.label} — ${lorem}`;
    t.x = 80; t.y = y; f.appendChild(t);
    f.appendChild(await mkText({ text: `${b.size}px · ${b.style}`, x: 1700, y: y + 4, size: 14, color: '#999999' }));
    y += b.lh * 3 + 64;
  }

  y += 40;
  f.appendChild(await mkText({ text: 'Text for Buttons and Links', x: 80, y, size: 40, style: 'Bold' })); y += 72;
  for (const b of btnSpecs) {
    const fn = await loadF(fontFamily, b.style);
    const t = figma.createText();
    t.fontName = fn; t.fontSize = b.size;
    t.lineHeight = { value: b.lh, unit: 'PIXELS' };
    t.fills = fill('#000000'); t.characters = b.label;
    t.x = 80; t.y = y; f.appendChild(t); y += 72;
  }
  return f;
}

// ── FRAME 4 — STYLES ─────────────────────────────
async function buildStyles(d, primary) {
  const f = figma.createFrame();
  f.name = 'Styles';
  f.resize(1920, 1996);
  f.fills = fill('#FFFFFF');
  f.clipsContent = true;
  await mkHeader(f, 'Styles', primary);

  const br = (d.styles && d.styles.borderRadius) || { S: 20, M: 32, L: 54 };
  const st = (d.styles && d.styles.stroke)       || { S: 0.5, M: 1, L: 2 };
  const ds = (d.styles && d.styles.dropShadow)   || { blur: 16, y: 4, x: 0, color: '#000000', opacity: 0.16 };

  // Border Radius
  f.appendChild(await mkText({ text: 'Border Radius', x: 80, y: 200, size: 36, style: 'Bold' }));
  for (const [i, [key, val]] of [['S', br.S], ['M', br.M], ['L', br.L]].entries()) {
    const x = 80 + i * 300;
    f.appendChild(mkRect(x, 284, 200, 200, '#f5f6f7', val, '#000000', 1));
    f.appendChild(await mkText({ text: `Border Radius ${key}\n${val}px`, x, y: 502, size: 18 }));
  }

  // Stroke
  f.appendChild(await mkText({ text: 'Stroke', x: 80, y: 620, size: 36, style: 'Bold' }));
  for (const [i, [key, val]] of [['S', st.S], ['M', st.M], ['L', st.L]].entries()) {
    const x = 80 + i * 300;
    f.appendChild(mkRect(x, 704, 200, 200, null, 12, '#000000', val));
    f.appendChild(await mkText({ text: `Stroke ${key}\n${val}px`, x, y: 922, size: 18 }));
  }

  // Drop Shadow
  f.appendChild(await mkText({ text: 'Drop Shadow', x: 80, y: 1040, size: 36, style: 'Bold' }));
  const shadowBox = mkRect(80, 1120, 200, 200, '#FFFFFF', 16);
  const sc = hexToRGB(ds.color || '#000000');
  shadowBox.effects = [{
    type: 'DROP_SHADOW',
    color: { r: sc.r, g: sc.g, b: sc.b, a: ds.opacity || 0.16 },
    offset: { x: ds.x || 0, y: ds.y || 4 },
    radius: ds.blur || 16,
    visible: true, blendMode: 'NORMAL', showShadowBehindNode: false,
  }];
  f.appendChild(shadowBox);
  f.appendChild(await mkText({
    text: `Drop Shadow M\nBlur: ${ds.blur}px  ·  Y: ${ds.y}px\nColor: ${ds.color}  ·  Opacity: ${Math.round((ds.opacity || 0.16) * 100)}%`,
    x: 320, y: 1148, size: 18,
  }));

  return f;
}

// ── FRAME 5 — SPACING ────────────────────────────
async function buildSpacing(d, primary) {
  const f = figma.createFrame();
  f.name = 'Spacing';
  f.resize(1920, 1853);
  f.fills = fill('#FFFFFF');
  f.clipsContent = true;
  await mkHeader(f, 'Spacing', primary);

  const spacings = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 120, 160, 200, 240];
  let y = 200;
  for (const s of spacings) {
    f.appendChild(await mkText({ text: `${s}`, x: 80, y: y + 8, size: 14, color: '#999999' }));
    const bar = mkRect(148, y, s * 4, 32, primary, 4);
    bar.opacity = 0.75;
    f.appendChild(bar);
    f.appendChild(await mkText({ text: `${s}px`, x: 164 + s * 4, y: y + 8, size: 14, color: '#666666' }));
    y += 72;
  }
  return f;
}

// ── FRAME 6 — COLORS ─────────────────────────────
async function buildColors(d, primary) {
  const f = figma.createFrame();
  f.name = 'Colors';
  f.resize(1920, 2191);
  f.fills = fill('#FFFFFF');
  f.clipsContent = true;
  await mkHeader(f, 'Colors', primary);

  const colors = d.colors || [];
  const shadeLabels = [
    'Light', 'Light :hover', 'Light :active',
    'Normal', 'Normal :hover', 'Normal :active',
    'Dark', 'Dark :hover', 'Dark :active', 'Darker',
  ];

  // Baseline circles
  f.appendChild(await mkText({ text: 'Baseline Colors', x: 80, y: 190, size: 36, style: 'Bold' }));
  for (const [i, c] of colors.slice(0, 7).entries()) {
    const cx = 80 + i * 240;
    const ell = figma.createEllipse();
    ell.resize(131, 131); ell.x = cx; ell.y = 262;
    ell.fills = fill(c.hex);
    if ((c.hex || '').replace('#', '').toUpperCase() === 'FFFFFF') {
      ell.strokes = fill('#dddddd'); ell.strokeWeight = 1;
    }
    f.appendChild(ell);
    f.appendChild(await mkText({ text: c.name || '', x: cx, y: 410, size: 16, style: 'Bold' }));
    f.appendChild(await mkText({ text: (c.hex || '').toUpperCase(), x: cx, y: 434, size: 14, color: '#59595B' }));
  }

  // Shade palettes
  f.appendChild(await mkText({ text: 'Color Palette', x: 80, y: 510, size: 36, style: 'Bold' }));
  for (const [ci, c] of colors.slice(0, 7).entries()) {
    const shades = c.shades ? Object.values(c.shades) : [];
    const colsPerRow = 4;
    const px = 80 + (ci % colsPerRow) * 450;
    const py = 590 + Math.floor(ci / colsPerRow) * 720;
    f.appendChild(await mkText({ text: c.name || '', x: px, y: py, size: 20, style: 'Bold' }));
    for (const [si, hex] of shades.slice(0, 10).entries()) {
      const sy = py + 44 + si * 56;
      f.appendChild(mkRect(px, sy, 280, 48, hex, 4));
      f.appendChild(await mkText({ text: shadeLabels[si] || '', x: px + 294, y: sy + 15, size: 13, color: '#59595B' }));
    }
  }
  return f;
}

// ── FRAME 7 — BUTTONS ────────────────────────────
async function buildButtons(d, primary) {
  const f = figma.createFrame();
  f.name = 'Buttons';
  f.resize(1920, 1626);
  f.fills = fill('#FFFFFF');
  f.clipsContent = true;
  await mkHeader(f, 'Buttons', primary);

  const fontFamily = (d.typography && (d.typography.font || d.typography.primaryFont)) || 'Inter';
  const br = (d.styles && d.styles.borderRadius && d.styles.borderRadius.M) || 12;

  for (const [si, sec] of [['Primary', 200], ['Secondary', 560], ['Link', 900]].entries()) {
    const [label, baseY] = sec;
    f.appendChild(await mkText({ text: label, x: 80, y: baseY, size: 40, style: 'Bold' }));
    f.appendChild(await mkText({ text: 'For Light Backgrounds', x: 360, y: baseY + 56, size: 16, color: '#666666' }));
    f.appendChild(await mkText({ text: 'For Dark Backgrounds',  x: 900, y: baseY + 56, size: 16, color: '#666666' }));
    f.appendChild(mkRect(880, baseY + 88, 600, 200, '#383838', 8));

    if (label === 'Primary') {
      f.appendChild(mkRect(360, baseY + 112, 240, 48, primary, br));
      f.appendChild(await mkText({ text: 'This is a Button', x: 378, y: baseY + 126, size: 16, family: fontFamily, style: 'SemiBold', color: '#FFFFFF' }));
      f.appendChild(mkRect(360, baseY + 188, 240, 48, '#FFFFFF', br, primary, 1.5));
      f.appendChild(await mkText({ text: 'This is a Button', x: 378, y: baseY + 202, size: 16, family: fontFamily, style: 'SemiBold', color: primary }));
      f.appendChild(mkRect(900, baseY + 112, 240, 48, primary, br));
      f.appendChild(await mkText({ text: 'This is a Button', x: 918, y: baseY + 126, size: 16, family: fontFamily, style: 'SemiBold', color: '#FFFFFF' }));
      f.appendChild(mkRect(900, baseY + 188, 240, 48, '#FFFFFF', br, primary, 1.5));
      f.appendChild(await mkText({ text: 'This is a Button', x: 918, y: baseY + 202, size: 16, family: fontFamily, style: 'SemiBold', color: primary }));
    }
    if (label === 'Secondary') {
      f.appendChild(mkRect(360, baseY + 112, 240, 48, '#FFFFFF', br, primary, 1.5));
      f.appendChild(await mkText({ text: 'This is a Button', x: 378, y: baseY + 126, size: 16, family: fontFamily, style: 'SemiBold', color: primary }));
      f.appendChild(mkRect(360, baseY + 188, 240, 48, primary, br));
      f.appendChild(await mkText({ text: 'This is a Button', x: 378, y: baseY + 202, size: 16, family: fontFamily, style: 'SemiBold', color: '#FFFFFF' }));
      f.appendChild(mkRect(900, baseY + 112, 240, 48, '#FFFFFF', br, primary, 1.5));
      f.appendChild(await mkText({ text: 'This is a Button', x: 918, y: baseY + 126, size: 16, family: fontFamily, style: 'SemiBold', color: primary }));
    }
    if (label === 'Link') {
      f.appendChild(await mkText({ text: 'See More →', x: 360, y: baseY + 126, size: 16, family: fontFamily, style: 'SemiBold', color: '#000000' }));
      f.appendChild(await mkText({ text: 'See More →', x: 360, y: baseY + 178, size: 16, family: fontFamily, style: 'SemiBold', color: primary }));
      f.appendChild(await mkText({ text: 'See More →', x: 900, y: baseY + 126, size: 16, family: fontFamily, style: 'SemiBold', color: '#FFFFFF' }));
    }
  }
  return f;
}

// ── FRAME 8 — IMAGES ─────────────────────────────
async function buildImages(d, primary) {
  const images = d.images || [];
  const rows = Math.max(Math.ceil(images.length / 3), 2);
  const frameH = Math.max(220 + rows * 490, 3703);

  const f = figma.createFrame();
  f.name = 'Images';
  f.resize(1920, frameH);
  f.fills = fill('#FFFFFF');
  f.clipsContent = true;
  await mkHeader(f, 'Images', primary);

  if (images.length === 0) {
    f.appendChild(await mkText({ text: 'Nenhuma imagem adicionada.', x: 80, y: 220, size: 24, color: '#cccccc' }));
    return f;
  }

  const imgW = 560, imgH = 420, gap = 40, sx = 80, sy = 220;
  for (const [i, imgData] of images.entries()) {
    const col = i % 3, row = Math.floor(i / 3);
    const x = sx + col * (imgW + gap), y = sy + row * (imgH + gap);

    let placed = false;
    if (typeof imgData === 'string' && imgData.includes('base64,')) {
      try {
        const b64 = imgData.replace(/^data:[^;]+;base64,/, '');
        const bytes = decodeBase64(b64);
        if (bytes) {
          const img = figma.createImage(bytes);
          const r = mkRect(x, y, imgW, imgH, null, 8);
          r.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: img.hash }];
          f.appendChild(r);
          placed = true;
        }
      } catch (_) {}
    }
    if (!placed) {
      f.appendChild(mkRect(x, y, imgW, imgH, '#f0f0f0', 8, '#dddddd', 1));
      f.appendChild(await mkText({ text: `Imagem ${i + 1}`, x: x + imgW / 2 - 40, y: y + imgH / 2 - 10, size: 18, color: '#aaaaaa' }));
    }
  }
  return f;
}

// ── FRAME 9 — COMPONENTS ─────────────────────────
async function buildComponents(d, primary) {
  const f = figma.createFrame();
  f.name = 'Components';
  f.resize(1920, 2059);
  f.fills = fill('#FFFFFF');
  f.clipsContent = true;
  await mkHeader(f, 'Components', primary);
  f.appendChild(await mkText({ text: 'Components — a ser preenchido no Figma', x: 80, y: 260, size: 28, color: '#cccccc' }));
  return f;
}

// ── MAIN MESSAGE HANDLER ─────────────────────────
figma.ui.onmessage = async (message) => {
  if (message.type !== 'CREATE') return;

  const d = message.data;
  const primary = (d.colors && d.colors[0] && d.colors[0].hex) || '#2078BA';

  figma.notify('⏳ Iniciando Style Guide…');

  try {
    // Create a new page (fallback to current page if not possible)
    let page;
    try {
      page = figma.createPage();
      page.name = 'Style Guide — ' + ((d.project && d.project.name) || 'D&Z');
      figma.currentPage = page;
    } catch (_) {
      page = figma.currentPage;
    }

    let x = 0, count = 0;
    const add = (frame) => {
      frame.x = x; frame.y = 0;
      page.appendChild(frame);
      x += frame.width + 120;
      count++;
    };

    prog('Project Introduction…', 6, 'intro');
    add(await buildIntro(d, primary));

    prog('Font Weight…', 17, 'fw');
    add(await buildFontWeight(d, primary));

    prog('Font Sizes…', 28, 'fs');
    add(await buildFontSizes(d, primary));

    prog('Styles…', 40, 'st');
    add(await buildStyles(d, primary));

    prog('Spacing…', 52, 'sp');
    add(await buildSpacing(d, primary));

    prog('Colors…', 63, 'co');
    add(await buildColors(d, primary));

    prog('Buttons…', 75, 'bt');
    add(await buildButtons(d, primary));

    prog('Images…', 87, 'im');
    add(await buildImages(d, primary));

    prog('Components…', 96, 'cm');
    add(await buildComponents(d, primary));

    figma.viewport.scrollAndZoomIntoView(page.children);
    figma.ui.postMessage({ type: 'DONE', count });
    figma.notify('✅ ' + count + ' frames criados!');

  } catch (err) {
    const errMsg = (err && err.message) ? err.message : String(err);
    figma.ui.postMessage({ type: 'ERROR', text: errMsg });
    figma.notify('❌ Erro: ' + errMsg, { error: true, timeout: 8000 });
    console.error(err);
  }
};
