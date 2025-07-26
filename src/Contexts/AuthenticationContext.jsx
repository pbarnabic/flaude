import React, {createContext, useContext, useEffect, useState} from 'react';
import {encryptionUtils, hashPassword} from '../Utils/EncryptionUtils.js';
import {validateUsername, validatePassword} from '../Utils/AuthenticationUtils.js';
import {
    getRegisteredUsers,
    storeUserPasswordHash,
    getUserPasswordHash,
    checkUserExists,
    deleteUserCompletely,
    testPasswordWithUserData
} from '../Requests/UserRequests.js';
import {getUserDatabaseName} from '../Requests/BaseStorageRequests.js';

const AuthenticationContext = createContext();

export const useAuthentication = () => {
    const context = useContext(AuthenticationContext);
    if (!context) {
        throw new Error('useAuthentication must be used within an AuthenticationProvider');
    }
    return context;
};

export const AuthenticationProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentPassword, setCurrentPassword] = useState(null);
    const [currentUsername, setCurrentUsername] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [existingUsers, setExistingUsers] = useState([]);

    // Check for existing users on mount
    useEffect(() => {
        checkForExistingUsers();
    }, []);

    const checkForExistingUsers = async () => {
        try {
            setIsLoading(true);
            const users = await getRegisteredUsers();
            setExistingUsers(users);
        } catch (error) {
            console.error('Error checking for existing users:', error);
            setExistingUsers([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Set up password for first time user
    const setupUser = async (username, password) => {
        try {
            if (!username || typeof username !== 'string') {
                throw new Error('Username is required');
            }

            const trimmedUsername = username.trim();

            // Validate username using existing utility
            const usernameError = validateUsername(trimmedUsername);
            if (usernameError) {
                throw new Error(usernameError);
            }

            // Validate password using existing utility
            const passwordError = validatePassword(password);
            if (passwordError) {
                throw new Error(passwordError);
            }

            // Check if user already exists
            const userExists = await checkUserExists(trimmedUsername);
            if (userExists) {
                throw new Error('Username already exists');
            }

            // Hash password for verification
            const passwordHash = await hashPassword(password);
            await storeUserPasswordHash(trimmedUsername, passwordHash);

            // Test encryption/decryption
            const testData = { test: 'encryption_test', timestamp: Date.now(), user: trimmedUsername };
            const encrypted = await encryptionUtils.encrypt(testData, password);
            const decrypted = await encryptionUtils.decrypt(encrypted, password);

            if (JSON.stringify(testData) !== JSON.stringify(decrypted)) {
                throw new Error('Encryption test failed');
            }

            setCurrentUsername(trimmedUsername);
            setCurrentPassword(password);
            setIsAuthenticated(true);

            // Refresh user list
            await checkForExistingUsers();
            return true;
        } catch (error) {
            console.error('User setup failed:', error);
            throw error;
        }
    };

    // Authenticate existing user
    const authenticateUser = async (username, password) => {
        try {
            if (!username || typeof username !== 'string') {
                throw new Error('Username is required');
            }

            const trimmedUsername = username.trim();

            // Basic username validation for authentication (less strict than signup)
            if (trimmedUsername.length < 2) {
                throw new Error('Username must be at least 2 characters long');
            }

            // Check if user exists in system database
            const userExists = await checkUserExists(trimmedUsername);
            if (!userExists) {
                throw new Error('User does not exist');
            }

            const storedHash = await getUserPasswordHash(trimmedUsername);
            if (!storedHash) {
                throw new Error('User authentication data not found');
            }

            // Verify password hash
            const passwordHash = await hashPassword(password);
            if (passwordHash !== storedHash) {
                throw new Error('Invalid password');
            }

            // Test decryption with actual data if available
            try {
                const testEncryption = await testPasswordWithUserData(trimmedUsername, password, encryptionUtils);
                if (!testEncryption) {
                    throw new Error('Cannot decrypt existing data with this password');
                }
            } catch (decryptError) {
                console.log('Decryption test error:', decryptError);
                throw new Error('Cannot access encrypted data with this password');
            }

            setCurrentUsername(trimmedUsername);
            setCurrentPassword(password);
            setIsAuthenticated(true);

            return true;
        } catch (error) {
            console.error('Authentication failed:', error);
            throw error;
        }
    };

    // Delete user and all their data - ONLY current user can delete themselves
    const deleteUser = async (username) => {
        try {
            if (!username || typeof username !== 'string') {
                throw new Error('Username is required');
            }

            const trimmedUsername = username.trim();

            // Security check: Only authenticated users can delete accounts
            if (!isAuthenticated || !currentUsername) {
                throw new Error('You must be signed in to delete an account');
            }

            // Security check: Users can only delete their own account
            if (currentUsername !== trimmedUsername) {
                throw new Error('You can only delete your own account');
            }

            // Delete user and all their data using the modular request
            await deleteUserCompletely(trimmedUsername);

            // Log out the user since they deleted their account
            logout();

            // Refresh user list
            await checkForExistingUsers();

            return true;
        } catch (error) {
            console.error('User deletion failed:', error);
            throw error;
        }
    };

    // Change password for current user
    const changePassword = async (oldPassword, newPassword) => {
        try {
            if (!isAuthenticated || !currentUsername || currentPassword !== oldPassword) {
                throw new Error('Current password is incorrect');
            }

            // Validate new password using existing utility
            const passwordError = validatePassword(newPassword);
            if (passwordError) {
                throw new Error(passwordError);
            }

            // This would require re-encrypting all user data with new password
            // For now, we'll throw an error indicating this needs implementation
            throw new Error('Password change functionality requires re-encrypting all data - not yet implemented');
        } catch (error) {
            console.error('Password change failed:', error);
            throw error;
        }
    };

    // Logout (clear password from memory)
    const logout = () => {
        setCurrentPassword(null);
        setCurrentUsername(null);
        setIsAuthenticated(false);
    };

    // Switch user (logout and allow different user login)
    const switchUser = () => {
        logout();
        checkForExistingUsers(); // Refresh user list
    };

    // Encrypt data (convenience method)
    const encryptData = async (data) => {
        if (!isAuthenticated || !currentPassword) {
            throw new Error('Not authenticated');
        }
        return encryptionUtils.encrypt(data, currentPassword);
    };

    // Decrypt data (convenience method)
    const decryptData = async (encryptedData) => {
        if (!isAuthenticated || !currentPassword) {
            throw new Error('Not authenticated');
        }
        return encryptionUtils.decrypt(encryptedData, currentPassword);
    };

    const contextValue = {
        // State
        isAuthenticated,
        isLoading,
        currentUsername,
        existingUsers,

        // Actions
        setupUser,
        authenticateUser,
        changePassword,
        deleteUser,
        logout,
        switchUser,

        // Encryption helpers
        encryptData,
        decryptData,

        // Utilities
        checkForExistingUsers,
        checkUserExists,
        getUserDatabaseName
    };

    return (
        <AuthenticationContext.Provider value={contextValue}>
            {children}
        </AuthenticationContext.Provider>
    );
};
