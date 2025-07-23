import React, {useEffect, useRef} from "react";
import {Bot, Code, FileText, Package} from "lucide-react";
import Message from "../Message/Message.jsx";
import LoadingDots from "../LoadingDots/LoadingDots.jsx";
import {ArtifactParsingUtils} from "../../Utils/ArtifactParsingUtils.js";

const Messages = ({
                      apiMessages = [],
                      isLoading,
                      handleEditSubmit,
                      streamingMessageId = null,
                      streamingContent = '',
                      streamingToolCalls,
                      onArtifactClick
                  }) => {
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [apiMessages, streamingContent]);

    // Use shared parsing utility - get all versions and latest artifacts
    const artifactVersions = ArtifactParsingUtils.parseArtifactsFromMessages(apiMessages, streamingContent);
    const latestArtifacts = ArtifactParsingUtils.getLatestArtifacts(artifactVersions);

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
                    sourceMessageId: msg.id
                });
            } else if (msg.role === "assistant" && typeof msg.content === "string") {
                const segments = ArtifactParsingUtils.parseSegments(msg.content);
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
                            artifact: latestArtifacts[segment.id], // Use latest artifacts
                            isStreaming: !segment.isComplete
                        });
                    }
                }
            }
        }

        // Only add streaming content if there's a streaming message
        if (streamingContent && streamingMessageId) {
            const segments = ArtifactParsingUtils.parseSegments(streamingContent, true);
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
                        artifact: latestArtifacts[segment.id], // Use latest artifacts
                        isStreaming: !segment.isComplete
                    });
                }
            }
        }

        if (streamingToolCalls?.length) {
            display.push({
                id: `stream-tools`,
                type: "tools",
                role: "assistant",
                toolCalls: streamingToolCalls
            });
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
                />
            );
        }

        if (msg.type === "artifact") {
            if (!msg.artifact) return null;

            const artifact = msg.artifact;
            const icon = (artifact.type === "application/vnd.ant.code" || artifact.language) ? (
                <Code className="w-4 h-4" />
            ) : (
                <FileText className="w-4 h-4" />
            );

            // Get the display type/language
            const displayType = artifact.language ||
                (artifact.type ? artifact.type.split("/").pop() : "Unknown");

            return (
                <div key={msg.id} className="flex gap-3 justify-start">
                    <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                    </div>
                    <button
                        onClick={() => onArtifactClick?.(msg.artifactId)}
                        className="max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 shadow-sm hover:shadow-md transition-all hover:border-purple-300 cursor-pointer group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 p-2 bg-white rounded-lg shadow-sm group-hover:shadow transition-shadow">
                                <Package className="w-5 h-5 text-purple-600" />
                            </div>
                            <div className="text-left">
                                <div className="font-medium text-slate-800">
                                    {artifact.title || "Untitled Artifact"}
                                </div>
                                <div className="text-sm text-slate-600 flex items-center gap-2 mt-0.5">
                                    {icon}
                                    <span>{displayType}</span>
                                    {!artifact.isComplete && (
                                        <span className="text-amber-600">(In progress...)</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </button>
                </div>
            );
        }

        if (msg.type === "tools") {
            return (
                <Message
                    key={msg.id}
                    message={{ ...msg, content: "", toolCalls: msg.toolCalls }}
                    onEditSubmit={handleEditSubmit}
                    isLoading={isLoading}
                />
            );
        }

        return null;
    };

    const displayMessages = buildDisplayMessages();

    return (
        <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="max-w-4xl mx-auto space-y-4">
                {displayMessages.map(renderMessage)}
                {isLoading && !streamingMessageId && (
                    <div className="flex gap-3 justify-start">
                        <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                        </div>
                        <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 bg-white border border-slate-200 shadow-sm text-slate-800">
                            <div className="flex items-center gap-3">
                                <LoadingDots />
                                <span className="text-sm text-slate-600">Claude is thinking...</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
        </div>
    );
};

export default Messages;
