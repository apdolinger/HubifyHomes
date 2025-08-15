# Client Portal Rename - Smoke Test Checklist

This checklist verifies that the Property Centers → Client Portal navigation restructuring is working correctly across all functionality.

## Navigation & UI Tests

- [ ] **Admin Navigation**: Admin sidebar shows "Client Portal" and links to `/admin/client-portal` routes
- [ ] **URL Redirects**: Visiting `/property-centers/:id` redirects (308) to `/admin/client-portal/:id`
- [ ] **Legacy Route Redirects**: Old `/property-center` routes redirect to `/admin/client-portal`
- [ ] **UI Copy Consistency**: All references use "Client Portal" terminology (page headers, buttons, descriptions)
- [ ] **Mobile Navigation**: Admin section includes Client Portal access

## API Endpoint Tests

### New Admin API Endpoints
- [ ] **Draft Save**: `PUT /api/admin/client-portal/:id/config` works
- [ ] **Preview Draft**: `GET /api/admin/client-portal/:id/preview?version=draft` works  
- [ ] **Preview Published**: `GET /api/admin/client-portal/:id/preview?version=published` works
- [ ] **Publish Settings**: `POST /api/admin/client-portal/:id/publish` works
- [ ] **Forms Library**: `GET/POST/PATCH /api/admin/forms` works
- [ ] **Assign Forms**: `GET/POST/DELETE /api/admin/client-portal/:id/forms` works

### Legacy API Redirects
- [ ] **Property Centers API**: Old `/api/property-centers/*` paths 308-redirect to new `/api/admin/client-portal/*`
- [ ] **Settings Endpoints**: Legacy settings endpoints redirect properly
- [ ] **Forms Assignment**: Old forms assignment endpoints redirect correctly

## Public Endpoints (Unchanged)
- [ ] **Portal Config**: `GET /api/portals/:propertyId/config` still works (no changes)
- [ ] **Client Portal Routes**: `/p/:propertySlug` still works (no changes)
- [ ] **Custom Domains**: Host → org mapping continues to work
- [ ] **Published Portals**: Public-facing portals render correctly using existing config

## Functional Tests

### Settings Management
- [ ] **Branding Tab**: Logo, colors, fonts configuration works
- [ ] **Layout Tab**: Header, footer, sidebar settings work
- [ ] **Modules Tab**: Feature toggles work correctly
- [ ] **Content Tab**: Welcome message, contact info work
- [ ] **Legal Tab**: Terms, privacy policy work
- [ ] **Auth Tab**: Authentication options work

### Forms & Assignments
- [ ] **Create Forms**: Staff can create forms in organization
- [ ] **Assign to Properties**: Forms can be assigned to specific properties
- [ ] **Client Submissions**: Clients can submit forms via public portal
- [ ] **Status Management**: Staff can review and update submission status

### Draft/Publish Workflow
- [ ] **Save as Draft**: Changes save without affecting live portal
- [ ] **Preview Draft**: Can preview unpublished changes
- [ ] **Publish Changes**: Draft settings become live when published
- [ ] **Version Management**: Published version tracking works

## Error Handling
- [ ] **Authentication**: Unauthorized access properly redirected
- [ ] **Validation**: Form validation works on all settings
- [ ] **Toast Messages**: Success/error messages use "client portal" terminology
- [ ] **Loading States**: All loading states display "client portal" text

## Cross-Browser Testing
- [ ] **Desktop Chrome**: All functionality works
- [ ] **Desktop Safari**: All functionality works  
- [ ] **Mobile Chrome**: Navigation and forms work
- [ ] **Mobile Safari**: Navigation and forms work

---

**Testing Notes:**
- Test with different organization tiers (Starter, Pro, Grow, Enterprise) to verify tier-based restrictions
- Verify that existing data and configurations are preserved after the rename
- Ensure backward compatibility with any bookmarked URLs or API integrations
- Test the complete workflow from admin settings to client-facing portal