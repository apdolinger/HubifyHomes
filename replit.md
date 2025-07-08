# Nestive - Property Management Platform

## Overview

Nestive is a professional property management platform designed for home watch and HOA companies. It provides a comprehensive solution for managing properties, tasks, team collaboration, and client relationships through a modern web interface.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state management
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with custom design system
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **API**: RESTful API endpoints with structured error handling
- **Authentication**: Replit Auth integration with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL store

### Database Architecture
- **Primary Database**: PostgreSQL with Drizzle ORM
- **Local Development**: Better SQLite3 for development environment
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection**: Neon Database serverless for production

## Key Components

### Authentication System
- **Provider**: Replit Auth with OIDC integration
- **Session Storage**: PostgreSQL-backed sessions with 7-day TTL
- **User Management**: Role-based access control (admin, supervisor, staff, client)
- **Protection**: Route-level authentication guards

### Property Management
- **Property Types**: Support for apartments, houses, commercial properties
- **Unit Management**: Multi-unit property support
- **Manager Assignment**: Property-to-manager relationships
- **Status Tracking**: Active/inactive property states

### Task Management System
- **Priority Levels**: Urgent, high, normal, low priority tasks
- **Status Tracking**: Pending, in_progress, completed, cancelled states
- **Assignment**: Task assignment to team members with audit trail
- **Property Association**: Tasks linked to specific properties
- **Due Date Management**: Deadline tracking and overdue notifications

### Team Collaboration
- **User Roles**: Hierarchical role system with permissions
- **Team Messaging**: Built-in communication system
- **Activity Logging**: Comprehensive audit trail for all actions
- **Real-time Updates**: Live dashboard updates

### Contact Management
- **Contact Types**: Tenants, owners, vendors, emergency contacts
- **Property Association**: Contacts linked to specific properties
- **Communication Tracking**: Email and phone contact information

## Data Flow

### Authentication Flow
1. User accesses protected route
2. Middleware checks for valid session
3. If no session, redirect to Replit Auth
4. After successful auth, create/update user record
5. Establish session with PostgreSQL store

### Task Management Flow
1. User creates task through UI or quick-add modal
2. Form validation with Zod schema
3. API endpoint processes request with authentication check
4. Database transaction creates task and activity log entry
5. Real-time UI updates via React Query cache invalidation

### Property Operations Flow
1. CRUD operations through REST API endpoints
2. Role-based permission checks on server
3. Database operations with Drizzle ORM
4. Optimistic UI updates with rollback on failure

## External Dependencies

### Core Dependencies
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

## Deployment Strategy

### Development Environment
- **Local Database**: Better SQLite3 for rapid development
- **Hot Reload**: Vite dev server with HMR
- **Auto-migration**: Database schema sync on startup
- **Environment Variables**: Local .env file configuration

### Production Environment
- **Database**: Neon PostgreSQL serverless
- **Build Process**: Vite production build + esbuild for server
- **Session Storage**: PostgreSQL-backed sessions
- **Static Assets**: Served from dist/public directory
- **Environment Variables**: Production environment configuration

### Database Management
- **Schema Migrations**: Drizzle Kit push/pull commands
- **Connection Pooling**: Neon serverless connection management
- **Backup Strategy**: Managed by Neon platform
- **Development Sync**: Auto-migration on server startup

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### July 8, 2025 - Property and People Profile Pages Implementation

#### Property Profile Page
- Created comprehensive PropertyProfile page with complete property management features
- Includes property details, owner/contact info, billing status, and task history
- Added tabbed interface for tasks, supplies log, community info, and notes
- Property card displays square footage, billing type, and status badges
- Linked properties are clickable from Properties page and navigate to profile

#### Person Profile Page
- Created PersonProfile page for complete contact management
- Displays contact details, linked properties, and related tasks
- Added tabs for tasks, billing info, notes, and activity history
- Person cards are clickable from People page and navigate to profile

#### Navigation and Routing Updates
- Added property-profile and person-profile routes to App.tsx
- Updated Properties page to make table rows clickable
- Updated People page to make contact cards clickable
- Fixed redirect logic after property and contact creation

#### Dashboard Enhancements
- Added gear icon to Recent Activity widget for customization
- Implemented gear icon functionality with toast notifications
- Enhanced dashboard with proper widget management foundation

#### User Experience Improvements
- Made all profile pages responsive with proper loading states
- Added back navigation buttons to all profile pages
- Implemented proper error handling for unauthorized access
- Enhanced profile cards with avatars and status badges

### June 30, 2025 - User Interface and Functionality Updates

#### Navigation Bar Reordering
- Updated navigation order: Properties | People | Tasks | Team | Property Center | Admin
- Added role-based Admin tab (only visible to admin users)
- Implemented proper role-based access control for admin features

#### Activity Logging Enhancement
- Extended activity logging beyond task creation to include:
  - Contact creation events: "Added contact 'John Smith'"
  - Property creation events: "Added property 'Property Name'"
  - All core CRUD operations now logged in Recent Activity widget

#### Quick Add Modal Improvements
- Quick Add Task modal now redirects to task detail page after creation
- Quick Add Contact functionality implemented with redirect to contact profile
- All Quick Add modals provide confirmation and redirect for additional edits

#### Team Page Updates
- Added "My Team" section below existing team member list
- Section displays direct reports and teammates (placeholder for future implementation)
- Enhanced team collaboration features

#### Admin Panel Implementation
- Created comprehensive Admin panel with tabbed interface
- Sections include: User Management, System Settings, Database Tools, Analytics
- Role-based access protection with automatic redirect for non-admin users
- Proper unauthorized access handling with toast notifications

#### Profile and Detail Page Fixes
- Fixed contact profile viewing/editing functionality
- Implemented proper redirect flow from People page after contact creation
- Enhanced user experience with confirmation messages and smooth transitions

## Changelog

Changelog:
- June 30, 2025. Initial setup and comprehensive feature implementation