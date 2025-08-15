/**
 * Centralized route definitions for type safety and easy maintenance
 * Update routes here for application-wide changes
 */

export const routes = {
  // Admin Client Portal Routes
  adminClientPortal: (propertyId?: string) => 
    propertyId ? `/admin/client-portal/${propertyId}` : '/admin/client-portal',
  
  adminClientPortalSettings: (propertyId: string) => 
    `/admin/client-portal/${propertyId}`,
  
  adminClientPortalBranding: (propertyId: string) => 
    `/admin/client-portal/${propertyId}/branding`,
  
  adminClientPortalNav: (propertyId: string) => 
    `/admin/client-portal/${propertyId}/nav`,
  
  adminClientPortalPages: (propertyId: string) => 
    `/admin/client-portal/${propertyId}/pages`,
  
  adminClientPortalForms: (propertyId: string) => 
    `/admin/client-portal/${propertyId}/forms`,
  
  adminClientPortalPreview: (propertyId: string) => 
    `/admin/client-portal/${propertyId}/preview`,

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

  // Public Portal Routes (unchanged)
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