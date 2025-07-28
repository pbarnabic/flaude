import React from "react";
import {Bot, Database, Package, Search, Settings, Terminal} from "lucide-react";
import LoadingDots from "../LoadingDots/LoadingDots.jsx";

const ToolCallMessage = ({message, onArtifactClick, latestArtifacts}) => {
    const getToolIcon = (toolName) => {
        if (toolName === 'web_search') return <Search className="w-4 h-4"/>;
        if (toolName === 'web_fetch') return <Database className="w-4 h-4"/>;
        if (toolName === 'repl') return <Terminal className="w-4 h-4"/>;
        if (toolName.startsWith('artifacts')) return <Package className="w-4 h-4"/>;
        return <Settings className="w-4 h-4"/>;
    };

    return (
        <div className="flex gap-2 sm:gap-3 justify-start w-full">
            <div className="flex-shrink-0 w-8 h-8">
                <div
                    className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                    <Bot className="w-5 h-5 text-white"/>
                </div>
            </div>
            <div className="min-w-0 flex-1" style={{maxWidth: 'calc(100% - 2.5rem)'}}>
                <div className="space-y-2">
                    {message.toolCalls.map((toolCall, index) => {
                        const isArtifactTool = toolCall.name === 'artifacts';
                        const artifactId = isArtifactTool ? toolCall.input?.id : null;
                        const isClickable = isArtifactTool && artifactId && latestArtifacts[artifactId];

                        const ToolCallContent = () => (
                            <div
                                className="rounded-2xl px-3 py-3 bg-gradient-to-r from-slate-50 to-gray-50 border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                    <div className="flex-shrink-0 p-1.5 sm:p-2 bg-white rounded-lg shadow-sm">
                                        {getToolIcon(toolCall.name)}
                                    </div>
                                    <div className="text-left min-w-0 flex-1 overflow-hidden">
                                        <div className="font-medium text-slate-800 text-sm sm:text-base">
                                            {toolCall.name === 'artifacts' ? 'Creating artifact' :
                                                toolCall.name === 'web_search' ? 'Searching the web' :
                                                    toolCall.name === 'web_fetch' ? 'Fetching web page' :
                                                        toolCall.name === 'repl' ? 'Running analysis' :
                                                            `Using ${toolCall.name}`}
                                        </div>
                                        <div className="text-xs sm:text-sm text-slate-600 mt-0.5">
                                            {isArtifactTool && toolCall.input?.title && (
                                                <span className="truncate">{toolCall.input.title}</span>
                                            )}
                                            {toolCall.name === 'web_search' && toolCall.input?.query && (
                                                <span className="truncate">"{toolCall.input.query}"</span>
                                            )}
                                            {toolCall.name === 'web_fetch' && toolCall.input?.url && (
                                                <span className="truncate">{new URL(toolCall.input.url).hostname}</span>
                                            )}
                                            {message.isStreaming && (
                                                <span className="text-amber-600 ml-2">
                                                    <LoadingDots size="sm"/>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );

                        return isClickable ? (
                            <button
                                key={`${message.id}-tool-${index}`}
                                onClick={() => onArtifactClick?.(artifactId)}
                                className="w-full cursor-pointer group hover:scale-[1.01] transition-transform"
                            >
                                <ToolCallContent/>
                            </button>
                        ) : (
                            <div key={`${message.id}-tool-${index}`}>
                                <ToolCallContent/>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ToolCallMessage;
