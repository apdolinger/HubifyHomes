/**
 * Centralized route definitions for type safety and easy maintenance
 * Update routes here for application-wide changes
 * 
 * MIGRATION NOTE:
 * - "Hubify Console" = Admin back-end (formerly PropertyCenter/ClientCenter admin)
 * - "Hubify Portal" = User-facing front-end (formerly ClientCenter public)
 */

export const routes = {
  // Hubify Console Routes (Admin Back-End)
  hubifyConsole: (propertyId?: string) => 
    propertyId ? `/hubify-console/${propertyId}` : '/hubify-console',
  
  hubifyConsoleSettings: (propertyId: string) => 
    `/hubify-console/${propertyId}`,
  
  hubifyConsoleBranding: (propertyId: string) => 
    `/hubify-console/${propertyId}/branding`,
  
  hubifyConsoleNav: (propertyId: string) => 
    `/hubify-console/${propertyId}/nav`,
  
  hubifyConsolePages: (propertyId: string) => 
    `/hubify-console/${propertyId}/pages`,
  
  hubifyConsoleForms: (propertyId: string) => 
    `/hubify-console/${propertyId}/forms`,
  
  hubifyConsolePreview: (propertyId: string) => 
    `/hubify-console/${propertyId}/preview`,
  
  // Backward compatibility aliases
  adminClientPortal: (propertyId?: string) => 
    propertyId ? `/hubify-console/${propertyId}` : '/hubify-console',
  
  adminClientPortalSettings: (propertyId: string) => 
    `/hubify-console/${propertyId}`,
  
  adminClientPortalBranding: (propertyId: string) => 
    `/hubify-console/${propertyId}/branding`,
  
  adminClientPortalNav: (propertyId: string) => 
    `/hubify-console/${propertyId}/nav`,
  
  adminClientPortalPages: (propertyId: string) => 
    `/hubify-console/${propertyId}/pages`,
  
  adminClientPortalForms: (propertyId: string) => 
    `/hubify-console/${propertyId}/forms`,
  
  adminClientPortalPreview: (propertyId: string) => 
    `/hubify-console/${propertyId}/preview`,

  // API Routes
  api: {
    adminClientPortal: (orgId: string, propertyId?: string) => 
      propertyId 
        ? `/api/admin/client-portal/${orgId}/${propertyId}/settings`
        : `/api/admin/client-portal/${orgId}`,
    
    adminClientPortalPublish: (orgId: string, propertyId: string) => 
      `/api/admin/client-portal/${orgId}/${propertyId}/settings/publish`,
    
    adminClientPortalForms: (orgId: string, propertyId: string) => 
      `/api/admin/client-portal/${orgId}/${propertyId}/forms`,
    
    adminBranding: (orgId: string) => 
      `/api/orgs/${orgId}/branding`,
  },

  // Hubify Portal Routes (User-Facing Front-End)
  hubifyPortal: (propertySlug: string) => `/p/${propertySlug}`,
  hubifyPortalConfig: (propertyId: string) => `/api/portals/${propertyId}/config`,
  
  // Backward compatibility
  publicPortal: (propertySlug: string) => `/p/${propertySlug}`,
  publicPortalConfig: (propertyId: string) => `/api/portals/${propertyId}/config`,

  // Legacy redirects (for reference)
  legacy: {
    propertyCenter: '/property-center',
    propertyCenterSettings: (propertyId: string) => `/properties/${propertyId}/portal-settings`,
    apiPropertyCenters: '/api/property-centers',
  }
} as const;

// Type helpers for route parameters
export type RouteParams = {
  propertyId: string;
  orgId: string;
  propertySlug: string;
};