# Hubify - Property Management Platform

## Overview
Hubify is a property management platform designed to streamline operations for home watch and estate management companies. It focuses on consolidating invoice batching for efficient client billing, enhancing team efficiency, and improving client communication through a modern web interface. The platform aims to address workflow inefficiencies and become a leading solution in property management.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Data Model
The system uses a multi-tenant data model where all data is scoped by `orgId`. Contacts are universal, managing various types like vendors, tenants, owners, and clients. A contact-client bridge allows for lazy client creation.

### UI/UX
The frontend is built with React 18 and TypeScript, leveraging Radix UI primitives, shadcn/ui, and Tailwind CSS for a modern, responsive interface. State management is handled by TanStack React Query, and forms use React Hook Form with Zod validation. Key UI features include customizable tables, interactive dashboard cards, and streamlined client detail pages.

### Technical Implementations
The backend is developed with Node.js and Express.js, providing RESTful API endpoints. Authentication utilizes Replit Auth via OpenID Connect, supporting hybrid authentication and invitation-based access. Multi-tenancy is enforced at the database level.

Core features include:
- **Comprehensive Property Management**: Supports various property types, multi-unit management, task integration, secure storage for access control, warranty tracking, and vendor association.
- **Advanced Task Management**: Includes priority levels, status tracking, recurring tasks, photo categorization, and a template system.
- **Integrated Calendar System**: Full-featured event management, staff scheduling, and iCal integration.
- **Team Collaboration**: Hierarchical user roles, permissions, communication tools, time tracking, and broadcast notifications.
- **Contact and Email Management**: Comprehensive client and vendor management with duplicate detection, alongside a full-featured email system with templates and scheduling.
- **Admin Customization**: Centralized customization for fields, supply settings, and billing, including organization-level default hourly rates.
- **Automated Invoice and Billing System**: A three-tier system with object storage, webhook-driven payment tracking, automated status updates, consolidated invoice batching, and secure Stripe integration for payment collection.
- **Forms System**: Multi-tenant forms with complex field types, property assignments, and admin viewing capabilities.
- **Specialized Portals**: Includes a client-facing Hubify Portal with role-based access and a Super Admin Control Panel for platform management, featuring real-time data for organizations, users, revenue, and compliance.
- **Branding and Compliance**: Tier-based branding policy enforcement and publicly accessible legal compliance pages.
- **Import Manager**: CSV import functionality for key data entities with AI field mapping.
- **Time Tracking**: Dedicated tracking for billable and non-billable time.
- **Support Ticket System**: Internal system for user requests.
- **System Alerts**: Organization-level alert system with severity and targeting.
- **Account Settings**: Organization configuration with company profile and secure API key management. Subscription card reads real `org_subscriptions` data via `GET /api/orgs/:orgId/subscription` (no mocked plan/payment-method UI). Forms, Email Templates, Task Templates, and Team Roles tabs are empty-state cards that SPA-navigate (wouter `setLocation`) to the real admin pages (`/admin/forms`, `/admin/email-templates`, `/admin?tab=templates`, `/team`). Integrations tab no longer shows SendGrid/Twilio "Coming Soon" placeholder cards.
- **Inspection Management**: Full inspection workflow with customizable checklists, reusable templates, and automated recurring inspection scheduling.
- **In-App Notifications**: Real-time notifications with an unread badge, a slide-over panel, and customizable preferences.
- **Feature Flags**: Platform-wide rollout control for features with per-organization overrides.
- **PDF Mockup Gallery**: Admin-only page for previewing client-facing PDFs with sample data and watermarking.
- **Field Mode**: Mobile-optimized, touch-first interface for field staff, providing access to assigned tasks, property details, and task management functionalities on the go.

### System Design Choices
The database uses PostgreSQL with Drizzle ORM (Better SQLite3 for local development). The architecture is multi-tenant and organization-scoped, utilizing UUID-based primary keys and JSONB for flexible data structures.

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