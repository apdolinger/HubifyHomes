import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { usePortalAuth } from '@/contexts/PortalAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Loader2 } from 'lucide-react';
import LegalLinks from '@/components/LegalLinks';
import { HUBIFY_HOMES_LOGO_URL, HUBIFY_HOMES_LOGO_ALT } from '@/lib/brand';
import { useTenant } from '@/contexts/TenantContext';

export default function PortalRegister() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1]);
  const tokenFromUrl = searchParams.get('token') || '';

  const [inviteToken, setInviteToken] = useState(tokenFromUrl);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [welcomeOrgName, setWelcomeOrgName] = useState<string | null>(null);
  const { register } = usePortalAuth();
  const { toast } = useToast();
  const { tenant } = useTenant();

  const isBranded = !tenant.isPublicDomain && tenant.found;
  const logoSrc = isBranded && tenant.logoUrl ? tenant.logoUrl : HUBIFY_HOMES_LOGO_URL;
  const logoAlt = isBranded && tenant.name ? tenant.name : HUBIFY_HOMES_LOGO_ALT;
  const portalTitle = isBranded && tenant.name ? `${tenant.name} Portal` : 'Hubify Portal';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: 'Password mismatch',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { orgName } = await register(inviteToken, email, password, firstName, lastName);
      setWelcomeOrgName(orgName);
      // Redirect to portal after brief welcome screen
      setTimeout(() => {
        setLocation('/portal');
      }, 2500);
    } catch (error: any) {
      toast({
        title: 'Registration failed',
        description: error.message || 'Could not create account',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  if (welcomeOrgName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md text-center" data-testid="welcome-card">
          <CardContent className="pt-10 pb-10 space-y-5">
            <div className="flex justify-center">
              <img src={logoSrc} alt={logoAlt} className="h-14 w-auto" />
            </div>
            <div className="flex justify-center">
              <CheckCircle2 className="w-16 h-16 text-teal-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Welcome!</h2>
              <p className="text-lg text-slate-600">
                You've been added to the{' '}
                <span className="font-semibold text-teal-700">{welcomeOrgName}</span>{' '}
                Client Portal.
              </p>
              <p className="text-sm text-slate-500 mt-3">Taking you to your portal now…</p>
            </div>
            <Loader2 className="w-5 h-5 animate-spin text-teal-500 mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <img src={logoSrc} alt={logoAlt} className="h-14 w-auto" />
          </div>
          <CardTitle className="text-2xl font-bold">Create {portalTitle} Account</CardTitle>
          <CardDescription>Register with your invitation</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!tokenFromUrl && (
              <div className="space-y-2">
                <Label htmlFor="inviteToken">Invitation Token</Label>
                <Input
                  id="inviteToken"
                  type="text"
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value)}
                  placeholder="Enter your invitation token"
                  required
                  data-testid="input-invite-token"
                />
              </div>
            )}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  data-testid="input-first-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  data-testid="input-last-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                required
                data-testid="input-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                data-testid="input-confirm-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-register">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account…
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link href="/portal/login" className="text-primary hover:underline" data-testid="link-login">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
      <LegalLinks className="mt-6" />
    </div>
  );
}
