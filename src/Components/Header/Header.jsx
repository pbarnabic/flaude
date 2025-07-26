import React, {useState} from "react";
import {Eye, EyeOff, Key, Menu, Sparkles, Trash2, Code, Settings, MessageSquare, Edit2, Check, X} from "lucide-react";
import {MODELS} from "../../Constants/Models.js";
import {useChats} from "../../Contexts/ChatsContext.jsx";

const Header = ({
                    showApiKey,
                    setShowApiKey,
                    apiKey,
                    setApiKey,
                    handleClear,
                    showMobileMenu,
                    setShowMobileMenu,
                    artifacts,
                    showArtifacts,
                    setShowArtifacts,
                    setShowSettings,
                    modelSettings,
                    showChatSidebar,
                    setShowChatSidebar
                }) => {
    const {currentChat, updateChatById} = useChats();
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitle, setEditTitle] = useState('');

    const handleStartEdit = () => {
        if (currentChat) {
            setEditTitle(currentChat.title);
            setIsEditingTitle(true);
        }
    };

    const handleSaveTitle = async () => {
        if (!currentChat || !editTitle.trim()) {
            setIsEditingTitle(false);
            return;
        }

        try {
            await updateChatById(currentChat.id, {title: editTitle.trim()});
            setIsEditingTitle(false);
        } catch (error) {
            console.error('Error updating chat title:', error);
            setIsEditingTitle(false);
        }
    };

    const handleCancelEdit = () => {
        setIsEditingTitle(false);
        setEditTitle('');
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSaveTitle();
        } else if (e.key === 'Escape') {
            handleCancelEdit();
        }
    };

    return (
        <div className="bg-white/80 backdrop-blur-lg border-b border-slate-200 px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* Chat Sidebar Toggle - only show when sidebar is collapsed */}
                    {!showChatSidebar && (
                        <button
                            onClick={() => setShowChatSidebar(true)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-all hover:shadow-md"
                            title="Show chat list"
                        >
                            <MessageSquare className="w-5 h-5 text-slate-600"/>
                        </button>
                    )}

                    <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                        <Sparkles className="w-5 h-5 text-white"/>
                    </div>

                    <div className="flex flex-col">
                        {/* Editable title */}
                        <div className="flex items-center gap-2">
                            {isEditingTitle ? (
                                <div className="flex items-center gap-1">
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        onKeyDown={handleKeyPress}
                                        onBlur={handleSaveTitle}
                                        className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent bg-transparent border-b border-slate-300 focus:outline-none focus:border-blue-500 min-w-0 flex-1"
                                        autoFocus
                                        maxLength={100}
                                    />
                                    <button
                                        onClick={handleSaveTitle}
                                        className="p-1 hover:bg-slate-100 rounded text-green-600"
                                        title="Save"
                                    >
                                        <Check className="w-3 h-3"/>
                                    </button>
                                    <button
                                        onClick={handleCancelEdit}
                                        className="p-1 hover:bg-slate-100 rounded text-red-600"
                                        title="Cancel"
                                    >
                                        <X className="w-3 h-3"/>
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 group">
                                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                        {currentChat?.title || 'Flaude'}
                                    </h1>
                                    {currentChat && (
                                        <button
                                            onClick={handleStartEdit}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded transition-opacity"
                                            title="Rename chat"
                                        >
                                            <Edit2 className="w-3 h-3 text-slate-500"/>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Show chat date when we have a chat */}
                        {currentChat && !isEditingTitle && (
                            <div className="hidden sm:block text-xs text-slate-500">
                                {new Date(currentChat.updatedAt).toLocaleDateString()}
                            </div>
                        )}
                    </div>
                </div>

                {/* Always use mobile menu button */}
                <button
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <Menu className="w-5 h-5 text-slate-600"/>
                </button>
            </div>

            {/* Mobile Menu - now the only menu */}
            {showMobileMenu && (
                <div className="mt-4 space-y-3 pb-2">
                    {/* Model indicator */}
                    <div className="text-center text-xs bg-slate-100 px-2 py-1 rounded-full text-slate-600">
                        Current: {MODELS[modelSettings?.model] || 'Unknown Model'}
                    </div>

                    <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
                        <Key className="w-4 h-4 text-slate-500"/>
                        <input
                            type={showApiKey ? "text" : "password"}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter API Key"
                            className="bg-transparent text-sm flex-1 focus:outline-none placeholder:text-slate-400"
                        />
                        <button
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="text-slate-500 hover:text-slate-700 transition-colors"
                        >
                            {showApiKey ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                        </button>
                    </div>

                    <div className="flex gap-2">
                        {/* Chat List Toggle */}
                        <button
                            onClick={() => {
                                setShowChatSidebar(!showChatSidebar);
                                setShowMobileMenu(false);
                            }}
                            className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <MessageSquare className="w-4 h-4"/>
                            <span className="text-sm">Chats</span>
                        </button>

                        {/* Settings button */}
                        <button
                            onClick={() => {
                                setShowSettings(true);
                                setShowMobileMenu(false);
                            }}
                            className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <Settings className="w-4 h-4"/>
                            <span className="text-sm">Settings</span>
                        </button>
                    </div>

                    <div className="flex gap-2">
                        {/* Artifacts button */}
                        {Object.keys(artifacts || {}).length > 0 && (
                            <button
                                onClick={() => {
                                    setShowArtifacts(!showArtifacts);
                                    setShowMobileMenu(false);
                                }}
                                className={`flex-1 py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                                    showArtifacts
                                        ? 'bg-blue-100 text-blue-600'
                                        : 'bg-slate-100 hover:bg-slate-200'
                                }`}
                            >
                                <Code className="w-4 h-4"/>
                                <span className="text-sm">Artifacts</span>
                            </button>
                        )}

                        <button
                            onClick={() => {
                                handleClear();
                                setShowMobileMenu(false);
                            }}
                            className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <Trash2 className="w-4 h-4"/>
                            <span className="text-sm">Clear</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Header;
