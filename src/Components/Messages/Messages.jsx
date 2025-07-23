import React, { useEffect, useRef } from "react";
import { Bot, Code, FileText, Package } from "lucide-react";
import Message from "../Message/Message.jsx";
import LoadingDots from "../LoadingDots/LoadingDots.jsx";
import {CLOSING_TAG, OPENING_TAG} from "../../Constants/ArtifactDelimiters.jsx";

const Messages = ({
                      apiMessages = [],
                      isLoading,
                      handleEditSubmit,
                      streamingMessageId = null,
                      streamingContent = '',
                      streamingCleanContent,
                      streamingToolCalls,
                      showDebugInfo = false,
                      onArtifactClick
                  }) => {
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [apiMessages, streamingContent]);

    // Parse artifacts by extracting complete artifact tags from messages (same as ArtifactCanvas)
    const parseArtifactsFromMessages = () => {
        const artifacts = {};

        // Helper to extract artifacts from content
        const extractArtifacts = (content, isStreaming = false) => {
            const foundArtifacts = {};
            let pos = 0;

            while (pos < content.length) {
                const startTag = content.indexOf(OPENING_TAG, pos);
                if (startTag === -1) break;

                const tagEnd = content.indexOf('>', startTag);
                if (tagEnd === -1) {
                    if (isStreaming) break;
                    else continue;
                }

                const endTag = content.indexOf(CLOSING_TAG, tagEnd);
                const openingTag = content.substring(startTag, tagEnd + 1);

                // Extract attributes
                const idMatch = openingTag.match(/id=["']([^"']+)["']/);
                const typeMatch = openingTag.match(/type=["']([^"']+)["']/);
                const languageMatch = openingTag.match(/language=["']([^"']+)["']/);
                const titleMatch = openingTag.match(/title=["']([^"']+)["']/);

                if (idMatch) {
                    let artifactContent = '';
                    let isComplete = true;

                    if (endTag === -1) {
                        if (isStreaming) {
                            artifactContent = content.substring(tagEnd + 1);
                            isComplete = false;
                        }
                    } else {
                        artifactContent = content.substring(tagEnd + 1, endTag);
                        isComplete = true;
                    }

                    foundArtifacts[idMatch[1]] = {
                        id: idMatch[1],
                        type: typeMatch ? typeMatch[1] : 'text/plain',
                        language: languageMatch ? languageMatch[1] : undefined,
                        title: titleMatch ? titleMatch[1] : 'Untitled',
                        content: artifactContent,
                        version: 1,
                        timestamp: Date.now(),
                        isComplete: isComplete
                    };
                }

                pos = endTag === -1 ? content.length : endTag + 14;
            }

            return foundArtifacts;
        };

        // Process API messages
        for (const apiMsg of apiMessages) {
            if (apiMsg.role === 'assistant' && typeof apiMsg.content === 'string') {
                const messageArtifacts = extractArtifacts(apiMsg.content, false);
                Object.assign(artifacts, messageArtifacts);
            }
        }

        // Process streaming content
        if (streamingContent) {
            const streamingArtifacts = extractArtifacts(streamingContent, true);
            Object.assign(artifacts, streamingArtifacts);
        }

        return artifacts;
    };

    const artifacts = parseArtifactsFromMessages();

    const parseSegments = (content, isStreaming = false) => {
        const segments = [];
        let cursor = 0;

        while (cursor < content.length) {
            const start = content.indexOf(OPENING_TAG, cursor);
            if (start === -1) break;

            const tagEnd = content.indexOf(">", start);
            if (tagEnd === -1) break;

            const end = content.indexOf(CLOSING_TAG, tagEnd);
            const idMatch = content.slice(start, tagEnd + 1).match(/id=["']([^"']+)["']/);
            const id = idMatch?.[1];

            if (cursor < start) {
                const text = content.slice(cursor, start).trim();
                if (text) segments.push({ type: "text", content: text });
            }

            if (id) {
                segments.push({
                    type: "artifact",
                    id,
                    isComplete: end !== -1
                });
            }

            cursor = end !== -1 ? end + 14 : content.length;
        }

        if (cursor < content.length) {
            const text = content.slice(cursor).trim();
            if (text) segments.push({ type: "text", content: text });
        }

        return segments;
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
                    sourceMessageId: msg.id
                });
            } else if (msg.role === "assistant" && typeof msg.content === "string") {
                const segments = parseSegments(msg.content);
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
                            artifact: artifacts[segment.id],
                            isStreaming: !segment.isComplete
                        });
                    }
                }
            }
        }

        // Only add streaming content if there's a streaming message
        if (streamingContent && streamingMessageId) {
            const segments = parseSegments(streamingContent, true);
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
                        artifact: artifacts[segment.id],
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

            const icon =
                msg.artifact.type === "application/vnd.ant.code" || msg.artifact.language ? (
                    <Code className="w-4 h-4" />
                ) : (
                    <FileText className="w-4 h-4" />
                );

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
                                    {msg.artifact.title || "Untitled Artifact"}
                                </div>
                                <div className="text-sm text-slate-600 flex items-center gap-2 mt-0.5">
                                    {icon}
                                    <span>{msg.artifact.language || msg.artifact.type.split("/").pop()}</span>
                                    {!msg.artifact.isComplete && (
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
