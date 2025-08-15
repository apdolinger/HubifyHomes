# Hubify - Property Management Platform

## Overview
Hubify is a professional property management platform for home watch and HOA companies. It offers a comprehensive solution for managing properties, tasks, team collaboration, and client relationships through a modern web interface. The platform aims to streamline property operations, enhance team efficiency, and improve client communication.

**Production Domain**: BASE_DOMAIN=hubifyhomes.app

## Recent Changes (August 2025)
- **Complete Rebranding**: Successfully updated entire application from "Dwellerly" to "Hubify" across all files, components, domains (hubifyhomes.app), and test data
- **Multi-Tenant Architecture**: Implemented comprehensive organization-based multi-tenancy with:
  - Organizations table with subscription tiers (starter, pro, grow, enterprise)
  - Clients table for property tenants/owners separate from staff users
  - Organization-scoped properties, forms, and submissions
  - Advanced forms library with property-specific assignments
- **Enhanced Forms System**: Replaced basic forms with advanced multi-tenant forms supporting:
  - Complex field types (text, textarea, number, select, checkbox, date, file)
  - Property-specific form assignments with sort order and required flags
  - Client submissions with status tracking (received, in_review, accepted, rejected)
  - File upload support with field-level attachments
- **Database Migration**: Successfully migrated to UUID-based properties and forms, added multi-tenant relationships, preserved existing data with default organization
- **Photo Upload System**: Implemented complete file upload functionality using multer middleware, server-side storage, and proper file serving
- **Property Interface Cleanup**: Removed property-level Supplies tab since supplies are managed per room (4 tabs: Tasks, Contacts, Rooms, Notes)
- **7-Tab Room Management**: Full room management system with Supplies, Devices, Notes, Surfaces, Fixtures, Photos, and History tabs
- **Advanced Duplicate Detection System**: Implemented comprehensive backend duplicate detection with sophisticated matching algorithms using Levenshtein distance, configurable scan parameters, confidence levels (Very High 95%+, High 85%+, Medium 70%+), real-time scanning, and support for both contacts and properties
- **Smart Merge Logic**: Created intelligent merge system that preserves primary record data while filling missing fields from duplicates, with detailed merge preview
- **Edit Contact Functionality**: Fixed edit buttons in PersonProfile page with complete modal form and validation
- **Backend Duplicate Detection**: Added `/api/duplicates/scan` and `/api/duplicates` endpoints with advanced matching criteria for names, emails, phones, and addresses
- **Tier-Based Branding System**: Implemented sophisticated branding policy enforcement with subscription-based feature restrictions:
  - Starter tier: Logo upload only  
  - Pro tier: Logo + primary color customization
  - Grow/Enterprise tiers: Full theming capabilities including custom CSS and secondary colors
- **Branding API Integration**: Added comprehensive branding management endpoints with policy enforcement and capabilities validation
- **Organization Architecture**: Enhanced organizations table with branding and theme JSONB columns for flexible customization storage
- **Property Portal Settings System (August 15, 2025)**: Completed comprehensive property portal configuration system with:
  - property_portal_settings table with versioning and draft/published workflow
  - Six-tab interface: Branding, Layout, Modules, Content, Legal, Authentication
  - Real-time tier-based branding policy enforcement
  - API endpoints for CRUD operations and publishing workflow
  - Route: /properties/:propertyId/portal-settings
- **Property Forms Assignment API (August 15, 2025)**: Implemented Express.js property forms assignment system equivalent to Next.js patterns:
  - Property-specific form assignments with sort order and required flags
  - CRUD operations: GET, POST, DELETE, PATCH for form assignments
  - Organization-scoped validation and form verification
  - API endpoints: /api/orgs/:orgId/properties/:propertyId/forms
  - Full compatibility with existing forms and propertyForms schema
- **Form Submissions System (August 15, 2025)**: Complete client-facing form submission workflow with validation:
  - Client form submission endpoint: POST /api/orgs/:orgId/forms/:formId/submit
  - Server-side form validation with required field checking
  - Staff management endpoints for submission review and status updates
  - Status workflow: received → in_review → accepted/rejected
  - Integration with existing forms and property assignment system
- **Production API Pattern Implementation (August 15, 2025)**: Complete API ecosystem matching production patterns:
  - Staff forms creation: POST /api/staff/forms with x-tenant-org header
  - Property centers assignment: POST /api/property-centers/:propertyId/forms
  - Client forms listing: GET /api/client/forms?property_id=X with Bearer token
  - Client submission: POST /api/client/forms/:formId/submit with Bearer auth
  - Full multi-tenant architecture with header-based org context
- **Property Centers Navigation Restructuring (August 15, 2025)**: Successfully moved Property Centers from main navigation to Admin → Client Portal:
  - Updated navigation structure: Property Centers now accessible under Admin → Client Portal dropdown
  - Changed URL structure: /property-center → /admin/client-portal and /properties/:id/portal-settings → /admin/client-portal/:id
  - Added backward compatibility: 308 redirects for old URLs to new admin paths
  - Updated API endpoints: New /api/admin/client-portal/* endpoints with backward compatibility redirects
  - Enhanced PropertyCenter page: Renamed to "Client Portal" with updated description and Portal Settings buttons per property
  - Complete functionality preservation: All existing features work identically under new navigation structure

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

### Key Features
- **Authentication System**: Replit Auth with OIDC, PostgreSQL-backed sessions, role-based access control (admin, supervisor, staff, client), route-level authentication guards.
- **Property Management**: Support for various property types, multi-unit management, manager assignment, and status tracking.
- **Task Management System**: Priority levels, status tracking, task assignment with audit trail, property association, and due date management.
- **Team Collaboration**: Hierarchical user roles with permissions, built-in communication, comprehensive activity logging, and real-time dashboard updates.
- **Contact Management**: Management of tenants, owners, vendors, emergency contacts, property association, and communication tracking.
- **Advanced Forms Management System**: Multi-tenant forms library with organization-level creation, property-specific assignments, client submissions with status tracking, file uploads, and tier-based feature restrictions.
- **Super Admin Internal Platform**: Internal control panel for platform-wide monitoring and management, including user management, mass email communication, system alerts, organization management, revenue dashboard, feature flags, system monitoring, and platform messaging.
- **Account Settings (Business Owner Control Center)**: Management of account information, subscription & billing, custom fields configuration, email template editor, task template manager, report templates, notification settings, team roles & permissions, automation rules, and audit logs.
- **Property Profile Page**: Comprehensive property details, owner/contact info, billing status, task history, and tabbed interface for tasks, supplies log, community info, and notes. Includes room-associated items tracking (lightbulbs, filters, paint, batteries) and categorized room notes.
- **Person Profile Page**: Contact details, linked properties, related tasks, and tabs for tasks, billing info, notes, and activity history.

## External Dependencies

### Core
- **@neondatabase/serverless**: PostgreSQL serverless connection
- **drizzle-orm**: Type-safe database operations
- **better-sqlite3**: Local development database
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store

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