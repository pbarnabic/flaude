import React, {useState, useRef} from 'react';
import MobileArtifactPanel from "./Components/MobileArtifactPanel/MobileArtifactPanel.jsx";
import MobileArtifactsViewer from "./Components/MobileArtifactsViewer/MobileArtifactsViewer.jsx";
import ArtifactCanvas from "./Components/ArtifactCanvas/ArtifactCanvas.jsx";
import Header from "./Components/Header/Header.jsx";
import ChatInput from "./Components/ChatInput/ChatInput.jsx";
import Messages from "./Components/Messages/Messages.jsx";
import ModelSettings from "./Components/ModelSettings/ModelSettings.jsx";
import {executeREPL} from "./Utils/Repl.js";
import {API_KEY} from "./Constants/ApiKey.js";
import {streamClaudeAPI} from "./Requests/StreamingAnthropicRequests.js";
import {processArtifactUpdate} from "./Utils/ArtifactParser.js";
import {StreamingArtifactParser} from "./Utils/StreamingArtifactsParser.js";
import {rateLimiter, estimateTokens} from "./Utils/RateLimiter.js";
import {OPENING_TAG} from "./Constants/ArtifactDelimiters.jsx";

const ClaudeClone = () => {
    // Single source of truth - API messages
    const [apiMessages, setApiMessages] = useState([]);

    // Artifacts state
    const [artifacts, setArtifacts] = useState({});

    // Track if last message hit max tokens
    const [lastMessageHitMaxTokens, setLastMessageHitMaxTokens] = useState(false);
    const incompleteArtifactIdRef = useRef(null);

    // Streaming state
    const [streamingContent, setStreamingContent] = useState('');
    const [streamingCleanContent, setStreamingCleanContent] = useState('');
    const [streamingToolCalls, setStreamingToolCalls] = useState([]);
    const [streamingMessageId, setStreamingMessageId] = useState(null);
    const streamingParserRef = useRef(null);
    const streamingArtifactsRef = useRef({});

    // UI State
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeArtifact, setActiveArtifact] = useState(null);

    // Settings and UI State
    const [apiKey, setApiKey] = useState(API_KEY);
    const [showApiKey, setShowApiKey] = useState(false);
    const [showArtifacts, setShowArtifacts] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showDebugInfo, setShowDebugInfo] = useState(false);
    const [modelSettings, setModelSettings] = useState({
        model: 'claude-3-5-haiku-20241022',
        temperature: 1.0,
        maxTokens: 1000
    });
    const [rateLimits, setRateLimits] = useState({});
    const [isWaiting, setIsWaiting] = useState(false);
    const [waitMessage, setWaitMessage] = useState('');

    // Build display messages from API messages
    const buildDisplayMessages = () => {
        const messages = [];
        let messageIdCounter = 1;

        for (let i = 0; i < apiMessages.length; i++) {
            const apiMsg = apiMessages[i];

            if (apiMsg.role === 'user') {
                if (typeof apiMsg.content === 'string') {
                    messages.push({
                        id: messageIdCounter++,
                        role: 'user',
                        content: apiMsg.content,
                        apiIndex: i
                    });
                } else if (Array.isArray(apiMsg.content)) {
                    // Tool results - don't display
                    continue;
                }
            } else if (apiMsg.role === 'assistant') {
                if (typeof apiMsg.content === 'string') {
                    // Parse to get clean content
                    const parser = new StreamingArtifactParser();
                    const result = parser.parseChunk(apiMsg.content);
                    const finalResult = parser.finalize();
                    const cleanContent = result.cleanedTextDelta + (finalResult.cleanedTextDelta || '');

                    messages.push({
                        id: messageIdCounter++,
                        role: 'assistant',
                        content: cleanContent,
                        toolCalls: [],
                        apiIndex: i
                    });
                } else if (Array.isArray(apiMsg.content)) {
                    // Tool calls
                    const toolCalls = apiMsg.content
                        .filter(block => block.type === 'tool_use')
                        .map(block => ({
                            id: block.id,
                            name: block.name,
                            input: block.input
                        }));

                    messages.push({
                        id: messageIdCounter++,
                        role: 'assistant',
                        content: '',
                        toolCalls: toolCalls,
                        apiIndex: i
                    });
                }
            }
        }

        // Add streaming message if present
        if (streamingContent || streamingToolCalls.length > 0) {
            messages.push({
                id: streamingMessageId,
                role: 'assistant',
                content: streamingCleanContent,
                toolCalls: streamingToolCalls,
                isStreaming: true
            });
        }

        return messages;
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
    const processArtifactUpdateTool = (toolCall, currentArtifacts) => {
        const result = processArtifactUpdate(toolCall, currentArtifacts);

        if (result.success) {
            // Update artifacts immediately
            setArtifacts(prev => ({
                ...prev,
                [result.updatedArtifact.id]: result.updatedArtifact
            }));

            return JSON.stringify({ success: true });
        } else {
            return JSON.stringify({ success: false, error: result.error });
        }
    };

    // Main conversation loop
    const runStreamingConversation = async (currentApiMessages, apiKey, modelSettings) => {
        const messageIdCounter = Date.now() + 1;

        // Estimate tokens
        const messageText = JSON.stringify(currentApiMessages);
        const estimatedInputTokens = estimateTokens(messageText);

        // Check rate limits
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
        setStreamingCleanContent('');
        setStreamingToolCalls([]);

        // Initialize parser for this streaming session
        const parser = new StreamingArtifactParser();
        streamingParserRef.current = parser;
        streamingArtifactsRef.current = {};

        let accumulatedContent = '';
        let accumulatedCleanContent = '';
        let toolCalls = [];
        let usage = { input_tokens: 0, output_tokens: 0 };
        let stopReason = null;

        // Check if we're continuing from an incomplete artifact
        let continuationId = null;
        if (lastMessageHitMaxTokens && incompleteArtifactIdRef.current) {
            continuationId = incompleteArtifactIdRef.current;
        }

        try {
            // Stream the response
            await streamClaudeAPI(
                currentApiMessages,
                apiKey,
                modelSettings,
                artifacts, // Current artifacts for tool generation
                (chunk) => {
                    if (chunk.type === 'text') {
                        // Parse chunk for artifacts
                        const result = parser.parseChunk(
                            chunk.content,
                            accumulatedContent === '' && continuationId ? continuationId : null
                        );

                        accumulatedContent += chunk.content;
                        accumulatedCleanContent += result.cleanedTextDelta;

                        // Update streaming artifacts
                        for (const artifact of result.artifacts || []) {
                            if (!artifact.isContinuation) {
                                streamingArtifactsRef.current[artifact.id] = {
                                    id: artifact.id,
                                    type: artifact.type || 'text/plain',
                                    language: artifact.language,
                                    title: artifact.title || 'Untitled',
                                    content: artifact.content || '',
                                    version: 1,
                                    timestamp: Date.now(),
                                    isComplete: false
                                };
                            }
                        }

                        // Handle artifact content updates
                        if (result.activeArtifactUpdate) {
                            const update = result.activeArtifactUpdate;
                            if (streamingArtifactsRef.current[update.id]) {
                                streamingArtifactsRef.current[update.id].content = update.content;
                                streamingArtifactsRef.current[update.id].isComplete = update.isComplete;
                            } else if (continuationId && update.id === continuationId) {
                                // Continuing from previous message
                                setArtifacts(prev => ({
                                    ...prev,
                                    [continuationId]: {
                                        ...prev[continuationId],
                                        content: prev[continuationId].content + update.content,
                                        isComplete: update.isComplete
                                    }
                                }));
                            }
                        }

                        // Update artifacts state with streaming artifacts
                        setArtifacts(prev => {
                            const updated = {
                                ...prev,
                                ...streamingArtifactsRef.current
                            };
                            if (showDebugInfo) {
                                console.log('Streaming artifacts update:', streamingArtifactsRef.current);
                                console.log('Total artifacts:', updated);
                            }
                            return updated;
                        });

                        setStreamingContent(accumulatedContent);
                        setStreamingCleanContent(accumulatedCleanContent);

                        // Auto-open artifacts if detected
                        if (chunk.content.includes(OPENING_TAG) && window.innerWidth >= 768) {
                            setShowArtifacts(true);
                        }
                    } else if (chunk.type === 'tool_use') {
                        toolCalls.push(chunk.toolCall);
                        setStreamingToolCalls([...toolCalls]);
                    } else if (chunk.type === 'done') {
                        usage = chunk.usage;
                        stopReason = chunk.stop_reason || null;
                    }
                }
            );

            // Finalize parser
            const finalResult = parser.finalize();

            // Handle any final updates
            if (finalResult.activeArtifactUpdate) {
                const update = finalResult.activeArtifactUpdate;
                if (streamingArtifactsRef.current[update.id]) {
                    streamingArtifactsRef.current[update.id].content = update.content;
                    streamingArtifactsRef.current[update.id].isComplete = update.isComplete;
                } else if (continuationId && update.id === continuationId) {
                    streamingArtifactsRef.current[continuationId] = {
                        ...artifacts[continuationId],
                        content: artifacts[continuationId].content + update.content,
                        isComplete: update.isComplete
                    };
                }
            }

            // Process any remaining artifacts
            for (const artifact of finalResult.artifacts || []) {
                if (!artifact.isContinuation) {
                    streamingArtifactsRef.current[artifact.id] = artifact;
                }
            }

            // Final update to artifacts with proper structure
            const finalArtifacts = {};
            for (const [id, artifact] of Object.entries(streamingArtifactsRef.current)) {
                finalArtifacts[id] = {
                    id: artifact.id,
                    type: artifact.type || 'text/plain',
                    language: artifact.language,
                    title: artifact.title || 'Untitled',
                    content: artifact.content || '',
                    version: artifact.version || 1,
                    timestamp: artifact.timestamp || Date.now(),
                    isComplete: artifact.isComplete !== false
                };
            }

            setArtifacts(prev => ({
                ...prev,
                ...finalArtifacts
            }));

            // Update incomplete artifact tracking
            incompleteArtifactIdRef.current = finalResult.incompleteArtifactId || null;

            // Update max tokens flag based on stop reason
            setLastMessageHitMaxTokens(stopReason === 'max_tokens');

            // Clear streaming state
            setStreamingContent('');
            setStreamingCleanContent('');
            setStreamingToolCalls([]);
            setStreamingMessageId(null);
            streamingParserRef.current = null;
            streamingArtifactsRef.current = {};

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
                        result = processArtifactUpdateTool(call, artifacts);
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
            setStreamingCleanContent('');
            setStreamingToolCalls([]);
            setStreamingMessageId(null);
            streamingParserRef.current = null;
            streamingArtifactsRef.current = {};

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
        setArtifacts({});
        setStreamingContent('');
        setStreamingCleanContent('');
        setStreamingToolCalls([]);
        setStreamingMessageId(null);
        streamingParserRef.current = null;
        streamingArtifactsRef.current = {};
        incompleteArtifactIdRef.current = null;
        setActiveArtifact(null);
        setLastMessageHitMaxTokens(false);
    };

    const handleEditSubmit = async (messageId, newContent) => {
        const displayMessages = buildDisplayMessages();

        // Find the display message
        const displayMessageIndex = displayMessages.findIndex(msg => msg.id === messageId);
        if (displayMessageIndex === -1) return;

        const displayMessage = displayMessages[displayMessageIndex];

        // Use the apiIndex to cut off at the right point
        if (displayMessage.apiIndex !== undefined) {
            // Clear messages after the edit point
            const truncatedMessages = apiMessages.slice(0, displayMessage.apiIndex);
            setApiMessages(truncatedMessages);

            // Rebuild artifacts from truncated messages
            const rebuiltArtifacts = {};
            const parser = new StreamingArtifactParser();

            for (let i = 0; i < truncatedMessages.length; i++) {
                const msg = truncatedMessages[i];
                if (msg.role === 'assistant' && typeof msg.content === 'string') {
                    parser.reset();

                    const result = parser.parseChunk(msg.content);
                    const finalResult = parser.finalize();

                    // Process artifacts
                    for (const artifact of [...(result.artifacts || []), ...(finalResult.artifacts || [])]) {
                        if (!artifact.isContinuation) {
                            rebuiltArtifacts[artifact.id] = artifact;
                        }
                    }

                    // Apply updates
                    const updates = [result.activeArtifactUpdate, finalResult.activeArtifactUpdate].filter(Boolean);
                    for (const update of updates) {
                        if (rebuiltArtifacts[update.id]) {
                            rebuiltArtifacts[update.id].content = update.content;
                            rebuiltArtifacts[update.id].isComplete = update.isComplete;
                        }
                    }
                }
            }

            setArtifacts(rebuiltArtifacts);
            incompleteArtifactIdRef.current = null;
            setLastMessageHitMaxTokens(false);

            // Send the edited message
            setInput(newContent);
            setTimeout(handleSend, 100);
        }
    };

    const handleStop = () => {
        setIsLoading(false);
        setIsWaiting(false);
        setStreamingContent('');
        setStreamingCleanContent('');
        setStreamingToolCalls([]);
        setStreamingMessageId(null);
        streamingParserRef.current = null;
        streamingArtifactsRef.current = {};
    };

    // Auto-select newest artifact when artifacts change
    React.useEffect(() => {
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
    }, [artifacts]);

    const displayMessages = buildDisplayMessages();

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
            <div className={`flex-1 flex flex-col transition-all duration-300 ${showArtifacts && window.innerWidth >= 768 ? 'md:mr-0' : ''}`}>
                <Header
                    showApiKey={showApiKey}
                    setShowApiKey={setShowApiKey}
                    apiKey={apiKey}
                    setApiKey={setApiKey}
                    handleClear={handleClear}
                    showMobileMenu={showMobileMenu}
                    setShowMobileMenu={setShowMobileMenu}
                    artifacts={artifacts}
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
                    streamingCleanContent={streamingCleanContent}
                    streamingToolCalls={streamingToolCalls}
                    artifacts={artifacts}
                    onArtifactClick={(artifactId) => {
                        setActiveArtifact(artifactId);
                        setShowArtifacts(true);
                    }}
                />

                {/* Rate Limit Waiting Indicator */}
                {isWaiting && (
                    <div className="mx-4 mb-2 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
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
                    canContinue={lastMessageHitMaxTokens}
                    isLoading={isLoading || isWaiting}
                    handleSend={handleSend}
                    input={input}
                    setInput={setInput}
                    apiKey={apiKey}
                    handleStop={handleStop}
                />
            </div>

            <ArtifactCanvas
                artifacts={artifacts}
                showArtifacts={showArtifacts}
                setShowArtifacts={setShowArtifacts}
                activeArtifact={activeArtifact}
                setActiveArtifact={setActiveArtifact}
                showDebugInfo={showDebugInfo}
                apiMessages={apiMessages}
                streamingContent={streamingContent}
                streamingMessageId={streamingMessageId}
            />

            <MobileArtifactsViewer
                artifacts={artifacts}
                showArtifacts={showArtifacts}
                setShowArtifacts={setShowArtifacts}
            />

            {showArtifacts && (
                <MobileArtifactPanel
                    showArtifacts={showArtifacts}
                    setShowArtifacts={setShowArtifacts}
                    artifacts={artifacts}
                    activeArtifact={activeArtifact}
                    apiMessages={apiMessages}
                    streamingContent={streamingContent}
                    streamingMessageId={streamingMessageId}
                    setActiveArtifact={setActiveArtifact}
                />
            )}

            {/* Debug Panel */}
            {showDebugInfo && (
                <div className="fixed bottom-20 right-4 max-w-md max-h-96 overflow-auto bg-gray-900 text-white p-4 rounded-lg shadow-lg">
                    <h3 className="font-bold mb-2">API Messages</h3>
                    <pre className="text-xs">{JSON.stringify(apiMessages, null, 2)}</pre>
                    <h3 className="font-bold mb-2 mt-4">Artifacts</h3>
                    <pre className="text-xs">{JSON.stringify(artifacts, null, 2)}</pre>
                    <h3 className="font-bold mb-2 mt-4">Incomplete Artifact ID</h3>
                    <pre className="text-xs">{incompleteArtifactIdRef.current || 'null'}</pre>
                </div>
            )}
        </div>
    );
};

export default ClaudeClone;
