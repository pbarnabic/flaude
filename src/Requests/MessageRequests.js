import {
    ensureAuthenticated,
    getCurrentUser,
    encryptForStorage,
    decryptFromStorage
} from '../Auth/UserSessionManager.js';


import {
    getUserDatabaseName,
    getRecord,
    putRecord,
    deleteRecord,
    getAllByIndex,
    executeTransaction,
    defaultErrorHandler,
    defaultSuccessHandler
} from './BaseStorageRequests.js';

/**
 * Get the current user's database name
 */
const getCurrentUserDatabaseName = () => {
    const {username} = getCurrentUser();
    if (!username) {
        throw new Error('No current user set');
    }
    return getUserDatabaseName(username);
};

/**
 * Save a single message
 */
export const saveMessage = async (chatId, message, index = 0) => {
    try {
        ensureAuthenticated();

        const now = new Date().toISOString();
        const messageData = {
            id: `${chatId}_${index}`,
            chatId,
            content: message.content,
            role: message.role,
            timestamp: now,
            index
        };

        const encryptedData = await encryptForStorage(messageData);
        const messageRecord = {
            id: messageData.id,
            chatId: messageData.chatId,
            encrypted_data: encryptedData,
            timestamp: messageData.timestamp,
            index: messageData.index
        };

        const databaseName = getCurrentUserDatabaseName();
        await putRecord(databaseName, 'messages', messageRecord);

        return defaultSuccessHandler(messageData);
    } catch (error) {
        return defaultErrorHandler(error);
    }
};

/**
 * Get a single message by ID
 */
export const getMessage = async (messageId) => {
    try {
        ensureAuthenticated();

        const databaseName = getCurrentUserDatabaseName();
        const messageRecord = await getRecord(databaseName, 'messages', messageId);

        if (!messageRecord) {
            return defaultSuccessHandler(null);
        }

        const decryptedMessage = await decryptFromStorage(messageRecord.encrypted_data);
        return defaultSuccessHandler(decryptedMessage);
    } catch (error) {
        return defaultErrorHandler(error);
    }
};

/**
 * Get all messages for a specific chat
 */
export const getMessagesByChatId = async (chatId) => {
    try {
        ensureAuthenticated();

        const databaseName = getCurrentUserDatabaseName();
        const messageRecords = await getAllByIndex(databaseName, 'messages', 'chatId', chatId);

        // Sort by index
        const sortedRecords = messageRecords.sort((a, b) => a.index - b.index);

        // Decrypt all messages
        const messages = [];
        for (const record of sortedRecords) {
            try {
                const decryptedMessage = await decryptFromStorage(record.encrypted_data);
                messages.push(decryptedMessage);
            } catch (decryptError) {
                console.error(`Failed to decrypt message ${record.id}:`, decryptError);
                // Skip corrupted messages
            }
        }

        return defaultSuccessHandler(messages);
    } catch (error) {
        return defaultErrorHandler(error);
    }
};

/**
 * Update a single message
 */
export const updateMessage = async (messageId, updates) => {
    try {
        ensureAuthenticated();

        const databaseName = getCurrentUserDatabaseName();
        const existingRecord = await getRecord(databaseName, 'messages', messageId);

        if (!existingRecord) {
            throw new Error('Message not found');
        }

        // Decrypt existing message
        const existingMessage = await decryptFromStorage(existingRecord.encrypted_data);

        // Apply updates
        const updatedMessage = {
            ...existingMessage,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        // Re-encrypt
        const encryptedData = await encryptForStorage(updatedMessage);
        const updatedRecord = {
            ...existingRecord,
            encrypted_data: encryptedData
        };

        await putRecord(databaseName, 'messages', updatedRecord);

        return defaultSuccessHandler(updatedMessage);
    } catch (error) {
        return defaultErrorHandler(error);
    }
};

/**
 * Delete a single message
 */
export const deleteMessage = async (messageId) => {
    try {
        ensureAuthenticated();

        const databaseName = getCurrentUserDatabaseName();
        await deleteRecord(databaseName, 'messages', messageId);

        return defaultSuccessHandler(true);
    } catch (error) {
        return defaultErrorHandler(error);
    }
};

/**
 * Delete all messages for a chat
 */
export const deleteMessagesByChatId = async (chatId) => {
    try {
        ensureAuthenticated();

        const databaseName = getCurrentUserDatabaseName();
        const messageRecords = await getAllByIndex(databaseName, 'messages', 'chatId', chatId);

        // Prepare delete operations
        const operations = messageRecords.map(record => ({
            type: 'delete',
            storeName: 'messages',
            key: record.id
        }));

        await executeTransaction(databaseName, ['messages'], 'readwrite', operations);

        return defaultSuccessHandler(true);
    } catch (error) {
        return defaultErrorHandler(error);
    }
};

/**
 * Clear all messages for a chat and replace with new ones
 */
export const replaceAllMessagesForChat = async (chatId, newMessages) => {
    try {
        ensureAuthenticated();

        const now = new Date().toISOString();
        const databaseName = getCurrentUserDatabaseName();

        // Get existing messages to delete
        const existingRecords = await getAllByIndex(databaseName, 'messages', 'chatId', chatId);

        // Prepare new encrypted message records
        const newMessageRecords = [];
        for (let index = 0; index < newMessages.length; index++) {
            const message = newMessages[index];
            const messageData = {
                id: `${chatId}_${index}`,
                chatId,
                content: message.content,
                role: message.role,
                timestamp: now,
                index
            };

            const encryptedData = await encryptForStorage(messageData);
            newMessageRecords.push({
                id: messageData.id,
                chatId: messageData.chatId,
                encrypted_data: encryptedData,
                timestamp: messageData.timestamp,
                index: messageData.index
            });
        }

        // Prepare all operations
        const operations = [
            // Delete existing messages
            ...existingRecords.map(record => ({
                type: 'delete',
                storeName: 'messages',
                key: record.id
            })),
            // Add new messages
            ...newMessageRecords.map(record => ({
                type: 'add',
                storeName: 'messages',
                record: record
            }))
        ];

        await executeTransaction(databaseName, ['messages'], 'readwrite', operations);

        return defaultSuccessHandler(true);
    } catch (error) {
        return defaultErrorHandler(error);
    }
};

/**
 * Get message count for a chat
 */
export const getMessageCount = async (chatId) => {
    try {
        ensureAuthenticated();

        const databaseName = getCurrentUserDatabaseName();
        const messageRecords = await getAllByIndex(databaseName, 'messages', 'chatId', chatId);

        return defaultSuccessHandler(messageRecords.length);
    } catch (error) {
        return defaultErrorHandler(error);
    }
};

/**
 * Search messages by content (basic text search)
 */
export const searchMessages = async (searchTerm, chatId = null) => {
    try {
        ensureAuthenticated();

        const databaseName = getCurrentUserDatabaseName();
        let messageRecords;

        if (chatId) {
            messageRecords = await getAllByIndex(databaseName, 'messages', 'chatId', chatId);
        } else {
            messageRecords = await getAllByIndex(databaseName, 'messages', 'timestamp');
        }

        const matchingMessages = [];

        for (const record of messageRecords) {
            try {
                const decryptedMessage = await decryptFromStorage(record.encrypted_data);

                // Simple text search in content
                if (typeof decryptedMessage.content === 'string' &&
                    decryptedMessage.content.toLowerCase().includes(searchTerm.toLowerCase())) {
                    matchingMessages.push(decryptedMessage);
                }
            } catch (decryptError) {
                console.error(`Failed to decrypt message ${record.id}:`, decryptError);
            }
        }

        // Sort by timestamp (newest first)
        matchingMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return defaultSuccessHandler(matchingMessages);
    } catch (error) {
        return defaultErrorHandler(error);
    }
};
