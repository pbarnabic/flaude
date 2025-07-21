import React, {useEffect, useRef, useState} from 'react';
import {TOOLS_V2} from "./Constants/ToolsV2.jsx";
import {API_KEY} from "./Constants/ApiKey.js";
import {executeREPL} from "./Utils/Repl.js";
import MobileArtifactPanel from "./Components/MobileArtifactPanel/MobileArtifactPanel.jsx";
import MobileArtifactsViewer from "./Components/MobileArtifactsViewer/MobileArtifactsViewer.jsx";
import ArtifactCanvas from "./Components/ArtifactCanvas/ArtifactCanvas.jsx";
import Header from "./Components/Header/Header.jsx";
import ChatInput from "./Components/ChatInput/ChatInput.jsx";
import Messages from "./Components/Messages/Messages.jsx";
import {SYSTEM_MESSAGE} from "./Constants/SystemMessages.js";

const ClaudeClone = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [artifacts, setArtifacts] = useState({});
    const [activeArtifact, setActiveArtifact] = useState(null);
    const [copied, setCopied] = useState(false);
    const [apiKey, setApiKey] = useState(API_KEY);
    const [showApiKey, setShowApiKey] = useState(false);
    const [showArtifacts, setShowArtifacts] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
    }, [messages]);

    // Process tool calls from Claude's response
    const processToolCalls = async (toolCalls) => {
        const results = [];

        for (const call of toolCalls) {
            if (call.name === 'artifacts') {
                // Check if it's the new format (with artifacts array) or old format (direct properties)
                let operations = [];

                if (call.input.artifacts && Array.isArray(call.input.artifacts)) {
                    // New format: { artifacts: [...] }
                    operations = call.input.artifacts;
                } else if (call.input.command) {
                    // Old format: { command, id, ... }
                    operations = [call.input];
                }

                // Process each operation
                for (const operation of operations) {
                    const {command, id, type, title, content, language, old_str, new_str} = operation;

                    if (command === 'create') {
                        setArtifacts(prev => ({
                            ...prev,
                            [id]: {id, type, language, title, content}
                        }));
                        setActiveArtifact(id);
                    } else if (command === 'update') {
                        if (old_str && new_str) {
                            // Handle string replacement update
                            setArtifacts(prev => {
                                if (!prev[id] || !prev[id].content) {
                                    console.warn(`Artifact ${id} not found or has no content for update`);
                                    return prev;
                                }
                                return {
                                    ...prev,
                                    [id]: {
                                        ...prev[id],
                                        content: prev[id].content.replace(old_str, new_str)
                                    }
                                };
                            });
                        } else if (content) {
                            // Handle content append update
                            setArtifacts(prev => {
                                if (!prev[id]) {
                                    console.warn(`Artifact ${id} not found for update`);
                                    return prev;
                                }
                                return {
                                    ...prev,
                                    [id]: {
                                        ...prev[id],
                                        content: (prev[id].content || '') + content
                                    }
                                };
                            });
                        }
                    } else if (command === 'rewrite') {
                        setArtifacts(prev => ({
                            ...prev,
                            [id]: {id, type, language, title, content}
                        }));
                    }
                }

                // Return success: true as JSON string - ONE PER TOOL CALL, NOT PER OPERATION
                results.push({
                    tool_use_id: call.id,
                    content: JSON.stringify({success: true})
                });

                // Auto-open artifacts panel on desktop
                if (window.innerWidth >= 768) {
                    setShowArtifacts(true);
                }
            } else if (call.name === 'repl') {
                const result = executeREPL(call.input.code);
                results.push({tool_use_id: call.id, content: result});
            }
        }

        return results;
    };

    // Non-streaming API call
    const callClaudeAPI = async (messages) => {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 4096,
                messages: messages,
                system: SYSTEM_MESSAGE,
                tools: TOOLS_V2,
                tool_choice: {type: 'auto'}
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error: ${response.status} - ${errorText}`);
        }

        return await response.json();
    };

    const handleSend = async () => {
        if (!input.trim() || !apiKey) return;

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
            const apiMessages = [];
            for (let i = 0; i < messages.length; i++) {
                const msg = messages[i];

                if (msg.role === 'user') {
                    apiMessages.push({role: 'user', content: msg.content});
                } else if (msg.role === 'assistant') {
                    if (msg.apiContent) {
                        apiMessages.push(msg.apiContent);
                        // Include tool results if they follow
                        if (i + 1 < messages.length && messages[i + 1].role === 'tool_result') {
                            apiMessages.push(messages[i + 1].apiContent);
                            i++; // Skip tool result
                        }
                    } else if (msg.content) {
                        apiMessages.push({role: 'assistant', content: msg.content});
                    }
                }
            }

            // Add current user message
            apiMessages.push({role: 'user', content: input});

            // Keep making API calls until Claude stops using tools
            let currentApiMessages = [...apiMessages];
            let messageIdCounter = Date.now() + 1;

            while (true) {
                // Call Claude API
                const response = await callClaudeAPI(currentApiMessages);

                // Process the response
                let assistantContent = '';
                let toolCalls = [];

                // Extract content and tool calls from response
                if (response.content) {
                    for (const block of response.content) {
                        if (block.type === 'text') {
                            assistantContent += block.text;
                        } else if (block.type === 'tool_use') {
                            toolCalls.push({
                                id: block.id,
                                name: block.name,
                                input: block.input
                            });
                        }
                    }
                }

                // Create assistant message
                const assistantMessage = {
                    id: messageIdCounter++,
                    role: 'assistant',
                    content: assistantContent,
                    toolCalls: toolCalls,
                    apiContent: response.content ? {role: 'assistant', content: response.content} : null
                };
                setMessages(prev => [...prev, assistantMessage]);

                // If no tool calls, we're done
                if (toolCalls.length === 0) {
                    break;
                }

                // Process tool calls
                const toolResults = await processToolCalls(toolCalls);

                // Create tool result message
                const toolResultContent = toolResults.map(r => ({
                    type: 'tool_result',
                    tool_use_id: r.tool_use_id,
                    content: r.content
                }));

                const toolResultMessage = {
                    id: messageIdCounter++,
                    role: 'tool_result',
                    content: 'Tool executed',
                    apiContent: {role: 'user', content: toolResultContent}
                };
                setMessages(prev => [...prev, toolResultMessage]);

                // Update API messages for next iteration
                currentApiMessages = [
                    ...currentApiMessages,
                    {role: 'assistant', content: response.content},
                    {role: 'user', content: toolResultContent}
                ];
            }

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

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleClear = () => {
        setMessages([]);
        setArtifacts({});
        setActiveArtifact(null);
    };

    const handleDownload = () => {
        const data = {
            messages: messages.map(m => ({
                id: m.id,
                role: m.role,
                content: m.content
            })),
            artifacts,
            timestamp: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `claude-conversation-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                setMessages(data.messages || []);
                setArtifacts(data.artifacts || {});
                if (Object.keys(data.artifacts || {}).length > 0) {
                    setActiveArtifact(Object.keys(data.artifacts)[0]);
                }
            } catch (error) {
                alert('Invalid file format');
            }
        };
        reader.readAsText(file);
    };

    const handleEditSubmit = async (messageId, newContent) => {
        if (!newContent.trim() || !apiKey) return;

        // Find the index of the message being edited
        const messageIndex = messages.findIndex(msg => msg.id === messageId);
        if (messageIndex === -1) return;

        // Truncate messages array to only include messages up to (and including) the edited message
        const truncatedMessages = messages.slice(0, messageIndex);

        // Update the edited message with new content
        const editedMessage = {
            ...messages[messageIndex],
            content: newContent
        };

        // Set messages to only include up to the edited message
        setMessages([...truncatedMessages, editedMessage]);
        setIsLoading(true);

        try {
            // Build API message history up to the edited message
            const apiMessages = [];
            for (let i = 0; i < truncatedMessages.length; i++) {
                const msg = truncatedMessages[i];

                if (msg.role === 'user') {
                    apiMessages.push({role: 'user', content: msg.content});
                } else if (msg.role === 'assistant') {
                    if (msg.apiContent) {
                        apiMessages.push(msg.apiContent);
                        // Include tool results if they follow
                        if (i + 1 < truncatedMessages.length && truncatedMessages[i + 1].role === 'tool_result') {
                            apiMessages.push(truncatedMessages[i + 1].apiContent);
                            i++; // Skip tool result
                        }
                    } else if (msg.content) {
                        apiMessages.push({role: 'assistant', content: msg.content});
                    }
                }
            }

            // Add the edited message
            apiMessages.push({role: 'user', content: newContent});

            // Keep making API calls until Claude stops using tools
            let currentApiMessages = [...apiMessages];
            let messageIdCounter = Date.now() + 1;

            while (true) {
                // Call Claude API
                const response = await callClaudeAPI(currentApiMessages);

                // Process the response
                let assistantContent = '';
                let toolCalls = [];

                // Extract content and tool calls from response
                if (response.content) {
                    for (const block of response.content) {
                        if (block.type === 'text') {
                            assistantContent += block.text;
                        } else if (block.type === 'tool_use') {
                            toolCalls.push({
                                id: block.id,
                                name: block.name,
                                input: block.input
                            });
                        }
                    }
                }

                // Create assistant message
                const assistantMessage = {
                    id: messageIdCounter++,
                    role: 'assistant',
                    content: assistantContent,
                    toolCalls: toolCalls,
                    apiContent: response.content ? {role: 'assistant', content: response.content} : null
                };
                setMessages(prev => [...prev, assistantMessage]);

                // If no tool calls, we're done
                if (toolCalls.length === 0) {
                    break;
                }

                // Process tool calls
                const toolResults = await processToolCalls(toolCalls);

                // Create tool result message
                const toolResultContent = toolResults.map(r => ({
                    type: 'tool_result',
                    tool_use_id: r.tool_use_id,
                    content: r.content
                }));

                const toolResultMessage = {
                    id: messageIdCounter++,
                    role: 'tool_result',
                    content: 'Tool executed',
                    apiContent: {role: 'user', content: toolResultContent}
                };
                setMessages(prev => [...prev, toolResultMessage]);

                // Update API messages for next iteration
                currentApiMessages = [
                    ...currentApiMessages,
                    {role: 'assistant', content: response.content},
                    {role: 'user', content: toolResultContent}
                ];
            }

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

    const copyToClipboard = () => {
        if (activeArtifact && artifacts[activeArtifact]) {
            navigator.clipboard.writeText(artifacts[activeArtifact].content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Simplified handleStop since we're not using streaming
    const handleStop = () => {
        // This could be implemented with AbortController if needed
        // For now, it's a no-op since we're not streaming
    };

    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100 relative">
            {/* Chat Section */}
            <div
                className={`flex-1 flex flex-col transition-all duration-300 ${showArtifacts && window.innerWidth >= 768 ? 'md:mr-0' : ''}`}>
                {/* Header */}
                <Header
                    showApiKey={showApiKey}
                    setShowApiKey={setShowApiKey}
                    apiKey={apiKey}
                    setApiKey={setApiKey}
                    handleClear={handleClear}
                    fileInputRef={fileInputRef}
                    showMobileMenu={showMobileMenu}
                    setShowMobileMenu={setShowMobileMenu}
                    handleDownload={handleDownload}
                    // Add these new props:
                    artifacts={artifacts}
                    showArtifacts={showArtifacts}
                    setShowArtifacts={setShowArtifacts}
                />

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleUpload}
                    className="hidden"
                />

                {/* Messages */}
                <Messages
                    messages={messages}
                    messagesEndRef={messagesEndRef}
                    isLoading={isLoading}
                    handleEditSubmit={handleEditSubmit}
                />

                {/* Input */}
                <ChatInput
                    canContinue={false}
                    isLoading={isLoading}
                    handleSend={handleSend}
                    input={input}
                    setInput={setInput}
                    apiKey={apiKey}
                    handleStop={handleStop}
                    handleKeyPress={handleKeyPress}
                />
            </div>

            {/* Artifact Canvas - Desktop */}
            <ArtifactCanvas
                artifacts={artifacts}
                showArtifacts={showArtifacts}
                setShowArtifacts={setShowArtifacts}
                activeArtifact={activeArtifact}
                setActiveArtifact={setActiveArtifact}
                copyToClipboard={copyToClipboard}
                copied={copied}
            />

            {/* Mobile Artifact Viewer */}
            <MobileArtifactsViewer
                artifacts={artifacts}
                showArtifacts={showArtifacts}
                setShowArtifacts={setShowArtifacts}
            />

            {/* Mobile Artifact Panel */}
            {showArtifacts && (
                <MobileArtifactPanel
                    showArtifacts={showArtifacts}
                    setShowArtifacts={setShowArtifacts}
                    artifacts={artifacts}
                    activeArtifact={activeArtifact}
                    copyToClipboard={copyToClipboard}
                    copied={copied}
                />
            )}
        </div>
    )
}

export default ClaudeClone;
