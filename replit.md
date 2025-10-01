# Hubify - Property Management Platform

## Overview
Hubify is a professional property management platform designed for home watch and HOA companies. Its purpose is to streamline property operations, enhance team efficiency, and improve client communication by offering a comprehensive solution for managing properties, tasks, team collaboration, and client relationships through a modern web interface. The platform's business vision is to become the leading solution for property management, offering significant market potential by addressing inefficiencies in current workflows.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **UI Components**: Radix UI primitives with shadcn/ui
- **Styling**: Tailwind CSS with custom design system
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API**: RESTful API endpoints
- **Authentication**: Replit Auth integration with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL store

### Database
- **Primary Database**: PostgreSQL with Drizzle ORM
- **Local Development**: Better SQLite3
- **Schema Management**: Drizzle Kit
- **Connection**: Neon Database serverless
- **Multi-Tenant Architecture**: Organization-scoped data with UUID-based primary keys
- **Advanced Forms**: JSONB schema storage with flexible field definitions and property assignments

### Recent Changes
- **October 2025**: Implemented comprehensive Super Admin Settings tab with 9 configuration sections for platform-wide management (Platform Configuration, Email & Communication, Integration Management, Default Organization Settings, Billing & Subscription, Compliance & Legal, System Maintenance, Security & Access, Customization Controls)
- **October 2025**: Implemented comprehensive three-tier invoice management system with platform invoices (Hubify billing organizations), organization billing views (orgs viewing their Hubify invoices), and client invoices (orgs billing their clients), including PDF/image upload support via object storage
- **October 2025**: Implemented dual-tier Stripe integration system with master billing (Hubify billing organizations via subscriptions) and per-organization Stripe connections (via Stripe Connect or direct API keys) for processing payments
- **October 2025**: Added comprehensive event attendees management system with support for team members, clients, and external email addresses, including multi-tenant org scoping security
- **October 2025**: Fixed duplicate scanner confidence calculation to show accurate match percentages instead of false 100% scores
- **August 2025**: Fixed platform-wide propertyId validation issue affecting room, vehicle, and contact creation across all properties
- **August 2025**: Streamlined form builder interface by removing step-by-step tutorial language and redundant settings
- **August 2025**: Consolidated form settings into cleaner, professional interface without numbered progression indicators

## Key Features and Design Decisions
- **Multi-Tenant Architecture**: Comprehensive organization-based multi-tenancy supporting distinct clients, properties, forms, and submissions per organization.
- **Three-Tier Invoice Management System**: Complete invoice management across three distinct contexts:
  - **Platform Invoices** (Admin → Organizations): Hubify admins create and manage invoices for billing organizations, with file upload/download via object storage, status tracking (draft, sent, paid, overdue, cancelled), and Stripe integration capability
  - **Organization Billing View** (Organizations viewing Hubify invoices): Read-only view for organizations to see and download their invoices from Hubify
  - **Client Invoices** (Organizations → Clients): Organizations create and manage invoices for their clients, with full CRUD operations, file upload/download, and multi-tenant security
  - **Technical Implementation**: Dedicated multer instance for invoice files (PDF/images, 25MB limit), ObjectStorageService integration with hierarchical storage keys, Zod validation on all API routes, proper 404 handling, and dynamic content-type detection for uploads
  - **Security**: Org-scoped enforcement on all operations, client-org integrity validation, signed URLs for downloads, and API routes with proper authorization checks
  - **Database Schema**: platformInvoices and clientInvoices tables with proper indices for status and date-based queries
- **Dual-Tier Stripe Integration**: Complete payment processing system with two separate tiers:
  - **Master Billing**: Hubify uses a master Stripe account to bill organizations for platform subscriptions with subscription management, webhook processing, and automatic billing updates
  - **Per-Organization Connections**: Organizations can connect their own Stripe accounts (via Stripe Connect or direct API keys) to process payments from their clients, supporting both Standard Connect accounts and direct API key integration
  - **Security Note**: API keys stored in database require encryption-at-rest before production deployment (currently noted as TODO in codebase)
- **Enhanced Forms System**: Advanced, multi-tenant forms with complex field types, property-specific assignments, client submissions with status tracking, and file upload support.
- **Duplicate Detection & Merge**: Sophisticated backend duplicate detection for contacts and properties using weighted similarity algorithms (Levenshtein distance) with accurate confidence scoring and smart merge logic that preserves primary record data.
- **Tier-Based Branding System**: Flexible branding policy enforcement with subscription-based feature restrictions (logo, primary color, full theming).
- **Property Portal Settings**: Comprehensive configuration system for client-facing property portals with versioning, draft/published workflow, and real-time tier-based branding enforcement.
- **Form Submissions System**: Client-facing form submission workflow with server-side validation and staff management endpoints for review and status updates.
- **Advanced Form Profile Matching**: Intelligent matching and creation logic for contact profiles based on form submissions, including field mapping and new profile creation.
- **Property Management**: Support for various property types, multi-unit management, manager assignment, and status tracking.
- **Task Management System**: Priority levels, status tracking, task assignment with audit trail, property association, and due date management.
- **Team Collaboration**: Hierarchical user roles with permissions, built-in communication, and activity logging.
- **Contact Management**: Management of tenants, owners, vendors, emergency contacts, property association, and communication tracking.
- **Room Management**: Comprehensive room management system with tabs for Supplies, Devices, Notes, Surfaces, Fixtures, Photos, and History.
- **Property Bulk Actions**: Functionality for bulk selection of properties, report generation (CSV), and email integration for owners.
- **Communities Management System**: Multi-tab interface for managing community details including profile, rules, schedule, financial information, amenities, and documents.
- **Admin Navigation Enhancement**: Centralized 'Admin' section in main navigation for authorized users, consolidating administrative tools like Client Portal and Data Management.
- **Calendar System with Attendees**: Full-featured calendar with FullCalendar integration, event creation/editing, attendees management (team members, clients, external emails), org-scoped security, and state reconciliation for attendee add/remove operations.
- **Super Admin Control Panel**: Internal-only platform management dashboard for Hubify team with 11 specialized tabs including Organizations, Users, Reports, Mass Email, System Alerts, Revenue, Feature Flags, Monitoring, Platform, Compliance, and Settings. Comprehensive Settings tab provides centralized configuration for platform-wide settings across 9 categories: Platform Configuration (API limits, session timeout, file sizes, webhooks, timezone), Email & Communication (SMTP/SendGrid, SMS gateway, notification defaults), Integration Management (Stripe master keys, OAuth configs, third-party APIs), Default Organization Settings (plan assignment, trial length, storage quotas, feature toggles), Billing & Subscription (pricing tiers, add-ons, grace periods), Compliance & Legal (retention policies, e-signature, GDPR/CCPA, audit logging), System Maintenance (maintenance mode, backup schedules, health checks), Security & Access (2FA policies, password complexity, session controls, IP whitelist), and Customization Controls (global feature toggles, default themes, notification templates).
- **UI/UX Decisions**: Utilizes Radix UI and shadcn/ui for components, Tailwind CSS for styling, aiming for a modern and clean interface.

## External Dependencies

### Core
- **@neondatabase/serverless**: PostgreSQL serverless connection
- **drizzle-orm**: Type-safe database operations
- **better-sqlite3**: Local development database
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store
- **stripe**: Payment processing for both master billing and per-organization connections

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
```