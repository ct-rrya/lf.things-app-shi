// Centralized Error Handling Utility
// Provides consistent error handling patterns across the app

import { Alert } from 'react-native';

/**
 * Error types for categorization
 */
export const ErrorType = {
  NETWORK: 'NETWORK',
  DATABASE: 'DATABASE',
  AUTHENTICATION: 'AUTHENTICATION',
  VALIDATION: 'VALIDATION',
  PERMISSION: 'PERMISSION',
  NOT_FOUND: 'NOT_FOUND',
  UNKNOWN: 'UNKNOWN',
};

/**
 * Categorize error based on error message or code
 */
export function categorizeError(error) {
  const message = error?.message?.toLowerCase() || '';
  const code = error?.code?.toLowerCase() || '';

  if (message.includes('network') || message.includes('fetch') || code.includes('network')) {
    return ErrorType.NETWORK;
  }
  if (message.includes('auth') || message.includes('unauthorized') || code === '401') {
    return ErrorType.AUTHENTICATION;
  }
  if (message.includes('permission') || message.includes('forbidden') || code === '403') {
    return ErrorType.PERMISSION;
  }
  if (message.includes('not found') || code === '404') {
    return ErrorType.NOT_FOUND;
  }
  if (message.includes('validation') || message.includes('invalid')) {
    return ErrorType.VALIDATION;
  }
  if (message.includes('database') || message.includes('query') || message.includes('supabase')) {
    return ErrorType.DATABASE;
  }

  return ErrorType.UNKNOWN;
}

/**
 * Get user-friendly error message based on error type
 */
export function getUserFriendlyMessage(error, context = '') {
  const errorType = categorizeError(error);

  const messages = {
    [ErrorType.NETWORK]: {
      title: 'Connection Issue',
      message: 'Please check your internet connection and try again.',
    },
    [ErrorType.DATABASE]: {
      title: 'Database Error',
      message: 'There was a problem accessing the database. Please try again later.',
    },
    [ErrorType.AUTHENTICATION]: {
      title: 'Authentication Required',
      message: 'Please sign in again to continue.',
    },
    [ErrorType.VALIDATION]: {
      title: 'Invalid Input',
      message: 'Please check your input and try again.',
    },
    [ErrorType.PERMISSION]: {
      title: 'Permission Denied',
      message: 'You don\'t have permission to perform this action.',
    },
    [ErrorType.NOT_FOUND]: {
      title: 'Not Found',
      message: 'The requested resource could not be found.',
    },
    [ErrorType.UNKNOWN]: {
      title: 'Unexpected Error',
      message: 'Something went wrong. Please try again.',
    },
  };

  const baseMessage = messages[errorType];
  
  if (context) {
    return {
      ...baseMessage,
      message: `${context}: ${baseMessage.message}`,
    };
  }

  return baseMessage;
}

/**
 * Show error alert with retry option
 */
export function showErrorAlert(error, options = {}) {
  const {
    context = '',
    onRetry = null,
    onCancel = null,
    customTitle = null,
    customMessage = null,
  } = options;

  const { title, message } = getUserFriendlyMessage(error, context);

  const buttons = [];

  if (onRetry) {
    buttons.push({
      text: 'Retry',
      onPress: onRetry,
    });
  }

  buttons.push({
    text: onRetry ? 'Cancel' : 'OK',
    style: 'cancel',
    onPress: onCancel,
  });

  Alert.alert(
    customTitle || title,
    customMessage || message,
    buttons
  );
}

/**
 * Log error for debugging and monitoring
 */
export function logError(error, context = '', additionalData = {}) {
  const errorType = categorizeError(error);
  const timestamp = new Date().toISOString();

  const errorLog = {
    timestamp,
    type: errorType,
    context,
    message: error?.message || 'Unknown error',
    stack: error?.stack,
    ...additionalData,
  };

  // Log to console in development
  if (__DEV__) {
    console.error('Error Log:', errorLog);
  }

  // TODO: Send to error monitoring service (Sentry, LogRocket, etc.)
  // sendToErrorMonitoring(errorLog);

  return errorLog;
}

/**
 * Handle Supabase errors specifically
 */
export function handleSupabaseError(error, context = '') {
  logError(error, context, { service: 'supabase' });

  // Check for specific Supabase error codes
  if (error?.code === 'PGRST116') {
    return {
      title: 'No Data Found',
      message: 'The requested data could not be found.',
    };
  }

  if (error?.code === '23505') {
    return {
      title: 'Duplicate Entry',
      message: 'This record already exists.',
    };
  }

  if (error?.code === '23503') {
    return {
      title: 'Reference Error',
      message: 'Cannot complete operation due to related records.',
    };
  }

  return getUserFriendlyMessage(error, context);
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff(
  fn,
  maxRetries = 3,
  initialDelay = 1000,
  onRetry = null
) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        
        if (onRetry) {
          onRetry(attempt + 1, maxRetries, delay);
        }

        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling(fn, options = {}) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error, options.context || fn.name);
      
      if (options.showAlert !== false) {
        showErrorAlert(error, options);
      }

      if (options.rethrow) {
        throw error;
      }

      return options.defaultValue;
    }
  };
}

/**
 * Validate required fields
 */
export function validateRequired(data, requiredFields) {
  const missing = [];

  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`);
    error.type = ErrorType.VALIDATION;
    error.missingFields = missing;
    throw error;
  }

  return true;
}

/**
 * Safe JSON parse with error handling
 */
export function safeJsonParse(jsonString, defaultValue = null) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    logError(error, 'JSON Parse Error', { jsonString });
    return defaultValue;
  }
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error) {
  const errorType = categorizeError(error);
  return [ErrorType.NETWORK, ErrorType.DATABASE].includes(errorType);
}

/**
 * Format error for display
 */
export function formatErrorForDisplay(error) {
  if (typeof error === 'string') {
    return error;
  }

  if (error?.message) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

/**
 * Create error with additional context
 */
export function createError(message, type = ErrorType.UNKNOWN, additionalData = {}) {
  const error = new Error(message);
  error.type = type;
  Object.assign(error, additionalData);
  return error;
}

export default {
  ErrorType,
  categorizeError,
  getUserFriendlyMessage,
  showErrorAlert,
  logError,
  handleSupabaseError,
  retryWithBackoff,
  withErrorHandling,
  validateRequired,
  safeJsonParse,
  isRetryableError,
  formatErrorForDisplay,
  createError,
};
