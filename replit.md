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
    - **Task Management System**: Priority levels, status tracking, assignment, property association, and due date management. Integrated with calendar.
    - **Calendar System**: Full-featured calendar with event management, attendee support, customizable settings, calendar visibility toggles, and staff scheduling conflict detection. Tasks with due dates appear as events. Dashboard calendar widget with auto-refresh (30-second interval) and clickable events that navigate to the calendar page with auto-opening event details modal. Calendar categories support customizable colors and Eye/EyeOff visibility toggles in the sidebar. **Recurring Events**: Comprehensive recurring event support with daily, weekly, monthly, and yearly frequencies. Weekly recurrences support day-of-week selection, monthly recurrences support both day-of-month and week-position options (e.g., "first Monday"), and yearly recurrences support month and day selection. End options include never-ending, after N occurrences, or on a specific date. Uses RFC5545 RRULE format with FullCalendar RRule plugin integration. **Calendar Sync**: One-way iCal feed integration for Google Calendar, Apple Calendar, Outlook, and other iCalendar-compatible apps. Organization-wide feeds (admin only) and personal feeds with token-based authentication, regeneration capability, and RFC 5545 compliant event formatting (DTEND for non-recurring events, DURATION for recurring events). **Calendar Reports**: Template-based export system for generating calendar reports within custom date ranges. Super Admin-managed templates define fields, formatting, and styling. Users can export as CSV or PDF (both immediate download). PDF reports feature professional formatting with organization branding, event summaries, and detailed event listings with icons and proper pagination. Reports tab in Calendar Settings provides date range picker, template selector, and download functionality.
    - **Conflict Resolution System**: Comprehensive workflow for managing scheduling conflicts. Automatically detects property and team member conflicts when multiple events overlap. Supervisors can approve or reject conflicts, with status tracking (pending, approved, rejected, resolved) and resolution notes. Integrated directly into the calendar interface with a dedicated panel showing all pending conflicts requiring attention.
    - **Team Collaboration**: Hierarchical user roles with permissions, communication, and activity logging. Includes out-of-office management and staff time tracking. **Team Messages**: Dedicated full-page messaging system with threaded conversations, @mentions with email notifications, message editing and deletion, emoji reactions (👍, ❤️, 😄), reply threads, and mouse-wheel scrollable interface. Messages appear in both the dashboard widget (showing 2 most recent) and the dedicated /messages page for full conversation history. Accessible via navigation menu dropdown and dashboard "View All Messages" button.
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