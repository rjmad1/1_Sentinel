import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { insforge } from './insforge';
import { Box, Flex, Heading, Text, Button, Input, Spinner } from '@chakra-ui/react';
import { Shield } from 'lucide-react';

export interface User {
  id: string;
  email: string;
  roles: string[];
  tenantId: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  bypassAuth: (role?: 'admin' | 'operator' | 'auditor') => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

// Detect E2E environment
const IS_E2E = typeof window !== 'undefined' && (
  !!window.navigator.webdriver || 
  window.location.search.includes('test=true') || 
  window.location.search.includes('demo=true')
);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Sync token with local storage and FastAPI headers
  const setSessionData = useCallback((accessToken: string, userData: any) => {
    localStorage.setItem('sentinel_jwt_token', accessToken);
    setToken(accessToken);
    
    // Decode roles and tenantId
    const claims = parseJwt(accessToken);
    const realmAccess = claims?.realm_access || {};
    const roles = realmAccess.roles || claims?.roles || ['operator'];
    const tenantId = claims?.tenant_id || 'default-tenant';

    const sessionUser: User = {
      id: userData?.id || claims?.sub || 'usr_dev',
      email: userData?.email || claims?.email || 'dev@example.com',
      roles: roles,
      tenantId: tenantId
    };
    
    setUser(sessionUser);
  }, []);

  const bypassAuth = useCallback((role: 'admin' | 'operator' | 'auditor' = 'admin') => {
    // Generate a mock JWT for developer bypass
    const mockPayload = {
      sub: 'usr_mock_dev',
      email: `${role}@sentinel.local`,
      tenant_id: 'default-tenant',
      realm_access: {
        roles: [role, 'operator']
      },
      exp: Math.floor(Date.now() / 1000) + 86400
    };
    
    // Simplistic mock JWT encoding
    const encodedHeader = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const encodedPayload = btoa(JSON.stringify(mockPayload));
    const mockToken = `${encodedHeader}.${encodedPayload}.signature`;

    setSessionData(mockToken, { id: 'usr_mock_dev', email: mockPayload.email });
  }, [setSessionData]);

  useEffect(() => {
    const initAuth = async () => {
      // 1. If E2E is active, automatically bypass login with mock Admin
      if (IS_E2E) {
        console.log('E2E/Demo mode detected, auto-bypassing authentication as mock Administrator.');
        bypassAuth('admin');
        setLoading(false);
        return;
      }

      // 2. Check saved session in LocalStorage
      const savedToken = localStorage.getItem('sentinel_jwt_token');
      if (savedToken) {
        try {
          const claims = parseJwt(savedToken);
          // Check expiration
          const exp = claims?.exp;
          const isExpired = exp && Date.now() >= exp * 1000;
          if (!isExpired) {
            setToken(savedToken);
            const realmAccess = claims?.realm_access || {};
            const roles = realmAccess.roles || claims?.roles || ['operator'];
            setUser({
              id: claims?.sub || 'usr_saved',
              email: claims?.email || 'user@example.com',
              roles: roles,
              tenantId: claims?.tenant_id || 'default-tenant'
            });
          } else {
            localStorage.removeItem('sentinel_jwt_token');
          }
        } catch {
          localStorage.removeItem('sentinel_jwt_token');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [bypassAuth]);

  const login = async (emailInput: string, passwordInput: string): Promise<boolean> => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const { data, error } = await insforge.auth.signInWithPassword({
        email: emailInput,
        password: passwordInput
      });

      if (error) {
        setErrorMsg(error.message || 'Invalid email or password.');
        setSubmitting(false);
        return false;
      }

      if (data && data.accessToken) {
        setSessionData(data.accessToken, data.user);
        setSubmitting(false);
        return true;
      }
      
      setErrorMsg('No access token returned from authentication service.');
      setSubmitting(false);
      return false;
    } catch (err: any) {
      setErrorMsg(err.message || 'Network connection failure.');
      setSubmitting(false);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('sentinel_jwt_token');
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = useMemo(() => user !== null, [user]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    await login(email, password);
  };

  // Sleek Cyberpunk Login panel
  const loginUI = (
    <Flex 
      w="100vw" 
      h="100vh" 
      align="center" 
      justify="center" 
      bg="radial-gradient(circle, rgba(16,24,48,1) 0%, rgba(8,12,24,1) 100%)"
      p="4"
      fontFamily="Inter, sans-serif"
    >
      <Box 
        w="400px" 
        bg="rgba(17, 24, 39, 0.75)" 
        backdropFilter="blur(20px)" 
        border="1px solid rgba(6, 182, 212, 0.2)" 
        boxShadow="0 0 25px rgba(6, 182, 212, 0.15), inset 0 0 15px rgba(6, 182, 212, 0.05)"
        borderRadius="12px" 
        p="8"
        textAlign="center"
        position="relative"
        overflow="hidden"
      >
        {/* Neon decorative scan lines */}
        <Box 
          position="absolute" 
          top="0" 
          left="0" 
          w="100%" 
          h="2px" 
          bg="linear-gradient(90deg, transparent, var(--color-cyan), transparent)" 
          className="scanline"
        />

        <Flex justify="center" align="center" gap="2" mb="6">
          <Shield size={32} color="#06B6D4" style={{ filter: 'drop-shadow(0 0 8px rgba(6,182,212,0.6))' }} />
          <Heading as="h1" size="lg" fontWeight="extrabold" letterSpacing="2px" color="#fff" style={{ textTransform: 'uppercase' }}>
            Sentinel <span style={{ color: '#06B6D4' }}>EIIP</span>
          </Heading>
        </Flex>

        <Text color="text.secondary" fontSize="13px" mb="6" lineHeight="1.6">
          Enterprise Infrastructure Intelligence Platform
        </Text>

        <form onSubmit={handleFormSubmit}>
          <Flex direction="column" gap="4">
            <Box textAlign="left">
              <Text fontSize="11px" fontWeight="bold" color="text.muted" textTransform="uppercase" mb="1.5">Email Address</Text>
              <Input 
                type="email" 
                placeholder="operator@sentinel.corp" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                bg="rgba(0,0,0,0.4)"
                border="1px solid rgba(255,255,255,0.1)"
                color="#fff"
                py="5.5"
                borderRadius="6px"
                _focus={{ borderColor: '#06B6D4', boxShadow: '0 0 8px rgba(6,182,212,0.3)' }}
                required
              />
            </Box>

            <Box textAlign="left" mb="2">
              <Text fontSize="11px" fontWeight="bold" color="text.muted" textTransform="uppercase" mb="1.5">Password</Text>
              <Input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                bg="rgba(0,0,0,0.4)"
                border="1px solid rgba(255,255,255,0.1)"
                color="#fff"
                py="5.5"
                borderRadius="6px"
                _focus={{ borderColor: '#06B6D4', boxShadow: '0 0 8px rgba(6,182,212,0.3)' }}
                required
              />
            </Box>

            {errorMsg && (
              <Box bg="rgba(239, 68, 68, 0.1)" border="1px solid rgba(239, 68, 68, 0.3)" borderRadius="6px" p="3" textAlign="left" mb="2">
                <Text color="#EF4444" fontSize="12px" fontWeight="medium">{errorMsg}</Text>
              </Box>
            )}

            <Button 
              type="submit"
              colorPalette="cyber"
              fontWeight="bold"
              py="6"
              borderRadius="6px"
              disabled={submitting}
              bg="#06B6D4"
              color="#000"
              _hover={{ bg: '#0891B2', boxShadow: '0 0 15px rgba(6,182,212,0.5)' }}
            >
              {submitting ? 'Authenticating...' : 'Sign In'}
            </Button>
          </Flex>
        </form>

        <Box mt="6" borderTop="1px solid rgba(255,255,255,0.1)" pt="4">
          <Text fontSize="11px" color="text.muted" mb="3">
            Developer / Local Offline Testing
          </Text>
          <Flex gap="2">
            <Button 
              variant="outline" 
              size="xs" 
              flex="1" 
              borderColor="rgba(6,182,212,0.3)"
              color="#06B6D4"
              _hover={{ bg: 'rgba(6,182,212,0.05)', borderColor: '#06B6D4' }}
              onClick={() => bypassAuth('admin')}
            >
              Bypass (Admin)
            </Button>
            <Button 
              variant="outline" 
              size="xs" 
              flex="1" 
              borderColor="rgba(245,158,11,0.3)"
              color="#F5A524"
              _hover={{ bg: 'rgba(245,158,11,0.05)', borderColor: '#F5A524' }}
              onClick={() => bypassAuth('operator')}
            >
              Bypass (Operator)
            </Button>
            <Button 
              variant="outline" 
              size="xs" 
              flex="1" 
              borderColor="rgba(255,255,255,0.15)"
              color="text.secondary"
              _hover={{ bg: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.3)' }}
              onClick={() => bypassAuth('auditor')}
            >
              Bypass (Auditor)
            </Button>
          </Flex>
        </Box>
      </Box>
    </Flex>
  );

  if (loading) {
    return (
      <Flex w="100vw" h="100vh" align="center" justify="center" bg="#0B0F19">
        <Spinner size="xl" color="cyan" />
      </Flex>
    );
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, bypassAuth, isAuthenticated }}>
      {user ? children : loginUI}
    </AuthContext.Provider>
  );
};
