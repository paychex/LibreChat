import { useEffect, useCallback, useRef } from 'react';
import type { TUser } from 'librechat-data-provider';

/** Pendo Public API Key */
const PENDO_API_KEY = 'efb1128b-760d-4ff7-7726-b5aef752cd38'; // NOTE - this is a public key from https://github.com/paychex/LibreChat/commit/327cc4d66eebdd19afa1e5939d6fc8c56799af06

/** Interval to check if pendo is ready (ms) */
const PENDO_READY_CHECK_INTERVAL = 100;

/** Maximum time to wait for pendo to be ready (ms) */
const PENDO_READY_TIMEOUT = 10000;

/**
 * Pendo visitor metadata interface
 */
interface PendoVisitorMetadata {
  /** Unique identifier for the visitor (usually user ID) */
  id: string;
  /** Visitor's email address */
  email?: string;
  /** Full name of the visitor */
  full_name?: string;
  /** Visitor's role in the application */
  role?: string;
  /** When the visitor was created (ISO 8601 format or Unix timestamp) */
  createdAt?: string | number;
  /** Custom metadata fields */
  [key: string]: string | number | boolean | undefined;
}

/**
 * Pendo account metadata interface
 */
interface PendoAccountMetadata {
  /** Unique identifier for the account (organization/company ID) */
  id: string;
  /** Name of the account/organization */
  name?: string;
  /** Account plan or tier */
  planLevel?: string;
  /** When the account was created */
  createdAt?: string | number;
  /** Custom metadata fields */
  [key: string]: string | number | boolean | undefined;
}

/**
 * Pendo initialization options
 */
interface PendoInitializeOptions {
  /** Visitor metadata for the current user */
  visitor: PendoVisitorMetadata;
  /** Account metadata for the current user's organization */
  account?: PendoAccountMetadata;
  /** Disable automatic page load tracking */
  disableAutoPageLoad?: boolean;
  /** Disable all guides */
  disableGuides?: boolean;
  /** Disable global CSS styles */
  disableGlobalCSS?: boolean;
}

interface UsePendoOptions {
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** User data from auth context */
  user: TUser | undefined;
  /** Optional account ID for organization tracking */
  accountId?: string;
  /** Optional account name */
  accountName?: string;
}

interface UsePendoReturn {
  /** Track a custom event in Pendo */
  trackEvent: (eventName: string, properties?: Record<string, string | number | boolean>) => void;
  /** Check if Pendo is initialized and ready */
  isReady: () => boolean;
}

/**
 * Injects the Pendo analytics script into the document head.
 * This follows Pendo's recommended installation pattern.
 */
function injectPendoScript(apiKey: string): void {
  // Prevent duplicate injection
  if (document.getElementById('pendo-script')) {
    return;
  }

  // Initialize pendo queue
  const pendoObj = (window as any).pendo || {};
  (window as any).pendo = pendoObj;
  pendoObj._q = pendoObj._q || [];

  // Queue methods for lazy initialization
  const methods = ['initialize', 'identify', 'updateOptions', 'pageLoad', 'track'];
  for (let i = 0; i < methods.length; i++) {
    const method = methods[i];
    if (!pendoObj[method]) {
      pendoObj[method] = function (...args: any[]) {
        pendoObj._q[method === 'initialize' ? 'unshift' : 'push']([method, ...args]);
      };
    }
  }

  // Create and inject the script
  const script = document.createElement('script');
  script.id = 'pendo-script';
  script.async = true;
  script.src = `https://cdn.pendo.io/agent/static/${apiKey}/pendo.js`;

  const firstScript = document.getElementsByTagName('script')[0];
  firstScript.parentNode?.insertBefore(script, firstScript);
}

/**
 * Waits for Pendo to be ready.
 */
function waitForPendo(timeout = PENDO_READY_TIMEOUT): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const checkPendo = () => {
      if (window.pendo?.isReady?.()) {
        resolve(true);
        return;
      }

      if (Date.now() - startTime > timeout) {
        console.warn('[Pendo] Initialization timeout');
        resolve(false);
        return;
      }

      setTimeout(checkPendo, PENDO_READY_CHECK_INTERVAL);
    };

    checkPendo();
  });
}

/**
 * Custom hook for Pendo analytics integration.
 *
 * Initializes Pendo when user authenticates and provides methods
 * for tracking custom events.
 *
 * @example
 * ```tsx
 * const { trackEvent, isReady } = usePendo({
 *   isAuthenticated,
 *   user,
 *   accountId: 'org_123',
 *   accountName: 'Acme Corp'
 * });
 *
 * // Track a custom event
 * trackEvent('feature_used', { feature: 'chat', model: 'gpt-4' });
 * ```
 */
export function usePendo({
  isAuthenticated,
  user,
  accountId,
  accountName,
}: UsePendoOptions): UsePendoReturn {
  const isInitializedRef = useRef(false);
  const previousUserIdRef = useRef<string | undefined>(undefined);

  /**
   * Check if Pendo is ready for use.
   */
  const isReady = useCallback((): boolean => {
    return window.pendo?.isReady?.() ?? false;
  }, []);

  /**
   * Track a custom event in Pendo.
   */
  const trackEvent = useCallback(
    (eventName: string, properties?: Record<string, string | number | boolean>): void => {
      if (!window.pendo) {
        console.warn('[Pendo] Cannot track event: Pendo not loaded');
        return;
      }

      try {
        window.pendo.track(eventName, properties);
      } catch (error) {
        console.error('[Pendo] Error tracking event:', error);
      }
    },
    [],
  );

  // Inject Pendo script on mount
  useEffect(() => {
    if (!PENDO_API_KEY || PENDO_API_KEY === 'PENDO_API_KEY') {
      console.warn('[Pendo] API key not configured. Pendo will not be initialized.');
      return;
    }

    injectPendoScript(PENDO_API_KEY);
  }, []);

  // Initialize or update Pendo when authentication state changes
  useEffect(() => {
    // Skip if API key not configured
    if (!PENDO_API_KEY || PENDO_API_KEY === 'PENDO_API_KEY') {
      return;
    }

    // Clear session on logout
    if (!isAuthenticated) {
      if (isInitializedRef.current && window.pendo?.clearSession) {
        try {
          window.pendo.clearSession();
        } catch (error) {
          console.error('[Pendo] Error clearing session:', error);
        }
      }
      isInitializedRef.current = false;
      previousUserIdRef.current = undefined;
      return;
    }

    // Skip if no user data
    if (!user?.id) {
      return;
    }

    // Skip if already initialized for this user
    if (isInitializedRef.current && previousUserIdRef.current === user.id) {
      return;
    }

    const initializePendo = async () => {
      // Wait for pendo object to be available
      if (!window.pendo) {
        await waitForPendo();
      }

      if (!window.pendo) {
        console.error('[Pendo] Failed to load Pendo SDK');
        return;
      }

      try {
        const visitorData: PendoVisitorMetadata = {
          id: user.id,
          email: user.email || undefined,
          full_name: user.name || undefined,
          role: user.role || undefined,
          createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : undefined,
        };

        const accountData: PendoAccountMetadata | undefined = accountId
          ? {
              id: accountId,
              name: accountName,
            }
          : undefined;

        const initOptions: PendoInitializeOptions = {
          visitor: visitorData,
          ...(accountData && { account: accountData }),
        };

        // Use identify if already initialized, otherwise initialize
        if (isInitializedRef.current) {
          window.pendo.identify(initOptions);
        } else {
          window.pendo.initialize(initOptions);
          isInitializedRef.current = true;
        }

        previousUserIdRef.current = user.id;
      } catch (error) {
        console.error('[Pendo] Error initializing:', error);
      }
    };

    initializePendo();
  }, [isAuthenticated, user, accountId, accountName]);

  return {
    trackEvent,
    isReady,
  };
}

export default usePendo;
