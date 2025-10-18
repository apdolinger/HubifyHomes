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