import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PDF = path.join(__dirname, '../screenshots/Hubify_User_Guide.pdf');
fs.mkdirSync(path.dirname(OUT_PDF), { recursive: true });

// ─── Brand palette ────────────────────────────────────────────────────────────
const BLUE        = '#2563eb';
const BLUE_DARK   = '#1e40af';
const BLUE_LIGHT  = '#eff6ff';
const BLUE_BORDER = '#bfdbfe';
const SLATE_900   = '#0f172a';
const SLATE_700   = '#334155';
const SLATE_500   = '#64748b';
const SLATE_200   = '#e2e8f0';
const SLATE_50    = '#f8fafc';
const WHITE       = '#ffffff';
const GREEN       = '#16a34a';
const ORANGE      = '#d97706';
const PURPLE      = '#7c3aed';

// ─── Layout constants ─────────────────────────────────────────────────────────
const PW    = 612;   // LETTER width pts
const PH    = 792;   // LETTER height pts
const ML    = 64;    // left margin
const MR    = 64;    // right margin
const BODY_W = PW - ML - MR;

// ─── PDF setup ────────────────────────────────────────────────────────────────
const doc = new PDFDocument({ size: 'LETTER', margin: 0, autoFirstPage: false, bufferPages: true });
const stream = fs.createWriteStream(OUT_PDF);
doc.pipe(stream);

let _pageNum = 0;
doc.on('pageAdded', () => { _pageNum++; });

function newPage() {
  doc.addPage();
  // top rule
  doc.rect(0, 0, PW, 4).fill(BLUE);
}

function footer() {
  if (_pageNum < 2) return;
  doc.save();
  doc.fillColor(SLATE_500).font('Helvetica').fontSize(8);
  doc.text('Hubify User Guide · hubify.com', ML, PH - 28, { width: 250 });
  doc.text(String(_pageNum), PW - ML - 40, PH - 28, { width: 40, align: 'right' });
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

function para(text, { color = SLATE_700, size = 10.5, bold = false, indent = ML, width = BODY_W, gap = 6 } = {}) {
  checkPageRoom(40);
  doc.fillColor(color)
     .font(bold ? 'Helvetica-Bold' : 'Helvetica')
     .fontSize(size)
     .text(text, indent, doc.y, { width, lineGap: gap });
  doc.moveDown(0.5);
}

function subheading(text) {
  checkPageRoom(50);
  doc.moveDown(0.3);
  doc.fillColor(SLATE_900).font('Helvetica-Bold').fontSize(12).text(text, ML, doc.y);
  doc.moveDown(0.5);
}

function bullet(items, indent = ML + 12) {
  items.forEach(item => {
    checkPageRoom(24);
    const y = doc.y;
    doc.circle(ML + 4, y + 5, 2.5).fill(BLUE);
    doc.fillColor(SLATE_700).font('Helvetica').fontSize(10.5)
       .text(item, indent, y, { width: BODY_W - (indent - ML), lineGap: 4 });
    doc.moveDown(0.3);
  });
  doc.moveDown(0.3);
}

function steps(items) {
  items.forEach((item, i) => {
    checkPageRoom(50);
    const y = doc.y;
    // number circle
    doc.circle(ML + 9, y + 9, 9).fill(BLUE);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(9)
       .text(String(i + 1), ML, y + 4, { width: 18, align: 'center' });
    // title
    doc.fillColor(SLATE_900).font('Helvetica-Bold').fontSize(10.5)
       .text(item.title, ML + 24, y + 3);
    if (item.detail) {
      doc.fillColor(SLATE_500).font('Helvetica').fontSize(10)
         .text(item.detail, ML + 24, doc.y + 2, { width: BODY_W - 24, lineGap: 3 });
    }
    doc.moveDown(0.8);
  });
}

function tip(text) {
  checkPageRoom(60);
  const y = doc.y;
  const bh = 44;
  doc.roundedRect(ML, y, BODY_W, bh, 6).fill(BLUE_LIGHT).stroke(BLUE_BORDER);
  doc.fillColor(BLUE_DARK).font('Helvetica-Bold').fontSize(9)
     .text('TIP', ML + 12, y + 9);
  doc.fillColor(BLUE_DARK).font('Helvetica').fontSize(9.5)
     .text(text, ML + 44, y + 9, { width: BODY_W - 56, lineGap: 3 });
  doc.y = y + bh + 10;
  doc.moveDown(0.4);
}

function note(text, color = ORANGE) {
  checkPageRoom(60);
  const y = doc.y;
  const bh = 44;
  doc.roundedRect(ML, y, BODY_W, bh, 6).fill('#fffbeb').stroke('#fed7aa');
  doc.fillColor(color).font('Helvetica-Bold').fontSize(9).text('NOTE', ML + 12, y + 9);
  doc.fillColor('#92400e').font('Helvetica').fontSize(9.5)
     .text(text, ML + 50, y + 9, { width: BODY_W - 62, lineGap: 3 });
  doc.y = y + bh + 10;
  doc.moveDown(0.4);
}

function badge(text, color = BLUE, bg = BLUE_LIGHT) {
  const w = doc.widthOfString(text, { fontSize: 8 }) + 16;
  const y = doc.y;
  doc.roundedRect(ML, y, w, 18, 4).fill(bg).stroke(color);
  doc.fillColor(color).font('Helvetica-Bold').fontSize(8).text(text, ML + 8, y + 5);
  doc.moveDown(1.2);
}

// Role / status pill inline helpers
function inlinePill(x, y, text, bg, fg) {
  const w = doc.widthOfString(text, { fontSize: 8 }) + 14;
  doc.roundedRect(x, y - 2, w, 16, 3).fill(bg);
  doc.fillColor(fg).font('Helvetica-Bold').fontSize(8).text(text, x + 7, y + 1);
  return w + 6;
}

// ─── Section opener ───────────────────────────────────────────────────────────
function section(num, title, subtitle = '') {
  footer();
  newPage();

  // Large section number
  doc.fillColor('#e2e8f0').font('Helvetica-Bold').fontSize(96)
     .text(String(num).padStart(2, '0'), PW - 130, 18, { width: 120, align: 'right' });

  doc.fillColor(SLATE_900).font('Helvetica-Bold').fontSize(24)
     .text(title, ML, 28, { width: 420 });

  if (subtitle) {
    doc.fillColor(SLATE_500).font('Helvetica').fontSize(11)
       .text(subtitle, ML, doc.y + 2, { width: 420 });
  }

  doc.y = 100;
  hline(SLATE_200, 1);
}

// ─── Two-column table helper ──────────────────────────────────────────────────
function table2(rows, col1Label = 'Item', col2Label = 'Description') {
  const C1 = 120, C2 = BODY_W - C1 - 10;
  const y0 = doc.y;

  // header
  doc.rect(ML, y0, BODY_W, 22).fill(BLUE);
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(9)
     .text(col1Label, ML + 6, y0 + 7)
     .text(col2Label, ML + C1 + 6, y0 + 7);
  let y = y0 + 22;

  rows.forEach((row, i) => {
    const estimatedH = 22;
    checkPageRoom(estimatedH + 10);
    y = doc.y;
    if (i % 2 === 0) doc.rect(ML, y, BODY_W, estimatedH).fill(SLATE_50);
    doc.fillColor(SLATE_900).font('Helvetica-Bold').fontSize(9.5)
       .text(row[0], ML + 6, y + 6, { width: C1 - 12 });
    doc.fillColor(SLATE_700).font('Helvetica').fontSize(9.5)
       .text(row[1], ML + C1 + 6, y + 6, { width: C2 - 6, lineGap: 2 });
    doc.y = y + estimatedH;
  });

  doc.moveDown(1);
}

// ─── Shortcut key visual ──────────────────────────────────────────────────────
function shortcutRow(key, desc) {
  checkPageRoom(30);
  const y = doc.y;
  const kw = 54;
  doc.rect(ML, y, kw, 22).fill(SLATE_50).stroke(SLATE_200);
  doc.fillColor(SLATE_900).font('Helvetica-Bold').fontSize(11)
     .text(key, ML, y + 6, { width: kw, align: 'center' });
  doc.fillColor(SLATE_700).font('Helvetica').fontSize(10.5)
     .text(desc, ML + kw + 12, y + 7, { width: BODY_W - kw - 12 });
  doc.y = y + 28;
}

// ─────────────────────────────────────────────────────────────────────────────
//  COVER PAGE
// ─────────────────────────────────────────────────────────────────────────────
doc.addPage();
// Full-bleed blue background
doc.rect(0, 0, PW, PH).fill(BLUE);

// White geometric accent
doc.save();
doc.opacity(0.08);
doc.circle(PW, 0, 280).fill(WHITE);
doc.circle(0, PH, 200).fill(WHITE);
doc.restore();

// Logo area
doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(52).text('Hubify', ML, 160);
doc.fillColor('rgba(255,255,255,0.7)').font('Helvetica').fontSize(18).text('Homes', ML + 3, 220);

doc.moveDown(0.3);
doc.moveTo(ML, doc.y).lineTo(ML + 200, doc.y).lineWidth(1).strokeColor('rgba(255,255,255,0.4)').stroke();
doc.moveDown(1);

doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(28).text('User Guide', ML, doc.y);
doc.fillColor('rgba(255,255,255,0.75)').font('Helvetica').fontSize(13)
   .text('Property Management Platform\nAdmin & Staff Reference', ML, doc.y + 6);

doc.fillColor('rgba(255,255,255,0.5)').font('Helvetica').fontSize(10)
   .text(`Version 1.0  ·  ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`, ML, PH - 80);
doc.text('For internal use', ML, PH - 65);

// ─────────────────────────────────────────────────────────────────────────────
//  TABLE OF CONTENTS
// ─────────────────────────────────────────────────────────────────────────────
newPage();
doc.fillColor(SLATE_900).font('Helvetica-Bold').fontSize(22).text('Contents', ML, 28);
hline(BLUE, 2);
doc.y = 70;

const toc = [
  [1,  'Getting Started — Login & Navigation'],
  [2,  'Dashboard'],
  [3,  'Properties'],
  [4,  'Tasks'],
  [5,  'Contacts'],
  [6,  'Team'],
  [7,  'Calendar'],
  [8,  'Invoices & Billing'],
  [9,  'Client Portal'],
  [10, 'Admin Settings'],
  [11, 'Account Settings'],
  [12, 'Time Tracking'],
  [13, 'Messages & Team Chat'],
  [14, 'Notifications'],
  [15, 'Tips & Keyboard Shortcuts'],
];

toc.forEach(([num, title], i) => {
  const y = doc.y;
  if (i % 2 === 0) doc.rect(ML, y - 2, BODY_W, 24).fill(SLATE_50);
  // number badge
  doc.rect(ML + 4, y + 3, 22, 16).fill(BLUE);
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(8).text(String(num), ML + 4, y + 7, { width: 22, align: 'center' });
  doc.fillColor(SLATE_900).font('Helvetica').fontSize(11).text(title, ML + 34, y + 4);
  doc.y = y + 24;
});

footer();

// ─────────────────────────────────────────────────────────────────────────────
//  1. GETTING STARTED
// ─────────────────────────────────────────────────────────────────────────────
section(1, 'Getting Started', 'Login, navigation, and your first session');

para('Hubify runs entirely in your web browser — nothing to install. If you\'ve received an invitation email, you already have everything you need to get started.');

subheading('Logging In');
para('Hubify uses Replit for secure authentication. Your account is linked to your organization by email address.');
steps([
  { title: 'Open the Hubify URL', detail: 'Navigate to your organization\'s Hubify address and click the blue Login button in the top-right corner.' },
  { title: 'Sign in with Replit', detail: 'You\'ll be redirected to Replit\'s login page. Use the same email address your admin used when they invited you.' },
  { title: 'You\'re in', detail: 'After a successful sign-in you land on your Dashboard automatically. Your role and organization are set by your admin.' },
]);

tip('Your login email must exactly match the address your admin entered. If you can\'t get in, ask your admin to verify the email on your account.');

subheading('The Navigation Bar');
para('The top navigation bar is always visible. It contains:');
bullet([
  'Hubify logo (left) — click to return to the Dashboard from anywhere',
  'Dashboard, Tasks, Properties, Clients, Team — the five main sections of the app',
  'Search bar — press S or ⌘K to open global search; find tasks, properties, people, anything',
  'Notification bell — shows an unread count badge; click to open the notifications panel',
  'User menu (top-right) — Messages, Calendar, Time Tracking, Settings, and Logout',
]);

subheading('User Roles at a Glance');
table2([
  ['Admin',      'Full access to all features, settings, billing, and team management'],
  ['Supervisor', 'Can manage staff and view all data; cannot change org-level settings'],
  ['Staff',      'Can see and act on tasks and properties assigned to them'],
], 'Role', 'Access Level');

// ─────────────────────────────────────────────────────────────────────────────
//  2. DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
section(2, 'Dashboard', 'Your command center for daily operations');

para('The Dashboard gives you an instant snapshot of everything important happening right now. It loads the moment you log in and updates in real time.');

subheading('Dashboard Widgets');
table2([
  ['Urgent Tasks',       'Tasks that are overdue or marked high/urgent priority — click any to open it'],
  ['Statistics Overview','Key numbers: total properties, open tasks, team size, pending invoices'],
  ['Team Chat',          'Post quick updates and @mention teammates; all team members see this feed'],
  ['Recent Activity',    'A chronological log of changes made across the platform'],
  ['Calendar',           'Upcoming events and task due dates (toggle on in widget settings)'],
  ['Billing Queue',      'Invoices awaiting review — visible to Admins and Supervisors only'],
], 'Widget', 'What It Shows');

subheading('Customizing Your Dashboard');
steps([
  { title: 'Click the gear icon', detail: 'Located in the top-right corner of the Dashboard header.' },
  { title: 'Toggle widgets on or off', detail: 'Enable only the widgets that are relevant to your daily workflow.' },
  { title: 'Reorder by dragging', detail: 'Drag widgets into the order that makes sense for how you work.' },
  { title: 'Save', detail: 'Your layout is saved automatically and persists between sessions.' },
]);

tip('Press T anywhere on the platform to instantly open the quick-add task form. Press S to open global search. Press ? to open the support form.');

subheading('Getting Started Card');
para('New users see a "Getting Started" card at the top of the Dashboard for the first 14 days. It links to the four most important setup steps — adding properties, inviting team members, creating a task, and configuring the client portal. Dismiss it once you\'re set up.');

// ─────────────────────────────────────────────────────────────────────────────
//  3. PROPERTIES
// ─────────────────────────────────────────────────────────────────────────────
section(3, 'Properties', 'The foundation that every task, invoice, and client record ties back to');

para('Properties are the core record in Hubify. Every task, inspection, invoice, and client relationship is connected to a property. Each property has a full profile page with everything in one place.');

subheading('Adding a Property');
steps([
  { title: 'Go to Properties', detail: 'Click "Properties" in the top navigation bar.' },
  { title: 'Click "+ Add Property"', detail: 'Enter the property address and type. Additional fields (owner, notes, size) can be filled in now or later.' },
  { title: 'Add access codes', detail: 'On the property profile, open the Access Control section. Store door codes, Wi-Fi passwords, alarm codes, and gate codes — all encrypted.' },
  { title: 'Link contacts', detail: 'Attach the property owner and any related clients, tenants, or vendors from the Contacts tab.' },
  { title: 'Add preferred vendors', detail: 'Link your go-to plumber, electrician, landscaper, etc. so the right contact is always at hand when something needs attention.' },
]);

subheading('Importing Properties via CSV');
para('If you have an existing property list in a spreadsheet, use Admin → Import → Properties. Upload the CSV and Hubify will map your columns — including AI-assisted field matching for non-standard headers. Review the mapping, then import in bulk.');

subheading('Property Profile Tabs');
bullet([
  'Overview — address, type, owner name, notes, last visited date',
  'Tasks — all open and completed tasks linked to this property',
  'Rooms — room-by-room detail with photos, supply tracking, and notes',
  'Access Control — all secure codes and credentials',
  'Warranties — appliance and system warranties with expiry dates',
  'Vendors — preferred vendors for this specific property',
  'Documents — files and photos stored against this property',
  'Inspections — past reports and upcoming scheduled inspections',
]);

tip('Use the Access Control section for all codes and passwords — never put them in task notes where they might be shared accidentally.');

// ─────────────────────────────────────────────────────────────────────────────
//  4. TASKS
// ─────────────────────────────────────────────────────────────────────────────
section(4, 'Tasks', 'How every job gets tracked from assignment to completion');

para('Tasks are how work gets done in Hubify. Every job — routine check, repair, inspection, vendor visit, or errand — should be a task. This keeps your history accurate and your invoicing clean.');

subheading('Creating a Task');
steps([
  { title: 'Press T or click "+ Task"', detail: 'The quick-add form opens immediately from anywhere in the app.' },
  { title: 'Give it a clear title', detail: 'Good titles are specific: "Annual AC filter replacement – 123 Main" beats "AC task".' },
  { title: 'Assign it', detail: 'Link the task to a property and assign it to a team member. Set a due date.' },
  { title: 'Set priority', detail: 'Urgent and High-priority tasks surface prominently on the dashboard and notification list.' },
  { title: 'Add photos or notes', detail: 'Attach before/after photos, written notes, or a checklist. For repeat work, set a recurrence schedule.' },
  { title: 'Save', detail: 'The assignee sees the task on their list and receives a notification.' },
]);

subheading('Task Statuses');
doc.y += 4;
const statusRows = [
  ['Open',       BLUE_LIGHT,   BLUE,       'Newly created; not yet started'],
  ['In Progress','#fef9c3',    '#ca8a04',  'Actively being worked on'],
  ['Completed',  '#dcfce7',    GREEN,      'Work is done; ready for review or invoicing'],
  ['Archived',   SLATE_50,     SLATE_500,  'Removed from active views but preserved in history'],
];
statusRows.forEach(([label, bg, fg, desc]) => {
  checkPageRoom(28);
  const y = doc.y;
  const pw = inlinePill(ML, y, label, bg, fg);
  doc.fillColor(SLATE_700).font('Helvetica').fontSize(10.5)
     .text(desc, ML + pw + 10, y, { width: BODY_W - pw - 10 });
  doc.y = y + 24;
});
doc.moveDown(0.5);

subheading('Task Priorities');
bullet([
  'Urgent — immediately visible on the dashboard; assignee notified with high urgency',
  'High — surfaced in the Urgent Tasks widget alongside Urgent items',
  'Normal — standard task, visible in the task list',
  'Low — background work; filtered out of urgent views',
]);

subheading('Recurring Tasks');
para('For work that repeats on a schedule (weekly property checks, monthly inspections, seasonal preparation), enable Recurring when creating the task. Set the frequency (daily / weekly / monthly / custom) and Hubify automatically creates the next instance when you complete the current one.');

subheading('Task Templates');
para('Save any task as a reusable template via Admin → Templates. Templates can include a pre-filled checklist, description, priority, and estimated duration. Create complex multi-step tasks in a single click — ideal for move-in/move-out checklists and seasonal routines.');

subheading('Inspections');
para('Inspections are a special task type with a built-in checklist system. Create an inspection schedule on a property and Hubify will automatically generate the inspection task on the right day, complete with the associated checklist for field staff to fill out on site.');

tip('Create a task for every job, even small ones. This builds your property history and gives you accurate data for invoicing and reporting.');

// ─────────────────────────────────────────────────────────────────────────────
//  5. CONTACTS
// ─────────────────────────────────────────────────────────────────────────────
section(5, 'Contacts', 'Everyone connected to your business, in one place');

para('Contacts stores all the people and companies you work with: property owners, clients, tenants, vendors, emergency contacts, and more. Contacts are universal — they can be linked to multiple properties and to the client portal.');

subheading('Contact Types');
table2([
  ['Owner',           'The person financially responsible for a property'],
  ['Client',          'A paying client; can be invited to the portal for self-service access'],
  ['Vendor',          'A service provider — plumber, landscaper, cleaner, electrician, etc.'],
  ['Tenant',          'A resident at a managed property'],
  ['Emergency',       'A backup contact for urgent situations at a specific property'],
], 'Type', 'Description');

subheading('Adding a Contact');
steps([
  { title: 'Go to Contacts', detail: 'Click "Clients" in the navigation bar — this opens the full Contacts section.' },
  { title: 'Click "+ Add Contact"', detail: 'Enter name, email, phone, and type. All fields except name are optional.' },
  { title: 'Link to properties', detail: 'From the contact\'s Properties tab, attach them to one or more properties. You can also link from the property side.' },
  { title: 'Invite to portal (clients)', detail: 'For client contacts, click "Invite to Portal" to send them an email with their login link.' },
]);

subheading('Vendor Employees');
para('For vendor companies, you can add individual employees within their contact record. This is useful when a vendor has multiple technicians who you work with directly.');

subheading('Duplicate Detection');
para('When you add a new contact, Hubify checks for existing records with the same name or email address and flags potential duplicates. Review them from the Duplicates widget on the dashboard — you can merge or dismiss each one.');

// ─────────────────────────────────────────────────────────────────────────────
//  6. TEAM
// ─────────────────────────────────────────────────────────────────────────────
section(6, 'Team', 'Managing the people who do the work');

para('The Team section is where you manage your staff — their roles, assignments, schedules, and communication. Only Admins and Supervisors can invite or edit team members.');

subheading('Inviting a Team Member');
steps([
  { title: 'Go to Team', detail: 'Click "Team" in the navigation bar.' },
  { title: 'Click "Invite Team Member"', detail: 'Enter their first name, last name, email address, and role.' },
  { title: 'They receive an invitation email', detail: 'The email explains what Hubify is, their role, and has a "Log in to Hubify" button.' },
  { title: 'They sign in', detail: 'When they log in with the same email address, their account is automatically linked to your organization.' },
]);

subheading('Teams');
para('Create sub-teams to group staff by function, region, or property set — for example: "South Zone", "Luxury Portfolio", "Maintenance Crew". Teams can be:');
bullet([
  'Assigned tasks collectively — assign a task to a team and any member can pick it up',
  'Emailed as a group — use the broadcast email tool to message an entire team at once',
  'Reported on — filter task and time tracking reports by team',
]);

subheading('Out of Office');
para('Staff can mark themselves as out of office for a specific date range. During that period, tasks cannot be assigned to them and any existing upcoming assignments are flagged. This prevents scheduling conflicts and ensures work gets covered.');

subheading('Supervisor Relationships');
para('Assign a supervisor to each staff member to establish reporting lines. Supervisors can see and manage the tasks assigned to their direct reports, making delegation and follow-up easier.');

note('Supervisors do not have access to billing, admin settings, or organization-wide reports unless those features are specifically enabled for them.');

// ─────────────────────────────────────────────────────────────────────────────
//  7. CALENDAR
// ─────────────────────────────────────────────────────────────────────────────
section(7, 'Calendar', 'Scheduling, conflicts, and iCal sync');

para('The Calendar gives you a visual view of everything scheduled — property visits, inspections, team meetings, task due dates, and client appointments.');

subheading('Creating an Event');
steps([
  { title: 'Click on any date', detail: 'A quick-create form opens for the selected date.' },
  { title: 'Fill in the details', detail: 'Give the event a title, attach it to a property (optional), and assign one or more team members.' },
  { title: 'Set recurrence', detail: 'For regular events (weekly team standups, monthly walkthroughs), enable the recurring option and set the frequency.' },
  { title: 'Save', detail: 'The event appears on the calendar and assigned staff are notified.' },
]);

subheading('Calendar Views');
bullet([
  'Month view — see the full month at a glance; events shown as colored chips by type',
  'Week view — detailed view of a single week with time slots',
  'Day view — hour-by-hour schedule for a single day',
  'Agenda view — list of upcoming events in chronological order',
]);

subheading('Conflict Detection');
para('Hubify automatically checks for scheduling conflicts when you create or edit an event. If two events overlap for the same team member, a warning is shown immediately. A full conflict scan also runs automatically twice a day (2am and 2pm) and results are visible in the dashboard notifications.');

subheading('iCal Subscription (Personal Calendar Sync)');
steps([
  { title: 'Open your User Menu', detail: 'Click your name or avatar in the top-right corner.' },
  { title: 'Go to Calendar → Subscribe', detail: 'Copy your personal iCal feed URL.' },
  { title: 'Add to your calendar app', detail: 'Paste the URL into Google Calendar (Add by URL), Apple Calendar, or Outlook as a new calendar subscription.' },
  { title: 'Done', detail: 'Your Hubify events now appear in your personal calendar — read-only and automatically synced.' },
]);

tip('The iCal feed is read-only. Changes must be made inside Hubify, and your calendar app will sync them on its normal refresh interval (usually every few hours).');

// ─────────────────────────────────────────────────────────────────────────────
//  8. INVOICES & BILLING
// ─────────────────────────────────────────────────────────────────────────────
section(8, 'Invoices & Billing', 'From line items to payment collection');

para('Hubify includes a complete invoicing system — from creating individual invoices to batching multiple invoices for a client into one consolidated bill. Stripe integration enables clients to pay directly from their portal.');

subheading('Invoice Statuses');
const invStatuses = [
  ['Draft',   '#f1f5f9', SLATE_500, 'Internal only — clients cannot see draft invoices'],
  ['Sent',    BLUE_LIGHT, BLUE,     'Visible in client portal; awaiting payment'],
  ['Paid',    '#dcfce7', GREEN,     'Payment confirmed; record closed'],
  ['Overdue', '#fef2f2', '#dc2626', 'Due date passed without payment; automated reminders active'],
];
doc.y += 4;
invStatuses.forEach(([label, bg, fg, desc]) => {
  checkPageRoom(28);
  const y = doc.y;
  const pw = inlinePill(ML, y, label, bg, fg);
  doc.fillColor(SLATE_700).font('Helvetica').fontSize(10.5)
     .text(desc, ML + pw + 10, y, { width: BODY_W - pw - 10 });
  doc.y = y + 24;
});
doc.moveDown(0.5);

subheading('Creating an Invoice');
steps([
  { title: 'Go to Admin → Invoices', detail: 'All invoices are managed from the Admin section — Admins and Supervisors only.' },
  { title: 'Click "+ New Invoice"', detail: 'Select the client and the property (or properties). Invoices can span multiple properties.' },
  { title: 'Add line items', detail: 'Each line item has a description, quantity, unit price, and an optional category (labor, materials, travel, etc.).' },
  { title: 'Save as Draft', detail: 'Drafts are internal only and never shown to clients until you\'re ready.' },
  { title: 'Change status to Sent', detail: 'The client can now see and pay the invoice from their portal.' },
]);

subheading('Consolidated Batch Invoices');
para('For clients with activity across multiple properties in a billing period, use Batch Invoices to combine everything into a single organized bill:');
steps([
  { title: 'Go to Admin → Billing → Batch Invoices' },
  { title: 'Select the client' },
  { title: 'Choose the individual invoices to include' },
  { title: 'Hubify generates a consolidated document with all line items and a summary total' },
]);

subheading('Connecting Stripe');
para('When Stripe is connected (Admin → Billing → Connect Stripe), clients can pay invoices directly from their portal using a credit card. Payment status is tracked automatically via webhook — no manual reconciliation needed.');

note('Stripe payments require a Stripe account. Contact your Hubify admin or the Hubify support team to complete the Stripe onboarding process.');

// ─────────────────────────────────────────────────────────────────────────────
//  9. CLIENT PORTAL
// ─────────────────────────────────────────────────────────────────────────────
section(9, 'Client Portal', 'A private, branded view for your clients');

para('The Client Portal is a separate web interface where your clients can log in and see their properties, task progress, invoices, and documents — without any access to your internal tools or other clients\' data.');

subheading('Setting Up the Portal');
steps([
  { title: 'Enable the portal', detail: 'Go to Admin → Client Portal Settings and toggle the portal on for your organization.' },
  { title: 'Set your welcome message', detail: 'Write the message clients see when they first log in. Keep it friendly and brief.' },
  { title: 'Add branding (optional)', detail: 'Upload your company logo to appear on the portal login page and header.' },
  { title: 'Invite a client', detail: 'From a client\'s contact record, click "Invite to Portal". An invitation email is sent with their login link.' },
  { title: 'Share the portal URL', detail: 'The portal lives at /portal/login on your Hubify domain. Share this with clients alongside their invitation.' },
]);

subheading('What Clients Can See');
table2([
  ['My Properties', 'Property overview, address, and current status'],
  ['My Tasks',      'Active and recent tasks on their properties — no internal staff notes visible'],
  ['My Invoices',   'Sent and paid invoices only — draft invoices are always hidden'],
  ['Documents',     'Files you have explicitly shared with them'],
], 'Portal Tab', 'What the Client Sees');

tip('Clients only ever see invoices with status Sent or Paid. Drafts are always hidden from the portal, regardless of settings.');

subheading('Client Portal Login');
para('Clients create their own password when they accept their invitation. They log in at your portal URL with their email and password — this is separate from the Replit login used by your staff.');

// ─────────────────────────────────────────────────────────────────────────────
//  10. ADMIN SETTINGS
// ─────────────────────────────────────────────────────────────────────────────
section(10, 'Admin Settings', 'Organization-wide configuration (Admin role required)');

para('The Admin section is accessible to Admins and Supervisors from the top navigation. It controls all operational settings for your organization.');

subheading('Admin Tabs Overview');
table2([
  ['General',       'Organization name, contact email, default hourly rate, timezone'],
  ['Invoices',      'View and manage all invoices across the organization; create batch invoices'],
  ['Billing',       'Stripe integration, subscription plan, payment settings'],
  ['Client Portal', 'Portal on/off switch, welcome message, branding settings'],
  ['Templates',     'Reusable task templates and email templates'],
  ['Import',        'CSV import for properties, contacts, and tasks with AI field mapping'],
  ['Forms',         'Custom forms for field staff to fill out on site'],
  ['Alerts',        'Create and manage organization-wide alert banners for your team'],
  ['Email Templates','Pre-built email templates with merge fields for consistent client communication'],
], 'Tab', 'What You Can Do');

subheading('Setting a Default Hourly Rate');
para('Go to Admin → General and set your organization\'s default hourly rate. This rate pre-fills on new time entries and invoice line items, saving time when billing for labor. Individual rates can be overridden per entry.');

subheading('Import Manager');
steps([
  { title: 'Go to Admin → Import', detail: 'Choose the data type: Properties, Contacts, or Tasks.' },
  { title: 'Download the sample CSV', detail: 'Use this as a template to format your data correctly.' },
  { title: 'Upload your file', detail: 'Hubify reads your column headers and attempts to auto-match them.' },
  { title: 'Review the field mapping', detail: 'Confirm each column maps to the right Hubify field. AI-assisted matching handles most non-standard header names.' },
  { title: 'Import', detail: 'Records are created in bulk. Any rows with errors are flagged in a results summary.' },
]);

// ─────────────────────────────────────────────────────────────────────────────
//  11. ACCOUNT SETTINGS
// ─────────────────────────────────────────────────────────────────────────────
section(11, 'Account Settings', 'Your personal preferences and profile');

para('Account Settings are personal — they affect only your account, not other users. Access them from the User Menu (top-right) → Settings, or by clicking your name.');

subheading('What You Can Configure');
table2([
  ['Profile',        'Update your name and profile photo'],
  ['Notifications',  'Choose which events trigger email or in-app alerts; turn off anything irrelevant to your role'],
  ['Subscription',   'View your organization\'s current plan and usage (Admin only)'],
  ['Integrations',   'Connect third-party services: Zapier webhooks, API keys'],
  ['Security',       'View your active sessions; useful if you\'ve logged in on a device you no longer use'],
  ['Forms',          'Jump to the forms management page'],
  ['Email Templates','Jump to the email templates page'],
  ['Task Templates', 'Jump to task templates in Admin'],
  ['Team Roles',     'Jump to team and role management'],
], 'Setting', 'Description');

subheading('Notification Preferences');
para('Go to Account Settings → Notifications to choose which events generate in-app alerts and which send an email. You can toggle each notification type independently. Turning off email notifications will not disable in-app alerts for the same event.');

// ─────────────────────────────────────────────────────────────────────────────
//  12. TIME TRACKING
// ─────────────────────────────────────────────────────────────────────────────
section(12, 'Time Tracking', 'Logging billable and non-billable hours against tasks and properties');

para('Time Tracking allows staff to log hours worked against specific tasks and properties. Billable time flows directly into invoice line items — so your billing is always based on accurate, real data.');

subheading('Clocking In and Out');
steps([
  { title: 'Open Time Tracking', detail: 'Go to User Menu → Time Tracking, or navigate directly to /time-tracking.' },
  { title: 'Click "Clock In"', detail: 'Select the task or property you\'re working on. The timer starts immediately.' },
  { title: 'Click "Clock Out"', detail: 'The session duration is recorded automatically. Add a note if needed.' },
  { title: 'Or log time manually', detail: 'Click "+ Add Time Entry", enter the date, duration, task, and whether it\'s billable.' },
]);

subheading('Billable vs Non-Billable');
para('When logging time, mark each entry as billable or non-billable:');
bullet([
  'Billable — appears as a line item candidate when generating invoices for the associated property',
  'Non-billable — tracked for internal reporting only; never appears on client invoices',
]);

subheading('Time Reports');
para('Admins can run time reports filtered by staff member, property, date range, or billable status from the Reports tab within Time Tracking. Reports can be exported for use in external payroll or accounting systems.');

tip('Make it a habit to clock in and out on every job rather than logging manually afterward — it\'s more accurate and takes less than five seconds on a phone.');

// ─────────────────────────────────────────────────────────────────────────────
//  13. MESSAGES & TEAM CHAT
// ─────────────────────────────────────────────────────────────────────────────
section(13, 'Messages & Team Chat', 'Two ways to communicate inside Hubify');

para('Hubify provides two complementary communication tools: Messages for formal, email-based communication with contacts and teams, and Team Chat for quick informal coordination.');

subheading('Messages');
para('The Messages section (User Menu → Messages) is a full email client inside Hubify. You can:');
bullet([
  'Compose and send emails to individual contacts or entire teams',
  'Use email templates with merge fields ({{first_name}}, {{property_address}}, etc.) for consistent messaging',
  'Schedule messages to send at a future date and time',
  'View sent message history against each contact record',
  'Send broadcast emails to all members of a specific team at once',
]);

subheading('Team Chat');
para('The Team Chat widget on the dashboard is an informal, real-time feed visible to everyone in your organization. Think of it as a shared group message thread:');
bullet([
  'Type a message and press Enter to post',
  'Use @FirstName to mention a specific person — they receive a notification',
  'Edit or delete your own messages',
  'React to messages with emoji',
  'Enable email notification on a message to alert the team by email as well as in-app',
]);

tip('Use Team Chat for quick updates like "finished 123 Main, key returned". For anything task-related, add a note directly to the task so the context stays attached to the work record.');

// ─────────────────────────────────────────────────────────────────────────────
//  14. NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────
section(14, 'Notifications', 'Staying on top of what matters');

para('Hubify sends in-app notifications for events that require your attention. The bell icon in the navigation bar shows a badge with the count of unread items. Click it to open the notifications slide-over panel.');

subheading('What Triggers a Notification');
bullet([
  'A task has been assigned to you',
  'A task you\'re assigned to is approaching its due date or is now overdue',
  'You were @mentioned in Team Chat',
  'A task you\'re watching was updated or commented on',
  'An invoice\'s status changed (Admin role)',
  'A scheduling conflict was detected on the calendar',
  'A system alert was created by your admin',
  'A team member has been added or removed from the organization (Admin role)',
]);

subheading('Managing Your Notification Preferences');
steps([
  { title: 'Open Account Settings → Notifications' },
  { title: 'Toggle each notification type on or off individually' },
  { title: 'Choose whether each type triggers an email, an in-app alert, or both' },
  { title: 'Save — changes take effect immediately' },
]);

subheading('In-App Notification Panel');
para('Click the bell icon to open the notifications panel. Mark individual notifications as read by clicking them, or use "Mark all as read" to clear the badge. Notifications older than 90 days are automatically archived.');

// ─────────────────────────────────────────────────────────────────────────────
//  15. TIPS & KEYBOARD SHORTCUTS
// ─────────────────────────────────────────────────────────────────────────────
section(15, 'Tips & Keyboard Shortcuts', 'Work faster and smarter');

subheading('Keyboard Shortcuts');
doc.moveDown(0.3);
shortcutRow('T',       'Open the quick-add task form from anywhere on the platform');
shortcutRow('S',       'Open global search');
shortcutRow('⌘K',      'Open global search (Mac)');
shortcutRow('?',       'Open the support / help request form');
doc.moveDown(0.8);

hline();

subheading('Field Mode (Mobile)');
para('If you\'re working on a phone or tablet, switch to Field Mode via User Menu → Field Mode. This is a touch-optimized, stripped-down interface designed for on-site work:');
bullet([
  'Shows only your assigned tasks and the properties they\'re linked to',
  'Large tap targets and minimal navigation for single-hand use',
  'Task completion, photo upload, and note-taking work seamlessly offline',
]);

subheading('Global Search');
para('Press S or ⌘K to open the search overlay. You can search across:');
bullet([
  'Tasks — by title, description, or assigned person',
  'Properties — by address, name, or owner',
  'Contacts — by name, email, or phone',
  'Notes and documents',
]);

subheading('Support');
para('Press ? anywhere in the app to open the Support form. Describe the issue and choose an urgency level. Your admin and the Hubify support team receive the request. For urgent issues, select "High" urgency to ensure a faster response.');

hline();

subheading('Best Practices');
bullet([
  'Create a task for every job, even small ones — it builds your history and makes invoicing accurate',
  'Use task templates for repeat work so nothing gets missed and checklists stay consistent',
  'Keep access codes in the property\'s Access Control section — never in task notes or chat',
  'Keep invoices in Draft until you\'re ready to send — clients cannot see drafts',
  'Set up your iCal subscription so your Hubify schedule shows in your personal calendar',
  'Log time entries on the day you work — memory fades and estimates drift',
  'Run a conflict scan before scheduling a heavy week — catch overlaps before staff do',
  'Use @mentions in Team Chat to get a specific person\'s attention without messaging them separately',
]);

hline(BLUE, 1.5);
doc.moveDown(0.5);
para('For additional help, press ? in the app or contact your organization admin.', { color: SLATE_500, size: 10 });
para('Hubify · hubify.com', { color: BLUE, size: 10, bold: true });

// ─────────────────────────────────────────────────────────────────────────────
//  Finalize
// ─────────────────────────────────────────────────────────────────────────────
footer();
doc.end();

await new Promise((resolve, reject) => {
  stream.on('finish', resolve);
  stream.on('error', reject);
});

console.log(`\n✓ PDF saved to: ${OUT_PDF}`);
console.log(`  Size: ${(fs.statSync(OUT_PDF).size / 1024).toFixed(1)} KB`);
