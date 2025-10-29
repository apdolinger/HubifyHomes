# Hubify - Property Management Platform

## Overview
Hubify is a professional property management platform designed to streamline operations for home watch and estate management companies. It consolidates invoice batching for efficient client billing, enhances team efficiency, and improves client communication through a modern web interface. The platform aims to be a leading solution in property management, addressing workflow inefficiencies and offering significant market potential.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX
- **Framework**: React 18 with TypeScript
- **UI Components**: Radix UI primitives with shadcn/ui
- **Styling**: Tailwind CSS with a custom design system
- **State Management**: TanStack React Query
- **Forms**: React Hook Form with Zod validation
- **Design Decisions**: Modern UI, gradient backgrounds, role-specific cards, responsive layouts, global keyboard shortcuts, and a centralized Support modal.

### Technical Implementations
- **Backend Runtime**: Node.js with Express.js (TypeScript, ES modules)
- **API**: RESTful endpoints
- **Authentication**: Replit Auth via OpenID Connect, session management (Express sessions with PostgreSQL store). Hybrid authentication for Super Admin (username/password) and regular users (OIDC). Invitation-based authentication for Hubify Portal.
- **Multi-Tenancy**: Organization-based for clients, properties, forms, and submissions.
- **Property Management**: Supports various property types, multi-unit management, manager assignment, status tracking, room management, tier-based restrictions, custom fields, and property-specific task lists. Includes secure storage for property access control information and warranty/servicing tracking for room devices, along with purchasing link management for room surfaces.
- **Task Management**: Priority levels, status tracking, assignment, property association, due dates, recurring tasks (RFC5545 RRULE), before/after photo categorization, persistent comments, bulk task creation, task templates, and context-aware task creation. Full custom field support.
- **Calendar System**: Full-featured calendar with event management, attendee support, staff scheduling conflict detection, recurring events (RFC5545 RRULE), one-way iCal feed integration, and template-based reports.
- **Conflict Resolution**: Automated detection and management of scheduling conflicts with supervisor approval workflow.
- **Team Collaboration**: Hierarchical user roles, permissions, communication, activity logging, out-of-office management, staff time tracking, dedicated messaging with threaded conversations, and broadcast email notifications.
- **Contact Management**: Comprehensive client and vendor management with duplicate detection, merging capabilities, and custom fields.
- **Admin Customization**: Centralized Customization tab for Custom Fields and Supply Settings.
- **Invoice Management**: Three-tier system with object storage, webhook-driven payment tracking, automatic status updates, HTML email notifications, on-demand PDF generation with branding, and configurable organization-level billing workflows. Features consolidated invoice batching by client or property, and client-level billing schedules.
- **Forms System**: Multi-tenant forms with complex field types, property-specific assignments, client submissions, and advanced profile matching.
- **Hubify Portal**: Client-facing portal with role-based access and admin preview mode.
- **Super Admin Control Panel**: Internal dashboard for platform management, including organizations, users, reports, communication, revenue, feature flags, monitoring, and compliance.
- **Branding System**: Tier-based branding policy enforcement.
- **Legal Compliance Pages**: Publicly accessible Privacy Policy and Terms of Service (US & Canadian standards).
- **Import Manager**: Comprehensive CSV import functionality for Properties, Contacts, and Tasks with AI field mapping, data validation, and history tracking.
- **Time Tracking**: Dedicated tracking for billable "Client Work" and non-billable "Organizational Time" with role-based editing permissions.
- **Support Ticket System**: Internal system for users to submit requests to the platform owner, managed exclusively in the Super Admin Console.

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