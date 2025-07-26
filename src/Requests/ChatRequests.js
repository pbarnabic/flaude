// User-specific database management
let currentUsername = null;
let passwordContext = null;
let currentDB = null;

export const setCurrentUser = (username, context = null) => {
    currentUsername = username;
    passwordContext = context;
    currentDB = null; // Reset DB connection
};

export const clearCurrentUser = () => {
    currentUsername = null;
    passwordContext = null;
    currentDB = null;
};

const getUserDatabaseName = (username) => {
    const safeUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `ClaudeChatDB_${safeUsername}`;
};

class UserChatDatabase {
    constructor() {
        this.db = null;
    }

    async init() {
        if (!currentUsername) {
            throw new Error('No current user set');
        }

        const dbName = getUserDatabaseName(currentUsername);

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, 2);

            request.onerror = () => reject(request.error);

            request.onsuccess = () => {
                this.db = request.result;
                currentDB = this.db;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create chats store
                if (!db.objectStoreNames.contains('chats')) {
                    const chatStore = db.createObjectStore('chats', { keyPath: 'id' });
                    chatStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                    chatStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Create messages store
                if (!db.objectStoreNames.contains('messages')) {
                    const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
                    messageStore.createIndex('chatId', 'chatId', { unique: false });
                    messageStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Create settings store for user preferences
                if (!db.objectStoreNames.contains('settings')) {
                    const settingsStore = db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    async ensureInitialized() {
        if (!this.db || !currentDB) {
            await this.init();
        }
    }
}

const chatDB = new UserChatDatabase();

// Helper function to encrypt data before storage
const encryptForStorage = async (data) => {
    if (!passwordContext || !passwordContext.encryptData) {
        throw new Error('No encryption context available - user not authenticated');
    }
    return await passwordContext.encryptData(data);
};

// Helper function to decrypt data after retrieval
const decryptFromStorage = async (encryptedData) => {
    if (!passwordContext || !passwordContext.decryptData) {
        throw new Error('No decryption context available - user not authenticated');
    }
    return await passwordContext.decryptData(encryptedData);
};

// Rate Limits Operations
export const saveRateLimits = async (rateLimits) => {
    await chatDB.ensureInitialized();

    try {
        const encryptedData = await encryptForStorage(rateLimits);
        const settingRecord = {
            key: 'rateLimits',
            encrypted_data: encryptedData,
            updatedAt: new Date().toISOString()
        };

        return new Promise((resolve, reject) => {
            const transaction = chatDB.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.put(settingRecord);

            request.onsuccess = () => resolve(rateLimits);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        throw error;
    }
};

export const getRateLimits = async () => {
    await chatDB.ensureInitialized();

    return new Promise((resolve, reject) => {
        const transaction = chatDB.db.transaction(['settings'], 'readonly');
        const store = transaction.objectStore('settings');
        const request = store.get('rateLimits');

        request.onsuccess = async () => {
            const settingRecord = request.result;
            if (!settingRecord) {
                resolve({});
                return;
            }

            try {
                const decryptedRateLimits = await decryptFromStorage(settingRecord.encrypted_data);
                resolve(decryptedRateLimits);
            } catch (decryptError) {
                console.error('Failed to decrypt rate limits:', decryptError);
                resolve({});
            }
        };
        request.onerror = () => reject(request.error);
    });
};

// Chat Operations
export const createChat = async (chatData = {}) => {
    await chatDB.ensureInitialized();

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

    try {
        // Encrypt the chat data BEFORE starting the transaction
        const encryptedData = await encryptForStorage(chat);
        const chatRecord = {
            id: chat.id,
            encrypted_data: encryptedData,
            updatedAt: chat.updatedAt, // Keep unencrypted for indexing
            createdAt: chat.createdAt   // Keep unencrypted for indexing
        };

        // Now start the transaction with the encrypted data ready
        return new Promise((resolve, reject) => {
            const transaction = chatDB.db.transaction(['chats'], 'readwrite');
            const store = transaction.objectStore('chats');

            const request = store.add(chatRecord);
            request.onsuccess = () => resolve(chat);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        throw error;
    }
};

export const updateChat = async (chatId, updates) => {
    await chatDB.ensureInitialized();

    // First, get the existing chat and decrypt it
    const existingChatRecord = await new Promise((resolve, reject) => {
        const transaction = chatDB.db.transaction(['chats'], 'readonly');
        const store = transaction.objectStore('chats');
        const getRequest = store.get(chatId);

        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = () => reject(getRequest.error);
    });

    if (!existingChatRecord) {
        throw new Error('Chat not found');
    }

    try {
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

        // Now update in database
        return new Promise((resolve, reject) => {
            const transaction = chatDB.db.transaction(['chats'], 'readwrite');
            const store = transaction.objectStore('chats');
            const putRequest = store.put(updatedRecord);

            putRequest.onsuccess = () => resolve(updatedChat);
            putRequest.onerror = () => reject(putRequest.error);
        });
    } catch (error) {
        throw error;
    }
};

export const getChat = async (chatId) => {
    await chatDB.ensureInitialized();

    // Get the encrypted chat record
    const chatRecord = await new Promise((resolve, reject) => {
        const transaction = chatDB.db.transaction(['chats'], 'readonly');
        const store = transaction.objectStore('chats');
        const request = store.get(chatId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    if (!chatRecord) {
        return null;
    }

    try {
        // Decrypt the chat data
        const decryptedChat = await decryptFromStorage(chatRecord.encrypted_data);
        return decryptedChat;
    } catch (decryptError) {
        throw decryptError;
    }
};

export const getAllChats = async () => {
    await chatDB.ensureInitialized();

    return new Promise(async (resolve, reject) => {
        try {
            const transaction = chatDB.db.transaction(['chats'], 'readonly');
            const store = transaction.objectStore('chats');
            const index = store.index('updatedAt');
            const request = index.getAll();

            request.onsuccess = async () => {
                try {
                    const chatRecords = request.result;
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
                    resolve(sortedChats);
                } catch (error) {
                    reject(error);
                }
            };
            request.onerror = () => reject(request.error);
        } catch (error) {
            reject(error);
        }
    });
};

export const deleteChat = async (chatId) => {
    await chatDB.ensureInitialized();

    return new Promise((resolve, reject) => {
        const transaction = chatDB.db.transaction(['chats', 'messages'], 'readwrite');
        const chatStore = transaction.objectStore('chats');
        const messageStore = transaction.objectStore('messages');

        // Delete all messages for this chat
        const messageIndex = messageStore.index('chatId');
        const messageRequest = messageIndex.getAll(chatId);

        messageRequest.onsuccess = () => {
            const messages = messageRequest.result;
            messages.forEach(message => {
                messageStore.delete(message.id);
            });

            // Delete the chat
            const chatRequest = chatStore.delete(chatId);
            chatRequest.onsuccess = () => resolve(true);
            chatRequest.onerror = () => reject(chatRequest.error);
        };
        messageRequest.onerror = () => reject(messageRequest.error);
    });
};

// Message Operations
export const saveMessages = async (chatId, messages) => {
    await chatDB.ensureInitialized();

    const now = new Date().toISOString();

    try {
        // Prepare all encrypted message records first
        const encryptedMessageRecords = [];
        for (let index = 0; index < messages.length; index++) {
            const message = messages[index];
            const messageData = {
                id: `${chatId}_${index}`,
                chatId,
                content: message.content,
                role: message.role,
                timestamp: now,
                index
            };

            const encryptedData = await encryptForStorage(messageData);
            encryptedMessageRecords.push({
                id: messageData.id,
                chatId: messageData.chatId,
                encrypted_data: encryptedData,
                timestamp: messageData.timestamp,
                index: messageData.index
            });
        }

        // Get and process chat data for title update
        let updatedChatRecord = null;
        if (messages.length > 0) {
            // Get current chat
            const currentChatRecord = await new Promise((resolve, reject) => {
                const transaction = chatDB.db.transaction(['chats'], 'readonly');
                const store = transaction.objectStore('chats');
                const getChatRequest = store.get(chatId);

                getChatRequest.onsuccess = () => resolve(getChatRequest.result);
                getChatRequest.onerror = () => reject(getChatRequest.error);
            });

            if (currentChatRecord) {
                try {
                    const chat = await decryptFromStorage(currentChatRecord.encrypted_data);
                    chat.updatedAt = now;

                    // Auto-generate title from first user message if still "New Chat"
                    if (chat.title === 'New Chat') {
                        const firstUserMessage = messages.find(m => m.role === 'user');
                        if (firstUserMessage && typeof firstUserMessage.content === 'string') {
                            chat.title = generateChatTitle(firstUserMessage.content);
                        }
                    }

                    const encryptedChatData = await encryptForStorage(chat);
                    updatedChatRecord = {
                        ...currentChatRecord,
                        encrypted_data: encryptedChatData,
                        updatedAt: chat.updatedAt
                    };
                } catch (error) {
                    console.error('Error preparing chat update:', error);
                }
            }
        }

        // Now perform all database operations in a single transaction
        return new Promise((resolve, reject) => {
            const transaction = chatDB.db.transaction(['messages', 'chats'], 'readwrite');
            const messageStore = transaction.objectStore('messages');
            const chatStore = transaction.objectStore('chats');

            // Clear existing messages for this chat
            const messageIndex = messageStore.index('chatId');
            const deleteRequest = messageIndex.getAll(chatId);

            deleteRequest.onsuccess = () => {
                const existingMessages = deleteRequest.result;
                existingMessages.forEach(message => {
                    messageStore.delete(message.id);
                });

                // Add new encrypted messages
                encryptedMessageRecords.forEach(messageRecord => {
                    messageStore.add(messageRecord);
                });

                // Update chat if we have updated data
                if (updatedChatRecord) {
                    chatStore.put(updatedChatRecord);
                }

                resolve(true);
            };
            deleteRequest.onerror = () => reject(deleteRequest.error);
        });
    } catch (error) {
        throw error;
    }
};

export const getMessages = async (chatId) => {
    await chatDB.ensureInitialized();

    // Get all encrypted message records for this chat
    const messageRecords = await new Promise((resolve, reject) => {
        const transaction = chatDB.db.transaction(['messages'], 'readonly');
        const store = transaction.objectStore('messages');
        const index = store.index('chatId');
        const request = index.getAll(chatId);

        request.onsuccess = () => {
            const records = request.result.sort((a, b) => a.index - b.index);
            resolve(records);
        };
        request.onerror = () => reject(request.error);
    });

    // Decrypt all messages
    const messages = [];
    for (const record of messageRecords) {
        try {
            const decryptedMessage = await decryptFromStorage(record.encrypted_data);
            messages.push({
                role: decryptedMessage.role,
                content: decryptedMessage.content
            });
        } catch (decryptError) {
            console.error(`Failed to decrypt message ${record.id}:`, decryptError);
            // Skip corrupted messages
        }
    }

    return messages;
};

// Utility functions
const generateChatId = () => {
    return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const generateChatTitle = (firstMessage) => {
    if (!firstMessage || typeof firstMessage !== 'string') return 'New Chat';

    // Take first 50 characters and clean up
    let title = firstMessage.slice(0, 50).trim();

    // Remove common prefixes
    title = title.replace(/^(please|can you|could you|help me|i need|i want)/i, '').trim();

    // Capitalize first letter
    if (title.length > 0) {
        title = title.charAt(0).toUpperCase() + title.slice(1);
    }

    // Add ellipsis if truncated
    if (firstMessage.length > 50) {
        title += '...';
    }

    return title || 'New Chat';
};

// Export the database instance for advanced operations if needed
export { chatDB };
