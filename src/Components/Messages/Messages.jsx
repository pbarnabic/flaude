import React, {useEffect, useRef} from "react";
import { Bot, Code, FileText } from "lucide-react";
import LoadingDots from '../LoadingDots/LoadingDots.jsx';
import Message from '../Message/Message.jsx';

const Messages = ({
                      messages,
                      isLoading,
                      handleEditSubmit
                  }) => {

    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
    }, [messages]);

    return (
        <div className="flex-1 overflow-y-auto px-4 py-6">
            {messages.length === 0 && !isLoading && (
                <div className="max-w-2xl mx-auto text-center mt-8">
                    <div className="inline-flex p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-2xl mb-6">
                        <Bot className="w-12 h-12 text-white"/>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Start a conversation with Claude</h2>
                    <p className="text-slate-600 mb-8">Enter your API key above to begin</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                            <Code className="w-8 h-8 text-blue-500 mb-2"/>
                            <h3 className="font-semibold text-slate-800 mb-1">Write Code</h3>
                            <p className="text-sm text-slate-600">
                                Ask me to create applications, debug code, or explain programming concepts
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                            <FileText className="w-8 h-8 text-purple-500 mb-2"/>
                            <h3 className="font-semibold text-slate-800 mb-1">Analyze Data</h3>
                            <p className="text-sm text-slate-600">
                                I can help you process data, create visualizations, and generate insights
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-4xl mx-auto space-y-4">
                {messages.filter(m => m.role !== 'tool_result').map((message) => (
                    <Message
                        key={message.id}
                        message={message}
                        onEditSubmit={handleEditSubmit}
                        isLoading={isLoading}
                    />
                ))}

                {/* Loading message when API is processing */}
                {isLoading && (
                    <div className="flex gap-3 justify-start">
                        <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                                <Bot className="w-5 h-5 text-white"/>
                            </div>
                        </div>
                        <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 bg-white border border-slate-200 shadow-sm text-slate-800">
                            <div className="flex items-center gap-3">
                                <LoadingDots />
                                <span className="text-sm text-slate-600">Claude is doing matrix muliplication...</span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef}/>
            </div>
        </div>
    );
}

export default Messages;
