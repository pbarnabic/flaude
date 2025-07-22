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
import {callClaudeAPI} from "./Requests/AnthropicRequests.js";
import {buildApiMessages, parseClaudeResponse} from "./Utils/ConversationUtils.js";
import {executeArtifactOperation, normalizeArtifactOperations} from "./Utils/ToolUtils.js";
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
     * Process artifact tool calls and return the result
     * This now properly tracks which artifacts were modified
     */
    const processArtifactTool = (toolCall, currentArtifacts) => {
        console.log('Processing artifact tool call:', toolCall);

        let operationResult = { success: true };
        let modifiedArtifactIds = [];
        let updatedArtifacts = currentArtifacts;

        try {
            const operations = normalizeArtifactOperations(toolCall.input);

            for (const operation of operations) {
                console.log(`Processing ${operation.command} operation for artifact ${operation.id}`);

                // Check if artifact exists for update operations
                if (operation.command === 'update' && !updatedArtifacts[operation.id]) {
                    console.error(`Artifact ${operation.id} not found for update`);
                    operationResult = { success: false, error: `Artifact ${operation.id} not found` };
                    continue;
                }

                // Execute the operation
                updatedArtifacts = executeArtifactOperation(operation, updatedArtifacts);

                // Track which artifacts were modified
                modifiedArtifactIds.push(operation.id);
            }

            return {
                result: JSON.stringify(operationResult),
                updatedArtifacts,
                modifiedArtifactIds
            };

        } catch (error) {
            console.error('Error processing artifact tool call:', error);
            return {
                result: JSON.stringify({ success: false, error: error.message }),
                updatedArtifacts: currentArtifacts,
                modifiedArtifactIds: []
            };
        }
    };

    // Helper function to create UI message objects
    const createAssistantMessage = (messageId, assistantContent, toolCalls, apiContent) => ({
        id: messageId,
        role: 'assistant',
        content: assistantContent,
        toolCalls: toolCalls,
        apiContent: apiContent ? {role: 'assistant', content: apiContent} : null,
        shouldStream: !!assistantContent.trim()
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

    // Main conversation loop - handles the back-and-forth with Claude
    const runConversationLoop = async (apiMessages, apiKey, modelSettings, setMessages) => {
        let currentApiMessages = [...apiMessages];
        let messageIdCounter = Date.now() + 1;

        while (true) {
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

            // Call Claude API
            const response = await callClaudeAPI(currentApiMessages, apiKey, modelSettings);

            // Parse response with usage information
            const {assistantContent, toolCalls, usage} = parseClaudeResponse(response);

            // Record the actual token usage
            rateLimiter.recordUsage(
                modelSettings.model,
                usage.input_tokens,
                usage.output_tokens
            );

            // Create and add assistant message to UI
            const assistantMessage = createAssistantMessage(
                messageIdCounter++,
                assistantContent,
                toolCalls,
                response.content
            );
            setMessages(prev => [...prev, assistantMessage]);

            // If no tool calls, conversation is complete
            if (toolCalls.length === 0) {
                break;
            }

            // Process tool calls
            const toolResults = [];
            let lastModifiedArtifactId = null;

            for (const call of toolCalls) {
                let result;

                switch (call.name) {
                    case 'artifacts':
                        // Get current artifacts state
                        const currentArtifacts = await new Promise(resolve => {
                            setArtifacts(current => {
                                resolve(current);
                                return current;
                            });
                        });

                        // Process artifact operations
                        const artifactProcessResult = processArtifactTool(call, currentArtifacts);

                        // Update artifacts state
                        setArtifacts(artifactProcessResult.updatedArtifacts);

                        // Track the last modified artifact
                        if (artifactProcessResult.modifiedArtifactIds.length > 0) {
                            lastModifiedArtifactId = artifactProcessResult.modifiedArtifactIds[
                            artifactProcessResult.modifiedArtifactIds.length - 1
                                ];
                        }

                        result = artifactProcessResult.result;
                        break;

                    case 'repl':
                        result = await processReplTool(call);
                        break;

                    default:
                        console.warn('Unknown tool:', call.name);
                        result = JSON.stringify({success: false, error: 'Unknown tool'});
                }

                toolResults.push({
                    tool_use_id: call.id,
                    content: result
                });
            }

            // Handle UI updates after processing all tools
            if (lastModifiedArtifactId) {
                console.log('Setting active artifact to:', lastModifiedArtifactId);
                setActiveArtifact(lastModifiedArtifactId);

                // Auto-open artifacts panel on desktop
                if (window.innerWidth >= 768) {
                    setShowArtifacts(true);
                }
            }

            // Create and add tool result message
            const toolResultMessage = createToolResultMessage(messageIdCounter++, toolResults);
            setMessages(prev => [...prev, toolResultMessage]);

            // Update API messages for next iteration
            currentApiMessages = [
                ...currentApiMessages,
                {role: 'assistant', content: response.content},
                {role: 'user', content: toolResultMessage.apiContent.content}
            ];
        }
    };

    // Simplified main handleSend function
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

            // Run the conversation loop until Claude stops using tools
            await runConversationLoop(
                apiMessages,
                apiKey,
                modelSettings,
                setMessages
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
        // todo: implement stop functionality
        setIsLoading(false);
        setIsWaiting(false);
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
