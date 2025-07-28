import React from "react";

const DebugPanel = ({
                        currentChatStr,
                        apiMessagesStr,
                        currentArtifactsStr,
                        rateLimitsStr
                    }) => {
    return (
        <div
            className="fixed bottom-20 right-4 max-w-md max-h-96 overflow-auto bg-gray-900 text-white p-4 rounded-lg shadow-lg">
            <h3 className="font-bold mb-2">Current Chat</h3>
            <pre className="text-xs">{currentChatStr}</pre>
            <h3 className="font-bold mb-2 mt-4">API Messages</h3>
            <pre className="text-xs">{apiMessagesStr}</pre>
            <h3 className="font-bold mb-2 mt-4">Current Artifacts</h3>
            <pre className="text-xs">{currentArtifactsStr}</pre>
            <h3 className="font-bold mb-2 mt-4">Rate Limits</h3>
            <pre className="text-xs">{rateLimitsStr}</pre>
        </div>
    );
}

export default DebugPanel;
