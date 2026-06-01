import { useState } from 'react';
import { Link } from 'wouter';
import { usePortalAuth } from '@/contexts/PortalAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import LegalLinks from '@/components/LegalLinks';
import { HUBIFY_HOMES_LOGO_URL, HUBIFY_HOMES_LOGO_ALT } from '@/lib/brand';
import { useTenant } from '@/contexts/TenantContext';

export default function PortalLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = usePortalAuth();
  const { toast } = useToast();
  const { tenant } = useTenant();

  const isBranded = !tenant.isPublicDomain && tenant.found;
  const logoSrc = isBranded && tenant.logoUrl ? tenant.logoUrl : HUBIFY_HOMES_LOGO_URL;
  const logoAlt = isBranded && tenant.name ? tenant.name : HUBIFY_HOMES_LOGO_ALT;
  const portalTitle = isBranded && tenant.name ? `${tenant.name} Portal` : 'Hubify Portal';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      toast({
        title: 'Login successful',
        description: 'Welcome to Hubify Portal',
      });
    } catch (error: any) {
      toast({
        title: 'Login failed',
        description: error.message || 'Invalid credentials',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <img src={logoSrc} alt={logoAlt} className="h-16 w-auto" />
          </div>
          <CardDescription>Sign in to access your property portal</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Password</Label>
                <Link href="/portal/forgot-password" className="text-xs text-primary hover:underline" data-testid="link-forgot-password">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                data-testid="input-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-login">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Have an invitation? </span>
            <Link href="/portal/register" className="text-primary hover:underline" data-testid="link-register">
              Create account
            </Link>
          </div>
        </CardContent>
      </Card>
      <LegalLinks className="mt-6" />
    </div>
  );
}
