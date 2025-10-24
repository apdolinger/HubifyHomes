# Hubify - Property Management Platform

## Overview
Hubify is a professional property management platform designed to streamline operations for home watch and estate management companies. It aims to enhance team efficiency and client communication by providing a comprehensive solution for managing properties, tasks, team collaboration, and client relationships through a modern web interface. The platform's vision is to become a leading solution in property management, addressing workflow inefficiencies and offering significant market potential.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX
- **Framework**: React 18 with TypeScript
- **UI Components**: Radix UI primitives with shadcn/ui
- **Styling**: Tailwind CSS with a custom design system, aiming for a modern and clean interface.
- **State Management**: TanStack React Query
- **Forms**: React Hook Form with Zod validation
- **Design Decisions**: Modern UI with gradient backgrounds, role-specific cards, responsive layouts. Support for global keyboard shortcuts and a centralized Support modal.

### Backend
- **Runtime**: Node.js with Express.js (TypeScript, ES modules)
- **API**: RESTful endpoints
- **Authentication**: Replit Auth via OpenID Connect, session management with Express sessions and PostgreSQL store. Hybrid authentication for Super Admin (username/password) and regular users (OIDC). Invitation-based authentication for Hubify Portal.
- **Core Features**:
    - **Multi-Tenant Architecture**: Organization-based multi-tenancy for clients, properties, forms, and submissions.
    - **Property Management**: Support for various property types (including premium types: Storage Units and Boats on Pro+ tiers), multi-unit management, manager assignment, status tracking, room management, and tier-based property type restrictions.
    - **Task Management System**: Priority levels, status tracking, assignment, property association, and due date management. Integrated with calendar. **Recurring Tasks**: Comprehensive recurring task support matching calendar capabilities with daily, weekly, monthly, and yearly frequencies. Uses RFC5545 RRULE format for recurrence rules. QuickAddTaskModal includes full recurrence UI with frequency selection, interval, weekday/monthday selection, and end conditions (never, after N occurrences, or on specific date). Recurring tasks display a visual Repeat icon indicator in the tasks table.
    - **Calendar System**: Full-featured calendar with event management, attendee support, customizable settings, calendar visibility toggles, and staff scheduling conflict detection. Tasks with due dates appear as events. Dashboard calendar widget with auto-refresh (30-second interval) and clickable events that navigate to the calendar page with auto-opening event details modal. Calendar categories support customizable colors and Eye/EyeOff visibility toggles in the sidebar. **Recurring Events**: Comprehensive recurring event support with daily, weekly, monthly, and yearly frequencies. Weekly recurrences support day-of-week selection, monthly recurrences support both day-of-month and week-position options (e.g., "first Monday"), and yearly recurrences support month and day selection. End options include never-ending, after N occurrences, or on a specific date. Uses RFC5545 RRULE format with FullCalendar RRule plugin integration. **Calendar Sync**: One-way iCal feed integration for Google Calendar, Apple Calendar, Outlook, and other iCalendar-compatible apps. Organization-wide feeds (admin only) and personal feeds with token-based authentication, regeneration capability, and RFC 5545 compliant event formatting (DTEND for non-recurring events, DURATION for recurring events). **Calendar Reports**: Template-based export system for generating calendar reports within custom date ranges. Super Admin-managed templates define fields, formatting, and styling. Users can export as CSV or PDF (both immediate download). PDF reports feature professional formatting with organization branding, event summaries, and detailed event listings with icons and proper pagination. Reports tab in Calendar Settings provides date range picker, template selector, and download functionality.
    - **Conflict Resolution System**: Comprehensive workflow for managing scheduling conflicts. Automatically detects property and team member conflicts when multiple events overlap. Supervisors can approve or reject conflicts, with status tracking (pending, approved, rejected, resolved) and resolution notes. Integrated directly into the calendar interface with a dedicated panel showing all pending conflicts requiring attention.
    - **Team Collaboration**: Hierarchical user roles with permissions, communication, and activity logging. Includes out-of-office management and staff time tracking. **Team Messages**: Dedicated full-page messaging system with threaded conversations, @mentions with email notifications, message editing and deletion, emoji reactions (👍, ❤️, 😄), reply threads, and mouse-wheel scrollable interface. Messages appear in both the dashboard widget (showing 2 most recent) and the dedicated /messages page for full conversation history. Accessible via navigation menu dropdown and dashboard "View All Messages" button. **Broadcast Email Notifications**: Optional "Email team members" checkbox sends organization-wide broadcast notifications via SendGrid when enabled. Users can control their broadcast preferences through notification settings (emailOnBroadcast field, defaults to true). Broadcast emails are sent to all team members except the message author and users who are @mentioned (they receive separate mention notifications). Preference handling explicitly supports legacy records without saved preferences by defaulting to sending emails.
    - **Contact Management**: Comprehensive management of clients (tenants, owners, emergency contacts) and vendors with duplicate detection and merge capabilities. Vendors are managed separately in the admin section for better organization. **Dashboard Duplicates Widget**: Live duplicate monitoring widget on the dashboard showing top 3 duplicate groups sorted by confidence score, with color-coded alerts, real-time counts, loading states, and quick navigation to the duplicate management page. **Intelligent Merge System**: Smart merging of duplicate contacts and properties with chronological notes combining (all notes preserved with date separators), comprehensive related record transfers (tasks, time entries, form submissions, rooms, vehicles, events, alerts, contact-property links with automatic deduplication), detailed transfer counts in activity logs for audit trail, and automatic cleanup of duplicate records. Future-proofed to handle custom fields automatically. **Duplicate History Cleanup**: Admin-only cleanup tool to remove old ignored duplicates and history records (1-365 days retention) with Zod validation and security middleware to reduce storage costs.
    - **Invoice Management**: Three-tier invoice system with object storage for file upload/download.
    - **Stripe Integration**: Dual-tier integration for platform subscriptions and per-organization client payments.
    - **Forms System**: Multi-tenant forms with complex field types, property-specific assignments, client submissions, and advanced profile matching.
    - **Hubify Portal**: Client-facing portal with role-based access (Staff, Vendor dashboards) and a preview mode for administrators.
    - **Super Admin Control Panel**: Internal dashboard for platform management, including organizations, users, reports, communication, revenue, feature flags, monitoring, compliance, and platform settings.
    - **Branding System**: Tier-based branding policy enforcement.
    - **Legal Compliance Pages**: Publicly accessible Privacy Policy and Terms of Service pages compliant with US (CCPA/CPRA) and Canadian (PIPEDA) legal standards.
    - **Import Manager**: Comprehensive CSV import functionality for Properties, Contacts, and Tasks with AI field mapping, data validation, and import history tracking.
    - **Time Tracking**: Dedicated tracking for both billable "Client Work" and non-billable "Organizational Time" with role-based editing permissions.
    - **Support Ticket System**: Comprehensive internal support ticketing for platform users to submit requests directly to the platform owner. Users can submit tickets with subject, message, email, urgency level (low/medium/high/critical), optional hyperlinks, and file attachments (stored in object storage at `.private/support-attachments`). Tickets are stored in the database with status tracking (new, in_progress, resolved) and are visible ONLY in the Super Admin Console (not at organization level). **Urgency Levels**: Users can select urgency when submitting tickets: Low (general questions), Medium (needs attention soon), High (urgent, affecting work), Critical (emergency, system down). Color-coded badges (gray/blue/orange/red) for quick priority identification. **Super Admin Access**: Navigate to Super Admin Console → Support tab to view all platform-wide support requests. **Filtering**: Search by subject/email, filter by organization (dropdown), urgency level (dropdown), status (new/in_progress/resolved), and date range (start/end dates with clear button). **Management**: Click any ticket row to open details modal showing full message, urgency badge, hyperlinks, downloadable attachments, and status dropdown. Update status from "new" → "in_progress" → "resolved" (sets resolvedAt timestamp). **Workflow**: New tickets appear at top of list. Super Admin can search, filter by urgency, review details, and track resolution progress. **Email Templates**: Super Admin can create and customize email templates for ticket receipts, notifications, and status updates. Future-ready for automated email receipts to users and support team notifications via SendGrid integration.

### Database
- **Primary Database**: PostgreSQL with Drizzle ORM
- **Local Development**: Better SQLite3
- **Schema Management**: Drizzle Kit
- **Connection**: Neon Database serverless
- **Architecture**: Multi-tenant, organization-scoped data with UUID-based primary keys.
- **Advanced Forms**: JSONB schema storage for flexible field definitions.

## External Dependencies

### Core
- **@neondatabase/serverless**: PostgreSQL serverless connection
- **drizzle-orm**: Type-safe database operations
- **better-sqlite3**: Local development database
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store
- **stripe**: Payment processing

### Authentication
- **openid-client**: OpenID Connect client for Replit Auth
- **passport**: Authentication middleware

### Frontend Libraries
- **@tanstack/react-query**: Server state management
- **react-hook-form**: Form handling
- **@hookform/resolvers**: Form validation resolvers
- **zod**: Schema validation
- **date-fns**: Date manipulation

### UI Components
- **@radix-ui/***: Headless UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library