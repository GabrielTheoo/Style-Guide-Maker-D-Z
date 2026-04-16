// ═══════════════════════════════════════════════
//  STYLE GUIDE MAKER — D&Z  |  Figma Plugin
// ═══════════════════════════════════════════════

figma.showUI(__html__, { width: 360, height: 580, title: 'Style Guide Maker — D&Z' });

// ── UTILITIES ────────────────────────────────────
function hexToRGB(hex) {
  hex = (hex || '#000000').replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  return {
    r: parseInt(hex.slice(0, 2), 16) / 255,
    g: parseInt(hex.slice(2, 4), 16) / 255,
    b: parseInt(hex.slice(4, 6), 16) / 255,
  };
}

function solidFill(hex) {
  return [{ type: 'SOLID', color: hexToRGB(hex) }];
}

function prog(text, percent, dotId) {
  figma.ui.postMessage({ type: 'PROGRESS', text, percent, dotId: dotId || null });
}

// ── FONT LOADING ─────────────────────────────────
// Always preload Inter (guaranteed available in Figma)
const SAFE_FONT = { family: 'Inter', style: 'Regular' };
const SAFE_BOLD = { family: 'Inter', style: 'Bold' };

async function preloadFonts() {
  await figma.loadFontAsync(SAFE_FONT);
  await figma.loadFontAsync(SAFE_BOLD);
  await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });
  await figma.loadFontAsync({ family: 'Inter', style: 'SemiBold' });
}

async function tryLoadFont(family, style) {
  try {
    await figma.loadFontAsync({ family, style });
    return { family, style };
  } catch (_) {
    // fallback to Inter
    return style.toLowerCase().includes('bold') ? SAFE_BOLD : SAFE_FONT;
  }
}

// ── CREATE TEXT ───────────────────────────────────
async function txt(options) {
  const {
    content, x, y,
    size = 16, family = 'Inter', style = 'Regular',
    color = '#000000', w, lh,
  } = options;

  const fontName = await tryLoadFont(family, style);
  const node = figma.createText();
  node.fontName = fontName;
  node.fontSize = size;
  node.fills = solidFill(color);
  if (lh) node.lineHeight = { value: lh, unit: 'PIXELS' };
  node.characters = content || '';
  node.x = x;
  node.y = y;
  if (w) {
    node.textAutoResize = 'HEIGHT';
    node.resize(w, 40);
  }
  return node;
}

// ── CREATE RECT ───────────────────────────────────
function rect(x, y, w, h, fillHex, radius = 0, strokeHex, strokeW = 1) {
  const node = figma.createRectangle();
  node.x = x; node.y = y;
  node.resize(w, h);
  node.fills = fillHex ? solidFill(fillHex) : [];
  if (radius) node.cornerRadius = radius;
  if (strokeHex) {
    node.strokes = solidFill(strokeHex);
    node.strokeWeight = strokeW;
    node.strokeAlign = 'INSIDE';
  }
  return node;
}

// ── SHARED HEADER ────────────────────────────────
async function addHeader(frame, title, primaryHex) {
  const bar = rect(0, 0, 1920, 140, primaryHex);
  frame.appendChild(bar);

  const logoTxt = await txt({ content: 'Style Guide', x: 80, y: 50, size: 32, style: 'Bold', color: '#FFFFFF' });
  frame.appendChild(logoTxt);

  const titleTxt = await txt({ content: title, x: 1400, y: 48, size: 40, style: 'Bold', color: '#FFFFFF', w: 440 });
  frame.appendChild(titleTxt);
}

// ── DIVIDER LINE ─────────────────────────────────
function divider(frame, y) {
  frame.appendChild(rect(80, y, 1760, 1, '#eeeeee'));
}

// ════════════════════════════════════════════════
//  FRAME 1 — PROJECT INTRODUCTION
// ════════════════════════════════════════════════
async function buildIntro(data, primary) {
  const frame = figma.createFrame();
  frame.name = 'Project Introduction';
  frame.resize(1920, 1080);
  frame.clipsContent = true;

  // Background
  let bgLoaded = false;
  if (data.project && data.project.background) {
    try {
      const b64 = data.project.background.replace(/^data:image\/\w+;base64,/, '');
      const bytes = figma.base64Decode(b64);
      const img = figma.createImage(bytes);
      const bg = rect(0, 0, 1920, 1080, null);
      bg.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: img.hash }];
      frame.appendChild(bg);
      bgLoaded = true;
    } catch (_) {}
  }
  if (!bgLoaded) {
    frame.appendChild(rect(0, 0, 1920, 1080, primary));
  }

  // Overlay
  const overlay = rect(0, 0, 1920, 1080, '#000000');
  overlay.opacity = 0.45;
  frame.appendChild(overlay);

  // Logo
  if (data.project && data.project.logo) {
    try {
      const b64 = data.project.logo.replace(/^data:image\/\w+;base64,/, '');
      const bytes = figma.base64Decode(b64);
      const img = figma.createImage(bytes);
      const logoR = rect(80, 48, 280, 72, null);
      logoR.fills = [{ type: 'IMAGE', scaleMode: 'FIT', imageHash: img.hash }];
      frame.appendChild(logoR);
    } catch (_) {
      const logoTxt = await txt({ content: 'Logo', x: 80, y: 60, size: 24, style: 'Bold', color: '#FFFFFF' });
      frame.appendChild(logoTxt);
    }
  }

  const name = data.project && data.project.name ? data.project.name : 'Project Name';
  const tagline = data.project && data.project.tagline ? data.project.tagline : '';

  frame.appendChild(await txt({ content: name, x: 80, y: 680, size: 96, style: 'Bold', color: '#FFFFFF', w: 1400 }));
  if (tagline) {
    frame.appendChild(await txt({ content: tagline, x: 80, y: 820, size: 36, color: '#FFFFFF', w: 1000, lh: 52 }));
  }

  return frame;
}

// ════════════════════════════════════════════════
//  FRAME 2 — FONT WEIGHT
// ════════════════════════════════════════════════
async function buildFontWeight(data, primary) {
  const frame = figma.createFrame();
  frame.name = 'Font Weight';
  frame.resize(1920, 1323);
  frame.fills = solidFill('#FFFFFF');
  frame.clipsContent = true;
  await addHeader(frame, 'Font Weight', primary);

  const fontFamily = (data.typography && data.typography.primaryFont) || 'Inter';

  frame.appendChild(await txt({ content: 'Font Weight', x: 80, y: 184, size: 40, style: 'Bold' }));
  frame.appendChild(await txt({ content: fontFamily, x: 80, y: 242, size: 20, color: '#59595B' }));

  const weights = [
    ['Thin', '100'],
    ['Extra Light', '200'],
    ['Light', '300'],
    ['Regular', '400'],
    ['Medium', '500'],
    ['Semi Bold', '600'],
    ['Bold', '700'],
    ['Extra Bold', '800'],
    ['Black', '900'],
  ];
  const styleMap = {
    '100': 'Thin', '200': 'ExtraLight', '300': 'Light', '400': 'Regular',
    '500': 'Medium', '600': 'SemiBold', '700': 'Bold', '800': 'ExtraBold', '900': 'Black',
  };
  const interStyleMap = {
    '100': 'Thin', '200': 'ExtraLight', '300': 'Light', '400': 'Regular',
    '500': 'Medium', '600': 'SemiBold', '700': 'Bold', '800': 'ExtraBold', '900': 'Black',
  };

  let y = 310;
  for (const [label, w] of weights) {
    const fontStyle = styleMap[w] || 'Regular';
    const fontName = await tryLoadFont(fontFamily, fontStyle);

    const t = figma.createText();
    t.fontName = fontName;
    t.fontSize = 44;
    t.fills = solidFill('#000000');
    t.characters = `${label} — Aa Bb Cc 01234`;
    t.x = 80; t.y = y;
    frame.appendChild(t);

    frame.appendChild(await txt({ content: w, x: 1800, y: y + 12, size: 16, color: '#aaaaaa' }));
    y += 96;
  }

  return frame;
}

// ════════════════════════════════════════════════
//  FRAME 3 — FONT SIZES
// ════════════════════════════════════════════════
async function buildFontSizes(data, primary) {
  const frame = figma.createFrame();
  frame.name = 'Font Sizes';
  frame.resize(1920, 4644);
  frame.fills = solidFill('#FFFFFF');
  frame.clipsContent = true;
  await addHeader(frame, 'Font Sizes', primary);

  const fontFamily = (data.typography && data.typography.primaryFont) || 'Inter';
  const sample = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';

  const headers = [
    { label: 'H1', size: 52, style: 'Bold',    lh: 68 },
    { label: 'H2', size: 44, style: 'Bold',    lh: 56 },
    { label: 'H3', size: 36, style: 'Regular', lh: 44 },
    { label: 'H4', size: 28, style: 'Bold',    lh: 36 },
    { label: 'H5', size: 22, style: 'Bold',    lh: 28 },
    { label: 'H6', size: 20, style: 'Regular', lh: 24 },
  ];
  const body = [
    { label: 'Body L', size: 20, style: 'Regular', lh: 32 },
    { label: 'Body M', size: 18, style: 'Regular', lh: 28 },
    { label: 'Body S', size: 16, style: 'Regular', lh: 24 },
  ];
  const btns = [
    { label: 'Button', size: 16, style: 'SemiBold', lh: 20 },
    { label: 'Label',  size: 16, style: 'Medium',   lh: 24 },
  ];

  let y = 184;

  frame.appendChild(await txt({ content: 'Headers', x: 80, y, size: 40, style: 'Bold' }));
  y += 72;

  for (const h of headers) {
    const fontName = await tryLoadFont(fontFamily, h.style);
    const t = figma.createText();
    t.fontName = fontName;
    t.fontSize = h.size;
    t.lineHeight = { value: h.lh, unit: 'PIXELS' };
    t.fills = solidFill('#000000');
    t.characters = `${h.label} — ${sample.slice(0, 42)}`;
    t.x = 80; t.y = y;
    frame.appendChild(t);
    frame.appendChild(await txt({ content: `${h.size}px · ${h.style}`, x: 1720, y: y + 4, size: 14, color: '#999999' }));
    divider(frame, y + h.lh + 16);
    y += h.lh + 56;
  }

  y += 40;
  frame.appendChild(await txt({ content: 'Body', x: 80, y, size: 40, style: 'Bold' }));
  y += 72;

  for (const b of body) {
    const fontName = await tryLoadFont(fontFamily, b.style);
    const t = figma.createText();
    t.fontName = fontName;
    t.fontSize = b.size;
    t.lineHeight = { value: b.lh, unit: 'PIXELS' };
    t.fills = solidFill('#000000');
    t.textAutoResize = 'HEIGHT';
    t.resize(1400, 200);
    t.characters = `${b.label} — ${sample}`;
    t.x = 80; t.y = y;
    frame.appendChild(t);
    frame.appendChild(await txt({ content: `${b.size}px · ${b.style}`, x: 1720, y: y + 4, size: 14, color: '#999999' }));
    y += b.lh * 3 + 64;
  }

  y += 40;
  frame.appendChild(await txt({ content: 'Text for Buttons and Links', x: 80, y, size: 40, style: 'Bold' }));
  y += 72;

  for (const b of btns) {
    const fontName = await tryLoadFont(fontFamily, b.style);
    const t = figma.createText();
    t.fontName = fontName;
    t.fontSize = b.size;
    t.lineHeight = { value: b.lh, unit: 'PIXELS' };
    t.fills = solidFill('#000000');
    t.characters = b.label;
    t.x = 80; t.y = y;
    frame.appendChild(t);
    y += 80;
  }

  return frame;
}

// ════════════════════════════════════════════════
//  FRAME 4 — STYLES
// ════════════════════════════════════════════════
async function buildStyles(data, primary) {
  const frame = figma.createFrame();
  frame.name = 'Styles';
  frame.resize(1920, 1996);
  frame.fills = solidFill('#FFFFFF');
  frame.clipsContent = true;
  await addHeader(frame, 'Styles', primary);

  const br = (data.styles && data.styles.borderRadius) || { S: 20, M: 32, L: 54 };
  const st = (data.styles && data.styles.stroke) || { S: 0.5, M: 1, L: 2 };
  const ds = (data.styles && data.styles.dropShadow) || { blur: 16, y: 4, x: 0, color: '#000000', opacity: 0.16 };

  // Border Radius
  frame.appendChild(await txt({ content: 'Border Radius', x: 80, y: 200, size: 36, style: 'Bold' }));
  for (const [i, [key, val]] of Object.entries({ S: br.S, M: br.M, L: br.L }).entries()) {
    const x = 80 + i * 280;
    frame.appendChild(rect(x, 280, 200, 200, '#f5f6f7', val, '#000000', 1));
    frame.appendChild(await txt({ content: `BR ${key}  ${val}px`, x, y: 500, size: 18 }));
  }

  // Stroke
  frame.appendChild(await txt({ content: 'Stroke', x: 80, y: 600, size: 36, style: 'Bold' }));
  for (const [i, [key, val]] of Object.entries({ S: st.S, M: st.M, L: st.L }).entries()) {
    const x = 80 + i * 280;
    frame.appendChild(rect(x, 680, 200, 200, null, 12, '#000000', val));
    frame.appendChild(await txt({ content: `Stroke ${key}  ${val}px`, x, y: 900, size: 18 }));
  }

  // Drop Shadow
  frame.appendChild(await txt({ content: 'Drop Shadow', x: 80, y: 1000, size: 36, style: 'Bold' }));
  const shadowBox = rect(80, 1080, 200, 200, '#FFFFFF', 16);
  const c = hexToRGB(ds.color || '#000000');
  shadowBox.effects = [{
    type: 'DROP_SHADOW',
    color: { r: c.r, g: c.g, b: c.b, a: ds.opacity || 0.16 },
    offset: { x: ds.x || 0, y: ds.y || 4 },
    radius: ds.blur || 16,
    visible: true,
    blendMode: 'NORMAL',
    showShadowBehindNode: false,
  }];
  frame.appendChild(shadowBox);
  frame.appendChild(await txt({
    content: `Blur: ${ds.blur}px  Y: ${ds.y}px\nColor: ${ds.color}  Opacity: ${Math.round((ds.opacity || 0.16) * 100)}%`,
    x: 320, y: 1110, size: 18,
  }));

  return frame;
}

// ════════════════════════════════════════════════
//  FRAME 5 — SPACING
// ════════════════════════════════════════════════
async function buildSpacing(data, primary) {
  const frame = figma.createFrame();
  frame.name = 'Spacing';
  frame.resize(1920, 1853);
  frame.fills = solidFill('#FFFFFF');
  frame.clipsContent = true;
  await addHeader(frame, 'Spacing', primary);

  const spacings = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 120, 160];
  let y = 200;
  for (const s of spacings) {
    frame.appendChild(await txt({ content: `${s}`, x: 80, y: y + 8, size: 14, color: '#999999' }));
    const bar = rect(140, y, s * 5, 32, primary, 4);
    bar.opacity = 0.75;
    frame.appendChild(bar);
    frame.appendChild(await txt({ content: `${s}px`, x: 160 + s * 5, y: y + 8, size: 14, color: '#666666' }));
    y += 72;
  }

  return frame;
}

// ════════════════════════════════════════════════
//  FRAME 6 — COLORS
// ════════════════════════════════════════════════
async function buildColors(data, primary) {
  const frame = figma.createFrame();
  frame.name = 'Colors';
  frame.resize(1920, 2191);
  frame.fills = solidFill('#FFFFFF');
  frame.clipsContent = true;
  await addHeader(frame, 'Colors', primary);

  const colors = data.colors || [];

  // Title
  frame.appendChild(await txt({ content: 'Baseline Colors', x: 80, y: 184, size: 36, style: 'Bold' }));

  // Circles
  colors.slice(0, 7).forEach((c, i) => {
    const cx = 80 + i * 240;
    const ell = figma.createEllipse();
    ell.resize(131, 131);
    ell.x = cx; ell.y = 256;
    ell.fills = solidFill(c.hex);
    if ((c.hex || '').toLowerCase().replace('#', '') === 'ffffff') {
      ell.strokes = solidFill('#dddddd');
      ell.strokeWeight = 1;
    }
    frame.appendChild(ell);
    txt({ content: c.name || '', x: cx, y: 404, size: 16, style: 'Bold' }).then(t => frame.appendChild(t));
    txt({ content: c.hex.toUpperCase(), x: cx, y: 428, size: 14, color: '#59595B' }).then(t => frame.appendChild(t));
  });

  // Shade palettes
  frame.appendChild(await txt({ content: 'Color Palette', x: 80, y: 504, size: 36, style: 'Bold' }));

  const shadeLabels = [
    'Light', 'Light :hover', 'Light :active',
    'Normal', 'Normal :hover', 'Normal :active',
    'Dark', 'Dark :hover', 'Dark :active', 'Darker',
  ];

  colors.slice(0, 7).forEach((c, ci) => {
    const shades = c.shades ? Object.values(c.shades) : [];
    const colsPerRow = 4;
    const palX = 80 + (ci % colsPerRow) * 440;
    const palY = 584 + Math.floor(ci / colsPerRow) * 700;

    txt({ content: c.name || '', x: palX, y: palY, size: 20, style: 'Bold' }).then(t => frame.appendChild(t));

    shades.slice(0, 10).forEach((hex, si) => {
      const sy = palY + 44 + si * 54;
      frame.appendChild(rect(palX, sy, 280, 46, hex, 4));
      txt({ content: shadeLabels[si] || '', x: palX + 292, y: sy + 14, size: 13, color: '#59595B' }).then(t => frame.appendChild(t));
    });
  });

  return frame;
}

// ════════════════════════════════════════════════
//  FRAME 7 — BUTTONS
// ════════════════════════════════════════════════
async function buildButtons(data, primary) {
  const frame = figma.createFrame();
  frame.name = 'Buttons';
  frame.resize(1920, 1626);
  frame.fills = solidFill('#FFFFFF');
  frame.clipsContent = true;
  await addHeader(frame, 'Buttons', primary);

  const br = (data.styles && data.styles.borderRadius && data.styles.borderRadius.M) || 12;

  const sections = [
    { label: 'Primary',   y: 200 },
    { label: 'Secondary', y: 560 },
    { label: 'Link',      y: 900 },
  ];

  for (const sec of sections) {
    frame.appendChild(await txt({ content: sec.label, x: 80, y: sec.y, size: 40, style: 'Bold' }));

    frame.appendChild(await txt({ content: 'For Light Backgrounds', x: 360, y: sec.y + 56, size: 16, color: '#666666' }));
    frame.appendChild(await txt({ content: 'For Dark Backgrounds',  x: 860, y: sec.y + 56, size: 16, color: '#666666' }));
    frame.appendChild(rect(840, sec.y + 88, 580, 200, '#383838', 8));

    if (sec.label === 'Primary') {
      // Light bg
      frame.appendChild(rect(360, sec.y + 108, 220, 48, primary, br));
      frame.appendChild(await txt({ content: 'This is a Button', x: 380, y: sec.y + 122, size: 16, style: 'SemiBold', color: '#FFFFFF' }));
      frame.appendChild(rect(360, sec.y + 180, 220, 48, '#FFFFFF', br, primary, 1.5));
      frame.appendChild(await txt({ content: 'This is a Button', x: 380, y: sec.y + 194, size: 16, style: 'SemiBold', color: primary }));
      // Dark bg
      frame.appendChild(rect(860, sec.y + 108, 220, 48, primary, br));
      frame.appendChild(await txt({ content: 'This is a Button', x: 880, y: sec.y + 122, size: 16, style: 'SemiBold', color: '#FFFFFF' }));
      frame.appendChild(rect(860, sec.y + 180, 220, 48, '#FFFFFF', br, primary, 1.5));
      frame.appendChild(await txt({ content: 'This is a Button', x: 880, y: sec.y + 194, size: 16, style: 'SemiBold', color: primary }));
    }

    if (sec.label === 'Secondary') {
      frame.appendChild(rect(360, sec.y + 108, 220, 48, '#FFFFFF', br, primary, 1.5));
      frame.appendChild(await txt({ content: 'This is a Button', x: 380, y: sec.y + 122, size: 16, style: 'SemiBold', color: primary }));
      frame.appendChild(rect(360, sec.y + 180, 220, 48, primary, br));
      frame.appendChild(await txt({ content: 'This is a Button', x: 380, y: sec.y + 194, size: 16, style: 'SemiBold', color: '#FFFFFF' }));

      frame.appendChild(rect(860, sec.y + 108, 220, 48, '#FFFFFF', br, primary, 1.5));
      frame.appendChild(await txt({ content: 'This is a Button', x: 880, y: sec.y + 122, size: 16, style: 'SemiBold', color: primary }));
    }

    if (sec.label === 'Link') {
      frame.appendChild(await txt({ content: 'See More →', x: 360, y: sec.y + 122, size: 16, style: 'SemiBold', color: '#000000' }));
      frame.appendChild(await txt({ content: 'See More →', x: 360, y: sec.y + 172, size: 16, style: 'SemiBold', color: primary }));
      frame.appendChild(await txt({ content: 'See More →', x: 860, y: sec.y + 122, size: 16, style: 'SemiBold', color: '#FFFFFF' }));
    }
  }

  return frame;
}

// ════════════════════════════════════════════════
//  FRAME 8 — IMAGES
// ════════════════════════════════════════════════
async function buildImages(data, primary) {
  const images = data.images || [];
  const rows = Math.max(Math.ceil(images.length / 3), 2);
  const frameH = 220 + rows * 480 + 80;

  const frame = figma.createFrame();
  frame.name = 'Images';
  frame.resize(1920, Math.max(frameH, 3703));
  frame.fills = solidFill('#FFFFFF');
  frame.clipsContent = true;
  await addHeader(frame, 'Images', primary);

  if (images.length === 0) {
    frame.appendChild(await txt({ content: 'Nenhuma imagem adicionada.', x: 80, y: 220, size: 24, color: '#cccccc' }));
    return frame;
  }

  const cols = 3;
  const imgW = 560, imgH = 420, gap = 40, startX = 80, startY = 220;

  for (let i = 0; i < images.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * (imgW + gap);
    const y = startY + row * (imgH + gap);

    try {
      const b64 = images[i].replace(/^data:image\/\w+;base64,/, '');
      const bytes = figma.base64Decode(b64);
      const img = figma.createImage(bytes);
      const r = rect(x, y, imgW, imgH, null, 8);
      r.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: img.hash }];
      frame.appendChild(r);
    } catch (_) {
      const placeholder = rect(x, y, imgW, imgH, '#f0f0f0', 8, '#dddddd', 1);
      frame.appendChild(placeholder);
      txt({ content: '🖼', x: x + imgW / 2 - 12, y: y + imgH / 2 - 12, size: 24 }).then(t => frame.appendChild(t));
    }
  }

  return frame;
}

// ════════════════════════════════════════════════
//  FRAME 9 — COMPONENTS (empty)
// ════════════════════════════════════════════════
async function buildComponents(data, primary) {
  const frame = figma.createFrame();
  frame.name = 'Components';
  frame.resize(1920, 2059);
  frame.fills = solidFill('#FFFFFF');
  frame.clipsContent = true;
  await addHeader(frame, 'Components', primary);

  frame.appendChild(await txt({
    content: 'Components — a ser preenchido no Figma',
    x: 80, y: 260, size: 28, color: '#cccccc',
  }));

  return frame;
}

// ════════════════════════════════════════════════
//  MAIN
// ════════════════════════════════════════════════
figma.ui.onmessage = async (msg) => {
  if (msg.type !== 'CREATE_STYLE_GUIDE') return;

  const data = msg.data;
  const primary = (data.colors && data.colors[0] && data.colors[0].hex) || '#2078BA';

  try {
    figma.notify('⏳ Criando Style Guide…');

    // Preload safe fonts first
    prog('Carregando fontes…', 2);
    await preloadFonts();

    // Use a new page or current page
    let targetPage;
    try {
      targetPage = figma.createPage();
      targetPage.name = `Style Guide — ${(data.project && data.project.name) || 'D&Z'}`;
      figma.currentPage = targetPage;
    } catch (_) {
      // Can't create page — use current page
      targetPage = figma.currentPage;
    }

    const LAYOUT_GAP = 120;
    let curX = 0;
    let created = 0;

    const place = (frame) => {
      frame.x = curX;
      frame.y = 0;
      targetPage.appendChild(frame);
      curX += frame.width + LAYOUT_GAP;
      created++;
    };

    prog('Criando Project Introduction…', 8, 'intro');
    place(await buildIntro(data, primary));

    prog('Criando Font Weight…', 18, 'fontweight');
    place(await buildFontWeight(data, primary));

    prog('Criando Font Sizes…', 28, 'fontsizes');
    place(await buildFontSizes(data, primary));

    prog('Criando Styles…', 42, 'styles');
    place(await buildStyles(data, primary));

    prog('Criando Spacing…', 52, 'spacing');
    place(await buildSpacing(data, primary));

    prog('Criando Colors…', 63, 'colors');
    place(await buildColors(data, primary));

    prog('Criando Buttons…', 76, 'buttons');
    place(await buildButtons(data, primary));

    prog('Criando Images…', 88, 'images');
    place(await buildImages(data, primary));

    prog('Criando Components…', 96, 'components');
    place(await buildComponents(data, primary));

    figma.viewport.scrollAndZoomIntoView(targetPage.children);

    figma.ui.postMessage({ type: 'DONE', framesCreated: created });
    figma.notify(`✅ ${created} frames criados com sucesso!`);

  } catch (error) {
    const msg = String(error);
    figma.ui.postMessage({ type: 'ERROR', message: msg });
    figma.notify('❌ Erro: ' + msg, { error: true, timeout: 6000 });
    console.error('Style Guide Maker error:', error);
  }
};
