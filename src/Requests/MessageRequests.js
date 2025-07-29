import {
    decryptFromStorage,
    encryptForStorage,
    ensureAuthenticated
} from '../Auth/UserSessionManager.js';

import {
    defaultErrorHandler,
    defaultSuccessHandler,
    executeTransaction,
    getAllByIndex,
    getCurrentUserDatabaseName
} from './BaseStorageRequests.js';


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
 * Clear all messages for a chat and replace with new ones
 */
export const putChatMessages = async (chatId, newMessages) => {
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
