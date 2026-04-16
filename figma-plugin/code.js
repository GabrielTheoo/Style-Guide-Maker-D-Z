// ═══════════════════════════════════════════════
//  STYLE GUIDE MAKER — D&Z  |  Figma Plugin
// ═══════════════════════════════════════════════

figma.showUI(__html__, { width: 360, height: 560, title: 'Style Guide Maker — D&Z' });

// ── COLORS ──────────────────────────────────────
function hexToRGB(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c+c).join('');
  return {
    r: parseInt(hex.slice(0,2),16)/255,
    g: parseInt(hex.slice(2,4),16)/255,
    b: parseInt(hex.slice(4,6),16)/255
  };
}
function rgb(hex) { return hexToRGB(hex); }
function solidFill(hex) { return [{ type: 'SOLID', color: hexToRGB(hex) }]; }
function solidFillA(hex, a) { const c = hexToRGB(hex); return [{ type: 'SOLID', color: c, opacity: a }]; }
function noFill() { return []; }

// ── TEXT HELPERS ─────────────────────────────────
async function loadFont(family, style) {
  try { await figma.loadFontAsync({ family, style }); return true; }
  catch(e) {
    try { await figma.loadFontAsync({ family: 'Inter', style: 'Regular' }); return false; }
    catch(e2) { return false; }
  }
}

async function createText(options) {
  const {
    content, x, y, fontSize = 16, fontFamily = 'Inter', fontStyle = 'Regular',
    color = '#000000', width, height, align = 'LEFT', lh = null
  } = options;
  await loadFont(fontFamily, fontStyle);
  const t = figma.createText();
  t.fontName = { family: fontFamily, style: fontStyle };
  t.fontSize = fontSize;
  t.fills = solidFill(color);
  t.textAlignHorizontal = align;
  if (lh) t.lineHeight = { value: lh, unit: 'PIXELS' };
  t.characters = content;
  t.x = x; t.y = y;
  if (width) { t.textAutoResize = 'HEIGHT'; t.resize(width, height || 40); }
  return t;
}

function createRect(x, y, w, h, fillHex, cornerRadius = 0, strokeHex = null, strokeWeight = 1) {
  const r = figma.createRectangle();
  r.x = x; r.y = y; r.resize(w, h);
  r.fills = fillHex ? solidFill(fillHex) : noFill();
  if (cornerRadius) r.cornerRadius = cornerRadius;
  if (strokeHex) {
    r.strokes = solidFill(strokeHex);
    r.strokeWeight = strokeWeight;
    r.strokeAlign = 'INSIDE';
  }
  return r;
}

function progress(text, percent, dotId = null) {
  figma.ui.postMessage({ type: 'PROGRESS', text, percent, dotId });
}

// ── SHARED HEADER ────────────────────────────────
async function addFrameHeader(frame, title, primaryHex, projectLogo) {
  const header = createRect(0, 0, 1920, 140, primaryHex);
  frame.appendChild(header);

  // Logo / project name text
  await loadFont('Inter', 'Bold');
  const logoText = figma.createText();
  logoText.fontName = { family: 'Inter', style: 'Bold' };
  logoText.fontSize = 28;
  logoText.fills = solidFill('#FFFFFF');
  logoText.characters = 'Style Guide';
  logoText.x = 80; logoText.y = 48;
  frame.appendChild(logoText);

  // Section title on right
  const titleNode = await createText({
    content: title, x: 1920 - 80 - 400, y: 50,
    fontSize: 36, fontFamily: 'Inter', fontStyle: 'Bold', color: '#FFFFFF',
    width: 400, align: 'RIGHT'
  });
  frame.appendChild(titleNode);
}

// ═══════════════════════════════════════════════
//  FRAME 1: PROJECT INTRODUCTION
// ═══════════════════════════════════════════════
async function createProjectIntroFrame(data) {
  const frame = figma.createFrame();
  frame.name = 'Project Introduction';
  frame.resize(1920, 1080);
  frame.fills = solidFill('#FFFFFF');
  frame.clipsContent = true;

  // Background image or gradient
  if (data.project.background) {
    try {
      const base64 = data.project.background.split(',')[1];
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const img = figma.createImage(bytes);
      const bg = createRect(0, 0, 1920, 1080, null);
      bg.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: img.hash }];
      frame.appendChild(bg);
    } catch(e) {}
  } else {
    // Default gradient overlay
    const primaryHex = data.colors?.[0]?.hex || '#2078BA';
    const bg = createRect(0, 0, 1920, 1080, primaryHex);
    frame.appendChild(bg);
  }

  // Dark overlay
  const overlay = createRect(0, 0, 1920, 1080, '#000000');
  overlay.opacity = 0.4;
  frame.appendChild(overlay);

  // Logo
  if (data.project.logo) {
    try {
      const base64 = data.project.logo.split(',')[1];
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const img = figma.createImage(bytes);
      const logoRect = createRect(80, 60, 320, 80, null);
      logoRect.fills = [{ type: 'IMAGE', scaleMode: 'FIT', imageHash: img.hash }];
      frame.appendChild(logoRect);
    } catch(e) {}
  }

  // Project name
  const name = await createText({
    content: data.project.name || 'Project Name',
    x: 80, y: 700, fontSize: 96, fontFamily: 'Inter', fontStyle: 'Bold',
    color: '#FFFFFF', width: 1200
  });
  frame.appendChild(name);

  // Tagline
  const tagline = await createText({
    content: data.project.tagline || 'Your project tagline here.',
    x: 80, y: 830, fontSize: 36, fontFamily: 'Inter', fontStyle: 'Regular',
    color: '#FFFFFF', width: 900, lh: 52
  });
  frame.appendChild(tagline);

  return frame;
}

// ═══════════════════════════════════════════════
//  FRAME 2: FONT WEIGHT
// ═══════════════════════════════════════════════
async function createFontWeightFrame(data) {
  const font = data.typography?.primaryFont || 'Inter';
  const frame = figma.createFrame();
  frame.name = 'Font Weight';
  frame.resize(1920, 1323);
  frame.fills = solidFill('#FFFFFF');
  frame.clipsContent = true;

  const primaryHex = data.colors?.[0]?.hex || '#2078BA';
  await addFrameHeader(frame, 'Font Weight', primaryHex, null);

  // Section title
  const sectionTitle = await createText({
    content: 'Font Weight', x: 80, y: 200,
    fontSize: 40, fontFamily: 'Inter', fontStyle: 'Bold', color: '#000000'
  });
  frame.appendChild(sectionTitle);

  // Font family name
  const familyLabel = await createText({
    content: font, x: 80, y: 260,
    fontSize: 24, fontFamily: 'Inter', fontStyle: 'Regular', color: '#59595B'
  });
  frame.appendChild(familyLabel);

  const weights = [
    { w: '100', label: 'Thin' },
    { w: '200', label: 'Extra Light' },
    { w: '300', label: 'Light' },
    { w: '400', label: 'Regular' },
    { w: '500', label: 'Medium' },
    { w: '600', label: 'SemiBold' },
    { w: '700', label: 'Bold' },
    { w: '800', label: 'ExtraBold' },
    { w: '900', label: 'Black' },
  ];
  const styleMap = { '100':'Thin','200':'ExtraLight','300':'Light','400':'Regular','500':'Medium','600':'SemiBold','700':'Bold','800':'ExtraBold','900':'Black' };

  let yPos = 340;
  for (const { w, label } of weights) {
    const style = styleMap[w] || 'Regular';
    const loaded = await loadFont(font, style);
    const actualFont = loaded ? font : 'Inter';
    const actualStyle = loaded ? style : 'Regular';

    await loadFont(actualFont, actualStyle);
    const t = figma.createText();
    t.fontName = { family: actualFont, style: actualStyle };
    t.fontSize = 48;
    t.fills = solidFill('#000000');
    t.characters = `${label} — Aa Bb Cc 0123`;
    t.x = 80; t.y = yPos;
    frame.appendChild(t);

    const wLabel = await createText({
      content: w, x: 1760, y: yPos + 12,
      fontSize: 18, fontFamily: 'Inter', fontStyle: 'Regular', color: '#999999'
    });
    frame.appendChild(wLabel);

    yPos += 90;
  }

  return frame;
}

// ═══════════════════════════════════════════════
//  FRAME 3: FONT SIZES
// ═══════════════════════════════════════════════
async function createFontSizesFrame(data) {
  const font = data.typography?.primaryFont || 'Inter';
  const frame = figma.createFrame();
  frame.name = 'Font Sizes';
  frame.resize(1920, 4644);
  frame.fills = solidFill('#FFFFFF');
  frame.clipsContent = true;

  const primaryHex = data.colors?.[0]?.hex || '#2078BA';
  await addFrameHeader(frame, 'Font Sizes', primaryHex, null);

  const sizes = [
    { label: 'H1', size: 52, weight: 'Bold', lh: 68 },
    { label: 'H2', size: 44, weight: 'Bold', lh: 56 },
    { label: 'H3', size: 36, weight: 'Regular', lh: 44 },
    { label: 'H4', size: 28, weight: 'Bold', lh: 36 },
    { label: 'H5', size: 22, weight: 'Bold', lh: 28 },
    { label: 'H6', size: 20, weight: 'Regular', lh: 24 },
  ];
  const bodySizes = [
    { label: 'Body L', size: 20, weight: 'Regular', lh: 32 },
    { label: 'Body M', size: 18, weight: 'Regular', lh: 28 },
    { label: 'Body S', size: 16, weight: 'Regular', lh: 24 },
  ];
  const buttonSizes = [
    { label: 'Button', size: 16, weight: 'SemiBold', lh: 20 },
    { label: 'Label',  size: 16, weight: 'Medium', lh: 24 },
  ];

  let yPos = 200;
  const sample = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';

  // Headers
  const hdrsTitle = await createText({ content: 'Headers', x: 80, y: yPos, fontSize: 40, fontFamily: 'Inter', fontStyle: 'Bold', color: '#000' });
  frame.appendChild(hdrsTitle);
  yPos += 80;

  for (const s of sizes) {
    await loadFont(font, s.weight);
    const t = figma.createText();
    try { t.fontName = { family: font, style: s.weight }; } catch { t.fontName = { family: 'Inter', style: s.weight }; }
    t.fontSize = s.size;
    t.lineHeight = { value: s.lh, unit: 'PIXELS' };
    t.fills = solidFill('#000');
    t.characters = `${s.label} — ${sample.slice(0,40)}`;
    t.x = 80; t.y = yPos;
    frame.appendChild(t);

    const lab = await createText({ content: `${s.size}px / ${s.weight}`, x: 1700, y: yPos + 4, fontSize: 14, fontFamily: 'Inter', fontStyle: 'Regular', color: '#999' });
    frame.appendChild(lab);

    const sep = createRect(80, yPos + s.lh + 16, 1760, 1, '#eeeeee');
    frame.appendChild(sep);
    yPos += s.lh + 48;
  }

  yPos += 40;
  const bodyTitle = await createText({ content: 'Body', x: 80, y: yPos, fontSize: 40, fontFamily: 'Inter', fontStyle: 'Bold', color: '#000' });
  frame.appendChild(bodyTitle);
  yPos += 80;

  for (const s of bodySizes) {
    await loadFont(font, s.weight);
    const t = figma.createText();
    try { t.fontName = { family: font, style: s.weight }; } catch { t.fontName = { family: 'Inter', style: 'Regular' }; }
    t.fontSize = s.size;
    t.lineHeight = { value: s.lh, unit: 'PIXELS' };
    t.fills = solidFill('#000');
    t.resize(1200, 200);
    t.textAutoResize = 'HEIGHT';
    t.characters = `${s.label} — ${sample}`;
    t.x = 80; t.y = yPos;
    frame.appendChild(t);
    yPos += s.lh * 3 + 60;
  }

  yPos += 40;
  const btnTitle = await createText({ content: 'Text for Buttons and Links', x: 80, y: yPos, fontSize: 40, fontFamily: 'Inter', fontStyle: 'Bold', color: '#000' });
  frame.appendChild(btnTitle);
  yPos += 80;

  for (const s of buttonSizes) {
    await loadFont(font, s.weight);
    const t = figma.createText();
    try { t.fontName = { family: font, style: s.weight }; } catch { t.fontName = { family: 'Inter', style: 'Regular' }; }
    t.fontSize = s.size;
    t.lineHeight = { value: s.lh, unit: 'PIXELS' };
    t.fills = solidFill('#000');
    t.characters = `${s.label}`;
    t.x = 80; t.y = yPos;
    frame.appendChild(t);
    yPos += 80;
  }

  return frame;
}

// ═══════════════════════════════════════════════
//  FRAME 4: STYLES
// ═══════════════════════════════════════════════
async function createStylesFrame(data) {
  const frame = figma.createFrame();
  frame.name = 'Styles';
  frame.resize(1920, 1996);
  frame.fills = solidFill('#FFFFFF');
  frame.clipsContent = true;

  const primaryHex = data.colors?.[0]?.hex || '#2078BA';
  await addFrameHeader(frame, 'Styles', primaryHex, null);

  const br = data.styles?.borderRadius || { S: 20, M: 32, L: 54 };
  const st = data.styles?.stroke || { S: 0.5, M: 1, L: 2 };
  const ds = data.styles?.dropShadow || { blur: 16, y: 4, color: '#000000', opacity: 0.16 };

  // Border Radius
  const brTitle = await createText({ content: 'Border Radius', x: 80, y: 220, fontSize: 36, fontFamily: 'Inter', fontStyle: 'Bold', color: '#000' });
  frame.appendChild(brTitle);

  const brSizes = [['S', br.S], ['M', br.M], ['L', br.L]];
  brSizes.forEach(([label, val], i) => {
    const r = createRect(80 + i * 260, 300, 200, 200, '#f5f6f7', val, '#000000', 1);
    frame.appendChild(r);
    createText({ content: `Border Radius ${label}\n${val}px`, x: 80 + i*260, y: 520, fontSize: 18, fontFamily: 'Inter', fontStyle: 'Regular', color: '#000' }).then(t => frame.appendChild(t));
  });

  // Stroke
  const stTitle = await createText({ content: 'Stroke', x: 80, y: 640, fontSize: 36, fontFamily: 'Inter', fontStyle: 'Bold', color: '#000' });
  frame.appendChild(stTitle);

  const stSizes = [['S', st.S], ['M', st.M], ['L', st.L]];
  stSizes.forEach(([label, val], i) => {
    const r = createRect(80 + i*260, 720, 200, 200, null, 15, '#000000', val);
    frame.appendChild(r);
    createText({ content: `Stroke ${label}\n${val}px`, x: 80 + i*260, y: 940, fontSize: 18, fontFamily: 'Inter', fontStyle: 'Regular', color: '#000' }).then(t => frame.appendChild(t));
  });

  // Drop Shadow
  const dsTitle = await createText({ content: 'Drop Shadow', x: 80, y: 1060, fontSize: 36, fontFamily: 'Inter', fontStyle: 'Bold', color: '#000' });
  frame.appendChild(dsTitle);

  const shadowBox = createRect(80, 1140, 200, 200, '#FFFFFF', 20);
  shadowBox.effects = [{
    type: 'DROP_SHADOW',
    color: { ...hexToRGB(ds.color || '#000000'), a: ds.opacity || 0.16 },
    offset: { x: ds.x || 0, y: ds.y || 4 },
    radius: ds.blur || 16,
    visible: true,
    blendMode: 'NORMAL'
  }];
  frame.appendChild(shadowBox);

  const dsLabel = await createText({
    content: `Drop Shadow M\nBlur: ${ds.blur}px  Y: ${ds.y}px\nColor: ${ds.color}  Opacity: ${Math.round((ds.opacity||0.16)*100)}%`,
    x: 320, y: 1160, fontSize: 18, fontFamily: 'Inter', fontStyle: 'Regular', color: '#000'
  });
  frame.appendChild(dsLabel);

  return frame;
}

// ═══════════════════════════════════════════════
//  FRAME 5: SPACING (static placeholder)
// ═══════════════════════════════════════════════
async function createSpacingFrame(data) {
  const frame = figma.createFrame();
  frame.name = 'Spacing';
  frame.resize(1920, 1853);
  frame.fills = solidFill('#FFFFFF');
  frame.clipsContent = true;

  const primaryHex = data.colors?.[0]?.hex || '#2078BA';
  await addFrameHeader(frame, 'Spacing', primaryHex, null);

  const spacings = [4,8,12,16,20,24,32,40,48,64,80,96,120,160];
  let y = 220;

  for (const s of spacings) {
    // Label
    const label = await createText({ content: `${s}px`, x: 80, y: y + 8, fontSize: 16, fontFamily: 'Inter', fontStyle: 'Regular', color: '#999' });
    frame.appendChild(label);
    // Bar
    const bar = createRect(160, y, s * 4, 32, primaryHex, 4);
    bar.opacity = 0.7;
    frame.appendChild(bar);
    y += 72;
  }

  return frame;
}

// ═══════════════════════════════════════════════
//  FRAME 6: COLORS
// ═══════════════════════════════════════════════
async function createColorsFrame(data) {
  const frame = figma.createFrame();
  frame.name = 'Colors';
  frame.resize(1920, 2191);
  frame.fills = solidFill('#FFFFFF');
  frame.clipsContent = true;

  const primaryHex = data.colors?.[0]?.hex || '#2078BA';
  await addFrameHeader(frame, 'Colors', primaryHex, null);

  // Baseline colors title
  const baseTitle = await createText({ content: 'Baseline Colors', x: 80, y: 200, fontSize: 36, fontFamily: 'Inter', fontStyle: 'Bold', color: '#000' });
  frame.appendChild(baseTitle);

  // Color circles - 7 colors in a row
  const colors = data.colors || [];
  colors.slice(0, 7).forEach((c, i) => {
    const colX = 80 + i * 240;
    const ellipse = figma.createEllipse();
    ellipse.resize(131, 131);
    ellipse.x = colX; ellipse.y = 270;
    ellipse.fills = solidFill(c.hex);
    if (c.hex.toLowerCase() === '#ffffff' || c.hex === '#fff') {
      ellipse.strokes = solidFill('#dddddd');
      ellipse.strokeWeight = 1;
    }
    frame.appendChild(ellipse);

    createText({ content: c.name, x: colX, y: 415, fontSize: 16, fontFamily: 'Inter', fontStyle: 'Bold', color: '#000' }).then(t => frame.appendChild(t));
    createText({ content: c.hex.toUpperCase(), x: colX, y: 438, fontSize: 14, fontFamily: 'Inter', fontStyle: 'Regular', color: '#59595B' }).then(t => frame.appendChild(t));
  });

  // Color palette title
  const palTitle = await createText({ content: 'Color Palette', x: 80, y: 520, fontSize: 36, fontFamily: 'Inter', fontStyle: 'Bold', color: '#000' });
  frame.appendChild(palTitle);

  const shadeLabels = ['Light','Light :hover','Light :active','Normal','Normal :hover','Normal :active','Dark','Dark :hover','Dark :active','Darker'];

  // Draw shade palettes
  colors.slice(0, 7).forEach((c, ci) => {
    const shades = c.shades || {};
    const shadeValues = Object.values(shades);
    const palX = 80 + (ci % 4) * 460;
    const palY = 600 + Math.floor(ci / 4) * 900;

    // Family title
    createText({ content: c.name, x: palX, y: palY, fontSize: 20, fontFamily: 'Inter', fontStyle: 'Bold', color: '#000' }).then(t => frame.appendChild(t));

    shadeValues.slice(0, 10).forEach((hex, si) => {
      const swatchY = palY + 44 + si * 56;
      const swatch = createRect(palX, swatchY, 300, 48, hex, 4);
      frame.appendChild(swatch);
      createText({ content: shadeLabels[si] || '', x: palX + 310, y: swatchY + 14, fontSize: 13, fontFamily: 'Inter', fontStyle: 'Regular', color: '#59595B' }).then(t => frame.appendChild(t));
    });
  });

  return frame;
}

// ═══════════════════════════════════════════════
//  FRAME 7: BUTTONS
// ═══════════════════════════════════════════════
async function createButtonsFrame(data) {
  const frame = figma.createFrame();
  frame.name = 'Buttons';
  frame.resize(1920, 1626);
  frame.fills = solidFill('#FFFFFF');
  frame.clipsContent = true;

  const primaryHex = data.colors?.[0]?.hex || '#2078BA';
  await addFrameHeader(frame, 'Buttons', primaryHex, null);

  const br = data.styles?.borderRadius?.M || 12;
  await loadFont('Inter', 'Bold');
  await loadFont('Inter', 'Regular');

  const sections = [
    { label: 'Primary', y: 220 },
    { label: 'Secondary', y: 560 },
    { label: 'Link', y: 900 },
  ];

  for (const sec of sections) {
    // Section label
    const lbl = await createText({ content: sec.label, x: 80, y: sec.y, fontSize: 40, fontFamily: 'Inter', fontStyle: 'Bold', color: '#000' });
    frame.appendChild(lbl);

    // Column labels
    const lightLbl = await createText({ content: 'For Light Backgrounds', x: 400, y: sec.y + 56, fontSize: 18, fontFamily: 'Inter', fontStyle: 'Regular', color: '#666' });
    frame.appendChild(lightLbl);
    const darkLbl = await createText({ content: 'For Dark Backgrounds', x: 900, y: sec.y + 56, fontSize: 18, fontFamily: 'Inter', fontStyle: 'Regular', color: '#666' });
    frame.appendChild(darkLbl);

    // Dark bg panel
    const darkPanel = createRect(880, sec.y + 90, 600, 200, '#383838', 8);
    frame.appendChild(darkPanel);

    if (sec.label === 'Primary') {
      // Default
      const btn1 = createRect(400, sec.y + 110, 200, 48, primaryHex, br);
      frame.appendChild(btn1);
      const btn1t = await createText({ content: 'This is a Button', x: 420, y: sec.y + 124, fontSize: 16, fontFamily: 'Inter', fontStyle: 'Bold', color: '#FFFFFF' });
      frame.appendChild(btn1t);

      // Hover
      const btn2 = createRect(400, sec.y + 186, 200, 48, '#FFFFFF', br, primaryHex, 1.5);
      frame.appendChild(btn2);
      const btn2t = await createText({ content: 'This is a Button', x: 420, y: sec.y + 200, fontSize: 16, fontFamily: 'Inter', fontStyle: 'Bold', color: primaryHex });
      frame.appendChild(btn2t);

      // Dark bg variants
      const btn3 = createRect(900, sec.y + 110, 200, 48, primaryHex, br);
      frame.appendChild(btn3);
      const btn3t = await createText({ content: 'This is a Button', x: 920, y: sec.y + 124, fontSize: 16, fontFamily: 'Inter', fontStyle: 'Bold', color: '#FFFFFF' });
      frame.appendChild(btn3t);

    } else if (sec.label === 'Secondary') {
      const btn1 = createRect(400, sec.y + 110, 200, 48, '#FFFFFF', br, primaryHex, 1.5);
      frame.appendChild(btn1);
      const btn1t = await createText({ content: 'This is a Button', x: 420, y: sec.y + 124, fontSize: 16, fontFamily: 'Inter', fontStyle: 'Bold', color: primaryHex });
      frame.appendChild(btn1t);

      const btn2 = createRect(400, sec.y + 186, 200, 48, primaryHex, br);
      frame.appendChild(btn2);
      const btn2t = await createText({ content: 'This is a Button', x: 420, y: sec.y + 200, fontSize: 16, fontFamily: 'Inter', fontStyle: 'Bold', color: '#FFFFFF' });
      frame.appendChild(btn2t);

    } else if (sec.label === 'Link') {
      const btn1t = await createText({ content: 'See More →', x: 400, y: sec.y + 124, fontSize: 16, fontFamily: 'Inter', fontStyle: 'Bold', color: '#000000' });
      frame.appendChild(btn1t);
      const btn2t = await createText({ content: 'See More →', x: 400, y: sec.y + 172, fontSize: 16, fontFamily: 'Inter', fontStyle: 'Bold', color: primaryHex });
      frame.appendChild(btn2t);
    }
  }

  return frame;
}

// ═══════════════════════════════════════════════
//  FRAME 8: IMAGES
// ═══════════════════════════════════════════════
async function createImagesFrame(data) {
  const frame = figma.createFrame();
  frame.name = 'Images';
  frame.resize(1920, 3703);
  frame.fills = solidFill('#FFFFFF');
  frame.clipsContent = true;

  const primaryHex = data.colors?.[0]?.hex || '#2078BA';
  await addFrameHeader(frame, 'Images', primaryHex, null);

  const images = data.images || [];
  const cols = 3;
  const imgW = 560;
  const imgH = 420;
  const gap = 40;
  const startX = 80;
  const startY = 220;

  if (images.length === 0) {
    const empty = await createText({ content: 'Nenhuma imagem adicionada.', x: 80, y: 260, fontSize: 24, fontFamily: 'Inter', fontStyle: 'Regular', color: '#999' });
    frame.appendChild(empty);
  }

  for (let i = 0; i < images.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * (imgW + gap);
    const y = startY + row * (imgH + gap);

    try {
      const base64 = images[i].split(',')[1];
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const img = figma.createImage(bytes);
      const r = createRect(x, y, imgW, imgH, null, 8);
      r.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: img.hash }];
      frame.appendChild(r);
    } catch(e) {
      const placeholder = createRect(x, y, imgW, imgH, '#f0f0f0', 8);
      frame.appendChild(placeholder);
    }
  }

  return frame;
}

// ═══════════════════════════════════════════════
//  FRAME 9: COMPONENTS (empty)
// ═══════════════════════════════════════════════
async function createComponentsFrame(data) {
  const frame = figma.createFrame();
  frame.name = 'Components';
  frame.resize(1920, 2059);
  frame.fills = solidFill('#FFFFFF');
  frame.clipsContent = true;

  const primaryHex = data.colors?.[0]?.hex || '#2078BA';
  await addFrameHeader(frame, 'Components', primaryHex, null);

  const placeholder = await createText({
    content: 'Components — será preenchido manualmente',
    x: 80, y: 260, fontSize: 28, fontFamily: 'Inter', fontStyle: 'Regular', color: '#cccccc'
  });
  frame.appendChild(placeholder);

  return frame;
}

// ═══════════════════════════════════════════════
//  MAIN HANDLER
// ═══════════════════════════════════════════════
figma.ui.onmessage = async (msg) => {
  if (msg.type !== 'CREATE_STYLE_GUIDE') return;

  const data = msg.data;
  let framesCreated = 0;

  try {
    // Create a new page for the style guide
    const page = figma.createPage();
    page.name = `Style Guide — ${data.project?.name || 'D&Z'}`;
    figma.currentPage = page;

    const LAYOUT_GAP = 100;
    let currentX = 0;

    const addFrame = (frame) => {
      frame.x = currentX;
      frame.y = 0;
      page.appendChild(frame);
      currentX += frame.width + LAYOUT_GAP;
      framesCreated++;
    };

    progress('Criando Project Introduction...', 5, 'intro');
    addFrame(await createProjectIntroFrame(data));

    progress('Criando Font Weight...', 15, 'fontweight');
    addFrame(await createFontWeightFrame(data));

    progress('Criando Font Sizes...', 25, 'fontsizes');
    addFrame(await createFontSizesFrame(data));

    progress('Criando Styles...', 40, 'styles');
    addFrame(await createStylesFrame(data));

    progress('Criando Spacing...', 50, 'spacing');
    addFrame(await createSpacingFrame(data));

    progress('Criando Colors...', 60, 'colors');
    addFrame(await createColorsFrame(data));

    progress('Criando Buttons...', 72, 'buttons');
    addFrame(await createButtonsFrame(data));

    progress('Criando Images...', 84, 'images');
    addFrame(await createImagesFrame(data));

    progress('Criando Components...', 95, 'components');
    addFrame(await createComponentsFrame(data));

    // Zoom to fit
    figma.viewport.scrollAndZoomIntoView(page.children);

    figma.ui.postMessage({ type: 'DONE', framesCreated });
    figma.notify(`✅ Style Guide criado com ${framesCreated} frames!`);

  } catch (error) {
    figma.ui.postMessage({ type: 'ERROR', message: String(error) });
    figma.notify('❌ Erro ao criar style guide: ' + String(error), { error: true });
  }
};
