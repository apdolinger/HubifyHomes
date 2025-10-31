# Hubify - Property Management Platform

## Overview
Hubify is a professional property management platform designed to streamline operations for home watch and estate management companies. It aims to consolidate invoice batching for efficient client billing, enhance team efficiency, and improve client communication through a modern web interface. The platform seeks to become a leading solution in property management by addressing workflow inefficiencies and leveraging significant market potential.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Data Model: Contact-Client Relationship
- **Contacts Table**: Universal contact management (vendors, tenants, owners, emergency contacts, and clients). Primary entity for PersonProfile pages.
- **Clients Table**: Billing-specific data for contacts designated as clients (contact.type='client'). Stores billing configuration, payment methods, and invoice preferences.
- **Relationship**: `clients.contact_id` links to `contacts.id` for unified person management. `client_payment_methods.added_by_contact_id` tracks which contact added each payment method for audit trail.
- **Architecture Note**: PersonProfile loads from contacts; billing features query associated client record when contact.type='client'.

### UI/UX
- **Framework**: React 18 with TypeScript.
- **UI Components**: Radix UI primitives with shadcn/ui.
- **Styling**: Tailwind CSS with a custom design system.
- **State Management**: TanStack React Query.
- **Forms**: React Hook Form with Zod validation.
- **Design Decisions**: Modern UI, gradient backgrounds, role-specific cards, responsive layouts, global keyboard shortcuts, and a centralized Support modal. Features customizable tables and stats widgets (column show/hide, drag-to-reorder) with persistence via localStorage. Interactive dashboard-style stats cards. Streamlined client detail page layout.

### Technical Implementations
- **Backend Runtime**: Node.js with Express.js (TypeScript, ES modules).
- **API**: RESTful endpoints.
- **Authentication**: Replit Auth via OpenID Connect, session management (Express sessions with PostgreSQL store). Hybrid authentication for Super Admin (username/password) and regular users (OIDC). Invitation-based authentication for Hubify Portal.
- **Multi-Tenancy**: Organization-based for clients, properties, forms, and submissions.
- **Property Management**: Supports various property types, multi-unit management, manager assignment, status tracking, room management, tier-based restrictions, custom fields, and property-specific task lists. Includes secure storage for property access control, warranty/servicing tracking, and purchasing link management. Comprehensive property reporting (Supplies, Devices, Fixtures, Surface Links, Shopping List) with search, summary stats, grouping, CSV export, and priority indicators.
- **Vehicle Management**: Complete lifecycle tracking with photos, maintenance records, and task integration, including maintenance alerts and integrated task creation.
- **Community Document Management**: Secure document storage for communities with two classification types (Community-Wide, Residential-Based) and robust security features (organization-level access, signed URLs, multi-tenant isolation).
- **Task Management**: Priority levels, status tracking, assignment, property association, due dates, recurring tasks (RFC5545 RRULE), before/after photo categorization, persistent comments, bulk task creation, task templates, context-aware task creation, and custom fields.
- **Calendar System**: Full-featured calendar with event management, attendee support, staff scheduling conflict detection, recurring events (RFC5545 RRULE), and one-way iCal feed integration.
- **Conflict Resolution**: Automated detection and management of scheduling conflicts with supervisor approval workflow.
- **Team Collaboration**: Hierarchical user roles, permissions, communication, activity logging, out-of-office management, staff time tracking, dedicated messaging, and broadcast email notifications. Comprehensive team organization system with creation, member assignment, role-based access control, search, and filtering. Contextual alerts with granular targeting options.
- **Contact Management**: Comprehensive client and vendor management with duplicate detection, merging, and custom fields, including "Client" contact type with primary/secondary categories.
- **Email System**: Full-featured email communication system with template management, 11 merge fields, scheduling, and delivery tracking. Templates auto-populate subject and body. All emails tracked in email history with status badges. Automated cron job for scheduled emails. Admin template management.
- **Admin Customization**: Centralized Customization tab for Custom Fields and Supply Settings. Admin search functionality for notes across all system entities.
- **Invoice Management**: Three-tier system with object storage, webhook-driven payment tracking, automatic status updates, HTML email notifications, on-demand PDF generation with branding, configurable billing workflows, consolidated invoice batching, and client-level billing schedules. Role-based access control restricts billing features (tab visibility and configuration) to admin and supervisor roles only.
- **Payment Method Collection (Sprint 1)**: Admin-only Stripe integration for collecting client payment methods (cards via Stripe Elements, ACH via Financial Connections). Stores only payment_method_id tokens (PCI-compliant SAQ-A). Includes SetupIntent flow, webhook handlers (setup_intent.succeeded, payment_method.detached), default payment method selection, and auto-charge preferences. All endpoints enforce admin/supervisor RBAC with Zod validation.
- **Forms System**: Multi-tenant forms with complex field types, property-specific assignments, client submissions, and advanced profile matching.
- **Hubify Portal**: Client-facing portal with role-based access and admin preview mode.
- **Super Admin Control Panel**: Internal dashboard for platform management, including organizations, users, reports, communication, revenue, feature flags, monitoring, and compliance.
- **Branding System**: Tier-based branding policy enforcement.
- **Legal Compliance Pages**: Publicly accessible Privacy Policy and Terms of Service (US & Canadian standards).
- **Import Manager**: Comprehensive CSV import functionality for Properties, Contacts, and Tasks with AI field mapping, data validation, and history tracking.
- **Time Tracking**: Dedicated tracking for billable "Client Work" and non-billable "Organizational Time" with role-based editing permissions.
- **Support Ticket System**: Internal system for users to submit requests to the platform owner, managed exclusively in the Super Admin Console.
- **System Alerts**: Organization-level alert system for admins to create blocking notifications with severity levels, targeting options, and acknowledgement tracking.

### System Design Choices
- **Database**: PostgreSQL with Drizzle ORM (Better SQLite3 for local development, Neon Database serverless for connection).
- **Schema Management**: Drizzle Kit.
- **Architecture**: Multi-tenant, organization-scoped data with UUID-based primary keys.
- **Advanced Forms**: JSONB schema storage for flexible field definitions.

## External Dependencies

### Core
- **@neondatabase/serverless**: PostgreSQL serverless connection.
- **drizzle-orm**: Type-safe database operations.
- **better-sqlite3**: Local development database.
- **express-session**: Session management.
- **connect-pg-simple**: PostgreSQL session store.
- **stripe**: Payment processing.

### Authentication
- **openid-client**: OpenID Connect client for Replit Auth.
- **passport**: Authentication middleware.

### Frontend Libraries
- **@tanstack/react-query**: Server state management.
- **react-hook-form**: Form handling.
- **@hookform/resolvers**: Form validation resolvers.
- **zod**: Schema validation.
- **date-fns**: Date manipulation.

### UI Components
- **@radix-ui/**: Headless UI primitives.
- **tailwindcss**: Utility-first CSS framework.
- **class-variance-authority**: Component variant management.
- **lucide-react**: Icon library.