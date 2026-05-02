import { useQuery } from "@tanstack/react-query";

/**
 * Returns the effective feature flag map for the currently authenticated user's
 * organization. Each entry resolves to true/false. Unknown keys default to
 * `false` from `isFeatureEnabled`.
 */
export function useFeatureFlags() {
  const { data, isLoading } = useQuery<Record<string, boolean>>({
    queryKey: ["/api/feature-flags/me"],
  });
  return {
    flags: data ?? {},
    isLoading,
    isFeatureEnabled: (key: string): boolean => data?.[key] === true,
  };
}
