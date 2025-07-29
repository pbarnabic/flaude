import {
    ensureAuthenticated,
    encryptForStorage,
    decryptFromStorage
} from '../Auth/UserSessionManager.js';

import {
    getCurrentUserDatabaseName,
    getRecord,
    putRecord,
    addRecord,
    deleteRecord,
    getAllByIndex,
    defaultErrorHandler,
    defaultSuccessHandler
} from './BaseStorageRequests.js';

/**
 * Utility functions
 */
const generateChatId = () => {
    return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create a new chat
 */
export const createChat = async (chatData = {}) => {
    try {
        ensureAuthenticated();

        const now = new Date().toISOString();
        const chat = {
            id: chatData.id || generateChatId(),
            title: chatData.title || 'New Chat',
            createdAt: now,
            updatedAt: now,
            modelSettings: chatData.modelSettings || {
                model: 'claude-3-5-haiku-20241022',
                temperature: 1.0,
                maxTokens: 500
            },
            ...chatData
        };

        const encryptedData = await encryptForStorage(chat);
        const chatRecord = {
            id: chat.id,
            encrypted_data: encryptedData,
            updatedAt: chat.updatedAt,
            createdAt: chat.createdAt
        };

        const databaseName = getCurrentUserDatabaseName();
        await addRecord(databaseName, 'chats', chatRecord);

        return defaultSuccessHandler(chat);
    } catch (error) {
        return defaultErrorHandler(error);
    }
};

/**
 * Update an existing chat
 */
export const updateChat = async (chatId, updates) => {
    try {
        ensureAuthenticated();

        const databaseName = getCurrentUserDatabaseName();

        // Get existing chat record
        const existingChatRecord = await getRecord(databaseName, 'chats', chatId);
        if (!existingChatRecord) {
            throw new Error('Chat not found');
        }

        // Decrypt existing data
        const existingChat = await decryptFromStorage(existingChatRecord.encrypted_data);

        // Apply updates
        const updatedChat = {
            ...existingChat,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        // Re-encrypt updated data
        const encryptedData = await encryptForStorage(updatedChat);
        const updatedRecord = {
            ...existingChatRecord,
            encrypted_data: encryptedData,
            updatedAt: updatedChat.updatedAt
        };

        await putRecord(databaseName, 'chats', updatedRecord);

        return defaultSuccessHandler(updatedChat);
    } catch (error) {
        return defaultErrorHandler(error);
    }
};

/**
 * Get a chat by ID
 */
export const getChat = async (chatId) => {
    try {
        ensureAuthenticated();

        const databaseName = getCurrentUserDatabaseName();
        const chatRecord = await getRecord(databaseName, 'chats', chatId);

        if (!chatRecord) {
            return null;
        }

        const decryptedChat = await decryptFromStorage(chatRecord.encrypted_data);
        return defaultSuccessHandler(decryptedChat);
    } catch (error) {
        return defaultErrorHandler(error);
    }
};

/**
 * Get all chats for the current user
 */
export const getAllChats = async () => {
    try {
        ensureAuthenticated();

        const databaseName = getCurrentUserDatabaseName();
        const chatRecords = await getAllByIndex(databaseName, 'chats', 'updatedAt');

        const decryptedChats = [];

        // Decrypt all chats
        for (const record of chatRecords) {
            try {
                const decryptedChat = await decryptFromStorage(record.encrypted_data);
                decryptedChats.push(decryptedChat);
            } catch (decryptError) {
                console.error(`Failed to decrypt chat ${record.id}:`, decryptError);
                // Skip corrupted chats rather than failing entirely
            }
        }

        // Sort by updatedAt desc (newest first)
        const sortedChats = decryptedChats.sort((a, b) =>
            new Date(b.updatedAt) - new Date(a.updatedAt)
        );

        return defaultSuccessHandler(sortedChats);
    } catch (error) {
        return defaultErrorHandler(error);
    }
};

/**
 * Delete a chat (messages should be deleted separately via MessageRequests)
 */
export const deleteChat = async (chatId) => {
    try {
        ensureAuthenticated();

        const databaseName = getCurrentUserDatabaseName();
        await deleteRecord(databaseName, 'chats', chatId);

        return defaultSuccessHandler(true);
    } catch (error) {
        return defaultErrorHandler(error);
    }
};
