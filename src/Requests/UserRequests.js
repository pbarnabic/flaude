// User management and authentication database operations
import {
    getSystemDatabaseName,
    getUserDatabaseName,
    getRecord,
    putRecord,
    deleteRecord,
    getAllRecords,
    deleteDatabase,
    getDatabase,
    defaultErrorHandler,
    defaultSuccessHandler
} from './BaseStorageRequests.js';

/**
 * Get all registered users
 */
export const getRegisteredUsers = async () => {
    try {
        const databaseName = getSystemDatabaseName();
        const userRecords = await getAllRecords(databaseName, 'users');
        const usernames = userRecords.map(record => record.username);

        return defaultSuccessHandler(usernames);
    } catch (error) {
        // If no system DB exists, return empty array
        return defaultSuccessHandler([]);
    }
};

/**
 * Store user password hash in system database
 */
export const storeUserPasswordHash = async (username, passwordHash) => {
    try {
        const databaseName = getSystemDatabaseName();
        const userRecord = {
            username: username,
            passwordHash: passwordHash,
            createdAt: new Date().toISOString(),
            databaseName: getUserDatabaseName(username)
        };

        await putRecord(databaseName, 'users', userRecord);

        return defaultSuccessHandler(true);
    } catch (error) {
        return defaultErrorHandler(error);
    }
};

/**
 * Get user password hash from system database
 */
export const getUserPasswordHash = async (username) => {
    try {
        const databaseName = getSystemDatabaseName();
        const userRecord = await getRecord(databaseName, 'users', username);

        return defaultSuccessHandler(userRecord ? userRecord.passwordHash : null);
    } catch (error) {
        // If no system DB or user not found, return null
        return defaultSuccessHandler(null);
    }
};

/**
 * Check if a user exists
 */
export const checkUserExists = async (username) => {
    try {
        const users = await getRegisteredUsers();
        return defaultSuccessHandler(users.includes(username));
    } catch (error) {
        return defaultErrorHandler(error);
    }
};

/**
 * Get user record (without password hash for security)
 */
export const getUserRecord = async (username) => {
    try {
        const databaseName = getSystemDatabaseName();
        const userRecord = await getRecord(databaseName, 'users', username);

        if (!userRecord) {
            return defaultSuccessHandler(null);
        }

        // Return user record without password hash
        const { passwordHash, ...userInfo } = userRecord;
        return defaultSuccessHandler(userInfo);
    } catch (error) {
        return defaultSuccessHandler(null);
    }
};

/**
 * Update user record (excluding password hash)
 */
export const updateUserRecord = async (username, updates) => {
    try {
        const databaseName = getSystemDatabaseName();
        const existingRecord = await getRecord(databaseName, 'users', username);

        if (!existingRecord) {
            throw new Error('User not found');
        }

        // Don't allow password hash updates through this method
        const { passwordHash, ...allowedUpdates } = updates;

        const updatedRecord = {
            ...existingRecord,
            ...allowedUpdates,
            updatedAt: new Date().toISOString()
        };

        await putRecord(databaseName, 'users', updatedRecord);

        // Return updated record without password hash
        const { passwordHash: _, ...userInfo } = updatedRecord;
        return defaultSuccessHandler(userInfo);
    } catch (error) {
        return defaultErrorHandler(error);
    }
};

/**
 * Delete user from system database
 */
export const unregisterUser = async (username) => {
    try {
        const databaseName = getSystemDatabaseName();
        await deleteRecord(databaseName, 'users', username);

        return defaultSuccessHandler(true);
    } catch (error) {
        // Don't fail if deletion fails - consider it done
        return defaultSuccessHandler(true);
    }
};

/**
 * Delete user and all their data
 */
export const deleteUserCompletely = async (username) => {
    try {
        // Delete user's personal database
        const userDbName = getUserDatabaseName(username);
        await deleteDatabase(userDbName);

        // Remove from system registry
        await unregisterUser(username);

        return defaultSuccessHandler(true);
    } catch (error) {
        return defaultErrorHandler(error);
    }
};

/**
 * Update user password hash
 */
export const updateUserPasswordHash = async (username, newPasswordHash) => {
    try {
        const databaseName = getSystemDatabaseName();
        const existingRecord = await getRecord(databaseName, 'users', username);

        if (!existingRecord) {
            throw new Error('User not found');
        }

        const updatedRecord = {
            ...existingRecord,
            passwordHash: newPasswordHash,
            updatedAt: new Date().toISOString()
        };

        await putRecord(databaseName, 'users', updatedRecord);

        return defaultSuccessHandler(true);
    } catch (error) {
        return defaultErrorHandler(error);
    }
};

/**
 * Test password against actual encrypted data for a specific user
 */
export const testPasswordWithUserData = async (username, password, encryptionUtils) => {
    try {
        const userDbName = getUserDatabaseName(username);

        // Use getDatabase directly to access the user database
        const db = await getDatabase(userDbName, 2, []);

        // Get first chat to test decryption
        const transaction = db.transaction(['chats'], 'readonly');
        const store = transaction.objectStore('chats');
        const getAllRequest = store.getAll();

        const chats = await new Promise((resolve, reject) => {
            getAllRequest.onsuccess = () => resolve(getAllRequest.result);
            getAllRequest.onerror = () => reject(getAllRequest.error);
        });

        if (chats.length > 0) {
            // Try to decrypt the first chat
            const firstChat = chats[0];
            if (firstChat.encrypted_data) {
                await encryptionUtils.decrypt(firstChat.encrypted_data, password);
                return defaultSuccessHandler(true);
            }
        }

        // If no encrypted chats, password is valid
        return defaultSuccessHandler(true);
    } catch (error) {
        return defaultSuccessHandler(false);
    }
};

/**
 * Get user statistics
 */
export const getUserStats = async (username) => {
    try {
        const userRecord = await getUserRecord(username);
        if (!userRecord) {
            return defaultSuccessHandler(null);
        }

        // Get additional stats from user's database
        const userDbName = getUserDatabaseName(username);
        const db = await getDatabase(userDbName, 2, []);

        const [chatRecords, messageRecords] = await Promise.all([
            new Promise((resolve, reject) => {
                const transaction = db.transaction(['chats'], 'readonly');
                const store = transaction.objectStore('chats');
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            }),
            new Promise((resolve, reject) => {
                const transaction = db.transaction(['messages'], 'readonly');
                const store = transaction.objectStore('messages');
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            })
        ]);

        const stats = {
            ...userRecord,
            chatCount: chatRecords.length,
            messageCount: messageRecords.length,
            lastActivity: chatRecords.length > 0 ?
                Math.max(...chatRecords.map(chat => new Date(chat.updatedAt || chat.createdAt).getTime())) :
                new Date(userRecord.createdAt).getTime()
        };

        return defaultSuccessHandler(stats);
    } catch (error) {
        return defaultErrorHandler(error);
    }
};

/**
 * Export user data (for backup purposes)
 */
export const exportUserData = async (username) => {
    try {
        const userRecord = await getUserRecord(username);
        if (!userRecord) {
            throw new Error('User not found');
        }

        const userDbName = getUserDatabaseName(username);
        const db = await getDatabase(userDbName, 2, []);

        const [chatRecords, messageRecords, settingRecords] = await Promise.all([
            new Promise((resolve, reject) => {
                const transaction = db.transaction(['chats'], 'readonly');
                const store = transaction.objectStore('chats');
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            }),
            new Promise((resolve, reject) => {
                const transaction = db.transaction(['messages'], 'readonly');
                const store = transaction.objectStore('messages');
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            }),
            new Promise((resolve, reject) => {
                const transaction = db.transaction(['settings'], 'readonly');
                const store = transaction.objectStore('settings');
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            })
        ]);

        const exportData = {
            user: userRecord,
            chats: chatRecords,
            messages: messageRecords,
            settings: settingRecords,
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };

        return defaultSuccessHandler(exportData);
    } catch (error) {
        return defaultErrorHandler(error);
    }
};
