
import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Send, X } from "lucide-react";

const ChatInput = ({
                       canContinue,
                       isLoading,
                       handleSend,
                       input,
                       setInput,
                       apiKey,
                       handleStop,
                   }) => {
    const textareaRef = useRef(null);

    // Auto-resize textarea based on content
    const adjustTextareaHeight = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        // Create a hidden clone to measure height
        const clone = textarea.cloneNode();
        clone.style.position = 'absolute';
        clone.style.visibility = 'hidden';
        clone.style.height = 'auto';
        clone.style.minHeight = '0';
        clone.value = textarea.value;

        textarea.parentNode.appendChild(clone);
        const scrollHeight = clone.scrollHeight;
        clone.remove();

        // Set the actual height with min and max constraints
        const minHeight = 52;
        const maxHeight = 200;
        const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);

        textarea.style.height = `${newHeight}px`;
        textarea.style.overflowY = newHeight === maxHeight ? 'auto' : 'hidden';
    };

    useEffect(() => {
        adjustTextareaHeight();
    }, [input]);

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="border-t border-slate-200 bg-white/80 backdrop-blur-lg p-2 sm:p-4">
            <div className="max-w-4xl mx-auto">
                {canContinue && !isLoading && (
                    <div className="mb-3 flex justify-center">
                        <button
                            onClick={() => handleSend(true)}
                            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600
                                text-white rounded-lg hover:from-purple-600 hover:to-purple-700
                                transition-all duration-200 shadow-md shadow-purple-500/10
                                hover:shadow-lg hover:shadow-purple-500/20
                                flex items-center gap-2 transform hover:scale-[1.02]"
                        >
                            <RefreshCw className="w-4 h-4"/>
                            Continue
                        </button>
                    </div>
                )}
                <div className="flex gap-3 items-end">
                    <div className="flex-1 relative">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => {
                                setInput(e.target.value);
                                // Adjust height immediately on change
                                requestAnimationFrame(() => adjustTextareaHeight());
                            }}
                            onKeyPress={handleKeyPress}
                            placeholder={apiKey ? "Message Claude..." : "Please enter API key above"}
                            disabled={!apiKey || isLoading}
                            className="w-full p-3 pr-12 bg-slate-50 border border-slate-200
                                rounded-xl resize-none focus:outline-none focus:ring-2
                                focus:ring-purple-500 focus:border-transparent
                                disabled:bg-slate-100 disabled:text-slate-400
                                text-sm sm:text-base
                                hover:border-purple-200 focus:bg-white
                                scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-slate-100
                                overflow-hidden"
                            style={{
                                minHeight: '52px',
                                maxHeight: '200px',
                                transition: 'none' // Remove transition to prevent jumpiness
                            }}
                        />
                        {isLoading ? (
                            <button
                                onClick={handleStop}
                                className="absolute bottom-3 right-3 p-2 bg-gradient-to-r
                                    from-red-500 to-red-600 text-white rounded-lg
                                    hover:from-red-600 hover:to-red-700
                                    transition-all duration-200 shadow-md hover:shadow-lg
                                    transform hover:scale-[1.05]"
                            >
                                <X className="w-4 h-4"/>
                            </button>
                        ) : (
                            <button
                                onClick={() => handleSend()}
                                disabled={isLoading || !input.trim() || !apiKey}
                                className="absolute bottom-3 right-3 p-2 bg-gradient-to-r
                                    from-purple-500 to-purple-600 text-white rounded-lg
                                    hover:from-purple-600 hover:to-purple-700
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    transition-all duration-200 shadow-md hover:shadow-lg
                                    shadow-purple-500/10 hover:shadow-purple-500/20
                                    transform hover:scale-[1.05] disabled:transform-none"
                            >
                                <Send className="w-4 h-4"/>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ChatInput;
