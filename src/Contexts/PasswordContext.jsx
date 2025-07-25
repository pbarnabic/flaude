
// /Contexts/PasswordContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { encryptionUtils, hashPassword } from '../Utils/EncryptionUtils.js';

const PasswordContext = createContext();

export const usePassword = () => {
    const context = useContext(PasswordContext);
    if (!context) {
        throw new Error('usePassword must be used within a PasswordProvider');
    }
    return context;
};

export const PasswordProvider = ({ children }) => {
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

    const getRegisteredUsers = async () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('ClaudeChatSystemDB', 1);

            request.onerror = () => {
                resolve([]); // If no system DB, no users
            };

            request.onsuccess = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('users')) {
                    db.close();
                    resolve([]);
                    return;
                }

                const transaction = db.transaction(['users'], 'readonly');
                const store = transaction.objectStore('users');
                const getAllRequest = store.getAll();

                getAllRequest.onsuccess = () => {
                    const userRecords = getAllRequest.result;
                    const usernames = userRecords.map(record => record.username);
                    db.close();
                    resolve(usernames);
                };

                getAllRequest.onerror = () => {
                    db.close();
                    resolve([]);
                };
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('users')) {
                    const userStore = db.createObjectStore('users', { keyPath: 'username' });
                    userStore.createIndex('createdAt', 'createdAt', { unique: false });
                }
            };
        });
    };

    const storeUserPasswordHash = async (username, passwordHash) => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('ClaudeChatSystemDB', 1);

            request.onerror = () => reject(request.error);

            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['users'], 'readwrite');
                const store = transaction.objectStore('users');

                const userRecord = {
                    username: username,
                    passwordHash: passwordHash,
                    createdAt: new Date().toISOString(),
                    databaseName: getUserDatabaseName(username)
                };

                const addRequest = store.put(userRecord);
                addRequest.onsuccess = () => {
                    db.close();
                    resolve();
                };
                addRequest.onerror = () => {
                    db.close();
                    reject(addRequest.error);
                };
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('users')) {
                    const userStore = db.createObjectStore('users', { keyPath: 'username' });
                    userStore.createIndex('createdAt', 'createdAt', { unique: false });
                }
            };
        });
    };

    const getUserPasswordHash = async (username) => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('ClaudeChatSystemDB', 1);

            request.onerror = () => resolve(null);

            request.onsuccess = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('users')) {
                    db.close();
                    resolve(null);
                    return;
                }

                const transaction = db.transaction(['users'], 'readonly');
                const store = transaction.objectStore('users');
                const getRequest = store.get(username);

                getRequest.onsuccess = () => {
                    const userRecord = getRequest.result;
                    db.close();
                    resolve(userRecord ? userRecord.passwordHash : null);
                };

                getRequest.onerror = () => {
                    db.close();
                    resolve(null);
                };
            };
        });
    };

    const unregisterUser = async (username) => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('ClaudeChatSystemDB', 1);

            request.onerror = () => resolve(); // If no system DB, consider it done

            request.onsuccess = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('users')) {
                    db.close();
                    resolve();
                    return;
                }

                const transaction = db.transaction(['users'], 'readwrite');
                const store = transaction.objectStore('users');
                const deleteRequest = store.delete(username);

                deleteRequest.onsuccess = () => {
                    db.close();
                    resolve();
                };
                deleteRequest.onerror = () => {
                    db.close();
                    resolve(); // Don't fail if deletion fails
                };
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('users')) {
                    const userStore = db.createObjectStore('users', { keyPath: 'username' });
                    userStore.createIndex('createdAt', 'createdAt', { unique: false });
                }
            };
        });
    };

    const getUserDatabaseName = (username) => {
        // Create a safe database name from username
        const safeUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '_');
        return `ClaudeChatDB_${safeUsername}`;
    };

    const checkUserExists = async (username) => {
        try {
            const users = await getRegisteredUsers();
            return users.includes(username);
        } catch (error) {
            console.error('Error checking user existence:', error);
            return false;
        }
    };

    // Set up password for first time user
    const setupUser = async (username, password) => {
        try {
            if (!username || username.trim().length < 2) {
                throw new Error('Username must be at least 2 characters long');
            }

            if (!password || password.length < 8) {
                throw new Error('Password must be at least 8 characters long');
            }

            const trimmedUsername = username.trim();
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
            const trimmedUsername = username.trim();
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
                const testEncryption = await testPasswordWithUserData(trimmedUsername, password);
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

    // Test password against actual encrypted data for a specific user
    const testPasswordWithUserData = async (username, password) => {
        try {
            const dbName = getUserDatabaseName(username);
            const db = await openUserDatabase(dbName);
            const transaction = db.transaction(['chats'], 'readonly');
            const store = transaction.objectStore('chats');

            // Get first chat to test decryption
            const getAllRequest = store.getAll();
            const chats = await new Promise((resolve, reject) => {
                getAllRequest.onsuccess = () => resolve(getAllRequest.result);
                getAllRequest.onerror = () => reject(getAllRequest.error);
            });

            db.close();

            if (chats.length > 0) {
                // Try to decrypt the first chat
                const firstChat = chats[0];
                if (firstChat.encrypted_data) {
                    await encryptionUtils.decrypt(firstChat.encrypted_data, password);
                    return true;
                }
            }

            // If no encrypted chats, password is valid
            return true;
        } catch (error) {
            return false;
        }
    };

    const openUserDatabase = (dbName) => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, 2);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('chats')) {
                    const chatStore = db.createObjectStore('chats', { keyPath: 'id' });
                    chatStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                    chatStore.createIndex('createdAt', 'createdAt', { unique: false });
                }
                if (!db.objectStoreNames.contains('messages')) {
                    const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
                    messageStore.createIndex('chatId', 'chatId', { unique: false });
                    messageStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    };

    // Delete user and all their data - ONLY current user can delete themselves
    const deleteUser = async (username) => {
        try {
            const trimmedUsername = username.trim();

            // Security check: Only authenticated users can delete accounts
            if (!isAuthenticated || !currentUsername) {
                throw new Error('You must be signed in to delete an account');
            }

            // Security check: Users can only delete their own account
            if (currentUsername !== trimmedUsername) {
                throw new Error('You can only delete your own account');
            }

            // Delete user's database
            const dbName = getUserDatabaseName(trimmedUsername);
            await new Promise((resolve, reject) => {
                const deleteRequest = indexedDB.deleteDatabase(dbName);
                deleteRequest.onsuccess = () => resolve();
                deleteRequest.onerror = () => reject(deleteRequest.error);
                deleteRequest.onblocked = () => reject(new Error('Database deletion blocked'));
            });

            // Remove from system registry
            await unregisterUser(trimmedUsername);

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

            if (!newPassword || newPassword.length < 8) {
                throw new Error('New password must be at least 8 characters long');
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
        <PasswordContext.Provider value={contextValue}>
            {children}
        </PasswordContext.Provider>
    );
};
