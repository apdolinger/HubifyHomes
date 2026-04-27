# Hubify - Property Management Platform

## Overview
Hubify is a professional property management platform designed to streamline operations for home watch and estate management companies. It consolidates invoice batching for efficient client billing, enhances team efficiency, and improves client communication through a modern web interface. The platform aims to become a leading solution in property management by addressing workflow inefficiencies.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Data Model
Contacts are universal, managing vendors, tenants, owners, emergency contacts, and clients. Clients specifically store billing data for contacts designated as clients. A contact-client bridge provides lazy client creation. All data is multi-tenant, scoped by `orgId`.

### UI/UX
The frontend uses React 18 with TypeScript, Radix UI primitives, shadcn/ui, and Tailwind CSS. State management is handled by TanStack React Query, and forms utilize React Hook Form with Zod validation. Design principles emphasize a modern UI with responsive layouts, customizable tables, interactive dashboard-style cards, and a streamlined client detail page.

### Technical Implementations
The backend is built with Node.js and Express.js, offering RESTful API endpoints. Authentication uses Replit Auth via OpenID Connect, with hybrid authentication for Super Admin and regular users, and invitation-based authentication for the Hubify Portal. Multi-tenancy is enforced at the database level.

Key features include:
- **Property Management**: Supports various property types, multi-unit management, manager assignment, status tracking, room management, tier-based restrictions, custom fields, and property-specific task lists. Includes secure storage for access control, warranty tracking, and purchasing link management. Comprehensive property reporting and preferred vendor associations with template-based replication and searchable vendor selection.
- **Vehicle Management**: Complete lifecycle tracking, maintenance records, and task integration.
- **Community Document Management**: Secure document storage with classification, security features, and a Document Template Library for reuse across communities.
- **Task Management**: Priority levels, status tracking, assignment, property and vendor association, due dates, recurring tasks, photo categorization, comments, bulk creation, and custom fields. Enhanced vendor assignment with notes and satisfaction ratings. Includes task template management in Admin > Templates with full CRUD operations for creating reusable task configurations.
- **Calendar System**: Full-featured event management, attendee support, staff scheduling conflict detection, recurring events, and iCal feed integration.
- **Team Collaboration**: Hierarchical user roles, permissions, communication, activity logging, out-of-office management, staff time tracking, messaging, and broadcast email notifications. Includes a comprehensive team organization system with lead selection and contextual alerts.
- **Contact Management**: Comprehensive client and vendor management with duplicate detection, merging, custom fields, CSV export, and client categories.
- **Email System**: Full-featured email communication with template management, merge fields, scheduling, delivery tracking, and automated cron jobs.
- **Admin Customization**: Centralized customization for fields, supply settings, and billing settings, with organization-level default hourly rates.
- **Invoice Management**: Three-tier system with object storage, webhook-driven payment tracking, automated status updates, HTML email notifications, on-demand PDF generation, and configurable billing workflows, including consolidated invoice batching.
- **Billing Automation**: Fully automated daily cron job for invoice generation, auto-charging, and payment notifications via Stripe webhooks.
- **Payment Method Collection**: Secure two-flow Stripe integration (Admin-Authenticated and Client Self-Service) for cards and ACH, storing only tokenized `payment_method_id` for PCI compliance.
- **Forms System**: Multi-tenant forms with complex field types, property assignments, client submissions, profile matching, and an admin submissions viewer with CSV export.
- **Hubify Portal**: Client-facing portal with role-based access and admin preview.
- **Super Admin Control Panel**: Internal dashboard for platform management, including organizations, users, reports (communities, vendors with satisfaction ratings), communication, revenue, feature flags, monitoring, and compliance.
- **Branding System**: Tier-based branding policy enforcement.
- **Legal Compliance Pages**: Publicly accessible Privacy Policy and Terms of Service.
- **Import Manager**: CSV import functionality for Properties, Contacts, and Tasks with AI field mapping and validation.
- **Time Tracking**: Dedicated tracking for billable and non-billable time with role-based editing.
- **Support Ticket System**: Internal system for user requests.
- **System Alerts**: Organization-level alert system with severity, targeting, and acknowledgement.
- **Account Settings**: Comprehensive organization configuration interface with Company Profile management (address, phone, website, timezone, currency, primary contact, industry) and Integrations tab featuring secure API key management with hashed storage, one-time display, and revocation capabilities. Placeholder UI for third-party integrations (SendGrid, Twilio) prepared for Replit integration system.
- **Inspection Checklists & Reports**: Full inspection workflow with DB-persisted checklist items (pass/fail/N/A per item), reusable Inspection Templates managed in Admin > Templates, per-task Inspection Checklist panel with apply-template button, printable Inspection Report page (/inspection-report/:taskId), and property-level Inspection History tab in PropertyProfile.
- **In-App Notifications**: Real-time notification bell in navigation bar with unread badge, slide-over notification panel (mark-read on click, mark-all-read), notification types (task_assigned, task_overdue, inspection_due, invoice_due, general). Daily automated cron job creates overdue-task notifications at 8am. Expanded notification preference toggles in user settings.

### System Design Choices
The database is PostgreSQL with Drizzle ORM (Better SQLite3 for local development). Schema management uses Drizzle Kit. The architecture is multi-tenant and organization-scoped, using UUID-based primary keys and JSONB for advanced form field definitions.

## External Dependencies

### Core
- **@neondatabase/serverless**: PostgreSQL serverless connection
- **drizzle-orm**: Type-safe database operations
- **better-sqlite3**: Local development database
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store
- **stripe**: Payment processing

### Authentication
- **openid-client**: OpenID Connect client
- **passport**: Authentication middleware

### Frontend Libraries
- **@tanstack/react-query**: Server state management
- **react-hook-form**: Form handling
- **@hookform/resolvers**: Form validation resolvers
- **zod**: Schema validation
- **date-fns**: Date manipulation

### UI Components
- **@radix-ui/**: Headless UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library