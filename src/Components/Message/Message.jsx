import React from 'react';
import ToolCallMessage from "../ToolCallMessage/ToolCallMessage.jsx";
import UserTextMessage from "../UserTextMessage/UserTextMessage.jsx";
import AssistantTextMessage from "../AssistantTextMessage/AssistantTextMessage.jsx";
import ArtifactMessage from "./ArtifactMessage/ArtifactMessage.jsx";

const Message = ({message, onEditSubmit, onArtifactClick, onViewImage, isLoading, latestArtifacts}) => {
    // Don't render user messages that are tool call results (we're required to send them up but they're meaningless to the user)
    if (message.role === 'user' && Array.isArray(message.content)) {
        const hasImageOrText = message.content.some(part =>
            part.type === 'image' || part.type === 'text'
        );
        if (!hasImageOrText) {
            return null;
        }
    }

    switch (message.type) {
        case 'text':
            if (message.role === 'user') {
                return (
                    <UserTextMessage
                        message={message}
                        onEditSubmit={onEditSubmit}
                        onViewImage={onViewImage}
                        isLoading={isLoading}
                    />
                );
            } else {
                return <AssistantTextMessage message={message}/>;
            }

        case 'artifact':
            return (
                <ArtifactMessage
                    message={message}
                    onArtifactClick={onArtifactClick}
                    latestArtifacts={latestArtifacts}
                />
            );

        case 'tool_calls':
            return (
                <ToolCallMessage
                    message={message}
                    onArtifactClick={onArtifactClick}
                    latestArtifacts={latestArtifacts}
                />
            );

        default:
            return null;
    }
};

export default Message;
