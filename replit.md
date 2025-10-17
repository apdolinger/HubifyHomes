# Hubify - Property Management Platform

## Overview
Hubify is a professional property management platform designed to streamline operations for home watch and estate management companies. It aims to enhance team efficiency and client communication by providing a comprehensive solution for managing properties, tasks, team collaboration, and client relationships through a modern web interface. The platform's vision is to become a leading solution in property management, addressing workflow inefficiencies and offering significant market potential.

## Recent Changes
- **CSV Import Manager with Data Validation (October 17, 2025)**: Built comprehensive import manager in admin area for CSV data uploads:
  - **Four-Step Import Flow**: Upload → Map Fields → Validate → Import with visual progress indicator
  - **Entity Type Selection**: Choose between Properties, Contacts, or Tasks for import
  - **CSV Parsing**: Integrated PapaParse library for reliable CSV parsing with header detection
  - **AI Field Mapping**: Automatically suggests column-to-field mappings based on:
    - Exact name matches (e.g., "name" → "name")
    - Partial matches (e.g., "Property Name" → "name")
    - Common naming variations (e.g., "Street Address" → "address1", "Zip Code" → "zip")
  - **Interactive Mapping**: Dropdown selectors for each CSV column with required field indicators
  - **Mapping Validation**: Ensures all required fields are mapped before proceeding
  - **Comprehensive Data Validation**:
    - Required field checks (prevents empty required fields)
    - Data type validation (numbers, emails, dates)
    - Format validation (email syntax, date formats)
    - Duplicate detection within CSV (warns about duplicate unique keys)
  - **Visual Error Indicators**:
    - Color-coded preview grid (Red = Error, Yellow = Warning)
    - Row-level issue icons with tooltips
    - Cell-level highlighting for specific field issues
    - Error/warning count badges
  - **Inline Editing**: Fix validation errors directly in preview table with auto-revalidation
  - **Error Report Export**: Download CSV with all validation issues (Row #, Field, Issue Type, Message, Value)
  - **Smart Flow Control**: Blocks import until all errors fixed; warnings allowed
  - **Admin Integration**: Added navigation link in Tools & Support section
  - **Testing Ready**: All interactive elements include data-testid attributes
- **Organizational Time Tracking (October 17, 2025)**: Added dedicated tracking for non-billable organizational hours:
  - **Two-Category System**: Clock in as either "Client Work" (billable) or "Organizational Time" (non-billable)
  - **Visual Distinction**: Clear icons and descriptions differentiate between client work and organizational time
  - **Automatic Handling**: Organizational time entries don't require property or task assignment
  - **Use Cases**: Track admin work, training, meetings, internal tasks separate from client billing
  - **Smart UI**: Property and task fields automatically hide when tracking organizational time
- **Role-Based Time Entry Editing (October 17, 2025)**: Implemented comprehensive time entry editing with permission controls:
  - **Two-Tier Permission System**: Admin and supervisor roles can edit all time entry fields; regular staff can only edit notes and billable rates
  - **Full Edit Capabilities**: Authorized users can modify clock in/out times, assigned user, property, task, notes, and billable rates
  - **Permission Indicators**: UI clearly shows when a user has "Full Edit Access" with visual badge
  - **Backend Protection**: API validates user role before allowing modifications to sensitive fields (clock times, user assignment)
  - **Enhanced UI**: Expanded edit dialog with datetime pickers for precise time adjustments and dropdowns for property/task/user selection
- **Property Merge Implementation (October 16, 2025)**: Completed full property duplicate merge functionality:
  - **Smart Merge Logic**: Automatically selects most complete property as primary based on weighted completeness scoring (address, name, details)
  - **Field Merging**: Intelligently combines data from duplicates (prefers longer strings, larger numbers for fields like square footage)
  - **Related Record Reassignment**: Automatically transfers all associated records to primary property:
    - Tasks (propertyId)
    - Time entries (propertyId)
    - Form submissions (propertyId)
    - Contact-property links (handles conflicts intelligently)
    - Rooms (propertyId)
    - Vehicles (propertyId)
  - **Conflict Resolution**: Smart handling of contact-property junction table conflicts (removes duplicate links)
  - **Activity Logging**: Records merge details including merged property IDs, notes, and primary address
  - **Organization Safety**: Enforces same-organization check to prevent cross-org merges
- **Contact Duplicate Detection Bug Fix (October 16, 2025)**: Fixed critical field name mismatch preventing duplicate detection:
  - **Root Cause**: Duplicate detection code used snake_case field names (`first_name`, `last_name`) but Drizzle ORM returns camelCase (`firstName`, `lastName`)
  - **Impact**: All contact field accesses returned `undefined`, preventing any duplicates from being detected
  - **Fix Applied**: Updated `calculateContactSimilarity()`, `calculateRecordCompleteness()`, and `getContactMatchFields()` to use camelCase field names
  - **Ignored Duplicates System**: Enhanced to properly filter out false positive matches while detecting legitimate duplicates

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
    - **Property Management**: Support for various property types, multi-unit management, manager assignment, status tracking, and room management.
    - **Task Management System**: Priority levels, status tracking, assignment, property association, and due date management. Integrated with calendar.
    - **Calendar System**: Full-featured calendar with event management, attendee support, customizable settings, and staff scheduling conflict detection. Tasks with due dates appear as events.
    - **Team Collaboration**: Hierarchical user roles with permissions, communication, and activity logging. Includes out-of-office management and staff time tracking.
    - **Contact Management**: Comprehensive management of tenants, owners, vendors, and emergency contacts with duplicate detection and merge capabilities.
    - **Invoice Management**: Three-tier invoice system with object storage for file upload/download.
    - **Stripe Integration**: Dual-tier integration for platform subscriptions and per-organization client payments.
    - **Forms System**: Multi-tenant forms with complex field types, property-specific assignments, client submissions, and advanced profile matching.
    - **Hubify Portal**: Client-facing portal with role-based access (Staff, Vendor dashboards) and a preview mode for administrators.
    - **Super Admin Control Panel**: Internal dashboard for platform management, including organizations, users, reports, communication, revenue, feature flags, monitoring, compliance, and platform settings.
    - **Branding System**: Tier-based branding policy enforcement.
    - **Legal Compliance Pages**: Publicly accessible Privacy Policy and Terms of Service pages compliant with US (CCPA/CPRA) and Canadian (PIPEDA) legal standards.

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