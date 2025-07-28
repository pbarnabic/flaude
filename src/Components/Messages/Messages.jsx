import React, {useEffect, useRef, useState} from "react";
import {Bot} from "lucide-react";
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
                      onImagesAdded
                  }) => {
    const messagesEndRef = useRef(null);
    const [viewingImage, setViewingImage] = useState(null);
    const [showDropIndicator, setShowDropIndicator] = useState(false);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({behavior: "smooth"});
    }, [apiMessages, streamingContent]);

    const handleImagesAddedWithNotification = (newImages) => {
        onImagesAdded(newImages);
        setShowDropIndicator(true);
        setTimeout(() => {
            setShowDropIndicator(false);
        }, 3000);
    };

    const artifactVersions = ArtifactParsingUtilsV2.parseArtifactsFromMessages(apiMessages, streamingContent);
    const latestArtifacts = ArtifactParsingUtilsV2.getLatestArtifacts(artifactVersions);

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
                    images: msg.images,
                    sourceMessageId: msg.id
                });
            } else if (msg.role === "assistant") {
                if (Array.isArray(msg.content)) {
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

        if (streamingToolCalls?.length) {
            display.push({
                id: `stream-tools`,
                type: "tool_calls",
                role: "assistant",
                toolCalls: streamingToolCalls,
                isStreaming: true
            });
        }

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

    const displayMessages = buildDisplayMessages();
    const shouldShowEmptyState = displayMessages.length === 0 && !isLoading && !streamingMessageId;

    return (
        <ImageDropZone
            className="flex-1 overflow-y-auto px-2 sm:px-4 py-6 w-full"
            showUploadButton={false}
            onImagesAdded={handleImagesAddedWithNotification}
        >
            <div className="max-w-4xl mx-auto w-full">
                {shouldShowEmptyState ? (
                    <EmptyMessages/>
                ) : (
                    <div className="space-y-4">
                        {displayMessages.map(msg => (
                            <Message
                                key={msg.id}
                                message={msg}
                                onEditSubmit={handleEditSubmit}
                                onArtifactClick={onArtifactClick}
                                onViewImage={setViewingImage}
                                isLoading={msg.isStreaming ? false : isLoading}
                                latestArtifacts={latestArtifacts}
                            />
                        ))}
                        {isLoading && !streamingMessageId && !streamingToolCalls?.length && (
                            <div className="flex gap-2 sm:gap-3 justify-start w-full">
                                <div className="flex-shrink-0 w-8 h-8">
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                                        <Bot className="w-5 h-5 text-white"/>
                                    </div>
                                </div>
                                <div className="min-w-0 flex-1" style={{maxWidth: 'calc(100% - 2.5rem)'}}>
                                    <div className="rounded-2xl px-3 py-3 bg-white border border-slate-200 shadow-sm text-slate-800 w-full">
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

            <ViewImageModal
                image={viewingImage}
                isOpen={!!viewingImage}
                onClose={() => setViewingImage(null)}
            />

            <ImageDropIndicator isVisible={showDropIndicator}/>
        </ImageDropZone>
    );
};

export default Messages;
