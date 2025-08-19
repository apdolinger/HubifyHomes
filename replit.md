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
- **August 2025**: Fixed platform-wide propertyId validation issue affecting room, vehicle, and contact creation across all properties
- **August 2025**: Streamlined form builder interface by removing step-by-step tutorial language and redundant settings
- **August 2025**: Consolidated form settings into cleaner, professional interface without numbered progression indicators

## Key Features and Design Decisions
- **Multi-Tenant Architecture**: Comprehensive organization-based multi-tenancy supporting distinct clients, properties, forms, and submissions per organization.
- **Enhanced Forms System**: Advanced, multi-tenant forms with complex field types, property-specific assignments, client submissions with status tracking, and file upload support.
- **Duplicate Detection & Merge**: Sophisticated backend duplicate detection for contacts and properties using matching algorithms (e.g., Levenshtein distance) and smart merge logic that preserves primary record data.
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
- **UI/UX Decisions**: Utilizes Radix UI and shadcn/ui for components, Tailwind CSS for styling, aiming for a modern and clean interface.

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
```