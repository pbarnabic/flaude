import React from "react";
import {Bot} from "lucide-react";
import MarkdownRenderer from "../MarkdownRenderer/MarkdownRenderer.jsx";
import StreamingCursor from "../StreamingCursor/StreamingCursor.jsx";

const AssistantTextMessage = ({message}) => {
    return (
        <div className="flex gap-2 sm:gap-3 justify-start" style={{width: '100%'}}>
            <div style={{flexShrink: 0}}>
                <div
                    className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
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

export default AssistantTextMessage;
