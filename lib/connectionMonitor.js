// Network Connection Monitor
// Monitors network connectivity and provides status updates

import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * Hook to monitor network connection status
 */
export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [connectionType, setConnectionType] = useState('unknown');

  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? true);
      setConnectionType(state.type);
    });

    // Get initial state
    NetInfo.fetch().then(state => {
      setIsConnected(state.isConnected ?? true);
      setConnectionType(state.type);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    isConnected,
    connectionType,
    isOnline: isConnected,
    isOffline: !isConnected,
  };
}

/**
 * Check if currently connected to network
 */
export async function checkConnection() {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected ?? true;
  } catch (error) {
    console.error('Error checking connection:', error);
    return true; // Assume connected if check fails
  }
}

/**
 * Wait for network connection
 */
export function waitForConnection(timeout = 30000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      unsubscribe();
      reject(new Error('Connection timeout'));
    }, timeout);

    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        clearTimeout(timeoutId);
        unsubscribe();
        resolve(true);
      }
    });

    // Check immediately
    NetInfo.fetch().then(state => {
      if (state.isConnected) {
        clearTimeout(timeoutId);
        unsubscribe();
        resolve(true);
      }
    });
  });
}

/**
 * Execute function when online
 */
export async function executeWhenOnline(fn, options = {}) {
  const { timeout = 30000, retryOnFailure = true } = options;

  const isConnected = await checkConnection();

  if (!isConnected) {
    console.log('Waiting for connection...');
    await waitForConnection(timeout);
  }

  try {
    return await fn();
  } catch (error) {
    if (retryOnFailure) {
      const stillConnected = await checkConnection();
      if (!stillConnected) {
        console.log('Connection lost, waiting to retry...');
        await waitForConnection(timeout);
        return await fn();
      }
    }
    throw error;
  }
}

export default {
  useNetworkStatus,
  checkConnection,
  waitForConnection,
  executeWhenOnline,
};
