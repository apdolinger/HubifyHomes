/**
 * Hubify Demo Site — Comprehensive User Guide Generator
 *
 * Usage:  node scripts/generate-demo-user-guide.mjs
 * Output: screenshots/Hubify_Demo_User_Guide.pdf
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PDF = path.join(__dirname, '../screenshots/Hubify_Demo_User_Guide.pdf');
const IMG_DIR = path.join(__dirname, '../screenshots');
fs.mkdirSync(IMG_DIR, { recursive: true });

// ─── Palette ──────────────────────────────────────────────────────────────────
const TEAL        = '#0d9488';
const TEAL_DARK   = '#0f766e';
const TEAL_LIGHT  = '#f0fdfa';
const TEAL_BDR    = '#99f6e4';
const SLATE_900   = '#0f172a';
const SLATE_700   = '#334155';
const SLATE_600   = '#475569';
const SLATE_500   = '#64748b';
const SLATE_300   = '#cbd5e1';
const SLATE_200   = '#e2e8f0';
const SLATE_100   = '#f1f5f9';
const SLATE_50    = '#f8fafc';
const WHITE       = '#ffffff';
const GREEN       = '#16a34a';
const GREEN_LIGHT = '#dcfce7';
const GREEN_BDR   = '#86efac';
const AMBER       = '#d97706';
const AMBER_LIGHT = '#fffbeb';
const AMBER_BDR   = '#fde68a';
const RED         = '#dc2626';
const RED_LIGHT   = '#fef2f2';
const RED_BDR     = '#fecaca';
const BLUE        = '#2563eb';
const BLUE_LIGHT  = '#eff6ff';
const BLUE_BDR    = '#bfdbfe';
const PURPLE      = '#7c3aed';
const PURPLE_LT   = '#f5f3ff';
const PURPLE_BDR  = '#ddd6fe';

// ─── Layout ───────────────────────────────────────────────────────────────────
const PW = 612, PH = 792, ML = 52, MR = 52, BW = PW - ML - MR;

// ─── Doc setup ────────────────────────────────────────────────────────────────
const doc = new PDFDocument({ size: 'LETTER', margin: 0, autoFirstPage: false, bufferPages: true });
const ws  = fs.createWriteStream(OUT_PDF);
doc.pipe(ws);

let pageNum = 0;
doc.on('pageAdded', () => pageNum++);

// ─── Core helpers ─────────────────────────────────────────────────────────────
function newPage() { doc.addPage(); doc.rect(0, 0, PW, 4).fill(TEAL); }

function footer() {
  if (pageNum < 2) return;
  doc.save();
  doc.fillColor(SLATE_300).font('Helvetica').fontSize(8)
     .text('Hubify · Demo Site User Guide', ML, PH - 26, { width: 260 })
     .text(`${pageNum}`, PW - ML - 30, PH - 26, { width: 30, align: 'right' });
  doc.restore();
}

function strH(text, { font = 'Helvetica', size = 10.5, width = BW, lineGap = 4 } = {}) {
  doc.font(font).fontSize(size);
  return doc.heightOfString(text, { width, lineGap });
}

function room(needed = 80) {
  if (doc.y > PH - 52 - needed) { footer(); newPage(); doc.y = 52; }
}

function hline(color = SLATE_200, w = 0.5) {
  doc.moveDown(0.35);
  doc.moveTo(ML, doc.y).lineTo(PW - MR, doc.y).lineWidth(w).strokeColor(color).stroke();
  doc.moveDown(0.5);
}

function para(text, { color = SLATE_700, size = 10.5, bold = false, x = ML, width = BW, gap = 4 } = {}) {
  room(strH(text, { size, width }) + 20);
  doc.fillColor(color).font(bold ? 'Helvetica-Bold' : 'Helvetica')
     .fontSize(size).text(text, x, doc.y, { width, lineGap: gap });
  doc.moveDown(0.4);
}

function h2(text, { color = SLATE_900, top = 0.3 } = {}) {
  room(46);
  doc.moveDown(top);
  doc.fillColor(color).font('Helvetica-Bold').fontSize(12).text(text, ML, doc.y);
  doc.moveDown(0.35);
}

function h3(text, { color = SLATE_700 } = {}) {
  room(36);
  doc.moveDown(0.2);
  doc.fillColor(color).font('Helvetica-Bold').fontSize(10.5).text(text, ML, doc.y);
  doc.moveDown(0.25);
}

function bullet(items, { indent = ML + 14 } = {}) {
  items.forEach(item => {
    const iw = BW - (indent - ML);
    room(strH(item, { width: iw }) + 14);
    const y = doc.y;
    doc.circle(ML + 5, y + 5.5, 2.5).fill(TEAL);
    doc.fillColor(SLATE_700).font('Helvetica').fontSize(10.5)
       .text(item, indent, y, { width: iw, lineGap: 4 });
    doc.moveDown(0.22);
  });
  doc.moveDown(0.3);
}

function numbered(items) {
  items.forEach((item, i) => {
    const iw = BW - 26;
    room(strH(item, { width: iw }) + 14);
    const y = doc.y;
    doc.fillColor(TEAL).font('Helvetica-Bold').fontSize(10.5)
       .text(`${i + 1}.`, ML, y, { width: 20 });
    doc.fillColor(SLATE_700).font('Helvetica').fontSize(10.5)
       .text(item, ML + 26, y, { width: iw, lineGap: 4 });
    doc.moveDown(0.25);
  });
  doc.moveDown(0.3);
}

// Step-by-step with numbered circles
function steps(items) {
  items.forEach((item, i) => {
    const tw = typeof item === 'string' ? item : item.title;
    const det = typeof item === 'string' ? null : item.detail;
    const dh = det ? strH(det, { size: 10, width: BW - 28 }) : 0;
    room(strH(tw, { font: 'Helvetica-Bold', size: 10.5, width: BW - 28 }) + dh + 22);
    const y = doc.y;
    doc.circle(ML + 9, y + 9, 9).fill(TEAL);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(8.5)
       .text(String(i + 1), ML, y + 5, { width: 18, align: 'center' });
    doc.fillColor(SLATE_900).font('Helvetica-Bold').fontSize(10.5)
       .text(tw, ML + 24, y + 3);
    if (det) {
      doc.fillColor(SLATE_600).font('Helvetica').fontSize(10)
         .text(det, ML + 24, doc.y + 2, { width: BW - 24, lineGap: 3 });
    }
    doc.moveDown(0.7);
  });
}

// Callout boxes with dynamic height
function box(text, { label = 'TIP', bg = TEAL_LIGHT, bdr = TEAL_BDR, lc = TEAL_DARK, tc = TEAL_DARK, lw = 36 } = {}) {
  const tw  = BW - lw - 24;
  const th  = strH(text, { size: 9.5, width: tw, lineGap: 3 });
  const bh  = Math.max(42, th + 18);
  room(bh + 14);
  const y = doc.y;
  doc.roundedRect(ML, y, BW, bh, 6).fill(bg).stroke(bdr);
  doc.fillColor(lc).font('Helvetica-Bold').fontSize(8).text(label, ML + 10, y + (bh / 2) - 5, { width: lw });
  doc.fillColor(tc).font('Helvetica').fontSize(9.5)
     .text(text, ML + lw + 12, y + 10, { width: tw, lineGap: 3 });
  doc.y = y + bh + 10;
  doc.moveDown(0.2);
}

// Two-column feature list
function featureRow(icon, label, desc) {
  const dh = strH(desc, { size: 9.5, width: BW - 130 }) + 14;
  room(dh + 4);
  const y = doc.y;
  // Icon circle
  doc.circle(ML + 10, y + 10, 10).fill(TEAL_LIGHT).stroke(TEAL_BDR);
  doc.fillColor(TEAL_DARK).font('Helvetica-Bold').fontSize(9).text(icon, ML + 2, y + 6, { width: 18, align: 'center' });
  doc.fillColor(SLATE_900).font('Helvetica-Bold').fontSize(10).text(label, ML + 26, y + 5, { width: 96 });
  doc.fillColor(SLATE_600).font('Helvetica').fontSize(9.5)
     .text(desc, ML + 128, y + 5, { width: BW - 130, lineGap: 3 });
  doc.y = y + Math.max(dh, 22);
  doc.moveDown(0.15);
}

// Table with proper dynamic row heights
function table(headers, rows, colWidths) {
  const totW = colWidths.reduce((a, b) => a + b, 0);
  room(28);
  const y0 = doc.y;
  // Header
  doc.rect(ML, y0, totW, 22).fill(TEAL);
  let hx = ML;
  headers.forEach((h, i) => {
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(8.5)
       .text(h, hx + 6, y0 + 7, { width: colWidths[i] - 10 });
    hx += colWidths[i];
  });
  doc.y = y0 + 22;

  rows.forEach((row, ri) => {
    // Calculate row height
    const rowH = Math.max(...row.map((cell, ci) =>
      strH(cell, { size: 9.5, width: colWidths[ci] - 12, lineGap: 2 })
    )) + 14;
    room(rowH + 2);
    const ry = doc.y;
    if (ri % 2 === 0) doc.rect(ML, ry, totW, rowH).fill(SLATE_50);
    doc.moveTo(ML, ry).lineTo(ML + totW, ry).lineWidth(0.3).strokeColor(SLATE_200).stroke();
    let cx = ML;
    row.forEach((cell, ci) => {
      const bold = ci === 0;
      doc.fillColor(bold ? SLATE_900 : SLATE_700)
         .font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.5)
         .text(cell, cx + 6, ry + 7, { width: colWidths[ci] - 12, lineGap: 2 });
      cx += colWidths[ci];
    });
    doc.y = ry + rowH;
  });
  doc.moveDown(0.9);
}

// Keyboard shortcut row
function shortcut(key, desc) {
  room(26);
  const y = doc.y;
  const kw = doc.font('Helvetica-Bold').fontSize(9).widthOfString(key) + 16;
  doc.roundedRect(ML, y + 1, kw, 18, 3).fill(SLATE_100).stroke(SLATE_200);
  doc.fillColor(SLATE_900).font('Helvetica-Bold').fontSize(9).text(key, ML + 8, y + 5);
  doc.fillColor(SLATE_600).font('Helvetica').fontSize(10).text(desc, ML + kw + 10, y + 4);
  doc.y = y + 26;
}

// Pill badge inline
function pill(x, y, text, bg, fg) {
  doc.font('Helvetica-Bold').fontSize(8);
  const w = doc.widthOfString(text) + 14;
  doc.roundedRect(x, y, w, 15, 3).fill(bg);
  doc.fillColor(fg).text(text, x + 7, y + 3);
  return w + 6;
}

// Section header page
function section(num, title, subtitle = '') {
  footer();
  newPage();
  // Watermark number
  doc.save(); doc.opacity(0.04);
  doc.fillColor(TEAL).font('Helvetica-Bold').fontSize(160)
     .text(String(num).padStart(2, '0'), PW - 220, -20, { width: 240, align: 'right' });
  doc.restore();
  // Teal left accent bar
  doc.rect(ML - 8, 22, 4, 60).fill(TEAL);
  doc.fillColor(TEAL).font('Helvetica-Bold').fontSize(8.5)
     .text(`CHAPTER ${String(num).padStart(2, '0')}`, ML, 24);
  doc.fillColor(SLATE_900).font('Helvetica-Bold').fontSize(23)
     .text(title, ML, 36, { width: 460 });
  if (subtitle) {
    doc.fillColor(SLATE_500).font('Helvetica').fontSize(10.5)
       .text(subtitle, ML, doc.y + 3, { width: 460 });
  }
  doc.y = 98;
  hline(TEAL_BDR, 1.5);
}

// ─────────────────────────────────────────────────────────────────────────────
//  COVER
// ─────────────────────────────────────────────────────────────────────────────
doc.addPage();
// Deep slate bg
doc.rect(0, 0, PW, PH).fill(SLATE_900);
// Teal accent band top
doc.rect(0, 0, PW, 6).fill(TEAL);
// Diagonal teal shape
doc.save(); doc.opacity(0.07);
doc.polygon([0, PH * 0.35], [PW * 0.55, 0], [PW, 0], [PW, PH * 0.25], [0, PH * 0.70]).fill(TEAL);
doc.restore();

// Logo
doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(52).text('Hubify', ML, 120);
doc.fillColor(TEAL).font('Helvetica-Bold').fontSize(12).text('PROPERTY MANAGEMENT PLATFORM', ML + 2, 180);

// Title block
doc.moveTo(ML, 210).lineTo(ML + 300, 210).lineWidth(1).strokeColor(TEAL).stroke();
doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(30).text('Demo Site', ML, 220);
doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(30).text('User Guide', ML, 254);
doc.fillColor(SLATE_300).font('Helvetica').fontSize(12)
   .text('Everything you need to know about navigating,\nusing, and getting the most out of the Hubify demo environment.', ML, 296, { width: 400, lineGap: 5 });

// Credential card
doc.roundedRect(ML, PH - 155, BW, 110, 8).fill('#1e293b').stroke('#334155');
doc.fillColor(TEAL).font('Helvetica-Bold').fontSize(9).text('DEMO LOGIN CREDENTIALS', ML + 16, PH - 143);
doc.moveTo(ML + 16, PH - 131).lineTo(ML + BW - 16, PH - 131).lineWidth(0.5).strokeColor('#334155').stroke();

doc.fillColor(SLATE_300).font('Helvetica').fontSize(8.5).text('STAFF URL', ML + 16, PH - 122);
doc.fillColor(WHITE).font('Helvetica').fontSize(10).text('/staff/login', ML + 80, PH - 123);

doc.fillColor(SLATE_300).font('Helvetica').fontSize(8.5).text('EMAIL', ML + 16, PH - 107);
doc.fillColor(WHITE).font('Helvetica').fontSize(10).text('demo@hubifyhomesonline.com', ML + 80, PH - 108);

doc.fillColor(SLATE_300).font('Helvetica').fontSize(8.5).text('PASSWORD', ML + 16, PH - 92);
doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(10).text('Demo2026!', ML + 80, PH - 93);

doc.fillColor(SLATE_500).font('Helvetica').fontSize(8.5)
   .text(`Demo environment  ·  Confidential  ·  ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`, ML, PH - 66);
doc.rect(0, PH - 6, PW, 6).fill(TEAL);

// ─────────────────────────────────────────────────────────────────────────────
//  TABLE OF CONTENTS
// ─────────────────────────────────────────────────────────────────────────────
newPage();
doc.fillColor(SLATE_900).font('Helvetica-Bold').fontSize(22).text('Contents', ML, 24);
hline(TEAL, 2);
doc.y = 62;

const chapters = [
  [1,  'Getting Started',          'Login, navigation, dashboard overview'],
  [2,  'Properties',               'Viewing, managing, and exploring property details'],
  [3,  'Tasks & Inspections',      'Creating, completing, recurring tasks, checklists'],
  [4,  'Calendar',                 'Events, scheduling, conflict detection, iCal sync'],
  [5,  'Invoices & Billing',       'Invoice statuses, batch invoicing, Stripe payments'],
  [6,  'Dispatch Center',          'Itineraries, Route Brief, access codes, supplies'],
  [7,  'Team Management',          'Roles, permissions, assignments, communication'],
  [8,  'Settings & Customization', 'Feature flags, org settings, notifications'],
  [9,  'Tips, Shortcuts & FAQs',   'Power-user tips, keyboard shortcuts, common questions'],
];

chapters.forEach(([num, title, sub], i) => {
  const y = doc.y;
  if (i % 2 === 0) doc.rect(ML, y - 2, BW, 32).fill(SLATE_50);
  doc.roundedRect(ML + 4, y + 6, 22, 18, 3).fill(TEAL);
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(9)
     .text(String(num), ML + 4, y + 10, { width: 22, align: 'center' });
  doc.fillColor(SLATE_900).font('Helvetica-Bold').fontSize(11)
     .text(title, ML + 34, y + 5);
  doc.fillColor(SLATE_500).font('Helvetica').fontSize(9)
     .text(sub, ML + 34, doc.y + 1);
  doc.y = y + 32;
});

doc.moveDown(1);
box('All data in the demo environment is fictional. Nothing you do here affects real clients or real billing. The demo can be fully reset at any time from Super Admin → Demo tab → Reset Demo Data.',
  { label: 'NOTE', bg: SLATE_100, bdr: SLATE_200, lc: SLATE_500, tc: SLATE_700, lw: 36 });
footer();

// ─────────────────────────────────────────────────────────────────────────────
//  1. GETTING STARTED
// ─────────────────────────────────────────────────────────────────────────────
section(1, 'Getting Started', 'Logging in and finding your way around');

h2('How to Log In');
steps([
  { title: 'Open the staff login page', detail: 'Navigate to /staff/login in your browser. You\'ll see a clean login form with an email and password field.' },
  { title: 'Enter the demo credentials', detail: 'Email: demo@hubifyhomesonline.com  ·  Password: Demo2026!' },
  { title: 'Click Sign In', detail: 'You\'re taken directly to the Dashboard. No two-factor setup or onboarding required.' },
]);

h2('The Navigation Bar');
para('The left sidebar (or top nav on smaller screens) contains every major feature. Here\'s what each item does:');

table(
  ['Nav Item', 'What It Does', 'Who Can See It'],
  [
    ['Dashboard',        'Your daily command center — urgent tasks, stats, team chat, activity feed', 'All roles'],
    ['Properties',       'Full list of all 10 demo properties with search, filter, and sort', 'All roles'],
    ['Tasks',            'All tasks across every property — filterable by status, priority, and assignee', 'All roles'],
    ['Calendar',         'Event view of all scheduled visits, vendor appointments, and team events', 'All roles'],
    ['Contacts',         'Owners, tenants, vendors, and emergency contacts for the demo portfolio', 'All roles'],
    ['Invoices',         'Billing management — create, send, track, and collect payment on invoices', 'Admin, Supervisor'],
    ['Dispatch',         'Daily itinerary builder and Route Brief tool for field staff', 'Admin, Supervisor'],
    ['Team',             'Staff roster, roles, assignments, and invite management', 'Admin, Supervisor'],
    ['Admin',            'Settings, feature flags, billing config, email templates, forms', 'Admin only'],
  ],
  [130, 240, 138]
);

h2('The Dashboard at a Glance');
para('The Dashboard is the first thing you see after login. It\'s built from widgets — each one can be toggled on or off and reordered by drag-and-drop. Here\'s what the default layout includes:');

featureRow('!', 'Urgent Tasks', 'Lists all tasks with Urgent priority that are still Pending or In Progress. Clicking any task opens it in a full detail view. This widget is the fastest way to find "what needs attention today."');
featureRow('≡', 'Stats Overview', 'Four headline numbers: total active properties (10 in the demo), urgent tasks, overdue tasks, and active team members. These update live as you work.');
featureRow('✉', 'Team Chat', 'A running message thread shared across all staff. Pre-seeded with demo messages. Type a message and press Enter to post — it appears immediately for all logged-in users.');
featureRow('◷', 'Recent Activity', 'A timestamped log of everything that has happened in the platform — tasks created, statuses changed, contacts added, invoices sent. Filterable by type.');
featureRow('◻', 'Calendar', 'A compact event preview showing the next 7 days. Click any event to open the full calendar at that date.');

box('To customize which widgets appear and in what order, click the gear icon (⚙) in the top-right corner of the Dashboard. Changes are saved per user — each person has their own layout.', { label: 'TIP' });

h2('User Menu');
para('Click your name or avatar in the top-right corner to access:');
bullet([
  'Your profile — name, email, profile photo',
  'Notification preferences — which events trigger alerts',
  'Calendar settings and iCal subscription URL',
  'Log out',
]);

// ─────────────────────────────────────────────────────────────────────────────
//  2. PROPERTIES
// ─────────────────────────────────────────────────────────────────────────────
section(2, 'Properties', 'The 10 demo properties and how to navigate them');

h2('The Properties List');
para('Navigate to Properties in the left nav. You\'ll see all 10 demo properties displayed as cards or in a table — toggle between views using the icons at the top right of the list.');

para('Each property shows its name, type, city, status (occupied / vacant), and a count of open tasks at a glance. Properties are color-coded by status and urgency.');

h2('Filtering and Searching');
bullet([
  'Use the search bar to find a property by name, address, or city',
  'Click the Filter button to narrow by property type (single family, condo, estate, rental)',
  'Click a column header in table view to sort by name, status, or task count',
  'Active filters are shown as removable chips — click × to clear individual filters',
]);

box('Try filtering by "urgent tasks > 0" to instantly see which properties need attention. In the demo, Pelican Point, Gulfstream Manor, and The Sandpiper all have urgent open tasks.', { label: 'TIP' });

h2('Property Detail — Tabs Overview');
para('Click any property name to open its detail page. The property detail view has multiple tabs:');

table(
  ['Tab', 'What You\'ll Find'],
  [
    ['Overview',        'Address, description, property type, assigned manager, primary contact, and current status. Edit the property details here.'],
    ['Tasks',           'All tasks for this property — open, in progress, and completed. Create new tasks directly from this tab.'],
    ['Rooms',           'Room inventory with supply tracking. Add rooms (kitchen, bedrooms, pool area, etc.) and track supplies needing replacement.'],
    ['Access Control',  'Door codes, gate codes, alarm codes, Wi-Fi passwords, and any other access credentials stored securely for this property.'],
    ['Inspections',     'Inspection history, active checklists, and scheduled recurring inspections. Each inspection has pass/fail results per checklist item.'],
    ['Vendors',         'Vendors linked to this property — HVAC, plumber, pool service, electrician, etc. Click a vendor to see their contact info.'],
    ['Documents',       'Files uploaded for this property — lease agreements, warranties, insurance docs, HOA rules. Upload and download from here.'],
    ['Notes',           'Internal staff notes. Not visible to clients. Timestamped and attributed to the staff member who wrote them.'],
    ['Calendar',        'Events that include this property as a location — filtered calendar view just for this address.'],
    ['Portal Settings', 'Configure how this property appears in the client portal — visibility, branding overrides, welcome message.'],
  ],
  [110, 398]
);

h2('The 10 Demo Properties — Scenarios');
para('Each demo property is pre-loaded with a realistic scenario. Here\'s a quick reference:');

const propScenarios = [
  ['1 · Beachside Breeze',       'Naples, FL',       'Home Watch',      'HVAC fault before owner arrival — urgent task, vendor dispatched. Shows emergency home watch workflow.'],
  ['2 · Sunset Key Villa',       'Naples, FL',       'Luxury Estate',   'Pool heater + smart-home offline — two open repairs. Shows luxury property management with vendor coordination.'],
  ['3 · Coconut Harbor Retreat', 'Fort Myers, FL',   'Seasonal',        'Hurricane prep checklist active. Shows recurring seasonal workflow and deadline tracking.'],
  ['4 · Pelican Point Cottage',  'Naples, FL',       'Emergency',       'Active water leak, critical alert, plumber on-site today. Shows emergency response and critical task escalation.'],
  ['5 · Royal Palm Estate',      'Palm Beach, FL',   'VIP Luxury',      'Owner event prep — 6 vendors coordinated, estate inspection completed. Shows complex event management.'],
  ['6 · Marina Bay Condo',       'Ft. Lauderdale',   'Rental',          'Guest turnover in progress — smart lock reset overdue, new guests arriving tomorrow.'],
  ['7 · Gulfstream Manor',       'Bonita Springs',   'High Maintenance','Irrigation repair 3 days overdue — HOA violation risk within 7 days. Shows urgency escalation.'],
  ['8 · The Sandpiper',          'Sarasota, FL',     'Seasonal Arrival','Owner arriving 2 days early — rush prep tasks created, same-day cleaning dispatched.'],
  ['9 · Lighthouse Point',       'Key West, FL',     'Storm Damage',    'Roof leak after storm — insurance documentation tasks, roofer on-site. Shows damage response workflow.'],
  ['10 · Oceanfront Oasis',      'Delray Beach, FL', 'Stable Premium',  'All tasks current, 4-year client, weekly + monthly recurring schedule. The "healthy account" baseline.'],
];
table(['Property', 'Location', 'Type', 'Scenario'], propScenarios, [130, 84, 84, 210]);

h2('Editing a Property');
steps([
  { title: 'Open the property detail page', detail: 'Click the property name from the list.' },
  { title: 'Click "Edit" in the Overview tab', detail: 'A form opens with all editable fields — name, address, type, status, manager, primary contact, and description.' },
  { title: 'Make your changes and click Save', detail: 'Changes save immediately. The updated values appear across the platform everywhere this property is referenced.' },
]);

box('Changing a property\'s status to "Vacant" will flag it differently on the dashboard and in the dispatch view. In the demo, The Sandpiper is set to Vacant because it\'s a seasonal property.', { label: 'NOTE', bg: AMBER_LIGHT, bdr: AMBER_BDR, lc: AMBER, tc: '#92400e', lw: 42 });

h2('Access Control — Storing Codes Safely');
para('Every property can store an unlimited number of access credentials. Navigate to a property → Access Control tab to see them.');
bullet([
  'Codes are stored encrypted in the database — never in plain text',
  'Values are masked (shown as ●●●●) by default — click the eye icon to reveal',
  'Each code has a category (door, gate, alarm, pool, Wi-Fi) and a description label',
  'The Route Brief in Dispatch pulls these codes for the day\'s itinerary — staff see only the codes for properties they\'re visiting that day',
]);
box('You can reveal all codes at once by clicking "Show All" in the Access Control tab header. This action is logged in the activity feed for audit purposes.', { label: 'TIP' });

// ─────────────────────────────────────────────────────────────────────────────
//  3. TASKS & INSPECTIONS
// ─────────────────────────────────────────────────────────────────────────────
section(3, 'Tasks & Inspections', 'Creating, managing, and completing work across your portfolio');

h2('Understanding Task Statuses');
doc.y += 4;
[
  ['Pending',      BLUE_LIGHT,  BLUE,    '#1e40af', 'Task created and assigned but not yet started. Due date is set.'],
  ['In Progress',  '#fef9c3',   '#ca8a04','#78350f', 'Work has started. Field staff have begun the job on-site.'],
  ['Completed',    GREEN_LIGHT, GREEN,   '#14532d', 'Work is done. A completion timestamp is recorded automatically.'],
  ['Cancelled',    SLATE_100,   SLATE_500,SLATE_700, 'Task was cancelled and will not be completed.'],
  ['Overdue',      RED_LIGHT,   RED,     '#991b1b', 'Status is Pending or In Progress but the due date has passed.'],
].forEach(([label, bg, fg, tc, desc]) => {
  const dw = BW - 120;
  const dh = strH(desc, { size: 9.5, width: dw }) + 14;
  room(dh + 4);
  const y = doc.y;
  pill(ML, y + 3, label, bg, fg);
  doc.fillColor(tc).font('Helvetica').fontSize(9.5)
     .text(desc, ML + 116, y, { width: dw });
  doc.y = y + dh;
});
doc.moveDown(0.5);

h2('Task Priority Levels');
table(
  ['Priority', 'What It Means', 'Dashboard Treatment'],
  [
    ['Urgent', 'Must be handled today — active damage, client arrival, vendor on-site', 'Appears in the Urgent Tasks widget; shown in red'],
    ['High',   'Important but not emergency — address within 24–48 hours',              'Shown with orange priority indicator in task list'],
    ['Normal', 'Standard scheduled work — routine inspections, maintenance',             'Default priority for new tasks'],
    ['Low',    'Nice-to-do when time permits — cosmetic, administrative',               'Shown in muted styling, sorted to bottom of list'],
  ],
  [60, 260, 188]
);

h2('Creating a Task');
steps([
  { title: 'Press T anywhere — or click "+ New Task"', detail: 'The quick-create panel opens as a modal over whatever page you\'re on.' },
  { title: 'Enter a title', detail: 'Keep it clear and actionable — "Fix pool heater motor — Sunset Key" is better than "Pool issue".' },
  { title: 'Select the property', detail: 'Type to search. The task will be linked to this property and appear in its Tasks tab.' },
  { title: 'Set priority, category, and due date', detail: 'Category options: maintenance, inspection, cleaning, repair, administrative, other.' },
  { title: 'Assign a team member', detail: 'The assigned person gets an in-app notification and sees the task in their personal task view.' },
  { title: 'Add a description (optional but recommended)', detail: 'Include vendor contacts, specific instructions, or safety notes. Field staff see this on their phones.' },
  { title: 'Click Create Task', detail: 'The task appears immediately in the property\'s task list and the main Tasks view.' },
]);

box('Use the Description field generously. A note like "Use the back gate code — front lockbox was replaced last week, code is now 7821" saves a phone call from the field.', { label: 'TIP' });

h2('Editing and Completing Tasks');
bullet([
  'Click any task to open the full detail view',
  'Change status by clicking the status dropdown — select In Progress when work begins, Completed when done',
  'Completion timestamp is recorded automatically with the current date and time',
  'Attach photos from the task detail view — before/after photos are categorized and stored with the task',
  'Add notes in the task comments — visible to supervisors and the assigned staff member',
  'Reassign a task by changing the Assigned To field — the new assignee gets a notification',
]);

h2('Using Task Templates');
para('Templates let you create reusable task scaffolds with pre-filled checklists, priorities, and time estimates. The demo has templates for the most common property management scenarios.');
steps([
  { title: 'Click "+ New Task" → "Use Template"', detail: 'A template picker opens with the available templates.' },
  { title: 'Select a template', detail: 'Demo templates include: Hurricane Prep, Move-In / Move-Out Turnover, Weekly Home Watch, Monthly Inspection, Pool Service, and HVAC Service.' },
  { title: 'Review and adjust', detail: 'The template pre-fills the title, category, priority, and checklist items. Change the property, assignee, and due date before saving.' },
  { title: 'Save the task', detail: 'A fully formed task with a checklist is created in seconds.' },
]);

h2('Recurring Tasks');
para('Recurring tasks auto-generate the next instance when the current one is completed. Two recurring tasks are active in the demo:');
bullet([
  'Monthly Property Check — The Sandpiper: fires on the 20th of each month',
  'Weekly Home Watch — Oceanfront Oasis: fires every Monday (recurring from last week\'s completed instance)',
]);
para('To create a recurring task: check "Is Recurring" in the task form, then set the recurrence rule (weekly, monthly, custom RRULE). The frequency and schedule appear on the task detail page.');

box('Recurring tasks show a ↻ icon in the task list. Completing a recurring task does not delete it — it schedules the next instance automatically, so the work never falls through the cracks.', { label: 'TIP' });

h2('Inspections and Checklists');
para('Inspections are tasks with attached checklists. Each checklist item can be marked Pass, Fail, or N/A, with an optional note and photo per item.');

steps([
  { title: 'Open a property → Inspections tab', detail: 'The demo has 3 completed inspections with full checklists across different properties.' },
  { title: 'Open any inspection', detail: 'Each item shows a result (pass/fail), a staff note where relevant, and any attached photos.' },
  { title: 'Create a new inspection task', detail: 'Use the "Inspection" category when creating a task, then add checklist items via the + Checklist Item button.' },
  { title: 'Mark items as you go', detail: 'Field staff mark each item on their phone in real time. Results are visible to supervisors immediately.' },
  { title: 'Complete the inspection', detail: 'Mark the task Completed. The inspection is saved to history with a timestamp and the completing staff member\'s name.' },
]);

box('Failed checklist items automatically create a note prompting a follow-up task. Supervisors can click "Create follow-up" directly from the failed item to generate a new repair or maintenance task.', { label: 'TIP' });

h2('Recurring Inspection Schedules');
para('Beyond individual recurring tasks, Hubify supports inspection schedule objects that define a rolling program of inspections for each property. Navigate to a property → Inspections tab → Schedules to see them.');
bullet([
  'Oceanfront Oasis: weekly, monthly, and quarterly inspection schedules all active',
  'Gulfstream Manor: monthly + quarterly schedules (monthly flagged a failed irrigation item)',
  'Royal Palm Estate: monthly schedule linked to the pre-event inspection checklist',
]);

// ─────────────────────────────────────────────────────────────────────────────
//  4. CALENDAR
// ─────────────────────────────────────────────────────────────────────────────
section(4, 'Calendar', 'Scheduling, event management, conflict detection, and iCal sync');

h2('Navigating the Calendar');
bullet([
  'Switch between Day, Week, and Month views using the tabs at the top of the Calendar page',
  'Click the forward/back arrows to move between time periods',
  'Click any event to see its details — property link, attendees, description, and location',
  'Click any empty time slot to create a new event at that date and time',
]);

h2('The 10 Pre-Seeded Demo Events');
table(
  ['Event', 'When', 'Property', 'Notes'],
  [
    ['Weekly Team Standup',              'Recurring Mon 9am', 'None (team)',      'All 4 staff — shows recurring team events'],
    ['CoolBreeze HVAC service call',     'Tomorrow 10am',     'Beachside Breeze', 'Linked to the open HVAC repair task'],
    ['SmartHome Tech system reset',      'Tomorrow 1pm',      'Sunset Key Villa', 'Linked to the smart-home offline task'],
    ['FastFlow Plumbing leak repair',    'Today 8am',         'Pelican Point',    'Intentional conflict with another same-staff event'],
    ['Owner arrival',                    '2 days out 2pm',    'The Sandpiper',    'Rush prep event — triggers urgency in task list'],
    ['Hurricane prep deadline',          'Today 6am',         'Coconut Harbor',   'Hard deadline — shows deadline events'],
    ['StormGuard roofing assessment',    'Today 9am',         'Lighthouse Point', 'Same-day emergency vendor appointment'],
    ['Owner event — Royal Palm',         '6 days out 5pm',    'Royal Palm Estate','VIP event — supervisor is organizer'],
    ['Pre-event walkthrough',            '5 days out 11am',   'Royal Palm Estate','Inspection day before the owner event'],
    ['Quarterly portfolio review',       '2 weeks out 3pm',   'None (office)',    'Management meeting — all staff invited'],
  ],
  [148, 72, 110, 178]
);

h2('Conflict Detection');
para('Hubify checks for scheduling conflicts automatically. A conflict occurs when the same staff member is assigned to two overlapping events. In the demo:');
bullet([
  'Demo Staff 1 is assigned to both the FastFlow Plumbing visit (today 8–11am) and another event that overlaps',
  'The conflict appears as a red warning badge on both events',
  'Supervisors see a conflict count badge in the Calendar nav item when conflicts exist',
]);
box('Conflict detection runs server-side whenever a new event is created or an existing event is modified. You don\'t need to manually check — the system flags it immediately.', { label: 'HOW IT WORKS', bg: BLUE_LIGHT, bdr: BLUE_BDR, lc: BLUE, tc: '#1e40af', lw: 76 });

h2('Creating an Event');
steps([
  { title: 'Click "+ New Event" or click any empty calendar slot', detail: 'The event creation form opens.' },
  { title: 'Set the title, date, start time, and end time', detail: 'Events can be all-day (toggle the "All Day" switch) or time-specific.' },
  { title: 'Link a property (optional)', detail: 'Linking a property connects the event to the property\'s calendar tab and to any dispatch itinerary for that day.' },
  { title: 'Add attendees', detail: 'Select staff members. They\'ll see this event in their personal calendar view. A conflict check runs automatically.' },
  { title: 'Set recurrence (optional)', detail: 'Choose weekly, monthly, or custom for recurring events like weekly standups or monthly inspections.' },
  { title: 'Save', detail: 'The event appears immediately for all attendees.' },
]);

h2('iCal Sync — Export to Google Calendar or Outlook');
para('Hubify generates a personal iCal feed URL for each user. Subscribing to it imports all your Hubify events into your external calendar app — and keeps them in sync automatically.');
steps([
  { title: 'Open User Menu → Calendar Settings', detail: 'You\'ll see your personal iCal subscription URL.' },
  { title: 'Copy the URL', detail: 'It looks like: /api/calendar/ical?token=...' },
  { title: 'In Google Calendar: click "Other calendars" → "From URL"', detail: 'Paste the URL and click Add Calendar. Google will refresh it every few hours.' },
  { title: 'In Outlook: click "Add calendar" → "From internet"', detail: 'Paste the URL and subscribe. The calendar appears in your sidebar.' },
]);
box('iCal is one-way: Hubify events appear in your external calendar, but changes made in Google Calendar do NOT sync back to Hubify. All event management happens inside Hubify.', { label: 'NOTE', bg: AMBER_LIGHT, bdr: AMBER_BDR, lc: AMBER, tc: '#92400e', lw: 42 });

// ─────────────────────────────────────────────────────────────────────────────
//  5. INVOICES & BILLING
// ─────────────────────────────────────────────────────────────────────────────
section(5, 'Invoices & Billing', 'Managing invoices, collecting payments, and batch billing');

h2('Invoice Statuses — What Each One Means');
table(
  ['Status', 'What It Means', 'Client Can See It?', 'Next Action'],
  [
    ['Draft',    'Invoice is being prepared. Not finalized yet.',                                      'No',  'Edit line items, then change to Sent when ready.'],
    ['Open',     'Invoice has been sent to the client.',                                               'Yes', 'Wait for payment, or send a payment reminder.'],
    ['Overdue',  'Past the due date and still unpaid.',                                                'Yes', 'Send a reminder or contact the client directly.'],
    ['Paid',     'Payment collected. Receipt URL generated (if via Stripe).',                          'Yes', 'No further action needed.'],
    ['Void',     'Invoice cancelled. A credit note may be issued.',                                    'No',  'Create a replacement invoice if needed.'],
  ],
  [60, 186, 108, 154]
);

h2('The 7 Demo Invoices');
table(
  ['Invoice #', 'Client', 'Amount', 'Status', 'Property'],
  [
    ['DEMO-2026-001', 'Main Client',   '$385',   'Paid',         'Beachside Breeze — April home watch + inspections'],
    ['DEMO-2026-002', 'Main Client',   '$520',   'Open',         'Beachside Breeze — May service + HVAC coordination'],
    ['DEMO-2026-003', 'VIP Client',    '$1,850', 'Paid',         'Royal Palm Estate — April estate management + event prep'],
    ['DEMO-2026-004', 'VIP Client',    '$2,460', 'Open',         'Royal Palm Estate — May estate + owner event (6 vendors)'],
    ['DEMO-2026-005', 'Rental Client', '$285',   'Paid',         'Marina Bay Condo — April turnover + inspection'],
    ['DEMO-2026-006', 'Rental Client', '$310',   'Open',         'Marina Bay Condo — May turnover + guest prep'],
    ['DEMO-2026-CONSOL', 'Main Client','$985',   'Draft (Batch)','All 3 billing clients — May 2026 consolidated preview'],
  ],
  [108, 86, 58, 80, 176]
);

h2('The Consolidated Batch Invoice');
para('The consolidated invoice (DEMO-2026-CONSOL) is a single invoice covering all three billing clients for the same period. This is one of Hubify\'s most-used billing features — it lets portfolio managers send one invoice per billing cycle instead of managing invoices per-property.');

steps([
  { title: 'Navigate to Invoices → find DEMO-2026-CONSOL', detail: 'It\'s in Draft status — the client can\'t see it yet.' },
  { title: 'Open the invoice', detail: 'Scroll through the line items — each client and property is itemized. Total is $985 across 3 accounts.' },
  { title: 'Preview the PDF', detail: 'Click the PDF icon to see the formatted invoice the client would receive.' },
  { title: 'Change status to Sent', detail: 'Click the status dropdown → Sent. The invoice is now visible in the client portal immediately.' },
  { title: 'Watch the portal update', detail: 'Open the client portal in a separate tab — the invoice appears in the client\'s Invoices tab.' },
]);

h2('Stripe Integration — Online Payment Collection');
para('When Stripe is connected, clients can pay invoices online directly from their portal. Hubify tracks payments via webhook — the invoice status updates automatically to Paid when payment clears.');
bullet([
  'Open DEMO-2026-001 (paid) to see a completed Stripe payment — card brand (Visa), last 4 digits, payment date, and receipt URL',
  'Paid invoices show a "View Receipt" link that opens the Stripe-hosted receipt',
  'Payment method is stored securely in Stripe — never in Hubify\'s database',
  'For demo purposes, no live card charges can be made; the Stripe data is pre-seeded',
]);

box('Draft invoices are permanently hidden from the client portal — regardless of any setting or permission. Only Sent and Paid invoices are ever visible to clients.', { label: 'KEY RULE', bg: RED_LIGHT, bdr: RED_BDR, lc: RED, tc: '#991b1b', lw: 60 });

h2('Creating an Invoice');
steps([
  { title: 'Go to Invoices → click "+ New Invoice"', detail: 'The invoice creation form opens.' },
  { title: 'Select the client and invoice period', detail: 'The client must exist in the Contacts list. The invoice number is auto-generated.' },
  { title: 'Add line items', detail: 'Each line item has a description, quantity, unit price, and optional property tag.' },
  { title: 'Set the due date', detail: 'Standard net-30 is the default. Adjust as needed.' },
  { title: 'Save as Draft', detail: 'Review everything before sending. You can edit a draft at any time.' },
  { title: 'Change to Sent when ready', detail: 'The invoice becomes visible in the client portal and an email notification can be triggered.' },
]);

// ─────────────────────────────────────────────────────────────────────────────
//  6. DISPATCH CENTER
// ─────────────────────────────────────────────────────────────────────────────
section(6, 'Dispatch Center', 'Building daily itineraries and briefing field staff before they leave');

h2('What Is the Dispatch Center?');
para('The Dispatch Center is where supervisors plan the day\'s route for field staff. Instead of sending a text or printing a clipboard, the dispatcher builds a digital itinerary — which properties to visit, in what order, how long to spend at each. Field staff see their itinerary on their phones.');

h2('Building an Itinerary');
steps([
  { title: 'Navigate to Dispatch in the left nav', detail: 'The page opens with today\'s date selected. If an itinerary exists for today, it loads automatically.' },
  { title: 'Click "+ New Itinerary"', detail: 'Select the date and the staff member the itinerary is for. Name it if helpful (e.g. "Demo Staff 1 — Tuesday Route").' },
  { title: 'Add the first stop', detail: 'Click "+ Add Stop" → type to search for a property → select it. Set the estimated stop duration in minutes.' },
  { title: 'Add more stops', detail: 'Keep adding stops. The total estimated time accumulates at the top of the itinerary.' },
  { title: 'Reorder stops', detail: 'Drag any stop up or down to change the route order. The sequence number updates automatically.' },
  { title: 'Open the Route Brief', detail: 'Click "Route Brief" in the itinerary header. A slide-over panel opens — see below for details.' },
  { title: 'Publish', detail: 'Click Publish. The itinerary is locked from further editing and pushed to the assigned staff member\'s schedule.' },
]);

h2('The Route Brief — Three Tabs');
para('The Route Brief is a pre-departure briefing panel that consolidates everything a field staff member needs to know before they leave — without having to open each property individually. It pulls live data from the platform.');

h3('Tab 1: Access Codes');
bullet([
  'Shows every access code for every property on the route — door, gate, alarm, pool, Wi-Fi',
  'Properties are listed in stop order',
  'Code values are masked (●●●●) by default — click the eye icon next to any code to reveal it',
  'Click "Show All" to reveal all codes at once (logged for audit purposes)',
  'Codes come directly from each property\'s Access Control tab — always current',
]);

h3('Tab 2: Alerts & Instructions');
bullet([
  'Lists all active alerts for the properties on the route, sorted by severity: Critical → Warning → Info',
  'Critical alerts shown in red; Warning in amber; Info in gray',
  'Two alert types appear: Property Alerts (specific to the address) and Client Notes (notes about the owner/tenant)',
  'In the demo: Pelican Point has a Critical water leak alert; Gulfstream Manor has a Warning about HOA deadline',
  'Only active alerts appear — dismissed or expired alerts are excluded',
]);

h3('Tab 3: Supplies');
bullet([
  '"Bring from Stock" section: supplies due for replacement within the next 30 days that the staff member should load in their van from the supply room',
  '"Need to Purchase" section: supplies that require ordering online or from a store (items with a purchase URL attached)',
  'Each supply item shows the room it belongs to, quantity, and a checkbox — staff check items off as they load the van',
  'Supplies are pulled from each property\'s Rooms → Supplies tracking, filtered to those due within 30 days',
]);

box('The Route Brief replaces the printed clipboard, the group text, and the emailed spreadsheet — all three, in one screen, pulling live data from the platform. Field staff arrive at each property already briefed.', { label: 'TIP' });

h2('What Field Staff See');
para('Field staff can view their assigned itinerary from their phone\'s browser. They see:');
bullet([
  'Their properties for the day, in order, with addresses and estimated durations',
  'A "Start Navigation" button that opens the address in Google Maps',
  'Their assigned tasks at each property — tap to update status in the field',
  'The Route Brief (access codes tab only visible after tapping "View Brief")',
]);

// ─────────────────────────────────────────────────────────────────────────────
//  7. TEAM MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
section(7, 'Team Management', 'Roles, permissions, staff assignments, and communication');

h2('The Role Hierarchy');
para('Hubify has three staff roles. Each role sees a different version of the platform — higher roles have full access to everything below them.');

table(
  ['Role', 'What They Can Do', 'What They Cannot Do'],
  [
    ['Admin',      'Everything — billing, settings, team management, all property and client data, feature flags, super-admin actions',
                   'Nothing is restricted'],
    ['Supervisor', 'View and manage all properties, tasks, contacts, calendar, and dispatch. Can manage staff assignments and approve task completions.',
                   'Cannot change org billing settings, subscription, or org-level configuration. Cannot create or delete admin accounts.'],
    ['Staff',      'View and update their own assigned tasks and the properties they\'re assigned to. Can create tasks and log time (if enabled).',
                   'Cannot see other staff\'s tasks, billing, team management, dispatch center, or org settings.'],
  ],
  [76, 242, 190]
);

h2('The Demo Team');
table(
  ['Account', 'Role', 'Supervisor', 'Notes'],
  [
    ['Demo Admin',       'Admin',      'None',           'Primary demo account — use this for the full walkthrough'],
    ['Demo Supervisor',  'Supervisor', 'Demo Admin',     'Shows supervisor-limited view — useful for showing permission differences'],
    ['Demo Staff 1',     'Staff',      'Demo Supervisor','Assigned to Beachside Breeze, Sandpiper, Gulfstream, Lighthouse tasks'],
    ['Demo Staff 2',     'Staff',      'Demo Supervisor','Assigned to Sunset Key, Marina Bay, Coconut Harbor tasks'],
  ],
  [110, 80, 110, 208]
);

h2('Inviting a New Team Member');
steps([
  { title: 'Navigate to Team → click "Invite Team Member"', detail: 'A modal opens with an invitation form.' },
  { title: 'Enter the new member\'s email and select their role', detail: 'You can also pre-assign a supervisor at this step.' },
  { title: 'Click Send Invitation', detail: 'An email is sent with a secure link. The invitee sets their own password — you never handle their credentials.' },
  { title: 'Track the invitation status', detail: 'Pending invitations appear in the Team list with an "Invited" badge until the person accepts.' },
]);

h2('Supervisor Relationships');
para('Supervisors manage a subset of the staff team. The relationship affects:');
bullet([
  'Task escalation — when a task is marked urgent and the assigned staff member doesn\'t respond, the supervisor is notified',
  'Task assignment — supervisors see only the tasks for staff they manage (unless they also have admin access)',
  'Approval workflows — in orgs with approval steps enabled, completed tasks route to the supervisor for review',
]);

h2('Broadcast Messaging');
para('To send a message to the entire team at once — or to a specific subset — use the Broadcast feature in the Team section:');
bullet([
  'Navigate to Team → Messages → New Broadcast',
  'Choose All Staff, Supervisors Only, or specific individuals',
  'The message appears in their Team Chat feed and triggers an in-app notification',
  'Useful for weather alerts, schedule changes, safety notices, or company announcements',
]);

box('Team Chat on the Dashboard is different from Broadcast Messages. Chat is conversational and informal — like a group text. Broadcasts are more formal one-way announcements from management.', { label: 'NOTE', bg: AMBER_LIGHT, bdr: AMBER_BDR, lc: AMBER, tc: '#92400e', lw: 42 });

// ─────────────────────────────────────────────────────────────────────────────
//  8. SETTINGS & CUSTOMIZATION
// ─────────────────────────────────────────────────────────────────────────────
section(8, 'Settings & Customization', 'Org configuration, feature flags, and notification preferences');

h2('Organization Settings — Admin → Settings');
para('The Admin section (top of the left nav, visible to Admins only) contains all org-level configuration:');

table(
  ['Settings Section', 'What You Can Configure'],
  [
    ['Company Profile',      'Org name, address, phone, website, logo upload, timezone, currency'],
    ['Billing & Subscription','Current plan, billing history, upgrade/downgrade options'],
    ['Feature Flags',        'Toggle platform features on or off for your organization — see list below'],
    ['Email Templates',      'Customize the content of automated emails sent to clients (invoice notifications, portal welcome, reminders)'],
    ['Custom Fields',        'Add custom data fields to properties, contacts, or tasks — visible in forms and export'],
    ['Supply Settings',      'Default categories and units for room supply tracking'],
    ['API Keys',             'Generate API keys for integrations or webhook endpoints'],
    ['Integrations',         'Connect Zapier (if flag enabled), configure webhook endpoints for outbound event delivery'],
  ],
  [148, 360]
);

h2('Feature Flags — What Each One Controls');
para('Feature flags let you selectively enable or disable platform capabilities per organization. Navigate to Admin → Settings → Feature Flags to see the toggles:');

table(
  ['Flag', 'What It Enables When ON'],
  [
    ['mobile_field_mode',          'A mobile-optimized "Field Mode" interface for field staff — simplified view, large tap targets, offline-ready task management'],
    ['task_cost_tracking',         'Time Tracking — clock in/out on tasks, billable vs. non-billable time, time reports. Adds Time Tracking to the nav.'],
    ['community_profiles',         'Community management — associate properties with HOA communities, track community documents and rules'],
    ['zapier_integration',         'Webhook endpoints for Zapier and other automation tools — trigger workflows when tasks complete, invoices send, etc.'],
    ['advanced_reporting',         'Reports tab in Account settings and a Time Report inside Time Tracking — exportable data views'],
    ['mobile_push_notifications',  'Push notification opt-in toggle in user notification preferences — requires mobile browser support'],
    ['white_label_branding',       'Branding tab in Portal Settings — upload org logo, set colors, customize the client portal to match your brand'],
  ],
  [160, 348]
);

box('The demo org has all feature flags enabled so you can see every feature during a walkthrough. In a real org, flags can be toggled at any time by an Admin — changes take effect immediately.', { label: 'TIP' });

h2('Notification Preferences');
para('Each user sets their own notification preferences. Navigate to User Menu → Notification Preferences:');
bullet([
  'Task notifications — alert when a task is assigned to you, completed by someone you supervise, or becomes overdue',
  'Invoice notifications — alert when an invoice is paid, when one becomes overdue',
  'Calendar notifications — alerts before scheduled events (15 min, 1 hour, 1 day ahead)',
  'System notifications — platform alerts sent by admins to specific users or groups',
  'Email digest — daily or weekly summary of activity (configurable frequency)',
]);

h2('Dashboard Widget Customization');
steps([
  { title: 'Click the gear (⚙) icon on the Dashboard', detail: 'The customization panel slides in from the right.' },
  { title: 'Toggle widgets on or off', detail: 'Disable widgets you don\'t use. Changes apply immediately.' },
  { title: 'Reorder by drag-and-drop', detail: 'Drag any widget in the panel to set its position on the dashboard.' },
  { title: 'Close the panel', detail: 'Your layout is saved automatically — it persists across sessions.' },
]);

// ─────────────────────────────────────────────────────────────────────────────
//  9. TIPS, SHORTCUTS & FAQs
// ─────────────────────────────────────────────────────────────────────────────
section(9, 'Tips, Shortcuts & FAQs', 'Power-user techniques, keyboard shortcuts, and common questions answered');

h2('Keyboard Shortcuts');
doc.moveDown(0.4);
shortcut('T',       'Open the quick-create task form from anywhere in the platform');
shortcut('/',       'Focus the global search bar — search properties, tasks, contacts by name');
shortcut('Esc',     'Close any open modal, panel, or slide-over');
shortcut('←  →',   'Navigate between calendar weeks/months without using the mouse');
shortcut('Enter',   'Submit the focused form (works in quick-task, team chat, search)');
doc.moveDown(0.6);

h2('Power-User Tips');

h3('Use the global search for everything');
para('Press / from any page. Type a property name, contact name, task title, or invoice number. Results appear in real time across all categories — no need to navigate to a specific section first.', { color: SLATE_600 });

h3('Complete tasks from the Urgent Tasks widget');
para('You don\'t need to open a task\'s detail page to change its status. From the Urgent Tasks widget on the Dashboard, hover over a task and click the status button directly. This is the fastest way to process a batch of urgent items.', { color: SLATE_600 });

h3('Use the task list filter combinations');
para('The Tasks page supports multi-filter combinations. Example: filter by Property = Gulfstream Manor + Status = In Progress + Priority = Urgent to see exactly what\'s happening at that address right now. Filters stack and the URL updates so you can bookmark or share the filtered view.', { color: SLATE_600 });

h3('Link events to tasks for a complete picture');
para('When creating a calendar event for a vendor visit, attach the related task. This creates a bidirectional link — from the task you can see when the vendor is scheduled; from the calendar event you can jump to the task status.', { color: SLATE_600 });

h3('Reset the demo without losing credentials');
para('If the demo data gets messy after a walkthrough, reset it without losing your login: Super Admin → Demo tab → "Reset Demo Data". All 10 properties, tasks, invoices, events, and notifications are wiped and reseeded in about 30 seconds. Your admin account and password are unchanged.', { color: SLATE_600 });
box('The reset is non-destructive to the org itself and the admin account. Only mutable data (tasks, invoices, events, notifications) is wiped and reseeded. Properties are preserved with updated data.', { label: 'RESET', bg: GREEN_LIGHT, bdr: GREEN_BDR, lc: GREEN, tc: '#14532d', lw: 44 });

h2('Frequently Asked Questions');

h3('Why can\'t I see the Invoices section?');
para('Invoices are visible to Admin and Supervisor roles only. If you\'re logged in as a Staff account, navigate to Admin → Team → click your account and upgrade the role to Supervisor.', { color: SLATE_600 });

h3('Why does the dashboard show 0 urgent tasks?');
para('Make sure you\'re logged in as Demo Admin (demo@hubifyhomesonline.com). The urgent task count is scoped to the demo org. If the count still shows 0 after login, try running a demo reset from the Super Admin panel — the seed data may be stale.', { color: SLATE_600 });

h3('How do I see what a client sees?');
para('The client portal is a completely separate interface at /portal/login. In the demo the portal client account has been removed from the public-facing guide — contact your Hubify representative if you need portal access credentials for a demo.', { color: SLATE_600 });

h3('Can I create real test data during a demo?');
para('Yes — everything you create during a demo is saved to the demo environment and will persist until the next reset. Feel free to create tasks, events, or invoices to show a live workflow. Just don\'t use real client names or real financial data.', { color: SLATE_600 });

h3('How do I add a new property to the demo?');
para('Go to Properties → click "+ New Property". Fill in the name, address, and type. The property immediately appears in all list views, can have tasks created against it, and can be added to a dispatch itinerary. It will be removed on the next demo reset.', { color: SLATE_600 });

h3('Does Hubify work on mobile?');
para('Yes. The full staff platform is responsive and works in any mobile browser. For field staff, the mobile experience is optimized in "Field Mode" (feature flag: mobile_field_mode) — a simplified, touch-first interface showing only the current day\'s tasks and assigned properties.', { color: SLATE_600 });

h3('What happens when I click "Publish" in Dispatch?');
para('Publishing locks the itinerary so it can\'t be accidentally changed, and pushes it to the assigned staff member\'s view. They see it in their schedule immediately. If the itinerary was for today, it also appears in the calendar as a scheduled block.', { color: SLATE_600 });

hline(TEAL, 1.5);
doc.moveDown(0.5);
para('Questions about the demo or the platform? Contact your Hubify account manager or visit hubifyhomesonline.com.', { color: SLATE_500, size: 10 });
doc.moveDown(0.2);
doc.fillColor(TEAL_DARK).font('Helvetica-Bold').fontSize(10.5).text('Hubify  ·  hubifyhomesonline.com', ML);

// ─── Finalize ─────────────────────────────────────────────────────────────────
footer();
doc.end();

await new Promise((res, rej) => { ws.on('finish', res); ws.on('error', rej); });

const stat = fs.statSync(OUT_PDF);
console.log(`\n✓  PDF → ${OUT_PDF}`);
console.log(`   ${(stat.size / 1024).toFixed(1)} KB`);
