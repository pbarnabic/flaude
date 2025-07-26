import {clearAllDatabaseInstances} from '../Requests/BaseStorageRequests.js';

// Current session state
let currentUsername = null;
let passwordContext = null;

/**
 * Set the current authenticated user and their password context
 */
export const setCurrentUser = (username, context = null) => {
    console.log('setCurrentUser', context);
    currentUsername = username;
    passwordContext = context;
};

/**
 * Clear the current user session and close all database connections
 */
export const clearCurrentUser = () => {
    currentUsername = null;
    passwordContext = null;

    // Clear all database connections when session ends
    clearAllDatabaseInstances();
};

/**
 * Get the current user session information
 */
export const getCurrentUser = () => {
    return {
        username: currentUsername,
        passwordContext: passwordContext
    };
};

/**
 * Check if a user is currently authenticated
 */
export const isUserAuthenticated = () => {
    return !!(currentUsername && passwordContext);
};

/**
 * Get the current username (null if not authenticated)
 */
export const getCurrentUsername = () => {
    return currentUsername;
};

/**
 * Get the current password context (null if not authenticated)
 */
export const getPasswordContext = () => {
    return passwordContext;
};

/**
 * Ensure user is authenticated, throw error if not
 */
export const ensureAuthenticated = () => {
    if (!currentUsername || !passwordContext) {
        throw new Error('User not authenticated');
    }
};

/**
 * Encrypt data using the current user's password context
 */
export const encryptForStorage = async (data) => {
    if (!passwordContext || !passwordContext.encryptData) {
        throw new Error('No encryption context available - user not authenticated');
    }
    return await passwordContext.encryptData(data);
};

/**
 * Decrypt data using the current user's password context
 */
export const decryptFromStorage = async (encryptedData) => {
    if (!passwordContext || !passwordContext.decryptData) {
        throw new Error('No decryption context available - user not authenticated');
    }
    return await passwordContext.decryptData(encryptedData);
};
