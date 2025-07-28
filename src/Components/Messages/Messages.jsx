import React, {useEffect, useRef, useState} from "react";
import {Bot, Code, Database, FileText, Package, Search, Settings, Terminal} from "lucide-react";
import Message from "../Message/Message.jsx";
import LoadingDots from "../LoadingDots/LoadingDots.jsx";
import ImageDropZone from "../ImageDropZone/ImageDropZone.jsx";
import ImageDropIndicator from "../ImageDropIndicator/ImageDropIndicator.jsx";
import EmptyMessages from "../EmptyMessages/EmptyMessages.jsx";
import ViewImageModal from "../ViewImageModal/ViewImageModal.jsx";
import {ArtifactParsingUtilsV2} from "../../Utils/ArtifactParsingUtilsV2.js";

const Messages = ({
                      apiMessages = [],
                      isLoading,
                      handleEditSubmit,
                      streamingMessageId = null,
                      streamingContent = '',
                      streamingToolCalls,
                      onArtifactClick,
                      onImagesAdded // New prop for handling dropped images
                  }) => {
    const messagesEndRef = useRef(null);
    const [viewingImage, setViewingImage] = useState(null);
    const [showDropIndicator, setShowDropIndicator] = useState(false);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({behavior: "smooth"});
    }, [apiMessages, streamingContent]);

    // Handle images added to messages area
    const handleImagesAddedWithNotification = (newImages) => {
        onImagesAdded(newImages);

        // Show notification briefly
        setShowDropIndicator(true);
        setTimeout(() => {
            setShowDropIndicator(false);
        }, 3000);
    };

    // Use shared parsing utility - get all versions and latest artifacts
    const artifactVersions = ArtifactParsingUtilsV2.parseArtifactsFromMessages(apiMessages, streamingContent);
    const latestArtifacts = ArtifactParsingUtilsV2.getLatestArtifacts(artifactVersions);

    // Helper to get icon for tool calls
    const getToolIcon = (toolName) => {
        if (toolName === 'web_search') return <Search className="w-4 h-4"/>;
        if (toolName === 'web_fetch') return <Database className="w-4 h-4"/>;
        if (toolName === 'repl') return <Terminal className="w-4 h-4"/>;
        if (toolName.startsWith('artifacts')) return <Package className="w-4 h-4"/>;
        return <Settings className="w-4 h-4"/>;
    };

    const buildDisplayMessages = () => {
        const display = [];
        let id = 0;

        for (const msg of apiMessages) {
            if (msg.role === "user") {
                display.push({
                    id: id++,
                    type: "text",
                    role: "user",
                    content: msg.content,
                    images: msg.images, // Include images in display message
                    sourceMessageId: msg.id
                });
            } else if (msg.role === "assistant") {
                // Handle tool calls first
                if (Array.isArray(msg.content)) {
                    // Process tool calls and responses
                    const toolCalls = msg.content.filter(item => item.type === 'tool_use');

                    if (toolCalls.length > 0) {
                        display.push({
                            id: id++,
                            type: "tool_calls",
                            role: "assistant",
                            toolCalls: toolCalls,
                            sourceMessageId: msg.id
                        });
                    }

                    // Process text responses within the same message
                    const textItems = msg.content.filter(item => item.type === 'text');
                    for (const textItem of textItems) {
                        if (textItem.text && textItem.text.trim()) {
                            const segments = ArtifactParsingUtilsV2.parseSegments(textItem.text);
                            for (const segment of segments) {
                                if (segment.type === "text") {
                                    display.push({
                                        id: id++,
                                        type: "text",
                                        role: "assistant",
                                        content: segment.content
                                    });
                                } else if (segment.type === "artifact") {
                                    display.push({
                                        id: id++,
                                        type: "artifact",
                                        role: "assistant",
                                        artifactId: segment.id,
                                        artifact: latestArtifacts[segment.id],
                                        isStreaming: !segment.isComplete
                                    });
                                }
                            }
                        }
                    }
                } else if (typeof msg.content === "string") {
                    // Handle string content (legacy format)
                    const segments = ArtifactParsingUtilsV2.parseSegments(msg.content);
                    for (const segment of segments) {
                        if (segment.type === "text") {
                            display.push({
                                id: id++,
                                type: "text",
                                role: "assistant",
                                content: segment.content
                            });
                        } else if (segment.type === "artifact") {
                            display.push({
                                id: id++,
                                type: "artifact",
                                role: "assistant",
                                artifactId: segment.id,
                                artifact: latestArtifacts[segment.id],
                                isStreaming: !segment.isComplete
                            });
                        }
                    }
                }
            }
        }

        // Handle streaming tool calls (show loading state)
        if (streamingToolCalls?.length) {
            display.push({
                id: `stream-tools`,
                type: "tool_calls",
                role: "assistant",
                toolCalls: streamingToolCalls,
                isStreaming: true
            });
        }

        // Only add streaming content if there's a streaming message
        if (streamingContent && streamingMessageId) {
            const segments = ArtifactParsingUtilsV2.parseSegments(streamingContent, true);
            for (const segment of segments) {
                if (segment.type === "text") {
                    display.push({
                        id: `stream-text-${id++}`,
                        type: "text",
                        role: "assistant",
                        content: segment.content,
                        isStreaming: true
                    });
                } else if (segment.type === "artifact") {
                    display.push({
                        id: `stream-artifact-${segment.id}`,
                        type: "artifact",
                        role: "assistant",
                        artifactId: segment.id,
                        artifact: latestArtifacts[segment.id],
                        isStreaming: !segment.isComplete
                    });
                }
            }
        }

        return display;
    };

    const renderMessage = (msg) => {
        if (msg.type === "text") {
            return (
                <Message
                    key={msg.id}
                    message={msg}
                    onEditSubmit={handleEditSubmit}
                    isLoading={msg.isStreaming ? false : isLoading}
                    onViewImage={setViewingImage} // Pass image viewer handler
                />
            );
        }

        if (msg.type === "artifact") {
            if (!msg.artifact) return null;

            const artifact = msg.artifact;
            const icon = (artifact.type === "application/vnd.ant.code" || artifact.language) ? (
                <Code className="w-4 h-4"/>
            ) : (
                <FileText className="w-4 h-4"/>
            );

            // Get the display type/language
            const displayType = artifact.language ||
                (artifact.type ? artifact.type.split("/").pop() : "Unknown");

            return (
                <div key={msg.id} className="flex gap-2 sm:gap-3 justify-start w-full">
                    <div className="flex-shrink-0 w-8 h-8">
                        <div
                            className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                            <Bot className="w-5 h-5 text-white"/>
                        </div>
                    </div>
                    <div className="min-w-0 flex-1" style={{maxWidth: 'calc(100% - 2.5rem)'}}>
                        <button
                            onClick={() => onArtifactClick?.(msg.artifactId)}
                            className="w-full rounded-2xl px-3 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 shadow-sm hover:shadow-md transition-all hover:border-purple-300 cursor-pointer group"
                        >
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                <div
                                    className="flex-shrink-0 p-1.5 sm:p-2 bg-white rounded-lg shadow-sm group-hover:shadow transition-shadow">
                                    <Package className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600"/>
                                </div>
                                <div className="text-left min-w-0 flex-1 overflow-hidden">
                                    <div className="font-medium text-slate-800 truncate text-sm sm:text-base">
                                        {artifact.title || "Untitled Artifact"}
                                    </div>
                                    <div
                                        className="text-xs sm:text-sm text-slate-600 flex items-center gap-1 sm:gap-2 mt-0.5">
                                        {icon}
                                        <span className="truncate">{displayType}</span>
                                        {!artifact.isComplete && (
                                            <span className="text-amber-600 whitespace-nowrap">(In progress...)</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            );
        }

        if (msg.type === "tool_calls") {
            return (
                <div key={msg.id} className="flex gap-2 sm:gap-3 justify-start w-full">
                    <div className="flex-shrink-0 w-8 h-8">
                        <div
                            className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                            <Bot className="w-5 h-5 text-white"/>
                        </div>
                    </div>
                    <div className="min-w-0 flex-1" style={{maxWidth: 'calc(100% - 2.5rem)'}}>
                        <div className="space-y-2">
                            {msg.toolCalls.map((toolCall, index) => {
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
                                                        <span
                                                            className="truncate">{new URL(toolCall.input.url).hostname}</span>
                                                    )}
                                                    {msg.isStreaming && (
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
                                        key={`${msg.id}-tool-${index}`}
                                        onClick={() => onArtifactClick?.(artifactId)}
                                        className="w-full cursor-pointer group hover:scale-[1.01] transition-transform"
                                    >
                                        <ToolCallContent/>
                                    </button>
                                ) : (
                                    <div key={`${msg.id}-tool-${index}`}>
                                        <ToolCallContent/>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            );
        }

        return null;
    };

    const displayMessages = buildDisplayMessages();

    // Check if we should show empty state
    const shouldShowEmptyState = displayMessages.length === 0 && !isLoading && !streamingMessageId;


    return (
        <ImageDropZone
            className="flex-1 overflow-y-auto px-2 sm:px-4 py-6 w-full"
            showUploadButton={false}
            onImagesAdded={handleImagesAddedWithNotification}
        >
            <div className="max-w-4xl mx-auto w-full">
                {
                    shouldShowEmptyState ?
                        <EmptyMessages/>
                        : (
                            <div className="space-y-4">
                                {displayMessages.map(renderMessage)}
                                {isLoading && !streamingMessageId && !streamingToolCalls?.length && (
                                    <div className="flex gap-2 sm:gap-3 justify-start w-full">
                                        <div className="flex-shrink-0 w-8 h-8">
                                            <div
                                                className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                                                <Bot className="w-5 h-5 text-white"/>
                                            </div>
                                        </div>
                                        <div className="min-w-0 flex-1" style={{maxWidth: 'calc(100% - 2.5rem)'}}>
                                            <div
                                                className="rounded-2xl px-3 py-3 bg-white border border-slate-200 shadow-sm text-slate-800 w-full">
                                                <div className="flex items-center gap-3">
                                                    <LoadingDots/>
                                                    <span className="text-sm text-slate-600">Claude is thinking...</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                <div ref={messagesEndRef}/>
            </div>

            {/* Image viewer modal */}
            <ViewImageModal
                image={viewingImage}
                isOpen={!!viewingImage}
                onClose={() => setViewingImage(null)}
            />

            {/* Drop indicator */}
            <ImageDropIndicator isVisible={showDropIndicator}/>
        </ImageDropZone>
    );
};

export default Messages;
