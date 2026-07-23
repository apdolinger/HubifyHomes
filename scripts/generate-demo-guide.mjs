/**
 * Hubify Demo Walkthrough Guide Generator
 *
 * Generates a polished PDF guide for anyone going through the Hubify demo site.
 * Includes credentials, step-by-step flows, talking points, and a property roster.
 *
 * Usage:
 *   node scripts/generate-demo-guide.mjs
 *
 * Output:
 *   screenshots/Hubify_Demo_Guide.pdf
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PDF = path.join(__dirname, '../screenshots/Hubify_Demo_Guide.pdf');
fs.mkdirSync(path.dirname(OUT_PDF), { recursive: true });

// ─── Brand palette ────────────────────────────────────────────────────────────
const TEAL        = '#0d9488';
const TEAL_DARK   = '#0f766e';
const TEAL_LIGHT  = '#f0fdfa';
const TEAL_BORDER = '#99f6e4';
const SLATE_900   = '#0f172a';
const SLATE_700   = '#334155';
const SLATE_500   = '#64748b';
const SLATE_200   = '#e2e8f0';
const SLATE_50    = '#f8fafc';
const WHITE       = '#ffffff';
const GREEN       = '#16a34a';
const GREEN_LIGHT = '#dcfce7';
const ORANGE      = '#d97706';
const RED         = '#dc2626';
const RED_LIGHT   = '#fef2f2';
const BLUE        = '#2563eb';
const BLUE_LIGHT  = '#eff6ff';
const PURPLE      = '#7c3aed';
const PURPLE_LIGHT= '#f5f3ff';
const AMBER_LIGHT = '#fffbeb';

// ─── Layout constants ─────────────────────────────────────────────────────────
const PW     = 612;
const PH     = 792;
const ML     = 56;
const MR     = 56;
const BODY_W = PW - ML - MR;

// ─── PDF setup ────────────────────────────────────────────────────────────────
const doc = new PDFDocument({ size: 'LETTER', margin: 0, autoFirstPage: false, bufferPages: true });
const stream = fs.createWriteStream(OUT_PDF);
doc.pipe(stream);

let _pageNum = 0;
doc.on('pageAdded', () => { _pageNum++; });

function newPage() {
  doc.addPage();
  doc.rect(0, 0, PW, 4).fill(TEAL);
}

function footer() {
  if (_pageNum < 2) return;
  doc.save();
  doc.fillColor(SLATE_500).font('Helvetica').fontSize(8);
  doc.text('Hubify · Demo Walkthrough Guide', ML, PH - 28, { width: 260 });
  doc.text(`Page ${_pageNum}`, PW - ML - 40, PH - 28, { width: 40, align: 'right' });
  doc.restore();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function checkPageRoom(needed = 80) {
  if (doc.y > PH - MR - needed) {
    footer();
    newPage();
    doc.y = 50;
  }
}

function hline(color = SLATE_200, weight = 0.5) {
  doc.moveDown(0.4);
  doc.moveTo(ML, doc.y).lineTo(PW - MR, doc.y).lineWidth(weight).strokeColor(color).stroke();
  doc.moveDown(0.6);
}

function para(text, { color = SLATE_700, size = 10.5, bold = false, indent = ML, width = BODY_W, gap = 5 } = {}) {
  checkPageRoom(36);
  doc.fillColor(color)
     .font(bold ? 'Helvetica-Bold' : 'Helvetica')
     .fontSize(size)
     .text(text, indent, doc.y, { width, lineGap: gap });
  doc.moveDown(0.5);
}

function subheading(text, { color = SLATE_900 } = {}) {
  checkPageRoom(50);
  doc.moveDown(0.3);
  doc.fillColor(color).font('Helvetica-Bold').fontSize(11.5).text(text, ML, doc.y);
  doc.moveDown(0.4);
}

function bullet(items, { indent = ML + 14 } = {}) {
  items.forEach(item => {
    checkPageRoom(22);
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
    checkPageRoom(46);
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
    doc.moveDown(0.75);
  });
}

function tip(text) {
  checkPageRoom(56);
  const y = doc.y;
  const bh = 42;
  doc.roundedRect(ML, y, BODY_W, bh, 6).fill(TEAL_LIGHT).stroke(TEAL_BORDER);
  doc.fillColor(TEAL_DARK).font('Helvetica-Bold').fontSize(8.5).text('TIP', ML + 12, y + 9);
  doc.fillColor(TEAL_DARK).font('Helvetica').fontSize(9.5)
     .text(text, ML + 44, y + 9, { width: BODY_W - 56, lineGap: 3 });
  doc.y = y + bh + 10;
  doc.moveDown(0.3);
}

function callout(text, { label = 'NOTE', bg = AMBER_LIGHT, border = '#fed7aa', labelColor = ORANGE, textColor = '#92400e' } = {}) {
  checkPageRoom(56);
  const y = doc.y;
  const bh = 44;
  doc.roundedRect(ML, y, BODY_W, bh, 6).fill(bg).stroke(border);
  doc.fillColor(labelColor).font('Helvetica-Bold').fontSize(8.5).text(label, ML + 12, y + 10);
  doc.fillColor(textColor).font('Helvetica').fontSize(9.5)
     .text(text, ML + 52, y + 10, { width: BODY_W - 64, lineGap: 3 });
  doc.y = y + bh + 10;
  doc.moveDown(0.3);
}

function credBox(label, value, { labelColor = TEAL_DARK, bg = TEAL_LIGHT, border = TEAL_BORDER } = {}) {
  checkPageRoom(36);
  const y = doc.y;
  doc.roundedRect(ML, y, BODY_W, 30, 5).fill(bg).stroke(border);
  doc.fillColor(labelColor).font('Helvetica-Bold').fontSize(9).text(label, ML + 12, y + 8);
  doc.fillColor(SLATE_900).font('Helvetica').fontSize(10).text(value, ML + 110, y + 8);
  doc.y = y + 36;
}

function table2(rows, col1Label = 'Item', col2Label = 'Description', { col1W = 150 } = {}) {
  const C1 = col1W, C2 = BODY_W - C1 - 10;
  const y0 = doc.y;

  doc.rect(ML, y0, BODY_W, 22).fill(TEAL);
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(9)
     .text(col1Label, ML + 6, y0 + 7)
     .text(col2Label, ML + C1 + 6, y0 + 7);
  let y = y0 + 22;

  rows.forEach((row, i) => {
    const estH = 26;
    checkPageRoom(estH + 10);
    y = doc.y;
    if (i % 2 === 0) doc.rect(ML, y, BODY_W, estH).fill(SLATE_50);
    doc.fillColor(SLATE_900).font('Helvetica-Bold').fontSize(9.5)
       .text(row[0], ML + 6, y + 7, { width: C1 - 12 });
    doc.fillColor(SLATE_700).font('Helvetica').fontSize(9.5)
       .text(row[1], ML + C1 + 6, y + 7, { width: C2 - 6, lineGap: 2 });
    doc.y = y + estH;
  });

  doc.moveDown(1);
}

function inlinePill(x, y, text, bg, fg) {
  const w = doc.widthOfString(text, { fontSize: 8 }) + 14;
  doc.roundedRect(x, y - 1, w, 16, 3).fill(bg);
  doc.fillColor(fg).font('Helvetica-Bold').fontSize(8).text(text, x + 7, y + 2);
  return w + 6;
}

function section(num, title, subtitle = '') {
  footer();
  newPage();
  doc.fillColor('#d1fae5').font('Helvetica-Bold').fontSize(80)
     .text(String(num).padStart(2, '0'), PW - 120, 16, { width: 110, align: 'right' });
  doc.fillColor(SLATE_900).font('Helvetica-Bold').fontSize(22)
     .text(title, ML, 26, { width: 420 });
  if (subtitle) {
    doc.fillColor(SLATE_500).font('Helvetica').fontSize(11)
       .text(subtitle, ML, doc.y + 2, { width: 420 });
  }
  doc.y = 96;
  hline(TEAL_BORDER, 1.5);
}

// ─── PROPERTY SCENARIO ROW ────────────────────────────────────────────────────
function propRow(num, name, type, city, scenario, talking) {
  checkPageRoom(70);
  const y = doc.y;
  // Number badge
  doc.roundedRect(ML, y, 28, 28, 4).fill(TEAL);
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(11)
     .text(String(num), ML, y + 7, { width: 28, align: 'center' });
  // Name + type
  doc.fillColor(SLATE_900).font('Helvetica-Bold').fontSize(10.5)
     .text(name, ML + 36, y + 2, { width: BODY_W - 36 });
  doc.fillColor(SLATE_500).font('Helvetica').fontSize(9)
     .text(`${type}  ·  ${city}`, ML + 36, doc.y + 1);
  // Scenario line
  doc.fillColor(TEAL_DARK).font('Helvetica-Bold').fontSize(9)
     .text('Scenario: ', ML + 36, doc.y + 4, { continued: true, lineGap: 2 });
  doc.fillColor(SLATE_700).font('Helvetica').fontSize(9).text(scenario, { lineGap: 2 });
  // Talking point
  if (talking) {
    doc.fillColor(SLATE_500).font('Helvetica').fontSize(9)
       .text(`"${talking}"`, ML + 36, doc.y + 2, { width: BODY_W - 36, lineGap: 2 });
  }
  doc.moveDown(0.6);
  doc.moveTo(ML + 36, doc.y).lineTo(PW - MR, doc.y).lineWidth(0.3).strokeColor(SLATE_200).stroke();
  doc.moveDown(0.5);
}

// ─────────────────────────────────────────────────────────────────────────────
//  COVER PAGE
// ─────────────────────────────────────────────────────────────────────────────
doc.addPage();
// Full-bleed teal gradient simulation
doc.rect(0, 0, PW, PH).fill(TEAL);
doc.save();
doc.opacity(0.07);
doc.circle(PW + 40, -40, 300).fill(WHITE);
doc.circle(-20, PH + 20, 220).fill(WHITE);
doc.rect(0, PH * 0.6, PW, PH * 0.4).fill(WHITE);
doc.restore();

// Bottom white section
doc.save();
doc.opacity(0.12);
doc.rect(0, PH * 0.62, PW, PH).fill(WHITE);
doc.restore();

// Logo
doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(48).text('Hubify', ML, 140);
doc.fillColor('rgba(255,255,255,0.65)').font('Helvetica').fontSize(16).text('Property Management Platform', ML + 3, 200);

doc.moveDown(0.4);
doc.moveTo(ML, doc.y).lineTo(ML + 220, doc.y).lineWidth(1).strokeColor('rgba(255,255,255,0.35)').stroke();
doc.moveDown(1.2);

doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(26).text('Demo Walkthrough Guide', ML, doc.y);
doc.fillColor('rgba(255,255,255,0.75)').font('Helvetica').fontSize(12)
   .text('Step-by-step tour of the Hubify demo environment\nfor sales calls, prospect walkthroughs, and self-guided evaluation', ML, doc.y + 6);

// Bottom bar
doc.rect(0, PH - 100, PW, 100).fill('rgba(0,0,0,0.18)');
doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(10).text('DEMO CREDENTIALS', ML, PH - 84);
doc.fillColor('rgba(255,255,255,0.85)').font('Helvetica').fontSize(9.5)
   .text('Staff Admin:   demo@hubifyhomesonline.com  /  Demo2026!', ML, PH - 68);
doc.fillColor('rgba(255,255,255,0.85)').font('Helvetica').fontSize(9.5)
   .text('Portal Client:  client@demo.hubifyhomesonline.com  /  DemoClient2026!', ML, PH - 56);
doc.fillColor('rgba(255,255,255,0.5)').font('Helvetica').fontSize(9)
   .text(`Confidential · ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`, ML, PH - 34);

// ─────────────────────────────────────────────────────────────────────────────
//  TABLE OF CONTENTS
// ─────────────────────────────────────────────────────────────────────────────
newPage();
doc.fillColor(SLATE_900).font('Helvetica-Bold').fontSize(20).text('What\'s in this Guide', ML, 28);
hline(TEAL, 2);
doc.y = 66;

const toc = [
  [1,  'Demo Credentials & First Login'],
  [2,  'Dashboard — Your Opening Slide'],
  [3,  'The 10 Demo Properties'],
  [4,  'Tasks & Inspections'],
  [5,  'Calendar'],
  [6,  'Invoices & Billing'],
  [7,  'Client Portal'],
  [8,  'Dispatch Center'],
  [9,  'Team Management'],
  [10, 'Talking Points & Objection Responses'],
];

toc.forEach(([num, title], i) => {
  const y = doc.y;
  if (i % 2 === 0) doc.rect(ML, y - 2, BODY_W, 24).fill(SLATE_50);
  doc.roundedRect(ML + 4, y + 3, 22, 16, 3).fill(TEAL);
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(8).text(String(num), ML + 4, y + 7, { width: 22, align: 'center' });
  doc.fillColor(SLATE_900).font('Helvetica').fontSize(11).text(title, ML + 34, y + 5);
  doc.y = y + 24;
});

doc.moveDown(1);
callout(
  'This guide is for the person running the demo — not the prospect. Share the "Client Portal" section with prospects who want to self-explore.',
  { label: 'HOW TO USE', bg: TEAL_LIGHT, border: TEAL_BORDER, labelColor: TEAL_DARK, textColor: TEAL_DARK }
);

footer();

// ─────────────────────────────────────────────────────────────────────────────
//  1. CREDENTIALS & FIRST LOGIN
// ─────────────────────────────────────────────────────────────────────────────
section(1, 'Demo Credentials & First Login', 'Two accounts — one for staff, one for the client portal');

subheading('Staff Admin Account  (full platform access)');
credBox('URL:', '/staff/login  →  log in with email + password');
credBox('Email:', 'demo@hubifyhomesonline.com');
credBox('Password:', 'Demo2026!');
doc.moveDown(0.5);

subheading('Portal Client Account  (client-facing portal)');
credBox('URL:', '/portal/login  →  separate login from staff', { bg: PURPLE_LIGHT, border: '#ddd6fe', labelColor: PURPLE });
credBox('Email:', 'client@demo.hubifyhomesonline.com', { bg: PURPLE_LIGHT, border: '#ddd6fe', labelColor: PURPLE });
credBox('Password:', 'DemoClient2026!', { bg: PURPLE_LIGHT, border: '#ddd6fe', labelColor: PURPLE });
doc.moveDown(0.6);

tip('Open both accounts in separate browser tabs — one for the staff view, one for the portal — so you can switch back and forth during the demo without logging in and out.');

subheading('Who\'s on the Demo Team');
table2([
  ['Demo Admin',      'Full admin access — the primary account for staff walkthroughs'],
  ['Demo Supervisor', 'Supervisor role — useful for showing permission differences'],
  ['Demo Staff 1',    'Field staff — assigned to most on-site tasks in the demo'],
  ['Demo Staff 2',    'Field staff — useful for showing task assignment and handoffs'],
], 'Account', 'Role & Purpose', { col1W: 130 });

subheading('Demo Organization');
para('The demo organization is called "Hubify Demo Portfolio" — a fictional Florida-based property management company with 10 active properties ranging from luxury estates to seasonal snowbird condos. All data is pre-loaded and realistic.');

callout(
  'Never enter real client data into the demo environment. The demo can be fully reset from the Super Admin panel at any time.',
  { label: 'IMPORTANT', bg: RED_LIGHT, border: '#fecaca', labelColor: RED, textColor: '#991b1b' }
);

// ─────────────────────────────────────────────────────────────────────────────
//  2. DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
section(2, 'Dashboard — Your Opening Slide', 'The first screen after login; sets the stage for the whole demo');

para('The Dashboard is deliberately pre-loaded with realistic demo data. Every widget shows real numbers from the seeded properties, tasks, and invoices — nothing is mocked.');

subheading('What You\'ll See');
table2([
  ['Urgent Tasks',        '2–4 overdue and high-priority tasks across the demo properties — leads naturally into the Tasks section'],
  ['Statistics Overview', 'Portfolio at a glance: 10 properties, active tasks, pending invoices, team size'],
  ['Team Chat',           'Pre-seeded messages from demo staff — shows the real-time feed'],
  ['Recent Activity',     'Latest platform actions — confirms everything is live data'],
  ['Calendar widget',     'Upcoming scheduled visits and events — 5 pre-seeded calendar entries'],
], 'Widget', 'What to Say / Point Out', { col1W: 140 });

subheading('Suggested Opening Script');
para('"When you log in every morning, this is your command center. You can see immediately if anything is on fire — right now there are two overdue tasks that need attention. Let me click into one of those..."', { color: TEAL_DARK, bold: true, size: 10 });

tip('If the prospect\'s business is task-heavy, click an overdue task immediately. If they\'re billing-focused, go straight to Invoices. Always follow their pain point, not a fixed script.');

subheading('Dashboard Customization');
para('Point out the gear icon and mention that each widget can be toggled on/off and reordered by drag-and-drop. This is personal — their admin sees a different layout than their field staff.');

// ─────────────────────────────────────────────────────────────────────────────
//  3. DEMO PROPERTIES
// ─────────────────────────────────────────────────────────────────────────────
section(3, 'The 10 Demo Properties', 'A diverse portfolio covering the most common property management scenarios');

para('Each property is pre-loaded with tasks, access codes, contacts, and inspection data. Use the scenario that best matches the prospect\'s business.');

propRow(1, 'Beachside Breeze', 'Home Watch', 'Naples, FL',
  'HVAC fault discovered before owner arrival — urgent task open',
  'This is your bread-and-butter home watch property. Show the task, the photo, and how you notify the owner.');

propRow(2, 'Sunset Key Villa', 'Luxury Estate', 'Key West, FL',
  'Pool heater down + smart-home system offline — two open issues',
  'Great for luxury clients. Point out the priority flag and the vendor contact already linked for the repair.');

propRow(3, 'Coconut Harbor Retreat', 'Seasonal / Snowbird', 'Ft. Myers, FL',
  'Hurricane prep tasks active — shows seasonal checklist workflow',
  'Perfect for snowbird managers. Show the recurring inspection schedule and checklist items.');

propRow(4, 'Pelican Point Cottage', 'Emergency', 'Captiva, FL',
  'Active water leak discovered during routine check — critical alert',
  'High-drama scenario. Click the critical alert badge and show how the team is notified instantly.');

propRow(5, 'Royal Palm Estate', 'VIP Luxury', 'Palm Beach, FL',
  'Owner event preparation in progress — multiple vendors coordinated',
  'Shows vendor coordination and multi-step task management for high-end clients.');

propRow(6, 'Marina Bay Condo', 'Rental', 'Sarasota, FL',
  'Guest turnover + smart lock reset — shows rental workflow',
  'Ideal for property managers with rental inventory. Show the recurring turnover task template.');

propRow(7, 'Gulfstream Manor', 'High Maintenance', 'Naples, FL',
  'Irrigation repair overdue + HOA violation open',
  'Shows the priority escalation and vendor assignment workflow side-by-side.');

propRow(8, 'The Sandpiper', 'Seasonal Arrival', 'Sanibel, FL',
  'Owner arriving early — rush prep tasks auto-created',
  'Great for showing how Hubify handles schedule changes. Rush tasks were created automatically when arrival moved up.');

propRow(9, 'Lighthouse Point', 'Storm Damage', 'Marco Island, FL',
  'Roof leak from recent storm — insurance documentation tasks active',
  'Point out the photo attachments on the tasks — field staff photographed the damage on-site.');

propRow(10, 'Oceanfront Oasis', 'Stable Premium', 'Naples, FL',
  'All tasks current, no open issues — shows a healthy account',
  'The "good" comparison. Use this to contrast with the others: "When everything\'s running smoothly, this is what it looks like."');

doc.moveDown(0.5);
tip('Navigate to Properties → select any property → walk through the tabs: Overview, Tasks, Rooms, Access Control, Inspections. Each tab has live data.');

// ─────────────────────────────────────────────────────────────────────────────
//  4. TASKS & INSPECTIONS
// ─────────────────────────────────────────────────────────────────────────────
section(4, 'Tasks & Inspections', 'The operational heart of the platform');

para('There are 20 pre-seeded tasks across the 10 properties: a mix of overdue, in-progress, completed, and scheduled. Three full inspection checklists are active.');

subheading('Key Things to Demonstrate');
steps([
  { title: 'Show an overdue task', detail: 'Click the Urgent Tasks widget or filter the task list by "Overdue". Open the Pelican Point water leak — it has a critical priority and a staff note attached.' },
  { title: 'Complete a task live', detail: 'Open any in-progress task and move it to Completed. The date-time stamps automatically. Point out: "This is what your field staff does on their phone when the job is done."' },
  { title: 'Show the recurring task setup', detail: 'Navigate to Oceanfront Oasis → Tasks and find the recurring weekly check. Show the recurrence schedule — next instance auto-creates on completion.' },
  { title: 'Open an inspection checklist', detail: 'Go to any property → Inspections tab. Open one of the three pre-seeded inspections. Walk through the checklist items — pass/fail/notes per room.' },
  { title: 'Create a task from a template', detail: 'Click "+ Task", then "Use Template". Show the Hurricane Prep or Move-In/Move-Out templates — pre-filled with checklist, estimated time, and priority.' },
]);

subheading('Task Statuses in the Demo');
doc.y += 4;
[
  ['Pending',     BLUE_LIGHT,   BLUE,    '8 tasks — scheduled but not yet started'],
  ['In Progress', '#fef9c3',    '#ca8a04','5 tasks — actively being worked on'],
  ['Completed',   GREEN_LIGHT,  GREEN,   '4 tasks — done; useful for showing history'],
  ['Overdue',     RED_LIGHT,    RED,     '3 tasks — intentionally overdue for demo drama'],
].forEach(([label, bg, fg, desc]) => {
  checkPageRoom(26);
  const y = doc.y;
  const pw = inlinePill(ML, y, label, bg, fg);
  doc.fillColor(SLATE_700).font('Helvetica').fontSize(10.5)
     .text(desc, ML + pw + 10, y, { width: BODY_W - pw - 10 });
  doc.y = y + 24;
});
doc.moveDown(0.5);

tip('Press T from anywhere to open the quick-task form. Create a task for the property you just visited — it takes 15 seconds. This is the "wow" moment for most prospects.');

// ─────────────────────────────────────────────────────────────────────────────
//  5. CALENDAR
// ─────────────────────────────────────────────────────────────────────────────
section(5, 'Calendar', '5 pre-seeded events — conflict detection live');

para('The Calendar has 5 demo events already in place. Two of them intentionally overlap on the same property for the same staff member — this triggers the conflict detection system.');

subheading('Pre-Seeded Events');
table2([
  ['Owner Arrival Prep',     'Sandpiper — linked to arrival rush tasks; shows property-event connection'],
  ['Royal Palm Owner Event', 'Multi-vendor coordination event — shows attendee management'],
  ['Pool Maintenance Visit', 'Sunset Key — recurring monthly; shows iCal subscription integration'],
  ['Pelican Plumber On-site','Overlap event — intentional conflict with another staff assignment'],
  ['Monthly Review Meeting', 'Team-internal; shows non-property events and staff scheduling'],
], 'Event', 'What to Point Out', { col1W: 170 });

subheading('Conflict Detection');
para('When you navigate to the Calendar, click on the Pelican Plumber event and then the overlapping assignment. The conflict badge appears immediately. Say:');
para('"Hubify checks for double-bookings automatically. Your supervisors see conflicts flagged in real time — no more discovering a problem when the client calls."', { color: TEAL_DARK, bold: true, size: 10 });

subheading('iCal Sync Demo');
steps([
  { title: 'Open User Menu → Calendar', detail: 'The iCal feed URL is shown in the Subscribe section.' },
  { title: 'Paste into Google Calendar', detail: '"Add by URL" imports all Hubify events into your personal calendar — read-only, synced automatically.' },
]);

tip('If the prospect uses a shared team calendar (Outlook, Google), lead with the iCal sync — it\'s the fastest way to show Hubify fits into their existing workflow.');

// ─────────────────────────────────────────────────────────────────────────────
//  6. INVOICES & BILLING
// ─────────────────────────────────────────────────────────────────────────────
section(6, 'Invoices & Billing', '5 invoices in every status + a consolidated batch');

para('The demo has invoices across every status, including a consolidated batch invoice — the feature prospects most frequently cite as a must-have.');

subheading('Demo Invoices at a Glance');
table2([
  ['DEMO-2026-001', 'Draft       — $1,950    · Beachside Breeze · Pre-arrival HVAC inspection'],
  ['DEMO-2026-002', 'Sent        — $3,800    · Coconut Harbor   · Hurricane prep + generator service'],
  ['DEMO-2026-003', 'Overdue     — $2,200    · Lighthouse Point · Emergency water-intrusion response'],
  ['DEMO-2026-004', 'Sent        — $2,460    · Royal Palm       · May owner-event coordination'],
  ['DEMO-2026-005', 'Paid        — $2,850    · Marina Bay       · April turnover + inspection'],
  ['DEMO-2026-CONSOL', 'Draft (Batch) — $9,850 · 3 properties  · Consolidated monthly portfolio'],
], 'Invoice #', 'Status / Amount / Property', { col1W: 140 });

subheading('What to Demo');
steps([
  { title: 'Show the batch invoice', detail: 'Go to Admin → Billing → Invoices. Open DEMO-2026-CONSOL. Scroll through the consolidated line items — all three properties, single PDF for the client.' },
  { title: 'Change a status', detail: 'Open DEMO-2026-001 (Draft). Change it to Sent. Explain: "The moment you change this status, it appears in the client\'s portal. Until then, they can\'t see it — no accidental sends."' },
  { title: 'Show the overdue invoice', detail: 'Open DEMO-2026-003. Point out the overdue badge and explain automated reminder emails — the system can be set to nudge clients automatically on day 3, 7, and 14.' },
  { title: 'Stripe payment (if configured)', detail: 'If Stripe is connected, open the paid invoice DEMO-2026-005. Show the payment method, transaction date, and receipt URL — all captured automatically via webhook.' },
]);

callout(
  'Drafts are never visible in the client portal — regardless of any setting. Clients only ever see Sent or Paid invoices. This is a hard rule, not a toggle.',
  { label: 'KEY POINT' }
);

// ─────────────────────────────────────────────────────────────────────────────
//  7. CLIENT PORTAL
// ─────────────────────────────────────────────────────────────────────────────
section(7, 'Client Portal', 'A private window into their portfolio — no staff access required');

para('The portal is a completely separate interface. Log in as the demo client to show what your customers actually see — without exposing internal operations or other clients\' data.');

subheading('Logging into the Portal');
credBox('URL:', '/portal/login');
credBox('Email:', 'client@demo.hubifyhomesonline.com');
credBox('Password:', 'DemoClient2026!', { bg: PURPLE_LIGHT, border: '#ddd6fe', labelColor: PURPLE });
doc.moveDown(0.5);

subheading('What the Demo Client Sees');
table2([
  ['My Properties', 'Beachside Breeze + Marina Bay Condo — the 2 properties linked to this portal account'],
  ['My Tasks',      'Active tasks on those 2 properties — field notes are stripped from client view'],
  ['My Invoices',   'Only Sent and Paid invoices — DEMO-2026-004 and -005 appear; drafts are hidden'],
  ['Documents',     'Any files explicitly shared by staff — shows secure document delivery'],
], 'Portal Tab', 'What the Client Sees', { col1W: 130 });

subheading('Suggested Portal Script');
para('"Now I\'m going to log in as one of your clients. This is the exact experience they get — their properties, their tasks, their invoices. Nothing else. No other client\'s data. No internal notes."', { color: TEAL_DARK, bold: true, size: 10 });
para('"When I go to Invoices, they can see what\'s been sent, download a PDF, and — if you\'ve connected Stripe — pay directly from this screen. You get notified the moment they do."', { color: TEAL_DARK, bold: true, size: 10 });

tip('Open the portal and staff tabs side by side (two browser windows) during the demo. Update a task in the staff view, then refresh the portal — they\'ll see it update in real time.');

subheading('Password Reset (for prospects)');
steps([
  { title: 'Direct them to /portal/login', detail: 'Click "Forgot password?" and follow the reset flow.' },
  { title: 'They set their own password', detail: 'The portal uses email + password login, separate from Replit. Prospects can create their own account via invitation.' },
]);

// ─────────────────────────────────────────────────────────────────────────────
//  8. DISPATCH CENTER
// ─────────────────────────────────────────────────────────────────────────────
section(8, 'Dispatch Center', 'Build daily itineraries and brief field staff before they leave');

para('The Dispatch Center is where supervisors plan the day\'s route for field staff — assigning which properties to visit, in what order, with estimated travel and stop durations.');

subheading('How to Demo It');
steps([
  { title: 'Navigate to Dispatch', detail: 'Click the Dispatch item in the main navigation (Admins and Supervisors only).' },
  { title: 'Select or create an itinerary', detail: 'Today\'s itinerary appears if one exists. Click "New Itinerary" to create one from scratch, or select an existing itinerary from the left panel.' },
  { title: 'Add stops', detail: 'Click "+ Add Stop" and select a property. Set an estimated duration. Drag stops to reorder.' },
  { title: 'Open the Route Brief', detail: 'Click the "Route Brief" button in the itinerary header. A side panel opens with three tabs.' },
  { title: 'Walk through the three tabs', detail: 'Access Codes (tap the eye icon to reveal), Alerts & Instructions (severity-coded), Supplies (what to bring vs. what to order).' },
  { title: 'Publish the itinerary', detail: 'Click Publish. The itinerary pushes to the assigned staff member\'s calendar and phone.' },
]);

subheading('Route Brief Tabs');
table2([
  ['Access Codes',           'All property codes for the route — door, gate, alarm, Wi-Fi. Values are blurred by default; tap the eye to reveal. Prevents codes being visible on screen during the briefing.'],
  ['Alerts & Instructions',  'Active property alerts (critical, warning, info) + client notes. Critical alerts shown first. Say: "Before your team walks out the door, they know about the dog, the sensitive alarm, and the flooded back room."'],
  ['Supplies',               '"Bring from stock" vs "Need to purchase" — items due for replacement within 30 days. Checkboxes let staff tick off what they\'ve loaded in the van.'],
], 'Tab', 'What to Say / Point Out', { col1W: 150 });

tip('"This replaces the paper clipboard, the group text, and the spreadsheet your dispatcher emailed this morning — all in one screen, always current."');

// ─────────────────────────────────────────────────────────────────────────────
//  9. TEAM MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
section(9, 'Team Management', 'Roles, assignments, and staff coordination');

para('Navigate to the Team section to show staff management. The demo has 4 team members: 1 admin, 1 supervisor, and 2 staff — representing a typical small-to-mid size operation.');

subheading('What to Show');
bullet([
  'Role hierarchy — Admin → Supervisor → Staff and what each role can and cannot do',
  'Inviting a new team member — click "Invite Team Member", enter an email, assign a role. They receive the invitation automatically.',
  'Supervisor relationships — click on Demo Staff 1 to see their assigned supervisor and how that affects task assignment workflow',
  'Out-of-office — show how to flag a staff member as unavailable and how it blocks new task assignments for that period',
  'Broadcast messaging — show how to email an entire team at once from the Messages section',
]);

subheading('Role Permissions at a Glance');
table2([
  ['Admin',      'Everything: billing, settings, team management, all data, super-admin actions'],
  ['Supervisor', 'All operational data; cannot change org settings or billing; can manage tasks and team assignments'],
  ['Staff',      'Own tasks and assigned properties only; no billing, no team management, no other clients\' data'],
], 'Role', 'What They Can Access', { col1W: 110 });

callout(
  'Time Tracking is controlled by a feature flag. If the prospect needs billable time logging, confirm it\'s enabled in Settings → Feature Flags before the demo.',
  { label: 'FEATURE FLAG' }
);

// ─────────────────────────────────────────────────────────────────────────────
//  10. TALKING POINTS & OBJECTIONS
// ─────────────────────────────────────────────────────────────────────────────
section(10, 'Talking Points & Objection Responses', 'Common questions and how to answer them');

subheading('"We already use spreadsheets / a different tool."');
para('"Hubify isn\'t just a better spreadsheet — it connects the job (task), the place (property), the person (client), and the money (invoice) in one record. When you complete a task, it\'s already attached to the right property and ready to invoice. No retyping, no cross-referencing."', { color: SLATE_700 });
doc.moveDown(0.3);

subheading('"Our clients don\'t want a portal — they just want to call us."');
para('"The portal doesn\'t replace the phone — it answers the questions that don\'t need a phone. \'Did the inspector go today?\' \'Where\'s my invoice?\' \'Did that leak get fixed?\' Clients check the portal instead of calling. You get fewer interruptions, they get instant answers."', { color: SLATE_700 });
doc.moveDown(0.3);

subheading('"What about our existing property data?"');
para('"We have a CSV import tool with AI-assisted field mapping — you can import your existing properties, contacts, and tasks. Most teams are fully migrated in a day. We also offer a white-glove onboarding service for larger portfolios."', { color: SLATE_700 });
doc.moveDown(0.3);

subheading('"Is my data secure?"');
para('"Hubify is multi-tenant — each organization is completely isolated. Your clients\' data is encrypted at rest and in transit. Access codes are stored encrypted. We\'re built on enterprise-grade infrastructure with SOC 2-aligned practices."', { color: SLATE_700 });
doc.moveDown(0.3);

subheading('"What\'s the pricing?"');
para('"Pricing is based on the number of active properties in your portfolio. I can pull up the current plan options and we can walk through which tier fits your team. Would you like to do that now, or finish the demo first?"', { color: SLATE_700 });
doc.moveDown(0.5);

hline(TEAL, 1.5);

subheading('Demo Reset', { color: SLATE_500 });
para('If any demo data gets changed during the walkthrough and you want to restore the original state, go to Super Admin → Demo tab → Full Reset. This wipes and reseeds everything in about 30 seconds. The demo URL and admin login are never affected.', { color: SLATE_500 });

doc.moveDown(0.5);
hline(TEAL, 1.5);
doc.moveDown(0.5);
para('Questions during the demo?  Press ? inside Hubify to open the support form, or email your Hubify account manager directly.', { color: SLATE_500, size: 10 });
para('Hubify · hubifyhomesonline.com', { color: TEAL_DARK, bold: true, size: 10 });

// ─── Finalize ──────────────────────────────────────────────────────────────
footer();
doc.end();

await new Promise((resolve, reject) => {
  stream.on('finish', resolve);
  stream.on('error', reject);
});

console.log(`\n✓  PDF saved to: ${OUT_PDF}`);
console.log(`   Size: ${(fs.statSync(OUT_PDF).size / 1024).toFixed(1)} KB`);
console.log(`   Pages: ~10 sections + cover + TOC`);
