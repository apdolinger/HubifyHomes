# Hubify - Property Management Platform

## Overview
Hubify is a professional property management platform designed to streamline operations for home watch and estate management companies. It aims to consolidate invoice batching for efficient client billing, enhance team efficiency, and improve client communication through a modern web interface. The platform seeks to become a leading solution in property management by addressing workflow inefficiencies and leveraging significant market potential.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Data Model: Contact-Client Relationship
- **Contacts Table**: Universal contact management (vendors, tenants, owners, emergency contacts, and clients). Primary entity for PersonProfile pages. Multi-tenant with required `orgId` for organization scoping.
- **Clients Table**: Billing-specific data for contacts designated as clients (contact.type='client'). Stores billing configuration, payment methods, and invoice preferences.
- **Relationship**: `clients.contact_id` links to `contacts.id` for unified person management. `client_payment_methods.added_by_contact_id` tracks which contact added each payment method for audit trail.
- **Contact-Client Bridge**: GET `/api/contacts/:contactId/client` endpoint provides lazy client creation when contact.type='client', with automatic orgId validation for security.
- **Architecture Note**: PersonProfile loads from contacts; billing features query associated client record when contact.type='client'.

### UI/UX
- **Framework**: React 18 with TypeScript.
- **UI Components**: Radix UI primitives with shadcn/ui.
- **Styling**: Tailwind CSS with a custom design system.
- **State Management**: TanStack React Query.
- **Forms**: React Hook Form with Zod validation.
- **Design Decisions**: Modern UI, gradient backgrounds, role-specific cards, responsive layouts, global keyboard shortcuts, and a centralized Support modal. Features customizable tables and stats widgets (column show/hide, drag-to-reorder) with persistence via localStorage on Dashboard, Teams page, and TeamMemberProfile pages. Interactive dashboard-style stats cards. Streamlined client detail page layout.

### Technical Implementations
- **Backend Runtime**: Node.js with Express.js (TypeScript, ES modules).
- **API**: RESTful endpoints.
- **Authentication**: Replit Auth via OpenID Connect, session management (Express sessions with PostgreSQL store). Hybrid authentication for Super Admin (username/password) and regular users (OIDC). Invitation-based authentication for Hubify Portal. In development mode, new OIDC users are automatically assigned to "Test Organization" on first login to ensure all users have a valid orgId. In production, users without an orgId must be explicitly invited to an organization (tenant isolation enforced).
- **Multi-Tenancy**: Organization-based for all entities including contacts, clients, properties, forms, and submissions. Enforced at database level with required orgId foreign keys.
- **Property Management**: Supports various property types, multi-unit management, manager assignment, status tracking, room management, tier-based restrictions, custom fields, and property-specific task lists. Includes secure storage for property access control, warranty/servicing tracking, and purchasing link management. Comprehensive property reporting (Supplies, Devices, Fixtures, Surface Links, Shopping List) with search, summary stats, grouping, CSV export, and priority indicators. Property-vendor associations (preferred vendors) allow admins to designate specific vendors for properties with notes; preferred vendors appear first with visual indicators (star badge, "(Preferred)" label) in task vendor dropdowns, streamlining vendor selection for property-specific work. Multi-tenant secure with orgId enforcement at all levels (property_vendors junction table with strict validation ensuring both property and vendor belong to requester's organization).
- **Vehicle Management**: Complete lifecycle tracking with photos, maintenance records, and task integration, including maintenance alerts and integrated task creation.
- **Community Document Management**: Secure document storage for communities with two classification types (Community-Wide, Residential-Based) and robust security features (organization-level access, signed URLs, multi-tenant isolation). Document Template Library allows admins to upload community documents once and reuse them across multiple communities during creation, eliminating redundant uploads for standard HOA declarations, bylaws, FAQ sheets, and welcome packets. Templates are stored at organization level with soft delete support, and can be linked to communities during or after creation via the Documents tab in the community creation dialog.
- **Task Management**: Priority levels, status tracking, assignment, property association, vendor assignment, due dates, recurring tasks (RFC5545 RRULE), before/after photo categorization, persistent comments, bulk task creation, task templates, context-aware task creation, and custom fields. Enhanced vendor assignment feature with toggle-based visibility (vendorNeeded checkbox), editable vendor details including notes and satisfaction ratings (1-5 stars), and persistent vendor relationship tracking. Task detail pages display a Vendor Information card when vendorNeeded=true, showing vendor name (clickable link to vendor profile), vendor type badge, editable notes textarea, and interactive 5-star satisfaction rating system. Card supports edit/view modes with save/cancel functionality and optimistic UI updates via toast notifications. Backend storage methods (getTask, updateTask) use Drizzle alias to join vendor contact data and return vendorNeeded, vendorNotes, and vendorSatisfactionRating fields for efficient retrieval and persistence.
- **Calendar System**: Full-featured calendar with event management, attendee support, staff scheduling conflict detection, recurring events (RFC5545 RRULE), and one-way iCal feed integration.
- **Conflict Resolution**: Automated detection and management of scheduling conflicts with supervisor approval workflow.
- **Team Collaboration**: Hierarchical user roles, permissions, communication, activity logging, out-of-office management, staff time tracking, dedicated messaging, and broadcast email notifications. Comprehensive team organization system with creation, member assignment, role-based access control, search, and filtering. Contextual alerts with granular targeting options. Team lead selection feature allows designating a single lead per team with visual indicators (ShieldCheck icon, blue-bordered avatar) in team cards and assignment modals. Backend enforces single-lead constraint by automatically demoting existing leads when promoting a new one (acceptable edge case: race conditions under high concurrency). Team page features a tabbed interface with two tabs: "My Teams" (teams user is a member of) and "Organization Teams" (all organization teams), providing a unified view of team organization. Clickable team cards with hover effects open TeamCommunicationModal for bulk email/SMS messaging to entire teams, with template support, merge fields, and recipient preview. TeamMemberProfile includes customizable stats widgets and enhanced Tasks tab with 90-day history filter, smart sorting (non-completed by due date, completed by completion date), and clickable non-closed tasks.
- **Contact Management**: Comprehensive client and vendor management with duplicate detection, merging, custom fields, CSV export, and "Client" contact type with primary/secondary categories.
- **Email System**: Full-featured email communication system with template management, 11 merge fields, scheduling, and delivery tracking. Templates auto-populate subject and body. All emails tracked in email history with status badges. Automated cron job for scheduled emails. Admin template management.
- **Admin Customization**: Centralized Customization tab for Custom Fields, Supply Settings, and Billing Settings. Admin search functionality for notes across all system entities. Organization-level default hourly rate configuration that auto-populates client billing settings while allowing per-client customization.
- **Invoice Management**: Three-tier system with object storage, webhook-driven payment tracking, automatic status updates, HTML email notifications, on-demand PDF generation with branding, configurable billing workflows, consolidated invoice batching, and client-level billing schedules. Role-based access control restricts billing features (tab visibility and configuration) to admin and supervisor roles only.
- **Billing Automation**: Fully automated billing system with daily cron job (3 AM) that generates consolidated invoices based on client billing schedules, automatically charges default payment methods when `autoChargeInvoices` is enabled in `clientBillingPrefs`, sends invoice emails with PDF attachments, and sends payment success/failure notifications via Stripe webhooks. Auto-charge settings stored in `clientBillingPrefs` table with configurable timing and retry strategies.
- **Payment Method Collection**: Complete two-flow Stripe integration for collecting client payment methods (cards via Stripe Elements, ACH via Financial Connections). Stores only payment_method_id tokens (PCI-compliant SAQ-A). Features include:
  - **Admin-Authenticated Flow**: Admins can add payment methods directly from client profiles via PaymentMethodCollectionModal
  - **Client Self-Service Flow**: Secure tokenized links allow clients to add payment methods without authentication
    - Admins generate one-time-use payment collection links (72-hour expiration)
    - Public endpoint validates tokens and provides unauthenticated payment method addition
    - Tokens automatically marked as used after successful setup intent creation
    - No sensitive data (orgId) exposed in public responses
  - Dynamic Stripe initialization using org-specific publishable keys from `org_stripe_connections`
  - Contact-client bridge with lazy client creation via GET `/api/contacts/:contactId/client`
  - SetupIntent flow with webhook handlers (setup_intent.succeeded, payment_method.detached)
  - Default payment method selection and auto-charge preferences
  - All admin endpoints enforce admin/supervisor RBAC with Zod validation
  - Graceful error handling when Stripe is not configured
  - Payment collection tokens table for secure token management
- **Forms System**: Multi-tenant forms with complex field types, property-specific assignments, client submissions, advanced profile matching, submissions viewer, and full form editing capabilities. Admin form submissions interface displays all submission answers in a dialog with field-type-aware formatting (checkbox badges, date formatting, multiselect arrays), CSV export functionality, and empty/loading states. Each form has a "View Submissions" button that opens a modal showing all submissions with their field answers organized by field label. Form editing interface (FormEdit) allows admins to modify form title, slug, description, and toggle form status (active/inactive) and embedding capability. Forms table displays Active/Inactive status badges for quick visibility. Forms can be disabled without deletion to preserve submission history.
- **Hubify Portal**: Client-facing portal with role-based access and admin preview mode.
- **Super Admin Control Panel**: Internal dashboard for platform management, including organizations, users, reports (communities, vendors with satisfaction ratings), communication, revenue, feature flags, monitoring, and compliance. Vendors Report aggregates vendor information across all organizations including company details, contact info, task counts, and average satisfaction ratings (1-5 stars) calculated from task-level vendor ratings. Features search functionality and CSV export with complete vendor analytics.
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