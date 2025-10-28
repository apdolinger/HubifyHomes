# Hubify - Property Management Platform

## Overview
Hubify is a professional property management platform designed to streamline operations for home watch and estate management companies. Features consolidated invoice batching for efficient client billing workflows. It aims to enhance team efficiency and client communication by providing a comprehensive solution for managing properties, tasks, team collaboration, and client relationships through a modern web interface. The platform's vision is to become a leading solution in property management, addressing workflow inefficiencies and offering significant market potential.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX
- **Framework**: React 18 with TypeScript
- **UI Components**: Radix UI primitives with shadcn/ui
- **Styling**: Tailwind CSS with a custom design system for a modern and clean interface.
- **State Management**: TanStack React Query
- **Forms**: React Hook Form with Zod validation
- **Design Decisions**: Modern UI with gradient backgrounds, role-specific cards, responsive layouts, global keyboard shortcuts, and a centralized Support modal.

### Technical Implementations
- **Backend Runtime**: Node.js with Express.js (TypeScript, ES modules)
- **API**: RESTful endpoints
- **Authentication**: Replit Auth via OpenID Connect, session management with Express sessions and PostgreSQL store. Hybrid authentication for Super Admin (username/password) and regular users (OIDC). Invitation-based authentication for Hubify Portal.
- **Multi-Tenancy**: Organization-based multi-tenancy for clients, properties, forms, and submissions.
- **Property Management**: Supports various property types (including premium types like Storage Units and Boats on Pro+ tiers), multi-unit management, manager assignment, status tracking, room management, and tier-based property type restrictions.
- **Task Management**: Priority levels, status tracking, assignment, property association, due date management, and integration with the calendar. Includes recurring tasks using RFC5545 RRULE format, generating individual instances with cloned checklists and adjusted due dates. Displays human-readable recurrence patterns. **Before/After Photo Categorization**: Photos attached to tasks can be categorized as "before" or "after" for side-by-side comparison display. Categories are preserved through the complete workflow (Task → Billing Submission → Invoice → PDF), with professional PDF rendering showing labeled before/after comparisons. **Task Comments**: Persistent database-backed comment system with inline editing (sprocket icon trigger), delete functionality, author attribution, and edit indicators. Only comment authors can edit/delete their own comments (backend-enforced authorization). **Bulk Task Creation**: Multi-property bulk task creation feature accessible via Properties page "More Actions" dropdown - allows creating identical tasks across multiple selected properties simultaneously with shared task details (title, description, priority, status, due date, assignment, category), ideal for disaster response scenarios or routine inspections affecting multiple properties. **Task Templates**: Template selector in bulk task creation modal allows users to pre-fill form fields from existing template tasks (tasks marked with isTemplate=true), with "No template (blank form)" option for manual entry - streamlines repetitive task creation workflows. **Custom Fields**: Full custom field support with 7 field types (text, textarea, number, date, select, multiselect, checkbox) stored as JSONB in customFieldValues column. Custom fields appear in create/edit modals and detail pages, with proper filtering by entity type. Edit modal uses formInitialized ref to populate data exactly once per session, preventing background refetch from overwriting user edits.
- **Calendar System**: Full-featured calendar with event management, attendee support, customizable settings, visibility toggles, and staff scheduling conflict detection. Tasks with due dates appear as events. Supports comprehensive recurring events (daily, weekly, monthly, yearly) using RFC5545 RRULE. Features one-way iCal feed integration for external calendars (Google, Apple, Outlook) and template-based calendar reports exportable as CSV or PDF with organization branding.
- **Conflict Resolution**: Automated detection and management of property and team member scheduling conflicts, with a workflow for supervisor approval/rejection and status tracking.
- **Team Collaboration**: Hierarchical user roles, permissions, communication, activity logging, out-of-office management, and staff time tracking. Features a dedicated messaging system with threaded conversations, @mentions, editing, emoji reactions, and broadcast email notifications via SendGrid.
- **Contact Management**: Comprehensive client and vendor management with duplicate detection and merging capabilities. Includes a dashboard widget for live duplicate monitoring, an intelligent merge system that preserves notes and transfers related records, and an admin tool for cleaning up old duplicate history. **Custom Fields**: Custom field support for clients with dynamic form rendering and data persistence through JSONB storage.
- **Property Management Extended**: **Custom Fields**: Custom field support for properties enabling flexible metadata capture with JSONB-backed storage and dynamic UI rendering.
- **Invoice Management**: Three-tier invoice system with object storage for file upload/download. Features webhook-driven payment tracking for Stripe, automatic status updates, and professional HTML email notifications for payment failures. Supports on-demand PDF generation with organization branding and direct email delivery via SendGrid. Organization-level billing workflow configuration (Automatic, Require Authorization, Manual) is supported. **Consolidated Invoice Batching**: Configurable grouping of pending billing submissions by either client or property (organization setting) with manual batch invoice creation - multiple submissions combine into single invoices with aggregated line items, notes, and photo attachments. Client-level billing schedule configuration (weekly/bi-weekly/monthly/manual) with auto-send preferences. Automated billing cron job framework (temporarily disabled).
- **Stripe Integration**: Dual-tier integration for platform subscriptions and per-organization client payments, handled via webhooks.
- **Forms System**: Multi-tenant forms with complex field types, property-specific assignments, client submissions, and advanced profile matching.
- **Hubify Portal**: Client-facing portal with role-based access and a preview mode for administrators.
- **Super Admin Control Panel**: Internal dashboard for platform management, including organizations, users, reports, communication, revenue, feature flags, monitoring, compliance, and platform settings.
- **Branding System**: Tier-based branding policy enforcement.
- **Legal Compliance Pages**: Publicly accessible Privacy Policy and Terms of Service pages compliant with US (CCPA/CPRA) and Canadian (PIPEDA) legal standards.
- **Import Manager**: Comprehensive CSV import functionality for Properties, Contacts, and Tasks with AI field mapping, data validation, and import history tracking.
- **Time Tracking**: Dedicated tracking for billable "Client Work" and non-billable "Organizational Time" with role-based editing permissions.
- **Support Ticket System**: Internal support ticketing for platform users to submit requests to the platform owner, with subject, message, email, urgency levels, hyperlinks, file attachments, and status tracking (new, in_progress, resolved). Tickets are managed exclusively in the Super Admin Console, which provides filtering, viewing details, and status updates. Email templates for notifications are also supported.

### System Design Choices
- **Database**: PostgreSQL with Drizzle ORM. Better SQLite3 for local development. Neon Database serverless for connection.
- **Schema Management**: Drizzle Kit.
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