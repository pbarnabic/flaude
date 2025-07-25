import React from "react";

const ArtifactStatusIndicator = ({artifact}) => {
    // Only show streaming indicator if the artifact is currently being streamed
    if (artifact._isCurrentlyStreaming) {
        return (
            <span className="text-xs text-amber-600 ml-2 flex items-center gap-1">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                    Streaming
                </span>
        );
    }
    return null;
};

export default ArtifactStatusIndicator;
