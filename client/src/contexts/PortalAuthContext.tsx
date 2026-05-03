import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { queryClient } from '@/lib/queryClient';

interface PortalUser {
  id: string;
  orgId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'staff' | 'vendor';
  profileImageUrl: string | null;
}

interface PortalAuthContextType {
  user: PortalUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (inviteToken: string, email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const PortalAuthContext = createContext<PortalAuthContextType | undefined>(undefined);

export function PortalAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PortalUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('portal_token'));
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/portal/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        localStorage.removeItem('portal_token');
        setToken(null);
      }
    } catch (error) {
      console.error('Error fetching portal user:', error);
      localStorage.removeItem('portal_token');
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/portal/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    localStorage.setItem('portal_token', data.token);
    setToken(data.token);
    setUser(data.user);
    setLocation('/portal');
  };

  const register = async (inviteToken: string, email: string, password: string, firstName?: string, lastName?: string) => {
    const response = await fetch('/api/portal/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteToken, email, password, firstName, lastName }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    const data = await response.json();
    localStorage.setItem('portal_token', data.token);
    setToken(data.token);
    setUser(data.user);
    setLocation('/portal');
  };

  const logout = async () => {
    try {
      await fetch('/api/portal/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      localStorage.removeItem('portal_token');
      setToken(null);
      setUser(null);
      queryClient.removeQueries({
        predicate: (q) => {
          const k = q.queryKey?.[0];
          return typeof k === 'string' && k.startsWith('/api/portal');
        },
      });
      setLocation('/portal/login');
    }
  };

  return (
    <PortalAuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>
      {children}
    </PortalAuthContext.Provider>
  );
}

export function usePortalAuth() {
  const context = useContext(PortalAuthContext);
  if (context === undefined) {
    throw new Error('usePortalAuth must be used within a PortalAuthProvider');
  }
  return context;
}
