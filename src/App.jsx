import React, {useEffect, useState} from 'react';
import MobileArtifactPanel from "./Components/MobileArtifactPanel/MobileArtifactPanel.jsx";
import MobileArtifactsViewer from "./Components/MobileArtifactsViewer/MobileArtifactsViewer.jsx";
import ArtifactCanvas from "./Components/ArtifactCanvas/ArtifactCanvas.jsx";
import Header from "./Components/Header/Header.jsx";
import ChatInput from "./Components/ChatInput/ChatInput.jsx";
import Messages from "./Components/Messages/Messages.jsx";
import ModelSettings from "./Components/ModelSettings/ModelSettings.jsx";
import {streamClaudeAPI} from "./Requests/AnthropicRequests.js";
import {OPENING_TAG} from "./Constants/ArtifactDelimiters.jsx";
import {API_KEY} from "./Constants/ApiKey.js";
import {processArtifactUpdate} from "./Utils/ToolUtils.js";
import {ArtifactParsingUtils} from "./Utils/ArtifactParsingUtils.js";
import {estimateTokens, rateLimiter} from "./Utils/RateLimitUtils.js";
import {executeREPL} from "./Utils/ReplUtils.js";

const ClaudeClone = () => {

    const [apiMessages, setApiMessages] = useState([]);

    // Streaming state - only what's currently being streamed
    const [streamingContent, setStreamingContent] = useState('');
    const [streamingToolCalls, setStreamingToolCalls] = useState([]);
    const [streamingMessageId, setStreamingMessageId] = useState(null);

    // UI State
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeArtifact, setActiveArtifact] = useState(null);
    const [showArtifacts, setShowArtifacts] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [userSelectedArtifact, setUserSelectedArtifact] = useState(null);

    // Rate Limiting UI State
    const [isWaiting, setIsWaiting] = useState(false);
    const [waitMessage, setWaitMessage] = useState('');

    // Settings
    const [apiKey, setApiKey] = useState(API_KEY);
    const [showApiKey, setShowApiKey] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showDebugInfo, setShowDebugInfo] = useState(false);
    const [modelSettings, setModelSettings] = useState({
        model: 'claude-3-5-haiku-20241022',
        temperature: 1.0,
        maxTokens: 1000
    });
    const [rateLimits, setRateLimits] = useState({});

    // Get current artifacts (latest versions for processing)
    const getCurrentArtifacts = () => {
        const artifactVersions = ArtifactParsingUtils.parseArtifactsFromMessages(apiMessages, streamingContent);
        return ArtifactParsingUtils.getLatestArtifacts(artifactVersions);
    };

    /**
     * Process REPL tool calls
     */
    const processReplTool = async (toolCall) => {
        try {
            const result = executeREPL(toolCall.input.code);
            return result;
        } catch (error) {
            console.error('Error executing REPL:', error);
            return `Error: ${error.message}`;
        }
    };

    /**
     * Process artifact update tool calls
     */
    const processArtifactUpdateTool = (toolCall) => {
        const currentArtifacts = getCurrentArtifacts();
        const result = processArtifactUpdate(toolCall, currentArtifacts);

        if (result.success) {
            return JSON.stringify({success: true});
        } else {
            return JSON.stringify({success: false, error: result.error});
        }
    };

    // Main conversation loop
    const runStreamingConversation = async (currentApiMessages, apiKey, modelSettings) => {
        const messageIdCounter = Date.now() + 1;

        // Estimate tokens and handle rate limits
        const messageText = JSON.stringify(currentApiMessages);
        const estimatedInputTokens = estimateTokens(messageText);

        const waitTime = rateLimiter.calculateWaitTime(
            modelSettings.model,
            estimatedInputTokens,
            rateLimits[modelSettings.model]
        );

        if (waitTime > 0) {
            setIsWaiting(true);
            setWaitMessage(`Rate limit approaching. Waiting ${Math.ceil(waitTime / 1000)} seconds...`);
            await rateLimiter.waitIfNeeded(
                modelSettings.model,
                estimatedInputTokens,
                rateLimits[modelSettings.model]
            );
            setIsWaiting(false);
            setWaitMessage('');
        }

        // Initialize streaming
        setStreamingMessageId(messageIdCounter);
        setStreamingContent('');
        setStreamingToolCalls([]);

        let accumulatedContent = '';
        let toolCalls = [];
        let usage = {input_tokens: 0, output_tokens: 0};

        try {
            // Get current artifacts for tool generation
            const currentArtifacts = getCurrentArtifacts();

            // Stream the response
            await streamClaudeAPI(
                currentApiMessages,
                apiKey,
                modelSettings,
                currentArtifacts,
                (chunk) => {
                    if (chunk.type === 'text') {
                        accumulatedContent += chunk.content;
                        setStreamingContent(accumulatedContent);

                        // Auto-open artifacts if detected
                        if (chunk.content.includes(OPENING_TAG) && window.innerWidth >= 768) {
                            setShowArtifacts(true);
                        }
                    } else if (chunk.type === 'tool_use') {
                        toolCalls.push(chunk.toolCall);
                        setStreamingToolCalls([...toolCalls]);
                    } else if (chunk.type === 'done') {
                        usage = chunk.usage;
                    }
                }
            );

            // Clear streaming state
            setStreamingContent('');
            setStreamingToolCalls([]);
            setStreamingMessageId(null);

            // Record usage
            rateLimiter.recordUsage(
                modelSettings.model,
                usage.input_tokens,
                usage.output_tokens
            );

            // Build new API message
            let newApiMessage;

            if (toolCalls.length > 0) {
                newApiMessage = {
                    role: 'assistant',
                    content: toolCalls.map(tc => ({
                        type: 'tool_use',
                        id: tc.id,
                        name: tc.name,
                        input: tc.input
                    }))
                };
            } else {
                newApiMessage = {
                    role: 'assistant',
                    content: accumulatedContent
                };
            }

            const updatedApiMessages = [...currentApiMessages, newApiMessage];
            setApiMessages(updatedApiMessages);

            // Process tool calls if any
            if (toolCalls.length > 0) {
                const toolResults = [];

                for (const call of toolCalls) {
                    let result;

                    if (call.name.startsWith('update_artifact_')) {
                        result = processArtifactUpdateTool(call);
                    } else if (call.name === 'repl') {
                        result = await processReplTool(call);
                    } else {
                        console.warn('Unknown tool:', call.name);
                        result = JSON.stringify({success: false, error: 'Unknown tool'});
                    }

                    toolResults.push({
                        tool_use_id: call.id,
                        content: result
                    });
                }

                // Add tool results and continue conversation
                const toolResultMessage = {
                    role: 'user',
                    content: toolResults.map(r => ({
                        type: 'tool_result',
                        tool_use_id: r.tool_use_id,
                        content: r.content
                    }))
                };

                const finalApiMessages = [...updatedApiMessages, toolResultMessage];
                setApiMessages(finalApiMessages);

                // Continue the conversation
                await runStreamingConversation(finalApiMessages, apiKey, modelSettings);
            }

        } catch (error) {
            console.error('Streaming error:', error);
            setStreamingContent('');
            setStreamingToolCalls([]);
            setStreamingMessageId(null);

            // Add error message
            setApiMessages([...currentApiMessages, {
                role: 'assistant',
                content: `Error: ${error.message}`
            }]);
        }
    };

    // Handle sending a message
    const handleSend = async () => {
        if (!input.trim() || !apiKey) return;

        const userContent = input;
        const newApiMessages = [...apiMessages, {
            role: 'user',
            content: userContent
        }];

        setApiMessages(newApiMessages);
        setInput('');
        setIsLoading(true);

        try {
            await runStreamingConversation(newApiMessages, apiKey, modelSettings);
        } catch (error) {
            console.error('Error in conversation:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClear = () => {
        setApiMessages([]);
        setStreamingContent('');
        setStreamingToolCalls([]);
        setStreamingMessageId(null);
        setActiveArtifact(null);
    };

    const handleEditSubmit = async (messageApiIndex, newContent) => {
        // Clear messages after the edit point
        const truncatedMessages = apiMessages.slice(0, messageApiIndex);
        setApiMessages(truncatedMessages);

        // Send the edited message
        setInput(newContent);
    };

    const handleStop = () => {
        setIsLoading(false);
        setIsWaiting(false);
        setStreamingContent('');
        setStreamingToolCalls([]);
        setStreamingMessageId(null);
    };

    // Auto-select newest artifact when artifacts change
    useEffect(() => {
        const artifacts = getCurrentArtifacts();
        const artifactEntries = Object.entries(artifacts);

        if (artifactEntries.length > 0) {
            // Sort by timestamp to get the newest
            artifactEntries.sort((a, b) => (a[1].timestamp || 0) - (b[1].timestamp || 0));
            const newestId = artifactEntries[artifactEntries.length - 1][0];

            // If no artifact is selected or the current selection doesn't exist, select the newest
            if (!activeArtifact || !artifacts[activeArtifact]) {
                setActiveArtifact(newestId);
            }

            // Auto-show artifacts panel if we have artifacts
            if (!showArtifacts && window.innerWidth >= 768) {
                setShowArtifacts(true);
            }
        }
    }, [apiMessages, streamingContent, activeArtifact]);

    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100 relative">
            {/* Settings Modal */}
            <ModelSettings
                showSettings={showSettings}
                setShowSettings={setShowSettings}
                modelSettings={modelSettings}
                setModelSettings={setModelSettings}
                showDebugInfo={showDebugInfo}
                setShowDebugInfo={setShowDebugInfo}
                rateLimits={rateLimits}
                setRateLimits={setRateLimits}
            />

            {/* Chat Section */}
            <div
                className={`flex-1 flex flex-col transition-all duration-300 ${showArtifacts && window.innerWidth >= 768 ? 'md:mr-0' : ''}`}>
                <Header
                    showApiKey={showApiKey}
                    setShowApiKey={setShowApiKey}
                    apiKey={apiKey}
                    setApiKey={setApiKey}
                    handleClear={handleClear}
                    showMobileMenu={showMobileMenu}
                    setShowMobileMenu={setShowMobileMenu}
                    artifacts={getCurrentArtifacts()}
                    showArtifacts={showArtifacts}
                    setShowArtifacts={setShowArtifacts}
                    showSettings={showSettings}
                    setShowSettings={setShowSettings}
                    modelSettings={modelSettings}
                />

                <Messages
                    apiMessages={apiMessages}
                    isLoading={isLoading}
                    handleEditSubmit={handleEditSubmit}
                    streamingMessageId={streamingMessageId}
                    streamingContent={streamingContent}
                    streamingToolCalls={streamingToolCalls}
                    onArtifactClick={(artifactId) => {
                        setActiveArtifact(artifactId);
                        setShowArtifacts(true);
                        setUserSelectedArtifact(artifactId);
                    }}
                />

                {/* Rate Limit Waiting Indicator */}
                {isWaiting && (
                    <div
                        className="mx-4 mb-2 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-amber-600" xmlns="http://www.w3.org/2000/svg"
                             fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                    strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm text-amber-700">{waitMessage}</span>
                    </div>
                )}

                <ChatInput
                    isLoading={isLoading || isWaiting}
                    handleSend={handleSend}
                    input={input}
                    setInput={setInput}
                    apiKey={apiKey}
                    handleStop={handleStop}
                />
            </div>

            <ArtifactCanvas
                apiMessages={apiMessages}
                streamingContent={streamingContent}
                showArtifacts={showArtifacts}
                setShowArtifacts={setShowArtifacts}
                activeArtifact={activeArtifact}
                setActiveArtifact={setActiveArtifact}
                showDebugInfo={showDebugInfo}
                userSelectedArtifact={userSelectedArtifact}
                setUserSelectedArtifact={setUserSelectedArtifact}
            />

            <MobileArtifactsViewer
                apiMessages={apiMessages}
                streamingContent={streamingContent}
                showArtifacts={showArtifacts}
                setShowArtifacts={setShowArtifacts}
                userSelectedArtifact={userSelectedArtifact}
                setUserSelectedArtifact={setUserSelectedArtifact}
            />

            {showArtifacts && (
                <MobileArtifactPanel
                    apiMessages={apiMessages}
                    streamingContent={streamingContent}
                    showArtifacts={showArtifacts}
                    setShowArtifacts={setShowArtifacts}
                    activeArtifact={activeArtifact}
                    setActiveArtifact={setActiveArtifact}
                    userSelectedArtifact={userSelectedArtifact}
                    setUserSelectedArtifact={setUserSelectedArtifact}
                />
            )}

            {/* Debug Panel */}
            {showDebugInfo && (
                <div
                    className="fixed bottom-20 right-4 max-w-md max-h-96 overflow-auto bg-gray-900 text-white p-4 rounded-lg shadow-lg">
                    <h3 className="font-bold mb-2">API Messages</h3>
                    <pre className="text-xs">{JSON.stringify(apiMessages, null, 2)}</pre>
                    <h3 className="font-bold mb-2 mt-4">Current Artifacts</h3>
                    <pre className="text-xs">{JSON.stringify(getCurrentArtifacts(), null, 2)}</pre>
                </div>
            )}
        </div>
    );
};

export default ClaudeClone;
