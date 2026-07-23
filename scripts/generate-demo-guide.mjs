/**
 * Hubify Demo Walkthrough Guide Generator
 *
 * Usage:  node scripts/generate-demo-guide.mjs
 * Output: screenshots/Hubify_Demo_Guide.pdf
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PDF   = path.join(__dirname, '../screenshots/Hubify_Demo_Guide.pdf');
const IMG_DIR   = path.join(__dirname, '../screenshots');
fs.mkdirSync(IMG_DIR, { recursive: true });

// ─── Brand palette ────────────────────────────────────────────────────────────
const TEAL         = '#0d9488';
const TEAL_DARK    = '#0f766e';
const TEAL_LIGHT   = '#f0fdfa';
const TEAL_BORDER  = '#99f6e4';
const SLATE_900    = '#0f172a';
const SLATE_700    = '#334155';
const SLATE_500    = '#64748b';
const SLATE_300    = '#cbd5e1';
const SLATE_200    = '#e2e8f0';
const SLATE_100    = '#f1f5f9';
const SLATE_50     = '#f8fafc';
const WHITE        = '#ffffff';
const GREEN        = '#16a34a';
const GREEN_LIGHT  = '#dcfce7';
const ORANGE       = '#d97706';
const ORANGE_LIGHT = '#fff7ed';
const RED          = '#dc2626';
const RED_LIGHT    = '#fef2f2';
const BLUE         = '#2563eb';
const BLUE_LIGHT   = '#eff6ff';
const PURPLE       = '#7c3aed';
const PURPLE_LIGHT = '#f5f3ff';
const AMBER_LIGHT  = '#fffbeb';

// ─── Layout constants ─────────────────────────────────────────────────────────
const PW     = 612;
const PH     = 792;
const ML     = 52;
const MR     = 52;
const BODY_W = PW - ML - MR;

// ─── PDF setup ────────────────────────────────────────────────────────────────
const doc = new PDFDocument({ size: 'LETTER', margin: 0, autoFirstPage: false, bufferPages: true });
const outStream = fs.createWriteStream(OUT_PDF);
doc.pipe(outStream);

let _pageNum = 0;
doc.on('pageAdded', () => { _pageNum++; });

function newPage() {
  doc.addPage();
  doc.rect(0, 0, PW, 4).fill(TEAL);
}

function footer() {
  if (_pageNum < 2) return;
  const savedY = doc.y;
  doc.save();
  doc.fillColor(SLATE_300).font('Helvetica').fontSize(8);
  doc.text('Hubify · Demo Walkthrough Guide · Confidential', ML, PH - 26, { width: 280 });
  doc.text(`Page ${_pageNum}`, PW - ML - 60, PH - 26, { width: 60, align: 'right' });
  doc.restore();
  doc.y = savedY;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function checkRoom(needed = 80) {
  if (doc.y > PH - 50 - needed) {
    footer();
    newPage();
    doc.y = 52;
  }
}

function hline(color = SLATE_200, weight = 0.5) {
  doc.moveDown(0.35);
  doc.moveTo(ML, doc.y).lineTo(PW - MR, doc.y).lineWidth(weight).strokeColor(color).stroke();
  doc.moveDown(0.55);
}

// Measure text height properly
function textHeight(text, { font = 'Helvetica', size = 10.5, width = BODY_W, lineGap = 4 } = {}) {
  doc.font(font).fontSize(size);
  return doc.heightOfString(text, { width, lineGap });
}

function para(text, { color = SLATE_700, size = 10.5, bold = false, indent = ML, width = BODY_W, gap = 4 } = {}) {
  checkRoom(textHeight(text, { width }) + 24);
  doc.fillColor(color)
     .font(bold ? 'Helvetica-Bold' : 'Helvetica')
     .fontSize(size)
     .text(text, indent, doc.y, { width, lineGap: gap });
  doc.moveDown(0.45);
}

function subheading(text, { color = SLATE_900, topGap = 0.3 } = {}) {
  checkRoom(44);
  doc.moveDown(topGap);
  doc.fillColor(color).font('Helvetica-Bold').fontSize(11.5).text(text, ML, doc.y);
  doc.moveDown(0.35);
}

function bullet(items, { indent = ML + 14 } = {}) {
  items.forEach(item => {
    const h = textHeight(item, { width: BODY_W - (indent - ML), size: 10.5 }) + 12;
    checkRoom(h);
    const y = doc.y;
    doc.circle(ML + 5, y + 5.5, 2.5).fill(TEAL);
    doc.fillColor(SLATE_700).font('Helvetica').fontSize(10.5)
       .text(item, indent, y, { width: BODY_W - (indent - ML), lineGap: 4 });
    doc.moveDown(0.25);
  });
  doc.moveDown(0.3);
}

function steps(items) {
  items.forEach((item, i) => {
    const detailH = item.detail ? textHeight(item.detail, { width: BODY_W - 28, size: 10 }) : 0;
    checkRoom(28 + detailH + 10);
    const y = doc.y;
    doc.circle(ML + 9, y + 9, 9).fill(TEAL);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(9)
       .text(String(i + 1), ML, y + 4, { width: 18, align: 'center' });
    doc.fillColor(SLATE_900).font('Helvetica-Bold').fontSize(10.5)
       .text(item.title, ML + 24, y + 3);
    if (item.detail) {
      doc.fillColor(SLATE_500).font('Helvetica').fontSize(10)
         .text(item.detail, ML + 24, doc.y + 2, { width: BODY_W - 24, lineGap: 3 });
    }
    doc.moveDown(0.7);
  });
}

function tip(text) {
  const th = textHeight(text, { width: BODY_W - 56, size: 9.5 });
  const bh = Math.max(42, th + 18);
  checkRoom(bh + 16);
  const y = doc.y;
  doc.roundedRect(ML, y, BODY_W, bh, 6).fill(TEAL_LIGHT).stroke(TEAL_BORDER);
  doc.fillColor(TEAL_DARK).font('Helvetica-Bold').fontSize(8.5).text('TIP', ML + 12, y + 10);
  doc.fillColor(TEAL_DARK).font('Helvetica').fontSize(9.5)
     .text(text, ML + 44, y + 10, { width: BODY_W - 56, lineGap: 3 });
  doc.y = y + bh + 10;
  doc.moveDown(0.3);
}

function callout(text, { label = 'NOTE', bg = AMBER_LIGHT, border = '#fed7aa', labelColor = ORANGE, textColor = '#92400e', labelW = 44 } = {}) {
  const th = textHeight(text, { width: BODY_W - labelW - 24, size: 9.5 });
  const bh = Math.max(44, th + 18);
  checkRoom(bh + 16);
  const y = doc.y;
  doc.roundedRect(ML, y, BODY_W, bh, 6).fill(bg).stroke(border);
  doc.fillColor(labelColor).font('Helvetica-Bold').fontSize(8.5).text(label, ML + 12, y + 12);
  doc.fillColor(textColor).font('Helvetica').fontSize(9.5)
     .text(text, ML + labelW + 12, y + 11, { width: BODY_W - labelW - 24, lineGap: 3 });
  doc.y = y + bh + 10;
  doc.moveDown(0.3);
}

function credBox(label, value, { labelColor = TEAL_DARK, bg = TEAL_LIGHT, border = TEAL_BORDER, labelW = 90 } = {}) {
  const th = textHeight(value, { size: 10, width: BODY_W - labelW - 24 });
  const bh = Math.max(30, th + 16);
  checkRoom(bh + 8);
  const y = doc.y;
  doc.roundedRect(ML, y, BODY_W, bh, 5).fill(bg).stroke(border);
  doc.fillColor(labelColor).font('Helvetica-Bold').fontSize(9).text(label, ML + 12, y + (bh / 2) - 5, { width: labelW });
  doc.fillColor(SLATE_900).font('Helvetica').fontSize(10).text(value, ML + labelW + 12, y + (bh / 2) - 5, { width: BODY_W - labelW - 24 });
  doc.y = y + bh + 6;
}

// table2: properly calculates row heights using heightOfString to prevent overlap
function table2(rows, col1Label = 'Item', col2Label = 'Description', { col1W = 150 } = {}) {
  const C2 = BODY_W - col1W - 8;
  checkRoom(28);
  // Header
  const y0 = doc.y;
  doc.rect(ML, y0, BODY_W, 22).fill(TEAL);
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(9)
     .text(col1Label, ML + 6, y0 + 7, { width: col1W - 8 })
     .text(col2Label, ML + col1W + 6, y0 + 7, { width: C2 - 4 });
  doc.y = y0 + 22;

  rows.forEach((row, i) => {
    const col1H = textHeight(row[0], { font: 'Helvetica-Bold', size: 9.5, width: col1W - 12 });
    const col2H = textHeight(row[1], { font: 'Helvetica', size: 9.5, width: C2 - 8 });
    const rowH  = Math.max(col1H, col2H) + 14;
    checkRoom(rowH + 4);
    const y = doc.y;
    if (i % 2 === 0) doc.rect(ML, y, BODY_W, rowH).fill(SLATE_50);
    doc.moveTo(ML, y).lineTo(PW - MR, y).lineWidth(0.3).strokeColor(SLATE_200).stroke();
    doc.fillColor(SLATE_900).font('Helvetica-Bold').fontSize(9.5)
       .text(row[0], ML + 6, y + 7, { width: col1W - 12 });
    doc.fillColor(SLATE_700).font('Helvetica').fontSize(9.5)
       .text(row[1], ML + col1W + 6, y + 7, { width: C2 - 8, lineGap: 2 });
    doc.y = y + rowH;
  });
  doc.moveDown(0.9);
}

function inlinePill(x, y, text, bg, fg) {
  doc.font('Helvetica-Bold').fontSize(8);
  const w = doc.widthOfString(text) + 14;
  doc.roundedRect(x, y - 1, w, 15, 3).fill(bg);
  doc.fillColor(fg).text(text, x + 7, y + 2);
  return w + 6;
}

function section(num, title, subtitle = '') {
  footer();
  newPage();
  // Faint section number watermark
  doc.save();
  doc.opacity(0.05);
  doc.fillColor(TEAL).font('Helvetica-Bold').fontSize(140)
     .text(String(num).padStart(2, '0'), PW - 180, -10, { width: 200, align: 'right' });
  doc.restore();
  doc.fillColor(TEAL).font('Helvetica-Bold').fontSize(9).text(`SECTION ${String(num).padStart(2,'0')}`, ML, 22);
  doc.fillColor(SLATE_900).font('Helvetica-Bold').fontSize(22)
     .text(title, ML, 34, { width: 450 });
  if (subtitle) {
    doc.fillColor(SLATE_500).font('Helvetica').fontSize(10.5)
       .text(subtitle, ML, doc.y + 3, { width: 450 });
  }
  doc.y = 94;
  hline(TEAL_BORDER, 1.5);
}

// ─── Screenshot frame: embeds a real image or draws a labelled placeholder ───
function screenshotFrame(imgPath, caption, { h = 180 } = {}) {
  checkRoom(h + 44);
  const y = doc.y;
  const frameW = BODY_W;

  // Outer frame
  doc.roundedRect(ML, y, frameW, h + 26, 6)
     .fill(SLATE_900).stroke(SLATE_700);

  // Fake browser chrome bar
  doc.roundedRect(ML + 1, y + 1, frameW - 2, 22, 5).fill('#1e293b');
  // Traffic lights
  doc.circle(ML + 14, y + 12, 4).fill('#ef4444');
  doc.circle(ML + 26, y + 12, 4).fill('#f59e0b');
  doc.circle(ML + 38, y + 12, 4).fill('#22c55e');
  // Address bar
  doc.roundedRect(ML + 52, y + 6, frameW - 100, 12, 3).fill('#0f172a');
  doc.fillColor(SLATE_300).font('Helvetica').fontSize(7.5)
     .text('hubifyhomesonline.com', ML + 58, y + 9, { width: frameW - 110 });

  // Image or placeholder
  const imgY = y + 24;
  const imgH = h;

  if (imgPath && fs.existsSync(imgPath)) {
    try {
      doc.image(imgPath, ML + 1, imgY, { width: frameW - 2, height: imgH, cover: [frameW - 2, imgH], align: 'center', valign: 'top' });
    } catch {
      drawPlaceholder(ML + 1, imgY, frameW - 2, imgH, caption);
    }
  } else {
    drawPlaceholder(ML + 1, imgY, frameW - 2, imgH, caption);
  }

  // Caption bar
  doc.rect(ML, y + h + 24, BODY_W, 2).fill(TEAL);

  doc.y = y + h + 26 + 10;

  if (caption) {
    doc.fillColor(SLATE_500).font('Helvetica').fontSize(8.5)
       .text(caption, ML, doc.y, { width: BODY_W, align: 'center' });
    doc.moveDown(0.6);
  }
  doc.moveDown(0.3);
}

function drawPlaceholder(x, y, w, h, label = '') {
  doc.rect(x, y, w, h).fill('#0f172a');
  // Grid lines (subtle)
  doc.save();
  doc.opacity(0.07);
  for (let gx = x; gx < x + w; gx += 40) {
    doc.moveTo(gx, y).lineTo(gx, y + h).lineWidth(0.5).strokeColor(WHITE).stroke();
  }
  for (let gy = y; gy < y + h; gy += 40) {
    doc.moveTo(x, gy).lineTo(x + w, gy).lineWidth(0.5).strokeColor(WHITE).stroke();
  }
  doc.restore();
  // Center label
  const lh = textHeight(label, { font: 'Helvetica-Bold', size: 12, width: w - 40 });
  doc.fillColor(TEAL).font('Helvetica-Bold').fontSize(12)
     .text(label, x, y + (h / 2) - lh / 2, { width: w, align: 'center' });
}

// ─── UI Preview Panel (for describing a screen section without a screenshot) ──
function uiPanel(lines, { title = null, bg = SLATE_50, border = SLATE_200 } = {}) {
  const contentH = lines.reduce((acc, l) => acc + textHeight(l.text || l, { size: l.size || 9.5, width: BODY_W - 32 }) + 10, 0);
  const panelH   = contentH + (title ? 38 : 16);
  checkRoom(panelH + 16);
  const y = doc.y;
  doc.roundedRect(ML, y, BODY_W, panelH, 6).fill(bg).stroke(border);
  let cy = y + 8;
  if (title) {
    doc.fillColor(SLATE_900).font('Helvetica-Bold').fontSize(9).text(title, ML + 12, cy);
    cy += 20;
    doc.moveTo(ML + 12, cy).lineTo(ML + BODY_W - 12, cy).lineWidth(0.3).strokeColor(border).stroke();
    cy += 8;
  }
  lines.forEach(l => {
    const text  = typeof l === 'string' ? l : l.text;
    const color = typeof l === 'string' ? SLATE_700 : (l.color || SLATE_700);
    const bold  = typeof l === 'string' ? false : !!l.bold;
    const size  = typeof l === 'string' ? 9.5 : (l.size || 9.5);
    const lh = textHeight(text, { size, width: BODY_W - 32 });
    doc.fillColor(color).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size)
       .text(text, ML + 12, cy, { width: BODY_W - 24, lineGap: 3 });
    cy += lh + 10;
  });
  doc.y = y + panelH + 12;
}

// ─── Property scenario row ────────────────────────────────────────────────────
function propRow(num, name, type, city, scenario, talking) {
  const scenH   = textHeight(scenario, { size: 9.5, width: BODY_W - 44 });
  const talkH   = talking ? textHeight(`"${talking}"`, { size: 9, width: BODY_W - 44 }) : 0;
  const totalH  = 10 + 16 + 12 + scenH + (talking ? talkH + 8 : 0) + 12;
  checkRoom(totalH + 4);
  const y = doc.y;

  // Number badge
  doc.roundedRect(ML, y + 4, 28, 28, 4).fill(TEAL);
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(11)
     .text(String(num), ML, y + 11, { width: 28, align: 'center' });

  // Name
  doc.fillColor(SLATE_900).font('Helvetica-Bold').fontSize(10.5)
     .text(name, ML + 36, y + 4, { width: BODY_W - 36 });

  // Type + city
  const metaY = y + 4 + textHeight(name, { font: 'Helvetica-Bold', size: 10.5, width: BODY_W - 36 }) + 2;
  doc.fillColor(SLATE_500).font('Helvetica').fontSize(9)
     .text(`${type}  ·  ${city}`, ML + 36, metaY);

  // Scenario
  const scenY = metaY + 14;
  doc.fillColor(TEAL_DARK).font('Helvetica-Bold').fontSize(9)
     .text('Scenario: ', ML + 36, scenY, { continued: true });
  doc.fillColor(SLATE_700).font('Helvetica').fontSize(9).text(scenario);

  // Talking point
  if (talking) {
    const talkY = doc.y + 4;
    doc.fillColor(SLATE_500).font('Helvetica').fontSize(9)
       .text(`"${talking}"`, ML + 36, talkY, { width: BODY_W - 36, lineGap: 2 });
  }
  doc.moveDown(0.5);

  // Divider
  doc.moveTo(ML + 36, doc.y + 2).lineTo(PW - MR, doc.y + 2)
     .lineWidth(0.3).strokeColor(SLATE_200).stroke();
  doc.moveDown(0.65);
}

// ─────────────────────────────────────────────────────────────────────────────
//  COVER PAGE
// ─────────────────────────────────────────────────────────────────────────────
doc.addPage();
doc.rect(0, 0, PW, PH).fill(TEAL);

// Subtle geometric shapes
doc.save();
doc.opacity(0.08);
doc.circle(PW + 40, -40, 300).fill(WHITE);
doc.circle(-20, PH + 20, 220).fill(WHITE);
doc.restore();

// Dark bottom third
doc.save();
doc.opacity(0.22);
doc.rect(0, PH * 0.60, PW, PH * 0.40).fill(SLATE_900);
doc.restore();

// Logo wordmark
doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(52).text('Hubify', ML, 130);
doc.save();
doc.opacity(0.65);
doc.fillColor(WHITE).font('Helvetica').fontSize(16).text('Property Management Platform', ML + 3, 194);
doc.restore();

// Divider
doc.moveDown(0.4);
doc.moveTo(ML, 220).lineTo(ML + 240, 220).lineWidth(1).strokeColor('rgba(255,255,255,0.3)').stroke();

// Guide title
doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(28).text('Demo Walkthrough Guide', ML, 236);
doc.save();
doc.opacity(0.72);
doc.fillColor(WHITE).font('Helvetica').fontSize(11.5)
   .text('A step-by-step tour of the Hubify demo environment\nfor sales calls, prospect walkthroughs, and self-guided evaluation', ML, 270);
doc.restore();

// Credential strip
doc.rect(0, PH - 92, PW, 92).fill('rgba(0,0,0,0.30)');
doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(8.5)
   .text('STAFF ADMIN LOGIN', ML, PH - 76);
doc.save();
doc.opacity(0.85);
doc.fillColor(WHITE).font('Helvetica').fontSize(10)
   .text('demo@hubifyhomesonline.com   /   Demo2026!', ML, PH - 62);
doc.restore();
doc.save();
doc.opacity(0.45);
doc.fillColor(WHITE).font('Helvetica').fontSize(9)
   .text(`Confidential  ·  ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`, ML, PH - 32);
doc.restore();

// ─────────────────────────────────────────────────────────────────────────────
//  TABLE OF CONTENTS
// ─────────────────────────────────────────────────────────────────────────────
newPage();
doc.fillColor(SLATE_900).font('Helvetica-Bold').fontSize(20).text('Contents', ML, 24);
hline(TEAL, 2);
doc.y = 60;

const toc = [
  [1, 'Demo Credentials & First Login'],
  [2, 'Dashboard — Your Opening Slide'],
  [3, 'The 10 Demo Properties'],
  [4, 'Tasks & Inspections'],
  [5, 'Calendar'],
  [6, 'Invoices & Billing'],
  [7, 'Dispatch Center'],
  [8, 'Team Management'],
  [9, 'FAQs & Objection Responses'],
];

toc.forEach(([num, title], i) => {
  const y = doc.y;
  if (i % 2 === 0) doc.rect(ML, y - 2, BODY_W, 24).fill(SLATE_50);
  doc.roundedRect(ML + 4, y + 3, 20, 16, 3).fill(TEAL);
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(8)
     .text(String(num), ML + 4, y + 7, { width: 20, align: 'center' });
  doc.fillColor(SLATE_900).font('Helvetica').fontSize(11)
     .text(title, ML + 32, y + 5);
  doc.y = y + 24;
});

doc.moveDown(1);
callout(
  'This guide is for the person running the demo. Keep it open alongside the live site as you walk through each section.',
  { label: 'HOW TO USE', bg: TEAL_LIGHT, border: TEAL_BORDER, labelColor: TEAL_DARK, textColor: TEAL_DARK, labelW: 76 }
);

footer();

// ─────────────────────────────────────────────────────────────────────────────
//  1. CREDENTIALS & FIRST LOGIN
// ─────────────────────────────────────────────────────────────────────────────
section(1, 'Demo Credentials & First Login', 'One staff admin account — full platform access');

// Embed real login screenshot
const loginImg = path.join(IMG_DIR, 'demo_login.jpg');
screenshotFrame(loginImg, 'Staff login page — /staff/login', { h: 200 });

subheading('Staff Admin Account  (full platform access)');
credBox('URL:', '/staff/login  →  sign in with email and password');
credBox('Email:', 'demo@hubifyhomesonline.com');
credBox('Password:', 'Demo2026!');
doc.moveDown(0.6);

subheading('Demo Organization');
para('The demo org is "Hubify Demo Portfolio" — a fictional Florida-based property management company. Everything you see after login is pre-loaded with realistic operational data across 10 active properties.');

callout(
  'Never enter real client data into the demo environment. The demo can be fully reset from Super Admin at any time.',
  { label: 'IMPORTANT', bg: RED_LIGHT, border: '#fecaca', labelColor: RED, textColor: '#991b1b', labelW: 60 }
);

subheading('Demo Team Members');
table2([
  ['Demo Admin',      'Full admin access — the primary account for all staff walkthroughs'],
  ['Demo Supervisor', 'Supervisor role — shows permission differences from admin'],
  ['Demo Staff 1',    'Field staff — assigned to most on-site tasks in the demo'],
  ['Demo Staff 2',    'Field staff — shows task assignment and handoff scenarios'],
], 'Account', 'Role & Purpose', { col1W: 130 });

tip('After logging in, the dashboard loads automatically with live data from all 10 demo properties — no setup or configuration needed.');

// ─────────────────────────────────────────────────────────────────────────────
//  2. DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
section(2, 'Dashboard — Your Opening Slide', 'The first screen after login — sets the stage for the whole demo');

screenshotFrame(null, 'Dashboard — /  (opens automatically after login)', { h: 160 });

para('The Dashboard loads the moment you sign in. Every widget pulls live data from the demo properties — nothing is hardcoded or mocked.');

subheading('What You\'ll See on the Dashboard');
table2([
  ['Statistics Overview', '10 properties active; task counts by status; pending invoices; team members — a real portfolio at a glance'],
  ['Urgent / Overdue Tasks', '3–5 overdue and high-priority tasks across the demo portfolio — use these as your entry point to Tasks'],
  ['Recent Activity Feed', 'Latest platform actions — confirms everything is live operational data'],
  ['Calendar Preview', 'Upcoming scheduled visits and vendor appointments — 5+ pre-seeded events'],
  ['Team Chat',  'Pre-seeded messages from demo staff — shows the real-time communication feed'],
], 'Widget', 'What to Point Out', { col1W: 150 });

subheading('Opening Script');
para('"When you log in every morning, this is your command center. You can see immediately if anything is urgent — right now there are overdue tasks that need attention. Let me click into one..."', { color: TEAL_DARK, bold: true, size: 10 });

tip('If the prospect\'s pain is billing, go straight to Invoices after the dashboard. If it\'s task management, click an overdue task. Always follow their pain point, not a fixed script.');

// ─────────────────────────────────────────────────────────────────────────────
//  3. DEMO PROPERTIES
// ─────────────────────────────────────────────────────────────────────────────
section(3, 'The 10 Demo Properties', 'A diverse Florida portfolio — every common property management scenario is covered');

screenshotFrame(null, 'Properties list — covers single-family, condos, luxury estates, and seasonal/snowbird homes', { h: 140 });

para('Each property is pre-loaded with tasks, access codes, vendor links, contacts, and inspection checklists. Navigate to any property → use the tabs: Overview, Tasks, Rooms, Access Control, Inspections.');

propRow(1, 'Beachside Breeze', 'Home Watch', 'Naples, FL',
  'HVAC fault discovered before owner arrival — urgent task open, vendor dispatched',
  'Bread-and-butter home watch scenario. Show the task, the photo attachment, and how the owner gets notified.');

propRow(2, 'Sunset Key Villa', 'Luxury Estate', 'Naples, FL',
  'Pool heater down + smart-home system offline — two open repair issues',
  'Great for luxury clients. Show the priority flag and vendor contact already linked for the repair.');

propRow(3, 'Coconut Harbor Retreat', 'Seasonal / Snowbird', 'Fort Myers, FL',
  'Hurricane prep tasks active — shows seasonal checklist and recurring schedule workflow',
  'Perfect for snowbird managers. Show the recurring inspection schedule and checklist items.');

propRow(4, 'Pelican Point Cottage', 'Emergency', 'Naples, FL',
  'Active water leak discovered during routine check — critical alert, plumber on-site today',
  'High-drama scenario. Click the critical alert badge and show how the team gets notified instantly.');

propRow(5, 'Royal Palm Estate', 'VIP Luxury', 'Palm Beach, FL',
  'Owner event preparation — 6 vendors being coordinated, pre-event inspection completed',
  'Shows multi-vendor coordination and multi-step task management for high-end clients.');

propRow(6, 'Marina Bay Condo', 'Rental', 'Fort Lauderdale, FL',
  'Guest turnover in progress — smart lock reset overdue, new guests arriving tomorrow',
  'Ideal for property managers with rental inventory. Show the urgent lock reset task.');

propRow(7, 'Gulfstream Manor', 'High Maintenance', 'Bonita Springs, FL',
  'Irrigation repair 3 days overdue + HOA violation risk if unresolved within 7 days',
  'Shows priority escalation. The overdue badge and HOA countdown make the urgency clear.');

propRow(8, 'The Sandpiper', 'Seasonal Arrival', 'Sarasota, FL',
  'Owner arriving 2 days early — rush prep tasks created, cleaning dispatched same-day',
  'Shows how Hubify handles schedule changes. Rush tasks were created when arrival moved up.');

propRow(9, 'Lighthouse Point', 'Storm Damage', 'Key West, FL',
  'Roof leak after storm — insurance documentation tasks active, roofer on-site today',
  'Point out the photo attachments — field staff photographed the damage on-site during the inspection.');

propRow(10, 'Oceanfront Oasis', 'Stable Premium', 'Delray Beach, FL',
  'All tasks current, no open issues — 4-year client with weekly and monthly recurring schedule',
  '"This is what a healthy account looks like." Use to contrast with the problem properties above.');

tip('Navigate to any property → Tasks tab to see all open, in-progress, and completed tasks for that address. The progress bar shows current status at a glance.');

// ─────────────────────────────────────────────────────────────────────────────
//  4. TASKS & INSPECTIONS
// ─────────────────────────────────────────────────────────────────────────────
section(4, 'Tasks & Inspections', 'The operational heart of the platform — 40+ pre-seeded tasks across all 10 properties');

screenshotFrame(null, 'Task list — filter by status, property, assignee, or due date in real time', { h: 150 });

subheading('Task Status Mix in the Demo');
doc.y += 4;
[
  ['Pending',      BLUE_LIGHT,  BLUE,    'Scheduled, not yet started — due today or in coming days'],
  ['In Progress',  '#fef9c3',   '#ca8a04','Actively being worked on — field staff on-site'],
  ['Completed',    GREEN_LIGHT, GREEN,   'Done with timestamp — shows completed history'],
  ['Overdue',      RED_LIGHT,   RED,     'Past due date, still open — creates urgency in the demo'],
].forEach(([label, bg, fg, desc]) => {
  checkRoom(26);
  const y = doc.y;
  const pw = inlinePill(ML, y, label, bg, fg);
  doc.fillColor(SLATE_700).font('Helvetica').fontSize(10.5)
     .text(desc, ML + pw + 8, y, { width: BODY_W - pw - 8 });
  doc.y = y + 24;
});
doc.moveDown(0.5);

subheading('Key Things to Demonstrate');
steps([
  { title: 'Open an overdue task', detail: 'Click an overdue item from the dashboard. Open the Gulfstream Manor irrigation task — it has an urgent priority badge, HOA note, and days-overdue indicator.' },
  { title: 'Complete a task live', detail: 'Open any "In Progress" task and move it to Completed. The timestamp records automatically. Say: "This is what your field staff does on their phone when the job is done."' },
  { title: 'Show recurring tasks', detail: 'Open Oceanfront Oasis → Tasks and find the weekly home watch. Show the recurrence schedule — next instance auto-creates on completion.' },
  { title: 'Walk through an inspection checklist', detail: 'Open any property → Inspections tab. Walk through a pre-seeded checklist: pass/fail results, notes, and photo attachments per room.' },
  { title: 'Create a task from a template', detail: 'Click "+ Task" → "Use Template". Show the Hurricane Prep or Turnover templates — pre-filled with checklist, estimated time, and priority.' },
]);

tip('Press T from anywhere to open the quick-task form — 15 seconds to create a task. This is the "wow" moment for most prospects.');

// ─────────────────────────────────────────────────────────────────────────────
//  5. CALENDAR
// ─────────────────────────────────────────────────────────────────────────────
section(5, 'Calendar', '10 pre-seeded events across all properties — conflict detection live');

screenshotFrame(null, 'Calendar — week and month views; staff scheduling and vendor appointments', { h: 155 });

para('The calendar has 10 demo events already in place. Several are linked to specific properties and vendor visits. Two overlap on the same staff member — this triggers the live conflict detection system.');

subheading('Pre-Seeded Events');
table2([
  ['Weekly Team Standup',       'Recurring Monday 9am — whole team; shows non-property scheduling'],
  ['CoolBreeze HVAC — Beachside','Tomorrow 10am — vendor visit linked to the HVAC task; shows property-event connection'],
  ['SmartHome Tech — Sunset Key','Tomorrow 1pm — linked to the smart-home offline task'],
  ['FastFlow Plumbing — Pelican','Today 8am — intentionally overlaps with another staff assignment (conflict trigger)'],
  ['Owner Arrival — The Sandpiper','2 days out — shows rush-arrival prep event with multi-staff attendance'],
  ['Hurricane Prep Deadline',   'Today 6am — Coconut Harbor deadline event with task link'],
  ['StormGuard Roofing — Lighthouse','Today 9am — same-day vendor on-site; shows emergency scheduling'],
  ['Owner Event — Royal Palm',  '6 days out — VIP event; shows supervisor managing high-value appointment'],
  ['Pre-Event Walkthrough',     '5 days out — day-before inspection linked to Royal Palm event'],
  ['Quarterly Portfolio Review','2 weeks out — management meeting; whole team attendees'],
], 'Event', 'What to Point Out', { col1W: 170 });

subheading('Conflict Detection Demo');
para('"Navigate to the Calendar and look at today\'s events. The FastFlow Plumbing visit overlaps with another staff assignment for the same person. Hubify flags this immediately — your supervisors see conflicts in real time."', { color: TEAL_DARK, bold: true, size: 10 });

subheading('iCal Sync');
steps([
  { title: 'Open User Menu → Settings → Calendar', detail: 'The iCal feed URL is shown in the Subscribe section.' },
  { title: 'Paste into Google Calendar or Outlook', detail: '"Add calendar by URL" — all Hubify events flow into their existing calendar, read-only, and update automatically.' },
]);

// ─────────────────────────────────────────────────────────────────────────────
//  6. INVOICES & BILLING
// ─────────────────────────────────────────────────────────────────────────────
section(6, 'Invoices & Billing', '7 invoices across every status — including a consolidated batch invoice');

screenshotFrame(null, 'Invoices list — sortable by status, client, amount, and due date', { h: 150 });

para('The demo has invoices in every possible state, including a consolidated batch invoice — the feature prospects most frequently cite as a must-have.');

subheading('Demo Invoices');
table2([
  ['DEMO-2026-001', 'Paid · $385 · Beachside Breeze · April home watch + weekly inspections'],
  ['DEMO-2026-002', 'Open · $520 · Beachside Breeze · May service + HVAC emergency coordination'],
  ['DEMO-2026-003', 'Paid · $1,850 · Royal Palm Estate · April full estate management + event prep'],
  ['DEMO-2026-004', 'Open · $2,460 · Royal Palm Estate · May estate + owner event (6 vendors)'],
  ['DEMO-2026-005', 'Paid · $285 · Marina Bay Condo · April turnover management + inspection'],
  ['DEMO-2026-006', 'Open · $310 · Marina Bay Condo · May turnover + guest prep'],
  ['DEMO-2026-CONSOL', 'Draft (Batch) · $985 · Beachside + Royal Palm + Marina Bay · May 2026 preview'],
], 'Invoice #', 'Status / Amount / Property', { col1W: 136 });

subheading('What to Demo');
steps([
  { title: 'Open the consolidated batch invoice', detail: 'Find DEMO-2026-CONSOL. Open it and scroll through the multi-property line items — three clients, single PDF. Say: "One invoice, one payment — instead of three separate sends."' },
  { title: 'Change a status (draft → sent)', detail: 'Open DEMO-2026-CONSOL. Change status to Sent. "The moment you flip this, it becomes visible in the client portal — clients can\'t see drafts no matter what. No accidental sends."' },
  { title: 'Show a paid invoice with Stripe receipt', detail: 'Open DEMO-2026-001. Show the payment method (Visa 4242), payment date, and Stripe receipt link — all captured automatically via webhook when the client paid online.' },
  { title: 'Invoice PDF preview', detail: 'Click the PDF icon on any invoice. The formatted invoice opens in a new tab — ready to download, email, or print.' },
]);

callout(
  'Draft invoices are never visible in the client portal — regardless of any setting. Clients only ever see Sent and Paid invoices.',
  { label: 'KEY POINT', bg: BLUE_LIGHT, border: '#bfdbfe', labelColor: BLUE, textColor: '#1e40af', labelW: 66 }
);

// ─────────────────────────────────────────────────────────────────────────────
//  7. DISPATCH CENTER
// ─────────────────────────────────────────────────────────────────────────────
section(7, 'Dispatch Center', 'Build daily itineraries and brief field staff before they leave');

screenshotFrame(null, 'Dispatch Center — daily itinerary builder with Route Brief slide-over', { h: 155 });

para('The Dispatch Center is where supervisors plan the day\'s property route for field staff — assigning which properties to visit, in what order, with stop durations and a full pre-departure brief.');

subheading('How to Demo It');
steps([
  { title: 'Navigate to Dispatch', detail: 'Click Dispatch in the main nav (Admin and Supervisor roles only). The today panel opens automatically.' },
  { title: 'Select or create an itinerary', detail: 'Click "New Itinerary" to create from scratch, or select today\'s if one exists from the left panel.' },
  { title: 'Add stops', detail: 'Click "+ Add Stop" → select a property → set an estimated duration. Drag to reorder the route.' },
  { title: 'Open the Route Brief', detail: 'Click the "Route Brief" button in the itinerary header. A side panel slides open with three tabs.' },
  { title: 'Walk through the Route Brief tabs', detail: 'Access Codes (tap eye icon to reveal), Alerts & Instructions (severity-sorted), Supplies (bring from stock vs. need to order).' },
  { title: 'Publish the itinerary', detail: 'Click Publish. The itinerary pushes to the assigned staff member\'s schedule.' },
]);

subheading('Route Brief — Three Tabs');
table2([
  ['Access Codes', 'All property codes for every stop on the route — door, gate, alarm, Wi-Fi. Values are masked by default; tap the eye icon to reveal. Prevents codes being visible during team briefings.'],
  ['Alerts & Instructions', 'Active property alerts (critical → warning → info) plus client notes. Critical items appear first in red. "Before your team leaves, they know about the dog, the alarm quirk, and the flooded back room."'],
  ['Supplies', '"Bring from stock" vs. "Need to purchase" — items due for replacement within 30 days, grouped by property. Checkboxes let staff tick off what\'s loaded in the van.'],
], 'Tab', 'What to Say', { col1W: 140 });

tip('"This replaces the clipboard, the group text, and the spreadsheet your dispatcher emailed this morning — all in one screen, always current, for every property on the route."');

// ─────────────────────────────────────────────────────────────────────────────
//  8. TEAM MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
section(8, 'Team Management', 'Roles, assignments, and staff coordination');

screenshotFrame(null, 'Team page — roster, roles, assignments, and invite flow', { h: 140 });

para('The demo team has 4 members: 1 admin, 1 supervisor, and 2 field staff — representing a typical small-to-mid-size operation. Navigate to Team in the main nav to show staff management.');

subheading('What to Show');
bullet([
  'Role hierarchy — Admin → Supervisor → Staff; each role sees a different version of the platform',
  'Inviting a new team member — click "Invite Team Member", enter an email, assign a role; they receive the invitation automatically',
  'Supervisor relationships — Demo Staff 1 has Demo Supervisor assigned; explains how task escalation flows',
  'Broadcast messaging — send a message or notification to the entire team from the Messages section',
]);

subheading('Role Permissions');
table2([
  ['Admin',      'Full access — billing, settings, team management, all property data'],
  ['Supervisor', 'All operational data; cannot change org settings or billing; manages task assignments'],
  ['Staff',      'Own tasks and assigned properties only — no billing, no team management'],
], 'Role', 'What They Can Access', { col1W: 100 });

subheading('Time Tracking (if enabled)');
para('If the prospect needs billable time logging, confirm the Time Tracking feature flag is on in Settings → Feature Flags before the demo. When enabled, staff can clock in and out on tasks and supervisors see a live time report.');

callout(
  'Features like Time Tracking, Zapier integration, and advanced reports are controlled by feature flags — easily toggled per organization.',
  { label: 'FEATURE FLAGS', bg: PURPLE_LIGHT, border: '#ddd6fe', labelColor: PURPLE, textColor: '#5b21b6', labelW: 80 }
);

// ─────────────────────────────────────────────────────────────────────────────
//  9. FAQs & OBJECTION RESPONSES
// ─────────────────────────────────────────────────────────────────────────────
section(9, 'FAQs & Objection Responses', 'Common questions and how to answer them confidently');

const faqs = [
  [
    '"We already use spreadsheets / a different tool."',
    'Hubify isn\'t just a better spreadsheet — it connects the job (task), the place (property), the person (client), and the money (invoice) in one record. When you complete a task, it\'s already attached to the right property and ready to invoice. No retyping, no cross-referencing between five tabs.',
  ],
  [
    '"Our clients don\'t want a portal — they just call us."',
    'The portal doesn\'t replace the phone call — it answers the questions that don\'t need one. "Did the inspector go today?" "Where\'s my invoice?" "Did that leak get fixed?" Clients check the portal and find the answer instantly. You get fewer interruptions; they get 24/7 visibility.',
  ],
  [
    '"What about importing our existing data?"',
    'We have a CSV import tool with AI-assisted field mapping — import your existing properties, contacts, and tasks. Most teams are fully migrated in a day. We also offer white-glove onboarding for larger portfolios.',
  ],
  [
    '"Is our data secure?"',
    'Hubify is fully multi-tenant — each organization is completely isolated. Client data is encrypted at rest and in transit. Access codes are stored encrypted. We\'re built on enterprise-grade infrastructure with SOC 2-aligned practices.',
  ],
  [
    '"What does it cost?"',
    'Pricing is based on the number of active properties in your portfolio. I can pull up the current plan options and we can walk through which tier fits your team. Would you like to do that now, or finish the demo first?',
  ],
  [
    '"We tried software before and the team didn\'t adopt it."',
    'Hubify\'s field staff interface works on any phone browser — no app to install, no training manual. Staff see only their assigned tasks. Supervisors see everything. The simpler the interface, the higher the adoption. Most teams are fully operational within a week.',
  ],
  [
    '"Can we try it before committing?"',
    'Absolutely — that\'s what this demo is for. After this walkthrough, we can set up a trial environment with your actual properties so you can see exactly how Hubify would work for your business.',
  ],
];

faqs.forEach(([q, a], i) => {
  const aH = textHeight(a, { size: 10.5, width: BODY_W - 20 });
  checkRoom(aH + 80);
  subheading(q, { topGap: i === 0 ? 0 : 0.4 });
  para(a);
  if (i < faqs.length - 1) hline();
});

doc.moveDown(0.5);
hline(TEAL, 1.5);

subheading('Demo Reset', { color: SLATE_500 });
para('If demo data gets changed during a walkthrough, reset it from Super Admin → Demo tab → "Reset Demo Data". This wipes and reseeds everything in about 30 seconds — the 10 properties, all tasks with their statuses, invoices, calendar events, and notifications are fully restored. The admin login is never changed.', { color: SLATE_500 });

doc.moveDown(0.5);
hline(TEAL, 1.5);
doc.moveDown(0.4);
doc.fillColor(TEAL_DARK).font('Helvetica-Bold').fontSize(10).text('Hubify  ·  hubifyhomesonline.com', ML, doc.y);

// ─── Finalize ─────────────────────────────────────────────────────────────────
footer();
doc.end();

await new Promise((resolve, reject) => {
  outStream.on('finish', resolve);
  outStream.on('error', reject);
});

const stat = fs.statSync(OUT_PDF);
console.log(`\n✓  PDF saved → ${OUT_PDF}`);
console.log(`   Size:  ${(stat.size / 1024).toFixed(1)} KB`);
