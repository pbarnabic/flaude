import React, {useState} from 'react';
import {Bot, Check, Edit3, User, X} from 'lucide-react';
import MarkdownRenderer from "../MarkdownRenderer/MarkdownRenderer.jsx";
import StreamingCursor from "../StreamingCursor/StreamingCursor.jsx";

const Message = ({message, onEditSubmit, isLoading}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content);

    const handleStartEdit = () => {
        setIsEditing(true);
        setEditContent(message.content);
    };

    const handleSaveEdit = () => {
        if (editContent.trim()) {
            onEditSubmit(message.id, editContent.trim());
            setIsEditing(false);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditContent(message.content);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSaveEdit();
        }
        if (e.key === 'Escape') {
            handleCancelEdit();
        }
    };

    if (message.role === 'user' && message?.content instanceof Array) { // we don't render tool calls
        return <></>;
    }

    // User message - editable
    if (message.role === 'user') {
        if (isEditing) {
            return (
                <div className="flex gap-2 sm:gap-3 justify-end group" style={{width: '100%'}}>
                    <div style={{flex: '1 1 0', minWidth: 0}}>
                        <div className="rounded-2xl bg-white border-2 border-blue-300 shadow-sm">
                            <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                onKeyDown={handleKeyPress}
                                className="w-full px-3 py-3 rounded-2xl resize-none text-sm sm:text-base text-slate-800 focus:outline-none"
                                rows="3"
                                autoFocus
                                disabled={isLoading}
                                style={{width: '100%'}}
                            />
                            <div className="flex gap-2 p-3 pt-0 flex-wrap">
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={isLoading || !editContent.trim()}
                                    className="flex items-center gap-1 px-3 py-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg text-sm transition-colors"
                                >
                                    <Check className="w-4 h-4"/>
                                    Save
                                </button>
                                <button
                                    onClick={handleCancelEdit}
                                    disabled={isLoading}
                                    className="flex items-center gap-1 px-3 py-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white rounded-lg text-sm transition-colors"
                                >
                                    <X className="w-4 h-4"/>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                    <div style={{flexShrink: 0}}>
                        <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center shadow-md">
                            <User className="w-5 h-5 text-white"/>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex gap-2 sm:gap-3 justify-end group" style={{width: '100%'}}>
                <div style={{flex: '1 1 0', minWidth: 0}}>
                    <div className="rounded-2xl px-3 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg relative"
                         style={{wordBreak: 'break-word', overflowWrap: 'anywhere'}}>
                        <p className="whitespace-pre-wrap text-sm sm:text-base">{`${message.content}`}</p>
                        <button
                            onClick={handleStartEdit}
                            disabled={isLoading}
                            className="absolute -left-6 sm:-left-8 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white hover:bg-gray-100 disabled:bg-gray-200 rounded-full shadow-md text-gray-600"
                            title="Edit message"
                        >
                            <Edit3 className="w-3 h-3 sm:w-4 sm:h-4"/>
                        </button>
                    </div>
                </div>
                <div style={{flexShrink: 0}}>
                    <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center shadow-md">
                        <User className="w-5 h-5 text-white"/>
                    </div>
                </div>
            </div>
        );
    }

    // Assistant message
    return (
        <div className="flex gap-2 sm:gap-3 justify-start" style={{width: '100%'}}>
            <div style={{flexShrink: 0}}>
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                    <Bot className="w-5 h-5 text-white"/>
                </div>
            </div>
            <div style={{flex: '1 1 0', minWidth: 0}}>
                <div className="rounded-2xl px-3 py-3 bg-white border border-slate-200 shadow-sm text-slate-800"
                     style={{wordBreak: 'break-word', overflowWrap: 'anywhere'}}>
                    <div className="text-sm sm:text-base">
                        <MarkdownRenderer content={message.content}/>
                        {message.isStreaming && <StreamingCursor/>}
                    </div>
                    {message.toolCalls && message.toolCalls.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-200">
                            <p className="text-xs text-slate-500">
                                🔧 Used {message.toolCalls.length} tool{message.toolCalls.length > 1 ? 's' : ''}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Message;
