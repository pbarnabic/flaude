import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    createChat,
    updateChat,
    getChat,
    getAllChats,
    deleteChat
} from '../Requests/ChatRequests.js';
import {
    putChatMessages,
    getMessagesByChatId
} from '../Requests/MessageRequests.js';
import {
    setCurrentUser,
    clearCurrentUser
} from '../Auth/UserSessionManager.js';
import { useAuthentication } from './AuthenticationContext.jsx';

const ChatsContext = createContext();

export const useChats = () => {
    const context = useContext(ChatsContext);
    if (!context) {
        throw new Error('useChats must be used within a ChatsProvider');
    }
    return context;
};

export const ChatsProvider = ({ children }) => {
    const passwordCtx = useAuthentication();
    const { isAuthenticated, currentUsername, isLoading: isPasswordLoading } = passwordCtx;

    // Chat list state
    const [allChats, setAllChats] = useState([]);
    const [isLoadingChats, setIsLoadingChats] = useState(true);

    // Current chat state
    const [currentChat, setCurrentChat] = useState(null);
    const [currentMessages, setCurrentMessages] = useState([]);
    const [isLoadingCurrentChat, setIsLoadingCurrentChat] = useState(false);

    // Database setup state
    const [isDatabaseReady, setIsDatabaseReady] = useState(false);

    // Set up user database when authenticated
    useEffect(() => {
        const setupDatabase = async () => {
            if (isAuthenticated && currentUsername && !isPasswordLoading) {
                try {
                    setIsDatabaseReady(false);

                    // Set the current user for the database layer with password context
                    setCurrentUser(currentUsername, passwordCtx);

                    setIsDatabaseReady(true);

                    // Now load chats directly (bypass the guard since we just set up the database)
                    try {
                        setIsLoadingChats(true);
                        const chats = await getAllChats();
                        setAllChats(chats);
                    } catch (error) {
                        console.error('Error loading chats:', error);
                        setAllChats([]);
                    } finally {
                        setIsLoadingChats(false);
                    }
                } catch (error) {
                    console.error('Error setting up user database:', error);
                    setIsDatabaseReady(false);
                    setIsLoadingChats(false);
                }
            } else {
                // Clear data when not authenticated
                setAllChats([]);
                setCurrentChat(null);
                setCurrentMessages([]);
                setIsDatabaseReady(false);
                setIsLoadingChats(true); // Reset to loading state when not authenticated

                // Clear user from database layer
                try {
                    clearCurrentUser();
                } catch (error) {
                    console.error('Error clearing user:', error);
                }
            }
        };

        setupDatabase();
    }, [isAuthenticated, currentUsername, isPasswordLoading, passwordCtx]);

    // Helper function to check if operations can proceed
    const canPerformDatabaseOperations = () => {
        return isAuthenticated && isDatabaseReady && !isPasswordLoading;
    };

    // Chat list operations
    const loadAllChats = async () => {
        if (!canPerformDatabaseOperations()) {
            console.warn('Cannot load chats: authentication not ready');
            setIsLoadingChats(false);
            return;
        }

        try {
            setIsLoadingChats(true);
            const chats = await getAllChats();
            setAllChats(chats);
        } catch (error) {
            console.error('Error loading chats:', error);
            setAllChats([]);
        } finally {
            setIsLoadingChats(false);
        }
    };

    const createNewChat = async (chatData = {}) => {
        if (!canPerformDatabaseOperations()) {
            throw new Error('Cannot create chat: authentication not ready');
        }

        try {
            const newChat = await createChat(chatData);
            setAllChats(prev => [newChat, ...prev]);
            return newChat;
        } catch (error) {
            console.error('Error creating chat:', error);
            throw error;
        }
    };

    const updateChatById = async (chatId, updates) => {
        if (!canPerformDatabaseOperations()) {
            throw new Error('Cannot update chat: authentication not ready');
        }

        try {
            const updatedChat = await updateChat(chatId, updates);

            // Update in all chats list
            setAllChats(prev =>
                prev.map(chat => chat.id === chatId ? updatedChat : chat)
            );

            // Update current chat if it's the one being updated
            if (currentChat?.id === chatId) {
                setCurrentChat(updatedChat);
            }

            return updatedChat;
        } catch (error) {
            console.error('Error updating chat:', error);
            throw error;
        }
    };

    const deleteChatById = async (chatId) => {
        if (!canPerformDatabaseOperations()) {
            throw new Error('Cannot delete chat: authentication not ready');
        }

        try {
            await deleteChat(chatId);

            // Remove from all chats list
            setAllChats(prev => prev.filter(chat => chat.id !== chatId));

            // Clear current chat if it's the one being deleted
            if (currentChat?.id === chatId) {
                setCurrentChat(null);
                setCurrentMessages([]);
            }

            return true;
        } catch (error) {
            console.error('Error deleting chat:', error);
            throw error;
        }
    };

    // Current chat operations
    const loadCurrentChat = async (chatId) => {
        if (!canPerformDatabaseOperations()) {
            throw new Error('Cannot load chat: authentication not ready');
        }

        if (!chatId) {
            setCurrentChat(null);
            setCurrentMessages([]);
            return;
        }

        try {
            setIsLoadingCurrentChat(true);

            // Load chat data
            const chat = await getChat(chatId);
            if (!chat) {
                throw new Error('Chat not found');
            }

            setCurrentChat(chat);

            // Load messages
            const messages = await getMessagesByChatId(chatId);
            // Convert to the format expected by the existing code
            const formattedMessages = messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));
            setCurrentMessages(formattedMessages);

            return chat;
        } catch (error) {
            console.error('Error loading current chat:', error);
            setCurrentChat(null);
            setCurrentMessages([]);
            throw error;
        } finally {
            setIsLoadingCurrentChat(false);
        }
    };

    const updateCurrentChatMessages = async (messages) => {
        if (!canPerformDatabaseOperations()) {
            console.warn('Cannot save messages: authentication not ready');
            return;
        }

        setCurrentMessages(messages);

        // Auto-save with debouncing handled by the component
        if (currentChat) {
            try {
                return await putChatMessages(currentChat.id, messages);
            } catch (error) {
                console.error('Error saving messages:', error);
                throw error;
            }
        }
    };

    const clearCurrentChatMessages = async () => {
        if (!canPerformDatabaseOperations()) {
            console.warn('Cannot clear messages: authentication not ready');
            return;
        }

        setCurrentMessages([]);

        if (currentChat) {
            try {
                await putChatMessages(currentChat.id, []);
            } catch (error) {
                console.error('Error clearing messages:', error);
                throw error;
            }
        }
    };

    // Helper function to get a chat by ID from the loaded list
    const getChatById = (chatId) => {
        return allChats.find(chat => chat.id === chatId) || null;
    };

    // Helper function to refresh current chat (for when it's updated elsewhere)
    const refreshCurrentChat = async () => {
        if (!canPerformDatabaseOperations()) {
            console.warn('Cannot refresh chat: authentication not ready');
            return;
        }

        if (currentChat?.id) {
            try {
                const updatedChat = await getChat(currentChat.id);
                if (updatedChat) {
                    setCurrentChat(updatedChat);

                    // Also update in the all chats list
                    setAllChats(prev =>
                        prev.map(chat => chat.id === updatedChat.id ? updatedChat : chat)
                    );
                }
            } catch (error) {
                console.error('Error refreshing current chat:', error);
            }
        }
    };

    const contextValue = {
        // Chat list state
        allChats,
        isLoadingChats,

        // Current chat state
        currentChat,
        currentMessages,
        isLoadingCurrentChat,

        // Database ready state
        isDatabaseReady,

        // Chat list operations
        loadAllChats,
        createNewChat,
        updateChatById,
        deleteChatById,
        getChatById,

        // Current chat operations
        loadCurrentChat,
        updateCurrentChatMessages,
        clearCurrentChatMessages,
        refreshCurrentChat,

        // Direct state setters (for advanced use cases)
        setCurrentChat,
        setCurrentMessages,
        setAllChats,

        // Helper functions
        canPerformDatabaseOperations
    };

    return (
        <ChatsContext.Provider value={contextValue}>
            {children}
        </ChatsContext.Provider>
    );
};
