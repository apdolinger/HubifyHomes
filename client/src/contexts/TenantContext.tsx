import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

export interface TenantInfo {
  isPublicDomain: boolean;
  subdomain: string | null;
  found: boolean;
  orgId: string | null;
  name: string | null;
  orgStatus: string | null;
}

const DEFAULT_TENANT: TenantInfo = {
  isPublicDomain: true,
  subdomain: null,
  found: false,
  orgId: null,
  name: null,
  orgStatus: null,
};

const TenantContext = createContext<{
  tenant: TenantInfo;
  isLoading: boolean;
}>({ tenant: DEFAULT_TENANT, isLoading: true });

export function TenantProvider({ children }: { children: ReactNode }) {
  const { data: tenant, isLoading } = useQuery<TenantInfo>({
    queryKey: ["/api/tenant"],
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return (
    <TenantContext.Provider value={{ tenant: tenant ?? DEFAULT_TENANT, isLoading }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
