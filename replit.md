# Hubify - Property Management Platform

## Overview
Hubify is a professional property management platform designed to streamline operations for home watch and estate management companies. It aims to enhance team efficiency and client communication by providing a comprehensive solution for managing properties, tasks, team collaboration, and client relationships through a modern web interface. The platform's vision is to become a leading solution in property management, addressing workflow inefficiencies and offering significant market potential.

## Recent Changes
- **Calendar Settings & Customization (October 16, 2025)**: Comprehensive calendar settings system with localStorage persistence:
  - **Calendar Management**: Create, edit, and delete calendars with customizable color picker (10 preset colors)
  - **Filter Settings**: Show/hide individual calendars, filter by event type (all/events/tasks), filter tasks by priority (all/urgent/high/normal/low)
  - **Display Settings**: Toggle weekends visibility, select default view (month/week/day), configure week start day (Sunday/Monday/Saturday)
  - **Three-Tab Interface**: Organized settings modal with Calendars, Filters, and Display tabs
  - **Persistent Preferences**: All settings stored per organization in localStorage and automatically restored
  - **Real-time Application**: Settings instantly applied to calendar view and event filtering without page reload
  - **Multiple Entry Points**: Accessible via settings button (gear icon) or "Add Calendar" sidebar button
  - **End-to-End Testing**: Complete calendar CRUD operations and settings persistence validated
- **Staff Scheduling Conflict Detection (October 16, 2025)**: Added automatic conflict detection for staff scheduling:
  - **Automatic Detection**: Calendar detects when staff members (user attendees) have overlapping events
  - **Visual Indicators**: Conflicting events display with warning emoji (⚠️), striped diagonal pattern, red border, and glow effect
  - **Attendee Data**: Events API now includes attendee information for conflict analysis
  - **Conflict Logic**: Detects both time overlap and staff member overlap to identify true scheduling conflicts
  - **Real-time Calendar Widget**: Updated dashboard calendar widget to show actual upcoming events and tasks from database
- **Calendar-Task Integration (October 16, 2025)**: Integrated tasks with due dates into the calendar system:
  - **Task Events**: Tasks with due dates now automatically appear on the calendar as all-day events
  - **Visual Differentiation**: Tasks color-coded by priority (urgent=#ef4444, high=#ea580c, normal/low=#059669)
  - **Smart Filtering**: Only shows active tasks (excludes archived, completed, and cancelled tasks)
  - **Organization Scoping**: Tasks are filtered by organization membership for multi-tenant security
  - **Merged Event Feed**: `/api/orgs/:orgId/events` endpoint now returns combined calendar events and task events with attendees
  - **End-to-End Testing**: Validated task creation, API integration, and calendar display functionality
- **Calendar Authentication Fix (October 16, 2025)**: Fixed calendar page authentication for Super Admin users:
  - **Hybrid User Endpoint**: `/api/auth/user` now supports both Super Admin session and OIDC authentication
  - **Super Admin Calendar Access**: Calendar page shows appropriate message for Super Admin (who don't have organization-specific calendars)
  - **Audit Logging Fix**: Corrected severity values from 'high'/'medium'/'low' to 'warning'/'info' to prevent runtime errors
  - **Development Simplification**: Super Admin default credentials work automatically in development without extra env var
- **Hybrid Authentication System (October 16, 2025)**: Implemented secure Super Admin authentication:
  - **Dual Authentication**: Regular users use Replit OIDC; Super Admin uses separate username/password login
  - **Session-Based Super Admin Auth**: Independent session management for platform administrators
  - **Security Hardening**: Credentials required via environment variables (SUPER_ADMIN_USERNAME, SUPER_ADMIN_PASSWORD)
  - **Development Mode**: Default credentials (superadmin/hubify2025) enabled when NODE_ENV=development
  - **Audit Logging**: All login attempts logged with proper severity levels for security monitoring
  - **Updated Middleware**: `isSuperAdmin` now checks session auth with OIDC fallback for backward compatibility
- **Support Modal & Keyboard Shortcut Updates (October 4, 2025)**: Enhanced support accessibility and streamlined UI:
  - **Global Keyboard Shortcut**: Integrated "?" key with centralized useHotkeys system in App.tsx for global Support modal access
  - **Smart Text Detection**: Keyboard shortcut respects input field focus (won't trigger when typing in text fields)
  - **Simplified Support Modal**: Removed "Need Immediate Help" section and "Full Help Center" button for cleaner interface
  - **Centralized State Management**: SupportModal now rendered at App level for consistent access across all pages
  - **Updated Documentation**: Keyboard Help modal reflects "?" → "Open Support" shortcut mapping
- **Portal Preview Mode (October 2, 2025)**: Added admin portal preview feature for visualizing role-specific dashboards:
  - **Preview Interface**: Dedicated `/portal-preview` page with role selector and device toggle controls
  - **Role Switching**: Live preview of all three portal roles (resident, staff, vendor) without creating actual users
  - **Device Views**: Toggle between desktop (full-width) and mobile (375px with device frame) preview modes
  - **Integration**: "Preview Portal" button added to Hubify Console header for easy access
  - **Live Rendering**: Uses actual dashboard components to show authentic portal experience
  - **End-to-End Testing**: All role switches and device toggles validated across desktop and mobile views
- **Portal Authentication System (October 2, 2025)**: Implemented secure invitation-based authentication for Hubify Portal:
  - **Database Schema**: Created `portal_users`, `portal_sessions`, `portal_user_properties`, and `portal_invitations` tables
  - **Invitation Security**: Registration requires invitation tokens created by admins, preventing unauthorized access
  - **Role-Based Access**: Support for three portal user roles (resident, staff, vendor) with property associations
  - **Session Management**: Token-based authentication with 30-day expiry and device tracking
  - **Password Security**: bcrypt password hashing with salt rounds for secure storage
  - **Admin Controls**: Endpoints for creating/managing invitations with role restrictions
  - **Multi-Tenant Security**: Invitation system enforces org/role from tokens, closing critical security flaw
- **Hubify Portal Implementation (October 2, 2025)**: Completed full client-facing portal with role-based access:
  - **Frontend Implementation**: React-based portal with dedicated auth context and routing (`/portal`, `/portal/login`, `/portal/register`)
  - **Three Role-Specific Dashboards**:
    - **Resident**: Payments, maintenance requests, documents, messages, property information
    - **Staff**: Time tracking (clock in/out), task management, schedule, file uploads
    - **Vendor**: Work orders, invoices, job completion tracking, revenue metrics
  - **End-to-End Testing**: All authentication flows, role-based rendering, and single-use invitations validated
  - **User Experience**: Modern UI with gradient backgrounds, role-specific cards, responsive layouts
- **Terminology Migration (October 2, 2025)**: Completed migration from legacy naming to unified Hubify branding:
  - **Hubify Console**: Admin back-end for property management (formerly PropertyCenter/ClientCenter admin)
  - **Hubify Portal**: Client-facing frontend for residents, staff, and vendors
  - Routes updated: `/hubify-console` as primary path with backward compatibility redirects from `/admin/client-portal` and `/property-center`
  - All UI labels, navigation menu items, and file names updated to reflect new terminology
  - File renamed: `PropertyCenter.tsx` → `HubifyConsole.tsx`

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX
- **Framework**: React 18 with TypeScript
- **UI Components**: Radix UI primitives with shadcn/ui
- **Styling**: Tailwind CSS with a custom design system, aiming for a modern and clean interface.
- **State Management**: TanStack React Query
- **Forms**: React Hook Form with Zod validation

### Backend
- **Runtime**: Node.js with Express.js (TypeScript, ES modules)
- **API**: RESTful endpoints
- **Authentication**: Replit Auth integration via OpenID Connect; session management with Express sessions and PostgreSQL store.
- **Core Features**:
    - **Multi-Tenant Architecture**: Organization-based multi-tenancy for distinct clients, properties, forms, and submissions.
    - **Out-of-Office Management**: Comprehensive system for team member availability, conflict detection in task assignment, and supervisor notifications.
    - **Staff Time Tracking**: Clock-in/clock-out functionality, property/task association, billable rates, and management interface with CSV export.
    - **Three-Tier Invoice Management**: Supports platform billing (Hubify to organizations), organization billing views (organizations viewing Hubify invoices), and client invoicing (organizations to their clients) with file upload/download via object storage.
    - **Dual-Tier Stripe Integration**: Master billing for platform subscriptions and per-organization Stripe Connect/API key integration for client payments.
    - **Enhanced Forms System**: Multi-tenant forms with complex field types, property-specific assignments, client submissions, and file upload.
    - **Duplicate Detection & Merge**: Backend duplicate detection for contacts and properties using weighted similarity algorithms and smart merge logic.
    - **Tier-Based Branding System**: Flexible branding policy enforcement with subscription-based feature restrictions.
    - **Property Portal Settings**: Configuration system for client-facing portals with versioning and branding enforcement.
    - **Form Submissions System**: Client-facing form submission workflow with server-side validation.
    - **Advanced Form Profile Matching**: Intelligent matching and creation logic for contact profiles from form submissions.
    - **Property Management**: Support for various property types, multi-unit management, manager assignment, and status tracking.
    - **Task Management System**: Priority levels, status tracking, task assignment, property association, and due date management.
    - **Team Collaboration**: Hierarchical user roles with permissions, communication, and activity logging.
    - **Contact Management**: Comprehensive management of tenants, owners, vendors, and emergency contacts.
    - **Room Management**: Detailed room management with tabs for supplies, devices, notes, surfaces, fixtures, photos, and history.
    - **Property Bulk Actions**: Bulk selection, report generation (CSV), and email integration.
    - **Communities Management System**: Multi-tab interface for managing community details.
    - **Calendar System with Attendees**: Full-featured calendar with event management and attendee support (team, clients, external emails).
    - **Super Admin Control Panel**: Internal dashboard for platform management, including organizations, users, reports, communication, revenue, feature flags, monitoring, compliance, and platform settings. Includes system alerts with scheduling and location targeting, and a centralized settings tab with 9 configuration categories.
    - **Legal Compliance Pages**: Publicly accessible Privacy Policy and Terms of Service pages compliant with US (CCPA/CPRA) and Canadian (PIPEDA) legal standards, including GDPR for privacy, and comprehensive SaaS clauses for terms.
    - **QuickBooks Integration (In Progress)**: Database schema implemented for OAuth-based QuickBooks Online connections, including sync logging and invoice linkage. Ready for API endpoint implementation and UI development.

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