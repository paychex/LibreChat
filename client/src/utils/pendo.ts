/**
 * Pendo Analytics Integration
 * 
 * This module provides utilities for initializing and managing Pendo analytics
 * for tracking user behavior and engagement.
 */

declare global {
  interface Window {
    pendo?: {
      initialize: (config: PendoConfig) => void;
      identify: (config: PendoConfig) => void;
      updateOptions: (config: Partial<PendoConfig>) => void;
      pageLoad: () => void;
      track: (eventName: string, metadata?: Record<string, unknown>) => void;
      trackAgent: (agentId: string) => void;
    };
  }
}

interface PendoVisitor {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  role?: string;
}

interface PendoAccount {
  id: string;
  accountName?: string;
  payingStatus?: string;
}

interface PendoConfig {
  visitor: PendoVisitor;
  account: PendoAccount;
}

/**
 * Initialize Pendo with user and account information
 * 
 * @param user - User object containing user details
 */
export const initializePendo = (user: {
  id?: string;
  email?: string;
  name?: string;
  username?: string;
  role?: string;
}) => {
  console.log('[Pendo Debug] initializePendo called with user:', user);
  
  // Check if Pendo is loaded
  if (typeof window === 'undefined' || !window.pendo) {
    console.warn('Pendo is not loaded');
    return;
  }

  // Ensure we have a user ID
  if (!user?.id) {
    console.warn('Cannot initialize Pendo without a user ID. User object:', user);
    return;
  }

  try {
    // Parse name into first and last name if available
    const nameParts = user.name?.split(' ') || [];
    const firstName = nameParts[0] || user.username || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const pendoConfig = {
      visitor: {
        id: user.id,
        email: user.email || '',
        firstName: firstName,
        lastName: lastName,
        name: user.name || user.username || '',
        role: user.role || '',
      },
      account: {
        id: user.id, // Using user ID as account ID for now
        accountName: user.email || user.username || 'LibreChat User',
        payingStatus: 'active', // You can customize this based on your business logic
      },
    };

    console.log('[Pendo Debug] Initializing with config:', pendoConfig);
    
    // Initialize Pendo with user information
    window.pendo.initialize(pendoConfig);

    console.log('Pendo initialized successfully');
  } catch (error) {
    console.error('Error initializing Pendo:', error);
  }
};

/**
 * Update Pendo visitor information
 * 
 * @param user - Updated user object
 */
export const updatePendoVisitor = (user: {
  id?: string;
  email?: string;
  name?: string;
  username?: string;
  role?: string;
}) => {
  if (typeof window === 'undefined' || !window.pendo || !user?.id) {
    return;
  }

  try {
    const nameParts = user.name?.split(' ') || [];
    const firstName = nameParts[0] || user.username || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    window.pendo.identify({
      visitor: {
        id: user.id,
        email: user.email || '',
        firstName: firstName,
        lastName: lastName,
        name: user.name || user.username || '',
        role: user.role || '',
      },
      account: {
        id: user.id,
        accountName: user.email || user.username || 'LibreChat User',
        payingStatus: 'active',
      },
    });
  } catch (error) {
    console.error('Error updating Pendo visitor:', error);
  }
};
