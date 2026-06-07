---
name: Dashboard nav routing
description: Why "/" must NOT be in isPublicOrTokenRoute in AuthWrapper — it hides the nav bar on the dashboard.
---

## Rule
Never add `location === "/"` to `isPublicOrTokenRoute` in `AuthWrapper` (App.tsx).

**Why:** `isPublicOrTokenRoute` causes `AuthWrapper` to render `<Router />` directly instead of `<AuthenticatedApp />`. `<AuthenticatedApp />` is the only component that wraps `<Navigation />`. So any route in `isPublicOrTokenRoute` will render **without the top navigation bar**. The dashboard lives at `"/"`, so putting `"/"` in that list removes the nav bar for all authenticated users on the dashboard.

**How to apply:** The super-admin redirect for `"/"` is already handled by the `shouldRedirectSuperAdmin` guard (early-return spinner + `navigate("/super-admin")`). No need to put `"/"` in `isPublicOrTokenRoute` for that reason. Only add routes to `isPublicOrTokenRoute` if they are genuinely public/token-based (URL tokens, portal, onboarding, staff login, etc.).
