import React, {useState} from 'react';
import {Bot, Check, Edit3, User, X} from 'lucide-react';

// Streaming cursor component
const StreamingCursor = () => (
    <span className="inline-block w-2 h-5 bg-blue-500 animate-pulse ml-1 align-text-bottom"></span>
);

// Simple markdown renderer (keeping the existing one)
const MarkdownRenderer = ({content}) => {
    const renderMarkdown = (text) => {
        if (!text) return [];

        const lines = text.split('\n');
        const elements = [];
        let currentCodeBlock = null;
        let currentCodeLanguage = '';
        let listItems = [];
        let inOrderedList = false;
        let inUnorderedList = false;

        const flushList = () => {
            if (listItems.length > 0) {
                if (inOrderedList) {
                    elements.push(
                        <ol key={`ol-${elements.length}`} className="list-decimal list-inside space-y-1 my-2 ml-4">
                            {listItems.map((item, idx) => (
                                <li key={idx} dangerouslySetInnerHTML={{__html: item}}/>
                            ))}
                        </ol>
                    );
                } else if (inUnorderedList) {
                    elements.push(
                        <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-1 my-2 ml-4">
                            {listItems.map((item, idx) => (
                                <li key={idx} dangerouslySetInnerHTML={{__html: item}}/>
                            ))}
                        </ul>
                    );
                }
                listItems = [];
                inOrderedList = false;
                inUnorderedList = false;
            }
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Code blocks
            if (line.startsWith('```')) {
                if (currentCodeBlock === null) {
                    flushList();
                    currentCodeLanguage = line.slice(3).trim();
                    currentCodeBlock = [];
                } else {
                    // End of code block
                    elements.push(
                        <div key={`code-${elements.length}`} className="my-3">
                            <div
                                className="bg-slate-800 rounded-t-lg px-3 py-2 text-xs text-slate-300 font-mono border-b border-slate-700">
                                {currentCodeLanguage || 'code'}
                            </div>
                            <pre className="bg-slate-900 rounded-b-lg p-3 overflow-x-auto">
                                <code className="text-slate-300 text-sm font-mono">
                                    {currentCodeBlock.join('\n')}
                                </code>
                            </pre>
                        </div>
                    );
                    currentCodeBlock = null;
                    currentCodeLanguage = '';
                }
                continue;
            }

            if (currentCodeBlock !== null) {
                currentCodeBlock.push(line);
                continue;
            }

            // Headers
            if (line.startsWith('# ')) {
                flushList();
                elements.push(
                    <h1 key={`h1-${elements.length}`} className="text-xl font-bold my-3 text-slate-800">
                        {line.slice(2)}
                    </h1>
                );
                continue;
            }
            if (line.startsWith('## ')) {
                flushList();
                elements.push(
                    <h2 key={`h2-${elements.length}`} className="text-lg font-bold my-2 text-slate-800">
                        {line.slice(3)}
                    </h2>
                );
                continue;
            }
            if (line.startsWith('### ')) {
                flushList();
                elements.push(
                    <h3 key={`h3-${elements.length}`} className="text-base font-bold my-2 text-slate-800">
                        {line.slice(4)}
                    </h3>
                );
                continue;
            }

            // Lists
            const orderedMatch = line.match(/^(\d+)\.\s+(.+)$/);
            const unorderedMatch = line.match(/^[-*+]\s+(.+)$/);

            if (orderedMatch) {
                if (!inOrderedList) {
                    flushList();
                    inOrderedList = true;
                }
                listItems.push(processInlineMarkdown(orderedMatch[2]));
                continue;
            }

            if (unorderedMatch) {
                if (!inUnorderedList) {
                    flushList();
                    inUnorderedList = true;
                }
                listItems.push(processInlineMarkdown(unorderedMatch[1]));
                continue;
            }

            // Not a list item, flush any pending list
            flushList();

            // Empty line
            if (line.trim() === '') {
                elements.push(<br key={`br-${elements.length}`}/>);
                continue;
            }

            // Regular paragraph
            elements.push(
                <p key={`p-${elements.length}`} className="my-1"
                   dangerouslySetInnerHTML={{__html: processInlineMarkdown(line)}}/>
            );
        }

        // Flush any remaining list
        flushList();

        return elements;
    };

    const processInlineMarkdown = (text) => {
        return text
            // Bold
            .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
            .replace(/__(.+?)__/g, '<strong class="font-semibold">$1</strong>')
            // Italic
            .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
            .replace(/_(.+?)_/g, '<em class="italic">$1</em>')
            // Inline code
            .replace(/`(.+?)`/g, '<code class="bg-slate-200 px-1 py-0.5 rounded text-sm font-mono text-slate-800">$1</code>')
            // Links
            .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$1</a>');
    };

    return (
        <div className="markdown-content">
            {renderMarkdown(content)}
        </div>
    );
};

// Message component without fake streaming
const Message = ({message, onEditSubmit, isLoading}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content);

    // Edit handlers
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
                <div className="flex gap-3 justify-end group">
                    <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl bg-white border-2 border-blue-300 shadow-sm">
                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onKeyDown={handleKeyPress}
                            className="w-full px-4 py-3 rounded-2xl resize-none text-sm sm:text-base text-slate-800 focus:outline-none"
                            rows="3"
                            autoFocus
                            disabled={isLoading}
                        />
                        <div className="flex gap-2 p-3 pt-0">
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
                    <div className="flex-shrink-0">
                        <div
                            className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center shadow-md">
                            <User className="w-5 h-5 text-white"/>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex gap-3 justify-end group">
                <div
                    className="max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg relative">
                    <p className="whitespace-pre-wrap text-sm sm:text-base">{`${message.content}`}</p>
                    <button
                        onClick={handleStartEdit}
                        disabled={isLoading}
                        className="absolute -left-8 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white hover:bg-gray-100 disabled:bg-gray-200 rounded-full shadow-md text-gray-600"
                        title="Edit message"
                    >
                        <Edit3 className="w-4 h-4"/>
                    </button>
                </div>
                <div className="flex-shrink-0">
                    <div
                        className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center shadow-md">
                        <User className="w-5 h-5 text-white"/>
                    </div>
                </div>
            </div>
        );
    }

    // Assistant message
    return (
        <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0">
                <div
                    className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                    <Bot className="w-5 h-5 text-white"/>
                </div>
            </div>
            <div
                className="max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 bg-white border border-slate-200 shadow-sm text-slate-800">
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
    );
};

export default Message;
