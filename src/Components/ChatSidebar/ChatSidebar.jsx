import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useChats } from '../../Contexts/ChatsContext.jsx';
import { Plus, MessageSquare, Trash2, Edit2, X, Check, Loader } from 'lucide-react';

const ChatSidebar = ({ isOpen, onClose, modelSettings }) => {
    const {
        allChats,
        isLoadingChats,
        createNewChat,
        updateChatById,
        deleteChatById
    } = useChats();

    const [deletingChatId, setDeletingChatId] = useState(null);
    const [editingChatId, setEditingChatId] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const navigate = useNavigate();
    const { chatId } = useParams();

    const handleNewChat = async () => {
        try {
            const newChat = await createNewChat({ modelSettings });
            navigate(`/chats/${newChat.id}`);
            if (window.innerWidth < 768) {
                onClose();
            }
        } catch (error) {
            console.error('Error creating new chat:', error);
        }
    };

    const handleDeleteChat = async (chatIdToDelete, event) => {
        event.stopPropagation();

        if (!confirm('Are you sure you want to delete this chat?')) {
            return;
        }

        try {
            setDeletingChatId(chatIdToDelete);
            await deleteChatById(chatIdToDelete);

            // If we're deleting the current chat, navigate to another chat or home
            if (chatId === chatIdToDelete) {
                // Find the most recent chat that isn't the one being deleted
                const remainingChats = allChats.filter(chat => chat.id !== chatIdToDelete);

                if (remainingChats.length > 0) {
                    // Sort by updatedAt and navigate to the most recent
                    const mostRecentChat = remainingChats.sort((a, b) =>
                        new Date(b.updatedAt) - new Date(a.updatedAt)
                    )[0];
                    navigate(`/chats/${mostRecentChat.id}`);
                } else {
                    navigate('/');
                }
            }
        } catch (error) {
            console.error('Error deleting chat:', error);
        } finally {
            setDeletingChatId(null);
        }
    };

    const handleChatClick = (selectedChatId) => {
        if (editingChatId) return;
        navigate(`/chats/${selectedChatId}`);
        if (window.innerWidth < 768) {
            onClose();
        }
    };

    const handleStartEdit = (chat, event) => {
        event.stopPropagation();
        setEditingChatId(chat.id);
        setEditTitle(chat.title);
    };

    const handleSaveEdit = async () => {
        if (!editTitle.trim()) {
            handleCancelEdit();
            return;
        }

        try {
            await updateChatById(editingChatId, { title: editTitle.trim() });
            setEditingChatId(null);
            setEditTitle('');
        } catch (error) {
            console.error('Error updating chat title:', error);
            handleCancelEdit();
        }
    };

    const handleCancelEdit = () => {
        setEditingChatId(null);
        setEditTitle('');
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSaveEdit();
        } else if (e.key === 'Escape') {
            handleCancelEdit();
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const chatDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        if (chatDate.getTime() === today.getTime()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (chatDate.getTime() === yesterday.getTime()) {
            return 'Yesterday';
        } else if (now - date < 7 * 24 * 60 * 60 * 1000) {
            return date.toLocaleDateString([], { weekday: 'short' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    };

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <div className={`
                fixed top-0 left-0 h-full w-80 
                bg-gradient-to-b from-gray-900 via-gray-900 to-black
                border-r border-white/10
                z-50 transform transition-transform duration-300 ease-in-out
                md:translate-x-0 md:static md:z-0
                flex flex-col
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Glass overlay effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10 pointer-events-none" />

                {/* Header */}
                <div className="relative p-4 border-b border-white/10 flex-shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white">Chats</h2>
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                            title={window.innerWidth >= 1024 ? "Collapse sidebar" : "Close"}
                        >
                            <X className="w-5 h-5 text-gray-400 hover:text-white" />
                        </button>
                    </div>

                    <button
                        onClick={handleNewChat}
                        className="w-full flex items-center gap-2 px-4 py-3
                            bg-gradient-to-r from-blue-600 to-purple-600
                            hover:from-blue-700 hover:to-purple-700
                            text-white rounded-lg font-medium
                            transition-all duration-200 transform hover:scale-[1.02]
                            shadow-lg shadow-purple-500/20"
                    >
                        <Plus className="w-4 h-4" />
                        New Chat
                    </button>
                </div>

                {/* Chat List - This is the scrollable area */}
                <div className="flex-1 overflow-y-auto min-h-0">
                    <div className="py-2">
                        {isLoadingChats ? (
                            <div className="p-4 text-center">
                                <Loader className="w-6 h-6 mx-auto mb-2 text-purple-400 animate-spin" />
                                <p className="text-sm text-gray-400">Loading chats...</p>
                            </div>
                        ) : allChats.length === 0 ? (
                            <div className="p-4 text-center">
                                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500/20 to-blue-500/20
                                    rounded-full flex items-center justify-center mb-3">
                                    <MessageSquare className="w-8 h-8 text-purple-400" />
                                </div>
                                <p className="text-sm text-gray-400">No chats yet</p>
                                <p className="text-xs text-gray-500 mt-1">Start a new conversation!</p>
                            </div>
                        ) : (
                            <div className="space-y-1 px-2">
                                {allChats.map((chat) => (
                                    <div
                                        key={chat.id}
                                        onClick={() => handleChatClick(chat.id)}
                                        className={`
                                            group relative p-3 rounded-lg cursor-pointer
                                            transition-all duration-200
                                            ${chat.id === chatId
                                            ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30'
                                            : 'hover:bg-white/5 border border-transparent'
                                        }
                                            ${editingChatId === chat.id ? 'cursor-default' : ''}
                                        `}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                {editingChatId === chat.id ? (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="text"
                                                            value={editTitle}
                                                            onChange={(e) => setEditTitle(e.target.value)}
                                                            onKeyDown={handleKeyPress}
                                                            onBlur={handleSaveEdit}
                                                            className="flex-1 min-w-0 bg-white/10 border-b border-purple-400
                                                                text-white text-sm px-1 py-0.5
                                                                focus:outline-none focus:border-purple-300"
                                                            autoFocus
                                                            maxLength={100}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleSaveEdit();
                                                            }}
                                                            className="p-1 hover:bg-white/10 rounded text-green-400"
                                                            title="Save"
                                                        >
                                                            <Check className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleCancelEdit();
                                                            }}
                                                            className="p-1 hover:bg-white/10 rounded text-red-400"
                                                            title="Cancel"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 group/title">
                                                        <h3 className={`
                                                            font-medium text-sm truncate flex-1
                                                            ${chat.id === chatId ? 'text-white' : 'text-gray-300'}
                                                        `}>
                                                            {chat.title}
                                                        </h3>
                                                        <button
                                                            onClick={(e) => handleStartEdit(chat, e)}
                                                            className="opacity-0 group-hover/title:opacity-100
                                                                p-1 hover:bg-white/10 rounded transition-all"
                                                            title="Rename chat"
                                                        >
                                                            <Edit2 className="w-3 h-3 text-gray-400" />
                                                        </button>
                                                    </div>
                                                )}
                                                <p className={`
                                                    text-xs mt-1
                                                    ${chat.id === chatId ? 'text-purple-300' : 'text-gray-500'}
                                                `}>
                                                    {formatDate(chat.updatedAt)}
                                                </p>
                                            </div>

                                            {editingChatId !== chat.id && (
                                                <button
                                                    onClick={(e) => handleDeleteChat(chat.id, e)}
                                                    disabled={deletingChatId === chat.id}
                                                    className={`
                                                        ml-2 p-1.5 rounded opacity-0 group-hover:opacity-100
                                                        hover:bg-red-500/20 text-gray-400 hover:text-red-400
                                                        transition-all duration-200
                                                        ${deletingChatId === chat.id ? 'opacity-100' : ''}
                                                    `}
                                                >
                                                    {deletingChatId === chat.id ? (
                                                        <Loader className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="relative p-4 border-t border-white/10 flex-shrink-0">
                    <div className="text-xs text-gray-500 text-center">
                        <span className="bg-gradient-to-r from-purple-400 to-blue-400
                            bg-clip-text text-transparent font-medium">
                            Flaude
                        </span>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ChatSidebar;
