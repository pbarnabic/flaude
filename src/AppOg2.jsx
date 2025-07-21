import React, {useEffect, useRef, useState} from 'react';
import {TOOLS} from "./Constants/Tools.jsx";
import {TOOLS_V2} from "./Constants/ToolsV2.jsx";
import {API_KEY} from "./Constants/ApiKey.js";
import {executeREPL} from "./Utils/Repl.js";
import MobileArtifactPanel from "./Components/MobileArtifactPanel/MobileArtifactPanel.jsx";
import MobileArtifactsViewer from "./Components/MobileArtifactsViewer/MobileArtifactsViewer.jsx";
import ArtifactCanvas from "./Components/ArtifactCanvas/ArtifactCanvas.jsx";
import Header from "./Components/Header/Header.jsx";
import ChatInput from "./Components/ChatInput/ChatInput.jsx";
import Messages from "./Components/Messages/Messages.jsx";

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
    const [streamingMessageId, setStreamingMessageId] = useState(null);
    const [canContinue, setCanContinue] = useState(false);
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const abortControllerRef = useRef(null);
    const [lastPartialMessage, setLastPartialMessage] = useState(null);
    const streamingArtifactsRef = useRef({});

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
    }, [messages]);

    // Process tool calls from Claude's response
    const processToolCalls = async (toolCalls) => {
        const results = [];

        for (const call of toolCalls) {
            if (call.name === 'artifacts') {
                const {command, id, type, title, content, language, old_str, new_str} = call.input;

                if (command === 'create') {
                    setArtifacts(prev => ({
                        ...prev,
                        [id]: {id, type, language, title, content}
                    }));
                    setActiveArtifact(id);
                    results.push({tool_use_id: call.id, content: 'Artifact created successfully'});
                } else if (command === 'update' && artifacts[id]) {
                    setArtifacts(prev => ({
                        ...prev,
                        [id]: {
                            ...prev[id],
                            content: prev[id].content.replace(old_str, new_str)
                        }
                    }));
                    results.push({tool_use_id: call.id, content: 'Artifact updated successfully'});
                } else if (command === 'rewrite') {
                    setArtifacts(prev => ({
                        ...prev,
                        [id]: {id, type, language, title, content}
                    }));
                    results.push({tool_use_id: call.id, content: 'Artifact rewritten successfully'});
                }
            } else if (call.name === 'repl') {
                const result = executeREPL(call.input.code);
                results.push({tool_use_id: call.id, content: result});
            }
        }

        return results;
    };

    // Handle streaming API call
    const callClaudeAPIStreaming = async (messages, onChunk) => {
        abortControllerRef.current = new AbortController();

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
                tools: TOOLS,
                tool_choice: {type: 'auto'},
                stream: true
            }),
            signal: abortControllerRef.current.signal
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error: ${response.status} - ${errorText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const {done, value} = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, {stream: true});
            const lines = buffer.split('\n');

            // Process all complete lines
            for (let i = 0; i < lines.length - 1; i++) {
                const line = lines[i].trim();
                if (line.startsWith('event: ')) {
                    const eventType = line.slice(7);
                    const dataLine = lines[i + 1];
                    if (dataLine && dataLine.startsWith('data: ')) {
                        const data = dataLine.slice(6);
                        if (data !== '[DONE]') {
                            try {
                                const parsed = JSON.parse(data);
                                await onChunk({event: eventType, ...parsed});
                            } catch (e) {
                                console.error('Error parsing SSE data:', e);
                            }
                        }
                    }
                }
            }

            // Keep the last incomplete line in the buffer
            buffer = lines[lines.length - 1];
        }
    };

    const handleSend = async (isContinue = false) => {
        if ((!input.trim() && !isContinue) || !apiKey) return;

        let currentInput = input;
        if (!isContinue) {
            const userMessage = {
                id: Date.now(),
                role: 'user',
                content: input
            };
            setMessages(prev => [...prev, userMessage]);
            setInput('');
            setCanContinue(false);
            setLastPartialMessage(null);
        } else {
            currentInput = 'Continue from where you left off.';
        }

        setIsLoading(true);
        streamingArtifactsRef.current = {};

        try {
            const apiMessages = [];

            // Build API message history
            for (let i = 0; i < messages.length; i++) {
                const msg = messages[i];

                if (msg.role === 'user') {
                    apiMessages.push({role: 'user', content: msg.content});
                } else if (msg.role === 'assistant' && !msg.isStreaming) {
                    if (msg.toolCalls && msg.toolCalls.length > 0 && msg.apiContent) {
                        apiMessages.push(msg.apiContent);
                        if (i + 1 < messages.length && messages[i + 1].role === 'tool_result') {
                            apiMessages.push(messages[i + 1].apiContent);
                            i++; // Skip tool result
                        }
                    } else if (msg.content) {
                        apiMessages.push({role: 'assistant', content: msg.content});
                    }
                }
            }

            // Handle continuation by including the partial message
            if (isContinue && lastPartialMessage) {
                const contentBlock = [];

                if (lastPartialMessage.text?.trim()) {
                    contentBlock.push({type: 'text', text: lastPartialMessage.text.trim()});
                }

                // Include any partial tool calls
                if (lastPartialMessage.toolCalls && lastPartialMessage.toolCalls.length > 0) {
                    for (const toolCall of lastPartialMessage.toolCalls) {
                        contentBlock.push({
                            type: 'tool_use',
                            id: toolCall.id,
                            name: toolCall.name,
                            input: toolCall.input
                        });
                    }
                }

                if (contentBlock.length > 0) {
                    apiMessages.push({role: 'assistant', content: contentBlock});
                }

                apiMessages.push({role: 'user', content: currentInput});
            } else if (!isContinue) {
                apiMessages.push({role: 'user', content: currentInput});
            }

            const assistantMessageId = Date.now() + 1;
            setStreamingMessageId(assistantMessageId);

            let streamedContent = '';
            let toolCalls = [];
            let currentToolCall = null;
            let toolCallInput = '';
            let completedToolCalls = [];

            setMessages(prev => [...prev, {
                id: assistantMessageId,
                role: 'assistant',
                content: '',
                isStreaming: true
            }]);

            await callClaudeAPIStreaming(apiMessages, async (data) => {
                if (data.type === 'content_block_start') {
                    if (data.content_block.type === 'tool_use') {
                        currentToolCall = {
                            id: data.content_block.id,
                            name: data.content_block.name,
                            input: {}
                        };
                        toolCallInput = '';

                        // Initialize streaming artifact if it's an artifact tool call
                        if (data.content_block.name === 'artifacts') {
                            streamingArtifactsRef.current[data.content_block.id] = {
                                id: data.content_block.id,
                                content: '',
                                metadata: {}
                            };

                            // Auto-open artifacts panel on desktop when artifact creation starts
                            if (window.innerWidth >= 768) {
                                setShowArtifacts(true);
                            }
                        }
                    }
                } else if (data.type === 'content_block_delta') {
                    if (data.delta.type === 'text_delta') {
                        streamedContent += data.delta.text;
                        setMessages(prev => prev.map(msg =>
                            msg.id === assistantMessageId
                                ? {...msg, content: streamedContent}
                                : msg
                        ));
                    } else if (data.delta.type === 'input_json_delta' && currentToolCall) {
                        toolCallInput += data.delta.partial_json;

                        // Stream artifact content updates - just try to parse
                        if (currentToolCall.name === 'artifacts') {
                            try {
                                const parsed = JSON.parse(toolCallInput);

                                if (parsed.command === 'create' || parsed.command === 'rewrite') {
                                    setArtifacts(prev => ({
                                        ...prev,
                                        [parsed.id]: {
                                            id: parsed.id,
                                            type: parsed.type || 'text/plain',
                                            language: parsed.language || null,
                                            title: parsed.title || 'Creating...',
                                            content: parsed.content || ''
                                        }
                                    }));
                                    setActiveArtifact(parsed.id);
                                } else if (parsed.command === 'update' && parsed.id) {
                                    setArtifacts(prev => ({
                                        ...prev,
                                        [parsed.id]: {
                                            ...prev[parsed.id],
                                            content: prev[parsed.id].content.replace(parsed.old_str, parsed.new_str)
                                        }
                                    }));
                                }
                            } catch (e) {
                                // JSON incomplete, just wait for more
                            }
                        }
                    }
                } else if (data.type === 'content_block_stop') {
                    if (currentToolCall) {
                        try {
                            currentToolCall.input = JSON.parse(toolCallInput);
                            completedToolCalls.push(currentToolCall);
                            toolCalls.push(currentToolCall);
                        } catch (e) {
                            console.error('Error parsing tool input:', e);
                            // Save the partial JSON for continuation
                            currentToolCall.input = {};
                            currentToolCall.partialJson = toolCallInput;
                            completedToolCalls.push(currentToolCall);
                            toolCalls.push(currentToolCall);
                        }
                        currentToolCall = null;
                        toolCallInput = '';
                    }
                } else if (data.type === 'message_delta') {
                    if (data.delta.stop_reason === 'max_tokens') {
                        setCanContinue(true);

                        // Save the partial message state
                        const partialMessage = {
                            text: streamedContent,
                            toolCalls: completedToolCalls
                        };

                        // If there's an incomplete tool call, save it
                        if (currentToolCall && toolCallInput) {
                            try {
                                currentToolCall.input = JSON.parse(toolCallInput);
                            } catch (e) {
                                // For continuation, we need to extract what we can
                                currentToolCall.input = {};
                                currentToolCall.partialJson = toolCallInput;
                            }
                            partialMessage.toolCalls.push(currentToolCall);
                        }

                        setLastPartialMessage(partialMessage);
                    }
                }
            });

            const apiContent = {
                role: 'assistant',
                content: []
            };

            if (streamedContent) {
                apiContent.content.push({type: 'text', text: streamedContent});
            }

            for (const toolCall of toolCalls) {
                // For partial tool calls, try to reconstruct what we can
                if (toolCall.partialJson) {
                    try {
                        const parsed = JSON.parse(toolCall.partialJson);
                        toolCall.input = parsed;
                    } catch (e) {
                        // Extract what fields we can for the API
                        const partialData = {};
                        const jsonStr = toolCall.partialJson;

                        // Simple field extraction
                        const matches = {
                            command: jsonStr.match(/"command"\s*:\s*"([^"]+)"/),
                            id: jsonStr.match(/"id"\s*:\s*"([^"]+)"/),
                            type: jsonStr.match(/"type"\s*:\s*"([^"]+)"/),
                            language: jsonStr.match(/"language"\s*:\s*"([^"]+)"/),
                            title: jsonStr.match(/"title"\s*:\s*"([^"]+)"/),
                            content: jsonStr.match(/"content"\s*:\s*"([^"]*)/),
                        };

                        for (const [field, match] of Object.entries(matches)) {
                            if (match && match[1]) {
                                partialData[field] = match[1];
                            }
                        }

                        toolCall.input = partialData;
                    }
                    delete toolCall.partialJson;
                }

                apiContent.content.push({
                    type: 'tool_use',
                    id: toolCall.id,
                    name: toolCall.name,
                    input: toolCall.input
                });
            }

            setMessages(prev => prev.map(msg =>
                msg.id === assistantMessageId
                    ? {
                        ...msg,
                        content: streamedContent,
                        isStreaming: false,
                        toolCalls: toolCalls,
                        apiContent: apiContent.content.length > 0 ? apiContent : null
                    }
                    : msg
            ));

            if (toolCalls.length > 0) {
                const toolResults = await processToolCalls(toolCalls);

                const toolResultContent = toolResults.map(r => ({
                    type: 'tool_result',
                    tool_use_id: r.tool_use_id,
                    content: r.content
                }));

                const toolResultMessage = {
                    id: Date.now() + 2,
                    role: 'tool_result',
                    content: 'Tool executed',
                    apiContent: {role: 'user', content: toolResultContent}
                };

                setMessages(prev => [...prev, toolResultMessage]);

                const updatedApiMessages = [...apiMessages, apiContent, {role: 'user', content: toolResultContent}];
                const followUpMessageId = Date.now() + 3;
                setStreamingMessageId(followUpMessageId);

                let followUpContent = '';
                let followUpToolCalls = [];

                setMessages(prev => [...prev, {
                    id: followUpMessageId,
                    role: 'assistant',
                    content: '',
                    isStreaming: true
                }]);

                await callClaudeAPIStreaming(updatedApiMessages, async (data) => {
                    if (data.type === 'content_block_start') {
                        if (data.content_block.type === 'tool_use') {
                            currentToolCall = {
                                id: data.content_block.id,
                                name: data.content_block.name,
                                input: {}
                            };
                            toolCallInput = '';

                            // Initialize streaming artifact for follow-up calls too
                            if (data.content_block.name === 'artifacts') {
                                streamingArtifactsRef.current[data.content_block.id] = {
                                    id: data.content_block.id,
                                    content: '',
                                    metadata: {}
                                };

                                // Auto-open artifacts panel
                                if (window.innerWidth >= 768) {
                                    setShowArtifacts(true);
                                }
                            }
                        }
                    } else if (data.type === 'content_block_delta') {
                        if (data.delta.type === 'text_delta') {
                            followUpContent += data.delta.text;
                            setMessages(prev => prev.map(msg =>
                                msg.id === followUpMessageId
                                    ? {...msg, content: followUpContent}
                                    : msg
                            ));
                        } else if (data.delta.type === 'input_json_delta' && currentToolCall) {
                            toolCallInput += data.delta.partial_json;

                            // Handle artifact streaming in follow-up
                            if (currentToolCall.name === 'artifacts') {
                                try {
                                    const parsed = JSON.parse(toolCallInput);

                                    if (parsed.command === 'create' || parsed.command === 'rewrite') {
                                        setArtifacts(prev => ({
                                            ...prev,
                                            [parsed.id]: {
                                                id: parsed.id,
                                                type: parsed.type || 'text/plain',
                                                language: parsed.language || null,
                                                title: parsed.title || 'Creating...',
                                                content: parsed.content || ''
                                            }
                                        }));
                                        setActiveArtifact(parsed.id);
                                    } else if (parsed.command === 'update' && parsed.id) {
                                        setArtifacts(prev => ({
                                            ...prev,
                                            [parsed.id]: {
                                                ...prev[parsed.id],
                                                content: prev[parsed.id].content.replace(parsed.old_str, parsed.new_str)
                                            }
                                        }));
                                    }
                                } catch (e) {
                                    // JSON incomplete, wait for more
                                }
                            }
                        }
                    } else if (data.type === 'content_block_stop') {
                        if (currentToolCall) {
                            try {
                                currentToolCall.input = JSON.parse(toolCallInput);
                                followUpToolCalls.push(currentToolCall);
                            } catch (e) {
                                console.error('Error parsing follow-up tool input:', e);
                                currentToolCall.input = {};
                                currentToolCall.partialJson = toolCallInput;
                                followUpToolCalls.push(currentToolCall);
                            }
                            currentToolCall = null;
                            toolCallInput = '';
                        }
                    } else if (data.type === 'message_delta' && data.delta.stop_reason === 'max_tokens') {
                        setCanContinue(true);

                        const partialMessage = {
                            text: followUpContent,
                            toolCalls: followUpToolCalls
                        };

                        if (currentToolCall && toolCallInput) {
                            try {
                                currentToolCall.input = JSON.parse(toolCallInput);
                            } catch (e) {
                                currentToolCall.input = {};
                                currentToolCall.partialJson = toolCallInput;
                            }
                            partialMessage.toolCalls.push(currentToolCall);
                        }

                        setLastPartialMessage(partialMessage);
                    }
                });

                setMessages(prev => prev.map(msg =>
                    msg.id === followUpMessageId
                        ? {...msg, isStreaming: false, toolCalls: followUpToolCalls}
                        : msg
                ));
            }

            setStreamingMessageId(null);
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error calling Claude API:', error);
                const errorMessage = {
                    id: Date.now() + 1,
                    role: 'assistant',
                    content: `Error: ${error.message}`
                };

                setMessages(prev => {
                    const filtered = prev.filter(msg => !(msg.id === streamingMessageId && msg.isStreaming));
                    return [...filtered, errorMessage];
                });
            }
            setStreamingMessageId(null);
        } finally {
            setIsLoading(false);
            streamingArtifactsRef.current = {};
        }
    };

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setIsLoading(false);
            setStreamingMessageId(null);
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
        setCanContinue(false);
        setLastPartialMessage(null);
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

    const copyToClipboard = () => {
        if (activeArtifact && artifacts[activeArtifact]) {
            navigator.clipboard.writeText(artifacts[activeArtifact].content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
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
                />

                {/* Input */}
                <ChatInput
                    canContinue={canContinue}
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
