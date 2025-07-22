import React, {useState} from 'react';
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
import {buildApiMessages} from "./Utils/ConversationUtils.js";
import {processArtifactUpdate, handleArtifactRewrite} from "./Utils/ArtifactParser.js";
import {StreamingArtifactParser} from "./Utils/StreamingArtifactsParser.js";
import {rateLimiter, estimateTokens} from "./Utils/RateLimiter.js";

const ClaudeClone = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [artifacts, setArtifacts] = useState({});
    const [activeArtifact, setActiveArtifact] = useState(null);
    const [apiKey, setApiKey] = useState(API_KEY);
    const [showApiKey, setShowApiKey] = useState(false);
    const [showArtifacts, setShowArtifacts] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showDebugInfo, setShowDebugInfo] = useState(false);
    const [modelSettings, setModelSettings] = useState({
        model: 'claude-sonnet-4-20250514',
        temperature: 1.0,
        maxTokens: 4096
    });
    const [rateLimits, setRateLimits] = useState({});
    const [isWaiting, setIsWaiting] = useState(false);
    const [waitMessage, setWaitMessage] = useState('');

    // Streaming state
    const [streamingMessageId, setStreamingMessageId] = useState(null);

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
        console.log('Processing artifact update tool call:', toolCall);

        const result = processArtifactUpdate(toolCall, currentArtifacts);

        if (result.success) {
            // Update the artifact with new version
            const updatedArtifacts = {
                ...currentArtifacts,
                [result.updatedArtifact.id]: result.updatedArtifact
            };

            return {
                result: JSON.stringify({ success: true }),
                updatedArtifacts,
                modifiedArtifactId: result.updatedArtifact.id
            };
        } else {
            return {
                result: JSON.stringify({ success: false, error: result.error }),
                updatedArtifacts: currentArtifacts,
                modifiedArtifactId: null
            };
        }
    };

    /**
     * Process artifacts from the parser
     */
    const processStreamingArtifacts = (artifacts, currentArtifacts) => {
        let updatedArtifacts = { ...currentArtifacts };
        let lastModifiedId = null;

        for (const artifact of artifacts) {
            // Check if this is a rewrite (artifact with same ID already exists)
            if (updatedArtifacts[artifact.id] && artifact.isComplete) {
                console.log(`Rewriting artifact ${artifact.id}`);
                updatedArtifacts[artifact.id] = handleArtifactRewrite(artifact, updatedArtifacts[artifact.id]);
            } else {
                console.log(`Creating/updating artifact ${artifact.id}`);
                updatedArtifacts[artifact.id] = artifact;
            }
            lastModifiedId = artifact.id;
        }
        console.log(updatedArtifacts);
        return { updatedArtifacts, lastModifiedId };
    };

    // Helper function to create UI message objects
    const createAssistantMessage = (messageId, assistantContent = '') => ({
        id: messageId,
        role: 'assistant',
        content: assistantContent,
        toolCalls: [],
        isStreaming: true
    });

    const createToolResultMessage = (messageId, toolResults) => ({
        id: messageId,
        role: 'tool_result',
        content: 'Tool executed',
        apiContent: {
            role: 'user',
            content: toolResults.map(r => ({
                type: 'tool_result',
                tool_use_id: r.tool_use_id,
                content: r.content
            }))
        }
    });

    // Main conversation loop with streaming
    const runStreamingConversation = async (apiMessages, apiKey, modelSettings) => {
        let currentApiMessages = [...apiMessages];
        let messageIdCounter = Date.now() + 1;
        const artifactParser = new StreamingArtifactParser();

        while (true) {
            // Get current artifacts for generating update tools
            const currentArtifacts = await new Promise(resolve => {
                setArtifacts(current => {
                    resolve(current);
                    return current;
                });
            });

            // Estimate tokens for the current request
            const messageText = JSON.stringify(currentApiMessages);
            const estimatedInputTokens = estimateTokens(messageText);

            // Check rate limits and wait if necessary
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

            // Reset parser for new response
            artifactParser.reset();

            // Create initial assistant message for streaming
            const assistantMessageId = messageIdCounter++;
            const assistantMessage = createAssistantMessage(assistantMessageId);
            setMessages(prev => [...prev, assistantMessage]);
            setStreamingMessageId(assistantMessageId);

            let accumulatedContent = '';
            let toolCalls = [];
            let usage = { input_tokens: 0, output_tokens: 0 };
            let lastArtifactId = null;

            // Stream Claude API response
            try {
                const result = await streamClaudeAPI(
                    currentApiMessages,
                    apiKey,
                    modelSettings,
                    currentArtifacts,
                    (chunk) => {
                        if (chunk.type === 'text') {
                            // Parse the chunk for artifacts
                            const parseResult = artifactParser.parseChunk(chunk.content);

                            // Update message content with cleaned text
                            accumulatedContent += parseResult.cleanedTextDelta;
                            setMessages(prev => prev.map(msg =>
                                msg.id === assistantMessageId
                                    ? { ...msg, content: accumulatedContent }
                                    : msg
                            ));

                            // Handle new artifacts
                            if (parseResult.artifacts.length > 0) {
                                const { updatedArtifacts, lastModifiedId } = processStreamingArtifacts(
                                    parseResult.artifacts,
                                    currentArtifacts
                                );
                                setArtifacts(updatedArtifacts);
                                lastArtifactId = lastModifiedId;

                                // Auto-open artifacts panel
                                if (window.innerWidth >= 768) {
                                    setShowArtifacts(true);
                                }
                                setActiveArtifact(lastModifiedId);
                            }

                            // Handle artifact content updates
                            if (parseResult.activeArtifactUpdate) {
                                setArtifacts(prev => ({
                                    ...prev,
                                    [parseResult.activeArtifactUpdate.id]: {
                                        ...prev[parseResult.activeArtifactUpdate.id],
                                        content: parseResult.activeArtifactUpdate.content,
                                        isComplete: parseResult.activeArtifactUpdate.isComplete
                                    }
                                }));
                            }
                        } else if (chunk.type === 'tool_use') {
                            toolCalls.push(chunk.toolCall);
                            setMessages(prev => prev.map(msg =>
                                msg.id === assistantMessageId
                                    ? { ...msg, toolCalls: [...msg.toolCalls, chunk.toolCall] }
                                    : msg
                            ));
                        } else if (chunk.type === 'done') {
                            usage = chunk.usage;
                        }
                    }
                );

                // Finalize parsing
                const finalResult = artifactParser.finalize();
                if (finalResult.cleanedTextDelta) {
                    accumulatedContent += finalResult.cleanedTextDelta;
                }
                if (finalResult.activeArtifactUpdate) {
                    setArtifacts(prev => ({
                        ...prev,
                        [finalResult.activeArtifactUpdate.id]: {
                            ...prev[finalResult.activeArtifactUpdate.id],
                            content: finalResult.activeArtifactUpdate.content,
                            isComplete: finalResult.activeArtifactUpdate.isComplete
                        }
                    }));
                }

                // Update final message state
                setMessages(prev => prev.map(msg =>
                    msg.id === assistantMessageId
                        ? { ...msg, content: accumulatedContent, isStreaming: false }
                        : msg
                ));
                setStreamingMessageId(null);

                // Record token usage
                rateLimiter.recordUsage(
                    modelSettings.model,
                    usage.input_tokens,
                    usage.output_tokens
                );

                // If no tool calls, conversation is complete
                if (toolCalls.length === 0) {
                    break;
                }

                // Process tool calls
                const toolResults = [];
                for (const call of toolCalls) {
                    let result;

                    // Check if this is an artifact update tool
                    if (call.name.startsWith('update_artifact_')) {
                        const currentArtifacts = await new Promise(resolve => {
                            setArtifacts(current => {
                                resolve(current);
                                return current;
                            });
                        });

                        const artifactProcessResult = processArtifactUpdateTool(call, currentArtifacts);

                        // Update artifacts state
                        setArtifacts(artifactProcessResult.updatedArtifacts);

                        if (artifactProcessResult.modifiedArtifactId) {
                            setActiveArtifact(artifactProcessResult.modifiedArtifactId);
                        }

                        result = artifactProcessResult.result;
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

                // Create and add tool result message
                const toolResultMessage = createToolResultMessage(messageIdCounter++, toolResults);
                setMessages(prev => [...prev, toolResultMessage]);

                // Update API messages for next iteration
                currentApiMessages = [
                    ...currentApiMessages,
                    {
                        role: 'assistant',
                        content: toolCalls.map(tc => ({
                            type: 'tool_use',
                            id: tc.id,
                            name: tc.name,
                            input: tc.input
                        }))
                    },
                    {role: 'user', content: toolResultMessage.apiContent.content}
                ];

            } catch (error) {
                console.error('Streaming error:', error);
                setMessages(prev => prev.map(msg =>
                    msg.id === assistantMessageId
                        ? { ...msg, content: `Error: ${error.message}`, isStreaming: false }
                        : msg
                ));
                setStreamingMessageId(null);
                break;
            }
        }
    };

    // Main handleSend function with streaming
    const handleSend = async () => {
        // Early return for invalid input
        if (!input.trim() || !apiKey) return;

        // Create and add user message
        const userMessage = {
            id: Date.now(),
            role: 'user',
            content: input
        };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Build API message history
            const apiMessages = buildApiMessages(messages, input);

            // Run the streaming conversation loop
            await runStreamingConversation(
                apiMessages,
                apiKey,
                modelSettings
            );

        } catch (error) {
            console.error('Error calling Claude API:', error);
            const errorMessage = {
                id: Date.now() + 999,
                role: 'assistant',
                content: `Error: ${error.message}`
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClear = () => {
        setMessages([]);
        setArtifacts({});
        setActiveArtifact(null);
        setStreamingMessageId(null);
    };

    const handleEditSubmit = async (messageId, newContent) => {
        // Find the message index
        const messageIndex = messages.findIndex(msg => msg.id === messageId);
        if (messageIndex === -1) return;

        // Clear all messages after this one
        const newMessages = messages.slice(0, messageIndex);

        // Update the edited message
        const editedMessage = {
            ...messages[messageIndex],
            content: newContent
        };

        setMessages([...newMessages, editedMessage]);

        // Set the input to the edited content and trigger send
        setInput(newContent);

        // Use setTimeout to ensure state updates have propagated
        setTimeout(() => {
            handleSend();
        }, 500);
    };

    const handleStop = () => {
        // todo: implement stop functionality for streaming
        setIsLoading(false);
        setIsWaiting(false);
        setStreamingMessageId(null);
    };

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
                    artifacts={artifacts}
                    showArtifacts={showArtifacts}
                    setShowArtifacts={setShowArtifacts}
                    showSettings={showSettings}
                    setShowSettings={setShowSettings}
                    modelSettings={modelSettings}
                />

                <Messages
                    messages={messages}
                    isLoading={isLoading}
                    handleEditSubmit={handleEditSubmit}
                    streamingMessageId={streamingMessageId}
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
                    canContinue={false}
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
                />
            )}
        </div>
    );
};

export default ClaudeClone;
