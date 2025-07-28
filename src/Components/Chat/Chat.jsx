import React, {useEffect, useRef, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import MobileArtifactCanvas from "../MobileArtifactCanvas/MobileArtifactCanvas.jsx";
import MobileArtifactsViewer from "../MobileArtifactsViewer/MobileArtifactsViewer.jsx";
import ArtifactsPanel from "../ArtifactPanel/ArtifactsPanel.jsx";
import Header from "../Header/Header.jsx";
import ChatInput from "../ChatInput/ChatInput.jsx";
import Messages from "../Messages/Messages.jsx";
import ModelSettings from "../ModelSettings/ModelSettings.jsx";
import SetupApiKey from "../SetupApiKey/SetupApiKey.jsx";
import RateLimitWaitingIndicator from "../RateLimitWaitingIndicator/RateLimitWaitingIndicator.jsx";
import DebugPanel from "../DebugPanel/DebugPanel.jsx";
import ChatLoading from "../ChatLoading/ChatLoading.jsx";
import {useChats} from "../../Contexts/ChatsContext.jsx";
import {useAuthentication} from "../../Contexts/AuthenticationContext.jsx";
import {getApiKey, getRateLimits, putApiKey, putRateLimits} from "../../Requests/SettingsRequests.js";
import {streamClaudeAPI, callClaudeAPI} from "../../Requests/AnthropicRequests.js";
import {processArtifactUpdate} from "../../Utils/ToolUtils.js";
import {ArtifactParsingUtilsV2} from "../../Utils/ArtifactParsingUtilsV2.js";
import {estimateTokens, rateLimiter} from "../../Utils/RateLimitUtils.js";
import {executeREPL} from "../../Utils/ReplUtils.js";
import {ImageUtils} from "../../Utils/ImageUtils.js";
import {NAME_CHAT_TOOL} from "../../Constants/Tools.js";
import {OPENING_TAG} from "../../Constants/ArtifactDelimiters.js";

const Chat = ({showChatSidebar, setShowChatSidebar, modelSettings: defaultModelSettings}) => {
    const {chatId} = useParams();
    const navigate = useNavigate();

    // Contexts
    const {isAuthenticated, isLoading: isPasswordLoading} = useAuthentication();

    const {
        currentChat,
        currentMessages,
        isLoadingCurrentChat,
        isDatabaseReady,
        loadCurrentChat,
        updateCurrentChatMessages,
        clearCurrentChatMessages,
        createNewChat
    } = useChats();

    // Use current messages from context instead of local state
    const apiMessages = currentMessages;

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
    const [pendingImages, setPendingImages] = useState([]); // Images waiting to be sent

    // Rate Limiting UI State
    const [isWaiting, setIsWaiting] = useState(false);
    const [waitingMessage, setWaitingMessage] = useState('');

    // Settings
    const [apiKey, setApiKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showDebugInfo, setShowDebugInfo] = useState(false);
    const [modelSettings, setModelSettings] = useState(
        defaultModelSettings || {
            model: 'claude-3-5-haiku-20241022',
            temperature: 1.0,
            maxTokens: 500
        }
    );
    const [rateLimits, setRateLimits] = useState({});

    // Auto-save ref to prevent excessive saves
    const saveTimeoutRef = useRef(null);
    const lastSavedMessagesRef = useRef('');

    // Load API key and rate limits on mount when authenticated and database is ready
    useEffect(() => {
        if (!isAuthenticated || !isDatabaseReady) return;

        const loadUserSettings = async () => {
            try {
                // Load API key
                const savedApiKey = await getApiKey();
                if (savedApiKey) {
                    setApiKey(savedApiKey);
                }

                // Load rate limits
                const savedRateLimits = await getRateLimits();
                setRateLimits(savedRateLimits);
            } catch (error) {
                console.error('Error loading user settings:', error);
            }
        };

        loadUserSettings();
    }, [isAuthenticated, isDatabaseReady]);

    // Save API key when it changes (debounced)
    useEffect(() => {
        if (!isAuthenticated || !isDatabaseReady || !apiKey) return;

        const saveApiKeyDebounced = async () => {
            try {
                await putApiKey(apiKey);
            } catch (error) {
                console.error('Error saving API key:', error);
            }
        };

        // Debounce saving
        const timeout = setTimeout(saveApiKeyDebounced, 1000);
        return () => clearTimeout(timeout);
    }, [apiKey, isAuthenticated, isDatabaseReady]);

    // Save rate limits when they change
    useEffect(() => {
        if (!isAuthenticated || !isDatabaseReady || Object.keys(rateLimits).length === 0) return;

        const saveRateLimitsDebounced = async () => {
            try {
                await putRateLimits(rateLimits);
            } catch (error) {
                console.error('Error saving rate limits:', error);
            }
        };

        // Debounce saving
        const timeout = setTimeout(saveRateLimitsDebounced, 500);
        return () => clearTimeout(timeout);
    }, [rateLimits, isAuthenticated, isDatabaseReady]);

    // Load chat on mount or chatId change - but only after authentication is complete
    useEffect(() => {
        // Don't try to load chats until authentication is complete AND database is ready
        if (isPasswordLoading || !isAuthenticated || !isDatabaseReady) {
            return;
        }

        const handleChatLoad = async () => {
            if (chatId) {
                try {
                    await loadCurrentChat(chatId);
                    // Update model settings from loaded chat
                    if (currentChat?.modelSettings) {
                        setModelSettings(currentChat.modelSettings);
                    }
                } catch (error) {
                    console.error('Error loading chat:', error);
                    // Create a fallback chat
                    try {
                        const newChat = await createNewChat({modelSettings: defaultModelSettings});
                        navigate(`/chats/${newChat.id}`, {replace: true});
                    } catch (createError) {
                        console.error('Error creating fallback chat:', createError);
                    }
                }
            } else {
                // No chatId, redirect to new chat
                try {
                    const newChat = await createNewChat({modelSettings: defaultModelSettings});
                    navigate(`/chats/${newChat.id}`, {replace: true});
                } catch (createError) {
                    console.error('Error creating new chat:', createError);
                }
            }
        };

        handleChatLoad();
    }, [chatId, navigate, isAuthenticated, isPasswordLoading, isDatabaseReady]);

    // Auto-save messages when they change
    useEffect(() => {
        if (!currentChat || isLoadingCurrentChat || apiMessages.length === 0 || !isAuthenticated) return;

        const messagesString = JSON.stringify(apiMessages);

        // Don't save if messages haven't actually changed
        if (messagesString === lastSavedMessagesRef.current) return;

        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Debounce saving by 1 second
        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await updateCurrentChatMessages(apiMessages);
                lastSavedMessagesRef.current = messagesString;
            } catch (error) {
                console.error('Error auto-saving messages:', error);
            }
        }, 1000);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [apiMessages, currentChat, isLoadingCurrentChat, isAuthenticated]);

    // Save model settings when they change
    useEffect(() => {
        if (!currentChat || isLoadingCurrentChat || !isAuthenticated) return;

        const updateChatSettings = async () => {
            try {
                // We'll use the context's updateChatById method through a different approach
                // For now, just update local context - we can enhance this later
                console.log('Model settings updated:', modelSettings);
            } catch (error) {
                console.error('Error saving model settings:', error);
            }
        };

        updateChatSettings();
    }, [modelSettings, currentChat, isLoadingCurrentChat, isAuthenticated]);

    // Get current artifacts (latest versions for processing)
    const getCurrentArtifacts = () => {
        const artifactVersions = ArtifactParsingUtilsV2.parseArtifactsFromMessages(apiMessages, streamingContent);
        return ArtifactParsingUtilsV2.getLatestArtifacts(artifactVersions);
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
            setWaitingMessage(`Rate limit approaching. Waiting ${Math.ceil(waitTime / 1000)} seconds...`);
            await rateLimiter.waitIfNeeded(
                modelSettings.model,
                estimatedInputTokens,
                rateLimits[modelSettings.model]
            );
            setIsWaiting(false);
            setWaitingMessage('');
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
            // Use context method to update messages
            updateCurrentChatMessages(updatedApiMessages);

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
                updateCurrentChatMessages(finalApiMessages);

                // Continue the conversation
                await runStreamingConversation(finalApiMessages, apiKey, modelSettings);
            }

        } catch (error) {
            console.error('Streaming error:', error);
            setStreamingContent('');
            setStreamingToolCalls([]);
            setStreamingMessageId(null);

            // Add error message
            updateCurrentChatMessages([...currentApiMessages, {
                role: 'assistant',
                content: `Error: ${error.message}`
            }]);
        }
    };

    // Handle sending a message
    const handleSend = async (isContinue = false) => {
        const hasText = input.trim();
        const hasImages = pendingImages.length > 0;

        if (!hasText && !hasImages) return;
        if (!apiKey || !currentChat || !isAuthenticated) return;

        // Build user message content in API format
        let userContent;

        if (hasImages) {
            const contentArray = [];

            // Add text if present
            if (hasText) {
                contentArray.push({
                    type: 'text',
                    text: input.trim()
                });
            }

            // Add images (already in API format)
            contentArray.push(...pendingImages);

            userContent = contentArray;
        } else {
            // Text only message
            userContent = input.trim();
        }

        // Create new message - content is exactly what API expects
        const newApiMessages = [...apiMessages, {
            role: 'user',
            content: userContent
        }];

        updateCurrentChatMessages(newApiMessages);
        setInput('');
        setPendingImages([]); // Clear pending images after sending
        setIsLoading(true);

        try {
            await runStreamingConversation(newApiMessages, apiKey, modelSettings);
        } catch (error) {
            console.error('Error in conversation:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImagesAdded = async (files) => {
        const imageObjects = await ImageUtils.processFilesForAPI(files);
        setPendingImages(prev => [...prev, ...imageObjects]);
    };

    // Handle removing pending images
    const handleRemovePendingImage = (index) => {
        setPendingImages(prev => prev.filter((_, i) => i !== index));
    };


    const handleClear = async () => {
        if (!isAuthenticated) return;

        setStreamingContent('');
        setStreamingToolCalls([]);
        setStreamingMessageId(null);
        setActiveArtifact(null);

        // Use context method to clear messages
        await clearCurrentChatMessages();
    };

    const handleEditSubmit = async (messageApiIndex, newContent) => {
        if (!isAuthenticated) return;

        // Clear messages after the edit point
        const truncatedMessages = apiMessages.slice(0, messageApiIndex);
        updateCurrentChatMessages(truncatedMessages);

        // Send the edited message (text only for edits)
        const newApiMessages = [...truncatedMessages, {
            role: 'user',
            content: newContent
        }];

        updateCurrentChatMessages(newApiMessages);
        setIsLoading(true);

        try {
            await runStreamingConversation(newApiMessages, apiKey, modelSettings);
        } catch (error) {
            console.error('Error in conversation:', error);
        } finally {
            setIsLoading(false);
        }
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
            if (!showArtifacts && window.innerWidth >= 768 && streamingContent) {
                setShowArtifacts(true);
            }
        }
    }, [apiMessages, streamingContent, activeArtifact]);

    // Show loading state while password/authentication is being checked or chat is being loaded
    if (isPasswordLoading || !isAuthenticated || !isDatabaseReady || isLoadingCurrentChat) {
        return (
            <ChatLoading
                isPasswordLoading={isPasswordLoading}
                isAuthenticated={isAuthenticated}
                isDatabaseReady={isDatabaseReady}
            />
        );
    }

    // Show API key setup if no API key is configured
    if (!apiKey) return <SetupApiKey apiKey={apiKey} setApiKey={setApiKey}/>;

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
                className={`flex-1 flex flex-col transition-all duration-300 ${showArtifacts && window.innerWidth >= 768 ? 'md:mr-0' : ''} w-80`}>
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
                    currentChat={currentChat}
                    setShowChatSidebar={setShowChatSidebar}
                    showChatSidebar={showChatSidebar}
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
                    }}
                    onImagesAdded={handleImagesAdded}
                />

                {/* Rate Limit Waiting Indicator */}
                {isWaiting && (
                    <RateLimitWaitingIndicator waitingMessage={waitingMessage}/>
                )}

                <ChatInput
                    isLoading={isLoading || isWaiting}
                    handleSend={handleSend}
                    input={input}
                    setInput={setInput}
                    apiKey={apiKey}
                    handleStop={handleStop}
                    pendingImages={pendingImages}
                    onImagesAdded={handleImagesAdded}
                    onRemovePendingImage={handleRemovePendingImage}
                />
            </div>

            <ArtifactsPanel
                apiMessages={apiMessages}
                streamingContent={streamingContent}
                showArtifacts={showArtifacts}
                setShowArtifacts={setShowArtifacts}
                activeArtifact={activeArtifact}
                setActiveArtifact={setActiveArtifact}
                showDebugInfo={showDebugInfo}
            />

            <MobileArtifactsViewer
                apiMessages={apiMessages}
                streamingContent={streamingContent}
                showArtifacts={showArtifacts}
                setShowArtifacts={setShowArtifacts}
            />

            {showArtifacts && (
                <MobileArtifactCanvas
                    apiMessages={apiMessages}
                    streamingContent={streamingContent}
                    showArtifacts={showArtifacts}
                    setShowArtifacts={setShowArtifacts}
                    activeArtifact={activeArtifact}
                    setActiveArtifact={setActiveArtifact}
                />
            )}

            {showDebugInfo && (
                <DebugPanel
                    currentChatStr={JSON.stringify(currentChat, null, 2)}
                    apiMessagesStr={JSON.stringify(apiMessages, null, 2)}
                    currentArtifactsStr={JSON.stringify(getCurrentArtifacts(), null, 2)}
                    rateLimitsStr={JSON.stringify(rateLimits, null, 2)}
                />
            )}
        </div>
    );
};

export default Chat;
