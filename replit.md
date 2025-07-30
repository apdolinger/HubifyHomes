# Dwellerly - Property Management Platform

## Overview

Dwellerly is a professional property management platform designed for home watch and HOA companies. It provides a comprehensive solution for managing properties, tasks, team collaboration, and client relationships through a modern web interface.

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

### July 24, 2025 - Forms System Implementation & Database Expansion

#### Complete Forms Management System
- Implemented comprehensive forms creation and management within Account panel
- Added dedicated "Forms" tab to Account settings for business owners
- Database expanded from 8 to 11 tables with three new forms-related tables:
  - `forms` table: Store form configurations with public/embeddable options
  - `form_fields` table: Define field types (text, email, select, checkbox, textarea, phone)
  - `form_submissions` table: Store submitted data with JSONB for flexibility

#### Forms Features Implemented:
1. **Form Management Interface**
   - Visual form cards showing existing forms with metadata
   - Form statistics: field count, submission count, destination routing
   - Public/Private visibility controls and embeddable options
   - Quick action buttons: Preview, Edit, Embed Code, Export Data, Share Link

2. **Form Templates & Quick Actions**
   - Pre-built templates: Property Intake, Maintenance Request, Contact Information
   - Service Feedback, Incident Report, and Custom Form options
   - One-click form creation from professional templates
   - Form routing to create Contacts, Tasks, or standalone submissions

3. **Form Configuration Options**
   - Form types: intake, feedback, registration
   - Destination routing: contacts, tasks, or none (survey only)
   - Public accessibility with shareable links
   - Embeddable forms for website integration
   - Field ordering and validation requirements

4. **Sample Forms Displayed**
   - Property Intake Form: 8 fields, 23 submissions, creates Contacts
   - Maintenance Request Form: 12 fields, 47 submissions, creates Tasks  
   - Client Feedback Survey: 6 fields, 12 submissions, survey only

#### Database Schema Enhancement
- Successfully pushed schema changes to PostgreSQL production
- Added proper relations between forms, fields, and submissions
- Implemented UUID primary keys for forms system
- JSONB data storage for flexible form submission handling
- Cascade delete constraints for data integrity

#### Technical Implementation
- Enhanced Account panel with Forms tab using responsive design
- Integrated with existing authentication and role-based access
- Maintained consistent UI patterns with rest of application
- Added comprehensive form field type support
- Implemented proper TypeScript types and Zod validation schemas

### July 24, 2025 - Super Admin Internal Platform Management & Enhanced Features

#### Internal Super Admin Area
- Created dedicated Super Admin control panel for Dwellerly platform team (internal use only)
- Accessible via discrete "Platform" link in footer (bottom right)
- Route: `/dwellerly-admin` - separate from client account management
- Provides platform-wide monitoring and management capabilities

#### Enhanced Super Admin Features (3 Major Additions):

1. **All Users Management Table**
   - Comprehensive table showing all users across client accounts
   - Columns: Name, Email, Company, Role, Status, Last Login, Created Date
   - Search functionality across name, email, and account fields
   - Sortable columns and filtering by role/status/account
   - Export to CSV capability for administrative reporting
   - User selection with checkboxes for bulk operations

2. **Mass Email Communication Tool**
   - Dedicated tab for sending emails to selected user groups
   - Target options: All Users, Admin Only, Selected Users, Specific Account
   - Rich text composition with dynamic field support
   - Available dynamic fields: {{firstName}}, {{lastName}}, {{email}}, {{accountName}}, {{role}}
   - Schedule send functionality with date/time picker
   - Quick templates: Maintenance Notice, Feature Announcement, System Update, Account Reminder
   - Delivery analytics: sent count, delivery rate, open rate tracking
   - Preview functionality before sending

3. **System Alerts & Pop-up Management**
   - Create and schedule system-wide pop-up messages for users
   - Targeting options: All Users, Admin Only, Specific Account, Specific Role
   - Alert severity levels: Info (Blue), Warning (Yellow), Critical (Red), Success (Green)
   - Time-based scheduling with start/end times
   - Optional acknowledgment requirement before proceeding
   - "Show once per session" toggle for user experience control
   - Action buttons with custom text and URLs
   - Active alerts management with edit/delete capabilities
   - Sample alerts: Maintenance notices, feature announcements, system updates

#### Super Admin Features:
1. **Organizations Management**
   - View all client organizations using Nestive platform
   - Organization details: admin contacts, plans, status, usage metrics
   - Admin actions: login-as functionality, suspend/activate accounts
   - Export capabilities for platform analytics

2. **Revenue Dashboard**
   - Platform-wide revenue tracking (MRR/ARR, churn, ARPU)
   - Plan distribution analytics and payment method insights
   - Revenue performance metrics for business intelligence

3. **Feature Flags & Beta Management**
   - Global feature toggle management across all organizations
   - Beta feature rollout controls and organization-specific settings
   - Feature adoption tracking and usage analytics

4. **System Monitoring**
   - Real-time platform performance metrics (CPU, memory, disk)
   - Error tracking and alert management
   - API performance monitoring and database health

5. **Platform Messaging**
   - Broadcast announcement system for all organizations
   - Maintenance notices, feature updates, security alerts
   - Multi-channel delivery (email, in-app banners)

6. **Platform Configuration**
   - Global platform settings and defaults
   - API rate limiting and security configurations

7. **Compliance & Security**
   - Platform-wide compliance monitoring
   - Security audit logs and certification tracking

#### Access Control
- Internal-only access for Dwellerly platform management team
- Hidden from client accounts and regular admin users
- Discrete footer access to maintain professional client experience
- Complete separation from client account management features

#### Future Tasks To Complete:
1. **Platform Team Authentication**
   - Implement proper login system for Super Admin platform access
   - Add role-based access control for internal Dwellerly team members
   - Secure authentication separate from client account system
   
2. **Account Panel Feature Implementation**
   - Complete custom fields configuration functionality
   - Build email template editor with WYSIWYG capabilities
   - Implement task template manager with property assignment
   - Add notification settings with multi-channel delivery
   - Build team roles & permissions management interface
   - Create audit log export functionality
   
3. **Phase 2 Features**
   - Report templates with PDF/web generation
   - Automation rules with IF/THEN workflow creation
   - Advanced analytics and business intelligence dashboards

### July 23, 2025 - Admin Panel and Account Settings Implementation

#### Admin Panel Access
- Added "Admin Panel" option to user dropdown menu for admin and manager roles
- Admin panel accessible via dropdown menu instead of top navigation
- Role-based access control ensures only authorized users can access admin features
- Admin panel displays appropriate role badge (Admin vs Manager access)
- Removed gear icon from dropdown menu option as requested

#### Account Settings - Business Owner Control Center
- Redesigned Account panel as business owner control center
- Only accessible to users with "admin" role for their own company
- Comprehensive account management for individual organizations

#### Account Panel Features Implemented:
1. **Account Information**
   - Company name, logo, address, and contact information
   - Business phone, email, billing contact management
   - Editable fields with save functionality
   - Professional company profile management

2. **Subscription & Billing**
   - Current plan information and status display
   - Payment method management and updates
   - Billing history with invoice downloads
   - Plan upgrade/downgrade options
   - Subscription cancellation with confirmation

3. **Custom Fields Configuration**
   - Create, edit, and remove custom fields for properties, people, tasks
   - Field type selection (text, dropdown, checkbox, etc.)
   - Required/optional field settings
   - Cross-module field usage tracking

4. **Email Template Editor**
   - Welcome email templates for new users
   - Task notification templates
   - Reminder and alert templates
   - WYSIWYG editor with variable insertion ({{firstName}}, {{propertyName}})
   - Template categorization and management

5. **Task Template Manager**
   - Create and manage reusable task sets
   - Templates like "Weekly Inspection Checklist", "Monthly Maintenance Review"
   - Apply templates to properties or assign to team members
   - Template usage analytics

6. **Report Templates**
   - Custom report configuration (Phase 2 feature)
   - PDF and web report generation
   - Data source selection from properties, tasks, people
   - Scheduled report delivery

7. **Notification Settings**
   - Multi-channel notification preferences (SMS, email, in-app)
   - Category-based notification controls
   - Delivery method selection per notification type
   - Team-wide notification management

8. **Team Roles & Permissions**
   - Role-based access control (Field Staff, Supervisor, Admin)
   - Permission matrix management
   - Custom role creation and modification
   - User assignment and override capabilities

9. **Automation Rules**
   - IF/THEN automation workflow creation (Phase 2 feature)
   - Task automation based on conditions
   - Email triggers and notifications
   - Workflow optimization tools

10. **Audit Log**
    - Complete system activity tracking
    - User action logging with timestamps
    - Export capabilities for compliance
    - Read-only security event monitoring

#### Navigation Updates
- Removed Admin tab from main navigation bar
- Admin access now through user dropdown menu for cleaner navigation
- Role-based menu items displayed appropriately
- Account button only visible to admin users
- Updated Account interface with 7-tab layout: Organizations, Revenue, Feature Flags, Monitoring, Messaging, Platform, Compliance

#### Security Enhancements
- Enhanced role-based access control for admin features
- Proper authentication checks for both admin and account pages
- Unauthorized access redirects with appropriate error messages
- Role verification on both frontend and backend levels
- Multi-organization security and access controls

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

## Recent Updates

### July 30, 2025 - Application Rebranding from Nestive to Dwellerly
- Updated application name from "Nestive" to "Dwellerly" throughout entire codebase
- Changed Super Admin route from `/nestive-admin` to `/dwellerly-admin`
- Updated branding in Navigation, Landing page, embedded forms, and all user-facing text
- Changed team member email addresses to @dwellerly.com domain
- Updated documentation and comments to reflect new company name
- Platform will be hosted on dwellerlyonline.com domain with "Dwellerly" branding

Changelog:
- June 30, 2025. Initial setup and comprehensive feature implementation