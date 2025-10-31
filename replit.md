# Hubify - Property Management Platform

## Overview
Hubify is a professional property management platform designed to streamline operations for home watch and estate management companies. It consolidates invoice batching for efficient client billing, enhances team efficiency, and improves client communication through a modern web interface. The platform aims to be a leading solution in property management, addressing workflow inefficiencies and offering significant market potential.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes

### Client Contact Type with Categories (October 31, 2025)
Added "Client" as a new contact type with primary/secondary category support to distinguish between different client relationships.

**Implementation**:
1. Added `clientCategory` varchar column to contacts table (nullable)
2. Updated frontend schemas in People.tsx and PersonProfile.tsx with Zod validation refinements
3. Validation requires category selection when type is "client" (error: "Client category is required for client type")
4. Conditional UI in add/edit modals shows client category dropdown when type is "client"
5. Enhanced display logic with formatContactType/getContactTypeDisplay functions
6. Badges show "Client (Primary)" or "Client (Secondary)" in table and profile views
7. Fixed groupedContacts memoization to include clientCategory and accountId fields

**Technical Details**:
- Database: `contacts.clientCategory` stores "primary" or "secondary"
- Backend: Field propagated through storage layer and API routes
- Frontend: Badge variant "outline" for client type, conditional rendering in forms
- Display: Capitalized category labels with parenthetical notation

### Team Management Fix (October 2025)
Fixed critical bug where teams created successfully on the backend but didn't appear in the "My Teams" section of the UI.

**Root Cause**: Missing `/api/current-user` endpoint caused `currentUser` to be undefined, preventing the user teams query from executing.

**Solution**:
1. Added `/api/current-user` endpoint that returns the authenticated user via session
2. Updated frontend query to use TanStack Query v5 default fetcher pattern with proper query key
3. Optimized `getUserTeams()` backend function to use single SQL query with JOIN and GROUP BY (eliminated N+1 query pattern)
4. Ensured consistent cache invalidation across all team mutations

**Technical Details**:
- Backend routes: `/api/current-user` (new), `/api/users/:userId/teams` (optimized)
- Frontend: Team.tsx uses default queryClient fetcher with enabled gating on currentUser
- Storage: Single aggregated query returns teams with memberCount instead of sequential fetches
- Cache invalidation: Matches query key format for proper refresh behavior

## System Architecture

### UI/UX
- **Framework**: React 18 with TypeScript
- **UI Components**: Radix UI primitives with shadcn/ui
- **Styling**: Tailwind CSS with a custom design system
- **State Management**: TanStack React Query
- **Forms**: React Hook Form with Zod validation
- **Design Decisions**: Modern UI, gradient backgrounds, role-specific cards, responsive layouts, global keyboard shortcuts, and a centralized Support modal. **Customizable Views**: Table customization on Tasks, Properties, Clients, and Team pages with column show/hide and drag-to-reorder (icon-only sprocket buttons). Stats widget customization on Clients and Team pages with toggle on/off and drag-to-reorder functionality. Team page stats include: Total Teams, Total Members, Admins, Supervisors, and Staff counts. Interactive dashboard-style stats cards with click-to-filter on Clients page. All customizations persist via localStorage. **Clean UI**: Client detail page uses streamlined 2-column layout (Linked Properties + Quick Stats) with redundant elements removed for improved visual clarity.

### Technical Implementations
- **Backend Runtime**: Node.js with Express.js (TypeScript, ES modules)
- **API**: RESTful endpoints
- **Authentication**: Replit Auth via OpenID Connect, session management (Express sessions with PostgreSQL store). Hybrid authentication for Super Admin (username/password) and regular users (OIDC). Invitation-based authentication for Hubify Portal.
- **Multi-Tenancy**: Organization-based for clients, properties, forms, and submissions.
- **Property Management**: Supports various property types, multi-unit management, manager assignment, status tracking, room management, tier-based restrictions, custom fields, and property-specific task lists. Includes secure storage for property access control information and warranty/servicing tracking for room devices, along with purchasing link management for room surfaces. **Property Reports**: Comprehensive reporting system with five specialized reports accessible via property sprocket menu: (1) Supplies Report - complete inventory with replacement tracking, (2) Devices Report - warranty status and service schedules, (3) Fixtures Report - counts and specifications across all rooms, (4) Surface Links Report - purchasing links organized by category, (5) Shopping List - smart consolidated view of items needing attention within 90 days (supplies needing replacement, devices requiring service, all surface purchasing links). Each report features search functionality, summary statistics, data grouped by room, CSV export, and color-coded badges. Shopping list includes priority indicators (overdue/due soon) based on dates. Backend routes: `/api/properties/:id/supplies-report`, `/api/properties/:id/devices-report`, `/api/properties/:id/fixtures-report`, `/api/properties/:id/surface-links-report`, `/api/properties/:id/shopping-list`. **Vehicle Management**: Complete lifecycle tracking with photos, maintenance records, and task integration. Supports vehicle photos with categories (general, damage, before, after, repair, insurance), comprehensive maintenance tracking (oil changes, inspections, registration, repairs, service), maintenance alert system showing overdue/due-soon items, and integrated task creation from maintenance records. Backend routes: `/api/vehicles/:vehicleId/photos`, `/api/vehicle-photos`, `/api/vehicles/:vehicleId/maintenance`, `/api/vehicle-maintenance`. **Community Document Management**: Secure document storage and management for communities with two classification types: (1) Community-Wide documents - single upload per type shared across all properties in a community (admin-only replacement), (2) Residential-Based documents - property-specific uploads allowing multiple instances. Supports document types: HOA Declarations, CC&Rs & Bylaws, Community FAQ, and Welcome Packets. Features comprehensive security: organization-level access control, path traversal prevention, signed URL uploads to object storage, admin-only deletion, and multi-tenant isolation. Backend routes: `/api/communities/:id/documents/upload-url`, `/api/communities/:id/documents`, `/api/community-documents/:id`, `/api/download-document`.
- **Task Management**: Priority levels, status tracking, assignment, property association, due dates, recurring tasks (RFC5545 RRULE), before/after photo categorization, persistent comments, bulk task creation, task templates, and context-aware task creation. Full custom field support.
- **Calendar System**: Full-featured calendar with event management, attendee support, staff scheduling conflict detection, recurring events (RFC5545 RRULE), one-way iCal feed integration, and template-based reports.
- **Conflict Resolution**: Automated detection and management of scheduling conflicts with supervisor approval workflow.
- **Team Collaboration**: Hierarchical user roles, permissions, communication, activity logging, out-of-office management, staff time tracking, dedicated messaging with threaded conversations, and broadcast email notifications. **Team Management**: Comprehensive team organization system with team creation, member assignment, and team-based task management. Create teams with custom names and descriptions, assign multiple members, and manage team memberships through an intuitive assignments interface. Teams are organization-scoped with automatic role-based access control. Backend routes: `/api/teams` (GET/POST), `/api/teams/:id` (GET), `/api/teams/:teamId/members` (POST/DELETE), `/api/users/:userId/teams` (GET). Real-time search functionality on team page to filter members by name, email, or role with pagination support. Sortable columns (Member, Email, Role) with visual indicators. Filter dropdowns for role (admin/supervisor/staff) and status (active/inactive/out of office). **Alert Targeting**: Contextual alerts (client/property/task) with granular targeting options - everyone, specific roles (admin/supervisor/staff), or specific users - ensuring alerts reach the right audience.
- **Contact Management**: Comprehensive client and vendor management with duplicate detection, merging capabilities, and custom fields. **Email Communication**: Direct email composition from client profiles - click any client's email address to open a branded email composition modal with subject and message fields, powered by SendGrid integration.
- **Admin Customization**: Centralized Customization tab for Custom Fields and Supply Settings. **Note Search**: Admin search functionality to find notes across all system entities including vehicle notes, room notes, property notes, contact notes, task notes, time tracking notes, and vehicle maintenance notes. Backend route: `/api/admin/notes/search?q={query}`. Frontend accessible via Admin → Tools & Support tab.
- **Invoice Management**: Three-tier system with object storage, webhook-driven payment tracking, automatic status updates, HTML email notifications, on-demand PDF generation with branding, and configurable organization-level billing workflows. Features consolidated invoice batching by client or property, and client-level billing schedules.
- **Forms System**: Multi-tenant forms with complex field types, property-specific assignments, client submissions, and advanced profile matching.
- **Hubify Portal**: Client-facing portal with role-based access and admin preview mode.
- **Super Admin Control Panel**: Internal dashboard for platform management, including organizations, users, reports, communication, revenue, feature flags, monitoring, and compliance.
- **Branding System**: Tier-based branding policy enforcement.
- **Legal Compliance Pages**: Publicly accessible Privacy Policy and Terms of Service (US & Canadian standards).
- **Import Manager**: Comprehensive CSV import functionality for Properties, Contacts, and Tasks with AI field mapping, data validation, and history tracking.
- **Time Tracking**: Dedicated tracking for billable "Client Work" and non-billable "Organizational Time" with role-based editing permissions.
- **Support Ticket System**: Internal system for users to submit requests to the platform owner, managed exclusively in the Super Admin Console.
- **System Alerts**: Organization-level alert system for admins to create blocking notifications with severity levels (info/warning/critical), targeting options (all users/roles/specific users), and acknowledgement tracking. Alerts appear as modals that block interaction until acknowledged.

### System Design Choices
- **Database**: PostgreSQL with Drizzle ORM (Better SQLite3 for local development, Neon Database serverless for connection).
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
- **@radix-ui/**: Headless UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library