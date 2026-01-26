import { useAuthContext } from '~/hooks/AuthContext';
import { usePendo } from './usePendo';

interface PendoInitializerProps {
  /** Optional account ID for organization-level tracking */
  accountId?: string;
  /** Optional account name for display in Pendo */
  accountName?: string;
  /** Child components to render */
  children?: React.ReactNode;
}

/**
 * Component that initializes Pendo analytics for the authenticated user.
 *
 * This component should be placed inside the AuthContextProvider to have
 * access to user authentication state. It automatically initializes Pendo
 * when the user is authenticated and clears the session on logout.
 *
 * @example
 * ```tsx
 * // Basic usage - place inside AuthContextProvider
 * <AuthContextProvider>
 *   <PendoInitializer>
 *     <App />
 *   </PendoInitializer>
 * </AuthContextProvider>
 *
 * // With account tracking
 * <PendoInitializer accountId="org_123" accountName="Acme Corp">
 *   <App />
 * </PendoInitializer>
 * ```
 */
export function PendoInitializer({
  accountId,
  accountName,
  children,
}: PendoInitializerProps): React.ReactElement {
  const { isAuthenticated, user } = useAuthContext();

  // Initialize Pendo - the hook handles all the logic
  usePendo({
    isAuthenticated,
    user,
    accountId,
    accountName,
  });

  return <>{children}</>;
}

export default PendoInitializer;
