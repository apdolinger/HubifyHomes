# Dwellerly - Property Management Platform

## Overview
Dwellerly is a professional property management platform for home watch and HOA companies. It offers a comprehensive solution for managing properties, tasks, team collaboration, and client relationships through a modern web interface. The platform aims to streamline property operations, enhance team efficiency, and improve client communication.

**Production Domain**: BASE_DOMAIN=hubifyhomes.app

## Recent Changes (August 2025)
- **Photo Upload System**: Implemented complete file upload functionality using multer middleware, server-side storage, and proper file serving
- **Property Interface Cleanup**: Removed property-level Supplies tab since supplies are managed per room (4 tabs: Tasks, Contacts, Rooms, Notes)
- **7-Tab Room Management**: Full room management system with Supplies, Devices, Notes, Surfaces, Fixtures, Photos, and History tabs
- **Database Schema**: Fixed missing room_devices table and updated photo schema to match file upload requirements
- **Advanced Duplicate Detection System**: Implemented comprehensive backend duplicate detection with sophisticated matching algorithms using Levenshtein distance, configurable scan parameters, confidence levels (Very High 95%+, High 85%+, Medium 70%+), real-time scanning, and support for both contacts and properties
- **Smart Merge Logic**: Created intelligent merge system that preserves primary record data while filling missing fields from duplicates, with detailed merge preview
- **Edit Contact Functionality**: Fixed edit buttons in PersonProfile page with complete modal form and validation
- **Backend Duplicate Detection**: Added `/api/duplicates/scan` and `/api/duplicates` endpoints with advanced matching criteria for names, emails, phones, and addresses

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

### Key Features
- **Authentication System**: Replit Auth with OIDC, PostgreSQL-backed sessions, role-based access control (admin, supervisor, staff, client), route-level authentication guards.
- **Property Management**: Support for various property types, multi-unit management, manager assignment, and status tracking.
- **Task Management System**: Priority levels, status tracking, task assignment with audit trail, property association, and due date management.
- **Team Collaboration**: Hierarchical user roles with permissions, built-in communication, comprehensive activity logging, and real-time dashboard updates.
- **Contact Management**: Management of tenants, owners, vendors, emergency contacts, property association, and communication tracking.
- **Forms Management System**: Comprehensive forms creation and management, including form configuration, templates, and submission handling with flexible JSONB storage.
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