import {RefreshCw, Send, X} from "lucide-react";
import React from "react";

const ChatInput = ({
                       canContinue,
                       isLoading,
                       handleSend,
                       input,
                       setInput,
                       apiKey,
                       handleStop,
                   }) => {

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="border-t border-slate-200 bg-white/80 backdrop-blur-lg p-4">
            <div className="max-w-4xl mx-auto">
                {canContinue && !isLoading && (
                    <div className="mb-3 flex justify-center">
                        <button
                            onClick={() => handleSend(true)}
                            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4"/>
                            Continue
                        </button>
                    </div>
                )}
                <div className="flex gap-3 items-end">
                    <div className="flex-1 relative">
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder={apiKey ? "Message Claude..." : "Please enter API key above"}
                                    disabled={!apiKey || isLoading}
                                    className="w-full p-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-400 text-sm sm:text-base transition-all"
                                    rows="3"
                                />
                        {isLoading ? (
                            <button
                                onClick={handleStop}
                                className="absolute bottom-3 right-3 p-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg"
                            >
                                <X className="w-4 h-4"/>
                            </button>
                        ) : (
                            <button
                                onClick={() => handleSend()}
                                disabled={isLoading || !input.trim() || !apiKey}
                                className="absolute bottom-3 right-3 p-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
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
