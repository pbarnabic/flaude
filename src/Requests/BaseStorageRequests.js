import {getCurrentUser} from '../Auth/UserSessionManager.js';

let databaseInstances = new Map();

/**
 * Generate a safe database name from username
 */
export const getUserDatabaseName = (username) => {
    const safeUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `ClaudeChatDB_${safeUsername}`;
};

/**
 * Get the current user's database name
 */
export const getCurrentUserDatabaseName = () => {
    const {username} = getCurrentUser();
    if (!username) {
        throw new Error('No current user set');
    }
    return getUserDatabaseName(username);
};

/**
 * Get system database name
 */
export const getSystemDatabaseName = () => {
    return 'ClaudeChatSystemDB';
};

/**
 * Complete user database schema - ALL stores for user databases
 */
const USER_DATABASE_STORES = [
    {
        name: 'chats',
        options: {keyPath: 'id'},
        indexes: [
            {name: 'updatedAt', keyPath: 'updatedAt', options: {unique: false}},
            {name: 'createdAt', keyPath: 'createdAt', options: {unique: false}}
        ]
    },
    {
        name: 'messages',
        options: {keyPath: 'id'},
        indexes: [
            {name: 'chatId', keyPath: 'chatId', options: {unique: false}},
            {name: 'timestamp', keyPath: 'timestamp', options: {unique: false}}
        ]
    },
    {
        name: 'settings',
        options: {keyPath: 'key'}
    }
];

/**
 * System database schema
 */
const SYSTEM_DATABASE_STORES = [
    {
        name: 'users',
        options: {keyPath: 'username'},
        indexes: [
            {name: 'createdAt', keyPath: 'createdAt', options: {unique: false}}
        ]
    }
];

/**
 * Get or cache a database instance
 */
export const getDatabaseInstance = (databaseName) => {
    return databaseInstances.get(databaseName) || null;
};

/**
 * Set a database instance in the cache
 */
export const setDatabaseInstance = (databaseName, database) => {
    databaseInstances.set(databaseName, database);
};

/**
 * Remove a database instance from the cache
 */
export const removeDatabaseInstance = (databaseName) => {
    const db = databaseInstances.get(databaseName);
    if (db && !db.closed) {
        db.close();
    }
    databaseInstances.delete(databaseName);
};

/**
 * Close and remove all database instances
 */
export const clearAllDatabaseInstances = () => {
    databaseInstances.forEach(db => {
        if (db && !db.closed) {
            db.close();
        }
    });
    databaseInstances.clear();
};

/**
 * Open or get cached database instance
 */
export const getDatabase = async (databaseName, version = 1, stores = []) => {
    // Check cache first
    const cachedDb = getDatabaseInstance(databaseName);
    if (cachedDb && !cachedDb.closed) {
        return cachedDb;
    }

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(databaseName, version);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
            const db = request.result;
            setDatabaseInstance(databaseName, db);
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Create stores based on configuration
            stores.forEach(storeConfig => {
                if (!db.objectStoreNames.contains(storeConfig.name)) {
                    const store = db.createObjectStore(storeConfig.name, storeConfig.options || {keyPath: 'id'});

                    // Create indexes if specified
                    if (storeConfig.indexes) {
                        storeConfig.indexes.forEach(index => {
                            store.createIndex(index.name, index.keyPath, index.options || {unique: false});
                        });
                    }
                }
            });
        };
    });
};

/**
 * Get a transaction for specified stores - automatically uses correct schema
 */
export const getTransaction = async (databaseName, storeNames, mode = 'readonly') => {
    // Determine which schema to use
    let stores, version;

    if (databaseName.startsWith('ClaudeChatDB_')) {
        // User database
        stores = USER_DATABASE_STORES;
        version = 2;
    } else if (databaseName === 'ClaudeChatSystemDB') {
        // System database
        stores = SYSTEM_DATABASE_STORES;
        version = 1;
    } else {
        // Unknown database type
        stores = [];
        version = 1;
    }

    const db = await getDatabase(databaseName, version, stores);
    return db.transaction(storeNames, mode);
};

/**
 * Generic get operation
 */
export const getRecord = async (databaseName, storeName, key) => {
    const transaction = await getTransaction(databaseName, [storeName], 'readonly');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

/**
 * Generic put operation
 */
export const putRecord = async (databaseName, storeName, record) => {
    const transaction = await getTransaction(databaseName, [storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
        const request = store.put(record);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

/**
 * Generic add operation
 */
export const addRecord = async (databaseName, storeName, record) => {
    const transaction = await getTransaction(databaseName, [storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
        const request = store.add(record);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

/**
 * Generic delete operation
 */
export const deleteRecord = async (databaseName, storeName, key) => {
    const transaction = await getTransaction(databaseName, [storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
        const request = store.delete(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

/**
 * Generic get all operation
 */
export const getAllRecords = async (databaseName, storeName) => {
    const transaction = await getTransaction(databaseName, [storeName], 'readonly');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

/**
 * Generic get all by index operation
 */
export const getAllByIndex = async (databaseName, storeName, indexName, value = null) => {
    const transaction = await getTransaction(databaseName, [storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);

    return new Promise((resolve, reject) => {
        const request = value ? index.getAll(value) : index.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

/**
 * Execute multiple operations in a single transaction
 */
export const executeTransaction = async (databaseName, storeNames, mode, operations) => {
    const transaction = await getTransaction(databaseName, storeNames, mode);
    const results = [];

    for (const operation of operations) {
        const store = transaction.objectStore(operation.storeName);

        const result = await new Promise((resolve, reject) => {
            let request;

            switch (operation.type) {
                case 'get':
                    request = store.get(operation.key);
                    break;
                case 'put':
                    request = store.put(operation.record);
                    break;
                case 'add':
                    request = store.add(operation.record);
                    break;
                case 'delete':
                    request = store.delete(operation.key);
                    break;
                case 'getAll':
                    request = store.getAll();
                    break;
                case 'getAllByIndex':
                    const index = store.index(operation.indexName);
                    request = operation.value ? index.getAll(operation.value) : index.getAll();
                    break;
                default:
                    reject(new Error(`Unknown operation type: ${operation.type}`));
                    return;
            }

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        results.push(result);
    }

    return results;
};

/**
 * Delete entire database
 */
export const deleteDatabase = async (databaseName) => {
    // Close and remove from cache if exists
    removeDatabaseInstance(databaseName);

    return new Promise((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase(databaseName);
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(deleteRequest.error);
        deleteRequest.onblocked = () => reject(new Error('Database deletion blocked'));
    });
};

/**
 * Default error handler
 */
export const defaultErrorHandler = (error) => {
    console.error('Storage operation failed:', error);
    throw error;
};

/**
 * Default success handler
 */
export const defaultSuccessHandler = (result) => {
    return result;
};

// Re-export auth functions for convenience
export {
    ensureAuthenticated,
    getCurrentUser,
    encryptForStorage,
    decryptFromStorage
} from '../Auth/UserSessionManager.js';
