import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Download, Upload, Code, FileText, X, Copy, Check, Play, Menu, ChevronLeft, Key, Eye, EyeOff, Sparkles, Bot, User, RefreshCw } from 'lucide-react';

// Exact tool definitions from Claude
const tools = [
    {
        name: "artifacts",
        description: "Creates and updates artifacts. Artifacts are self-contained pieces of content that can be referenced and updated throughout the conversation in collaboration with the user.",
        input_schema: {
            type: "object",
            properties: {
                command: { type: "string" },
                content: { anyOf: [{ type: "string" }, { type: "null" }], default: null },
                id: { type: "string" },
                language: { anyOf: [{ type: "string" }, { type: "null" }], default: null },
                new_str: { anyOf: [{ type: "string" }, { type: "null" }], default: null },
                old_str: { anyOf: [{ type: "string" }, { type: "null" }], default: null },
                title: { anyOf: [{ type: "string" }, { type: "null" }], default: null },
                type: { anyOf: [{ type: "string" }, { type: "null" }], default: null }
            },
            required: ["command", "id"]
        }
    },
    {
        name: "repl",
        description: "Execute JavaScript code in a sandboxed environment",
        input_schema: {
            type: "object",
            properties: {
                code: { type: "string" }
            },
            required: ["code"]
        }
    }
];

const ClaudeClone = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [artifacts, setArtifacts] = useState({});
    const [activeArtifact, setActiveArtifact] = useState(null);
    const [copied, setCopied] = useState(false);
    const [apiKey, setApiKey] = useState('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');
    const [showApiKey, setShowApiKey] = useState(false);
    const [showArtifacts, setShowArtifacts] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [streamingMessageId, setStreamingMessageId] = useState(null);
    const [canContinue, setCanContinue] = useState(false);
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const abortControllerRef = useRef(null);


    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
    }, [messages]);

    useEffect(() => {
        if (Object.keys(artifacts).length > 0 && window.innerWidth >= 768) {
            setShowArtifacts(true);
        }
    }, [artifacts]);

    // Execute REPL code in a sandboxed manner
    const executeREPL = (code) => {
        const logs = [];
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;

        // Capture console output
        console.log = (...args) => logs.push({type: 'log', content: args.join(' ')});
        console.error = (...args) => logs.push({type: 'error', content: args.join(' ')});
        console.warn = (...args) => logs.push({type: 'warn', content: args.join(' ')});

        try {
            // Create a sandboxed function
            const func = new Function(code);
            func();

            // Restore console
            console.log = originalLog;
            console.error = originalError;
            console.warn = originalWarn;

            return logs.map(l => l.content).join('\n') || 'Code executed successfully';
        } catch (error) {
            // Restore console
            console.log = originalLog;
            console.error = originalError;
            console.warn = originalWarn;

            return `Error: ${error.message}`;
        }
    };

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
                tools: tools,
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
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
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
                                await onChunk({ event: eventType, ...parsed });
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
        } else {
            currentInput = 'Continue from where you left off.';
        }

        setIsLoading(true);

        try {
            // Build API message history - DO NOT include currently streaming messages
            const apiMessages = [];

            for (let i = 0; i < messages.length; i++) {
                const msg = messages[i];

                if (msg.role === 'user') {
                    apiMessages.push({role: 'user', content: msg.content});
                } else if (msg.role === 'assistant' && !msg.isStreaming) {
                    // Only include completed assistant messages
                    if (msg.toolCalls && msg.toolCalls.length > 0 && msg.apiContent) {
                        apiMessages.push(msg.apiContent);

                        // Look for corresponding tool result
                        if (i + 1 < messages.length && messages[i + 1].role === 'tool_result') {
                            apiMessages.push(messages[i + 1].apiContent);
                            i++; // Skip the tool result in next iteration
                        }
                    } else if (msg.content) {
                        apiMessages.push({role: 'assistant', content: msg.content});
                    }
                }
            }

            // Add the current input
            if (isContinue) {
                apiMessages.push({role: 'user', content: 'Continue from where you left off.'});
            } else {
                apiMessages.push({role: 'user', content: currentInput});
            }

            // Create assistant message
            const assistantMessageId = Date.now() + 1;
            setStreamingMessageId(assistantMessageId);

            let streamedContent = '';
            let toolCalls = [];
            let currentToolCall = null;
            let toolCallInput = '';

            // Add empty assistant message
            setMessages(prev => [...prev, {
                id: assistantMessageId,
                role: 'assistant',
                content: '',
                isStreaming: true
            }]);

            // Handle streaming chunks
            await callClaudeAPIStreaming(apiMessages, async (data) => {
                if (data.type === 'message_start') {
                    // Message started
                } else if (data.type === 'content_block_start') {
                    if (data.content_block.type === 'text') {
                        // Text content starting
                    } else if (data.content_block.type === 'tool_use') {
                        // Tool use starting
                        currentToolCall = {
                            id: data.content_block.id,
                            name: data.content_block.name,
                            input: {}
                        };
                        toolCallInput = '';
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
                        // Accumulate JSON string
                        toolCallInput += data.delta.partial_json;
                    }
                } else if (data.type === 'content_block_stop') {
                    if (currentToolCall) {
                        // Parse the complete JSON
                        try {
                            currentToolCall.input = JSON.parse(toolCallInput);
                            toolCalls.push(currentToolCall);
                        } catch (e) {
                            console.error('Error parsing tool input:', e);
                        }
                        currentToolCall = null;
                        toolCallInput = '';
                    }
                } else if (data.type === 'message_delta') {
                    if (data.delta.stop_reason === 'max_tokens') {
                        setCanContinue(true);
                    }
                } else if (data.type === 'message_stop') {
                    // Message complete
                }
            });

            // Build API content for this message
            const apiContent = {
                role: 'assistant',
                content: []
            };

            if (streamedContent) {
                apiContent.content.push({type: 'text', text: streamedContent});
            }

            for (const toolCall of toolCalls) {
                apiContent.content.push({
                    type: 'tool_use',
                    id: toolCall.id,
                    name: toolCall.name,
                    input: toolCall.input
                });
            }

            // Update message with final content
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

            // Process tool calls if any
            if (toolCalls.length > 0) {
                const toolResults = await processToolCalls(toolCalls);

                // Create tool result message
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

                // Make follow-up API call with tool results
                const updatedApiMessages = [...apiMessages, apiContent, {role: 'user', content: toolResultContent}];

                // Create new assistant message for follow-up
                const followUpMessageId = Date.now() + 3;
                setStreamingMessageId(followUpMessageId);

                let followUpContent = '';

                setMessages(prev => [...prev, {
                    id: followUpMessageId,
                    role: 'assistant',
                    content: '',
                    isStreaming: true
                }]);

                await callClaudeAPIStreaming(updatedApiMessages, async (data) => {
                    if (data.type === 'content_block_delta' && data.delta.type === 'text_delta') {
                        followUpContent += data.delta.text;
                        setMessages(prev => prev.map(msg =>
                            msg.id === followUpMessageId
                                ? {...msg, content: followUpContent}
                                : msg
                        ));
                    } else if (data.type === 'message_delta') {
                        if (data.delta.stop_reason === 'max_tokens') {
                            setCanContinue(true);
                        }
                    }
                });

                setMessages(prev => prev.map(msg =>
                    msg.id === followUpMessageId
                        ? {...msg, isStreaming: false}
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

                // Replace the streaming message with error message
                setMessages(prev => {
                    const filtered = prev.filter(msg => !(msg.id === streamingMessageId && msg.isStreaming));
                    return [...filtered, errorMessage];
                });
            }
            setStreamingMessageId(null);
        } finally {
            setIsLoading(false);
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
                <div className="bg-white/80 backdrop-blur-lg border-b border-slate-200 px-4 py-3 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                                <Sparkles className="w-5 h-5 text-white"/>
                            </div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Claude Clone
                            </h1>
                        </div>

                        {/* Desktop Controls */}
                        <div className="hidden md:flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
                                <Key className="w-4 h-4 text-slate-500"/>
                                <input
                                    type={showApiKey ? "text" : "password"}
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Enter API Key"
                                    className="bg-transparent text-sm w-48 focus:outline-none placeholder:text-slate-400"
                                />
                                <button
                                    onClick={() => setShowApiKey(!showApiKey)}
                                    className="text-slate-500 hover:text-slate-700 transition-colors"
                                >
                                    {showApiKey ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                                </button>
                            </div>
                            <div className="flex gap-1">
                                <button
                                    onClick={handleClear}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-all hover:shadow-md"
                                    title="Clear conversation"
                                >
                                    <Trash2 className="w-5 h-5 text-slate-600"/>
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-all hover:shadow-md"
                                    title="Download conversation"
                                >
                                    <Download className="w-5 h-5 text-slate-600"/>
                                </button>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-all hover:shadow-md"
                                    title="Upload conversation"
                                >
                                    <Upload className="w-5 h-5 text-slate-600"/>
                                </button>
                            </div>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setShowMobileMenu(!showMobileMenu)}
                            className="md:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <Menu className="w-5 h-5 text-slate-600"/>
                        </button>
                    </div>

                    {/* Mobile Menu */}
                    {showMobileMenu && (
                        <div className="md:hidden mt-4 space-y-3 pb-2">
                            <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
                                <Key className="w-4 h-4 text-slate-500"/>
                                <input
                                    type={showApiKey ? "text" : "password"}
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Enter API Key"
                                    className="bg-transparent text-sm flex-1 focus:outline-none placeholder:text-slate-400"
                                />
                                <button
                                    onClick={() => setShowApiKey(!showApiKey)}
                                    className="text-slate-500 hover:text-slate-700 transition-colors"
                                >
                                    {showApiKey ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleClear}
                                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4"/>
                                    <span className="text-sm">Clear</span>
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <Download className="w-4 h-4"/>
                                    <span className="text-sm">Download</span>
                                </button>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <Upload className="w-4 h-4"/>
                                    <span className="text-sm">Upload</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleUpload}
                    className="hidden"
                />

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-6">
                    {messages.length === 0 && (
                        <div className="max-w-2xl mx-auto text-center mt-8">
                            <div
                                className="inline-flex p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-2xl mb-6">
                                <Bot className="w-12 h-12 text-white"/>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-2">Start a conversation with Claude</h2>
                            <p className="text-slate-600 mb-8">Enter your API key above to begin</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                                <div
                                    className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                                    <Code className="w-8 h-8 text-blue-500 mb-2"/>
                                    <h3 className="font-semibold text-slate-800 mb-1">Write Code</h3>
                                    <p className="text-sm text-slate-600">Ask me to create applications, debug code, or
                                        explain programming concepts</p>
                                </div>
                                <div
                                    className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                                    <FileText className="w-8 h-8 text-purple-500 mb-2"/>
                                    <h3 className="font-semibold text-slate-800 mb-1">Analyze Data</h3>
                                    <p className="text-sm text-slate-600">I can help you process data, create
                                        visualizations, and generate insights</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="max-w-4xl mx-auto space-y-4">
                        {messages.filter(m => m.role !== 'tool_result').map((message) => (
                            <div
                                key={message.id}
                                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {message.role === 'assistant' && (
                                    <div className="flex-shrink-0">
                                        <div
                                            className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                                            <Bot className="w-5 h-5 text-white"/>
                                        </div>
                                    </div>
                                )}
                                <div
                                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${
                                        message.role === 'user'
                                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                                            : 'bg-white border border-slate-200 shadow-sm'
                                    }`}
                                >
                                    <p className="whitespace-pre-wrap text-sm sm:text-base">{message.content}</p>
                                    {message.toolCalls && message.toolCalls.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-slate-200">
                                            <p className="text-xs text-slate-500">🔧
                                                Used {message.toolCalls.length} tool{message.toolCalls.length > 1 ? 's' : ''}</p>
                                        </div>
                                    )}
                                    {message.isStreaming && (
                                        <div className="inline-block ml-1">
                                            <span className="animate-pulse">▋</span>
                                        </div>
                                    )}
                                </div>
                                {message.role === 'user' && (
                                    <div className="flex-shrink-0">
                                        <div
                                            className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center shadow-md">
                                            <User className="w-5 h-5 text-white"/>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        <div ref={messagesEndRef}/>
                    </div>
                </div>

                {/* Input */}
                <div className="border-t border-slate-200 bg-white/80 backdrop-blur-lg p-4">
                    <div className="max-w-4xl mx-auto">
                        {canContinue && !isLoading && (
                            <div className="mb-3 flex justify-center">
                                <button
                                    onClick={() => handleSend(true)}
                                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                                >
                                    <RefreshCw className="w-4 h-4"/>
                                    Continue
                                </button>
                            </div>
                        )}
                        <div className="flex gap-3 items-end">
                            <div className="flex-1 relative">
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder={apiKey ? "Message Claude..." : "Please enter API key above"}
                                    disabled={!apiKey || isLoading}
                                    className="w-full p-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-400 text-sm sm:text-base transition-all"
                                    rows="3"
                                />
                                {isLoading ? (
                                    <button
                                        onClick={handleStop}
                                        className="absolute bottom-3 right-3 p-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg"
                                    >
                                        <X className="w-4 h-4"/>
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleSend()}
                                        disabled={isLoading || !input.trim() || !apiKey}
                                        className="absolute bottom-3 right-3 p-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                                    >
                                        <Send className="w-4 h-4"/>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Artifact Canvas - Desktop */}
            {Object.keys(artifacts).length > 0 && showArtifacts && (
                <div className="hidden md:flex w-1/2 border-l border-slate-200 bg-slate-900 flex-col">
                    {/* Artifact Tabs */}
                    <div className="bg-slate-800 border-b border-slate-700 flex items-center overflow-x-auto">
                        {Object.values(artifacts).map((artifact) => (
                            <button
                                key={artifact.id}
                                onClick={() => setActiveArtifact(artifact.id)}
                                className={`px-4 py-3 flex items-center gap-2 whitespace-nowrap border-r border-slate-700 transition-all ${
                                    activeArtifact === artifact.id
                                        ? 'bg-slate-900 text-white'
                                        : 'text-slate-400 hover:bg-slate-700 hover:text-slate-300'
                                }`}
                            >
                                {artifact.type === 'application/vnd.ant.code' || artifact.language ? (
                                    <Code className="w-4 h-4"/>
                                ) : artifact.type === 'application/vnd.ant.react' ? (
                                    <Play className="w-4 h-4"/>
                                ) : (
                                    <FileText className="w-4 h-4"/>
                                )}
                                <span className="text-sm font-medium">{artifact.title || 'Untitled'}</span>
                            </button>
                        ))}
                        <button
                            onClick={() => {
                                setShowArtifacts(false);
                                setTimeout(() => {
                                    setArtifacts({});
                                    setActiveArtifact(null);
                                }, 300);
                            }}
                            className="ml-auto p-2 text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4"/>
                        </button>
                    </div>

                    {/* Artifact Content */}
                    {activeArtifact && artifacts[activeArtifact] && (
                        <div className="flex-1 overflow-auto relative">
                            <div className="absolute top-4 right-4 z-10">
                                <button
                                    onClick={copyToClipboard}
                                    className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-slate-700 transition-all shadow-lg"
                                >
                                    {copied ? <Check className="w-4 h-4"/> : <Copy className="w-4 h-4"/>}
                                    <span className="text-sm font-medium">{copied ? 'Copied!' : 'Copy'}</span>
                                </button>
                            </div>
                            <pre className="p-6 text-slate-300 text-sm font-mono">
                                <code>{artifacts[activeArtifact].content}</code>
                            </pre>
                        </div>
                    )}
                </div>
            )}

            {/* Mobile Artifact Viewer */}
            {Object.keys(artifacts).length > 0 && (
                <button
                    onClick={() => setShowArtifacts(!showArtifacts)}
                    className="md:hidden fixed bottom-20 right-4 p-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all z-10"
                >
                    {showArtifacts ? <ChevronLeft className="w-5 h-5"/> : <Code className="w-5 h-5"/>}
                </button>
            )}

            {/* Mobile Artifact Panel */}
            {showArtifacts && (
                <div
                    className={`md:hidden fixed inset-0 bg-slate-900 z-20 transform transition-transform duration-300 ${showArtifacts ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="flex flex-col h-full">
                        {/* Mobile Artifact Header */}
                        <div className="bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between">
                            <h2 className="text-white font-semibold">Artifacts</h2>
                            <button
                                onClick={() => setShowArtifacts(false)}
                                className="p-2 text-slate-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5"/>
                            </button>
                        </div>

                        {/* Mobile Artifact Tabs */}
                        <div className="bg-slate-800 border-b border-slate-700 flex overflow-x-auto">
                            {Object.values(artifacts).map((artifact) => (
                                <button
                                    key={artifact.id}
                                    onClick={() => setActiveArtifact(artifact.id)}
                                    className={`px-4 py-3 flex items-center gap-2 whitespace-nowrap border-r border-slate-700 transition-all ${
                                        activeArtifact === artifact.id
                                            ? 'bg-slate-900 text-white'
                                            : 'text-slate-400 hover:bg-slate-700'
                                    }`}
                                >
                                    {artifact.type === 'application/vnd.ant.code' || artifact.language ? (
                                        <Code className="w-4 h-4"/>
                                    ) : artifact.type === 'application/vnd.ant.react' ? (
                                        <Play className="w-4 h-4"/>
                                    ) : (
                                        <FileText className="w-4 h-4"/>
                                    )}
                                    <span className="text-sm">{artifact.title || 'Untitled'}</span>
                                </button>
                            ))}
                        </div>

                        {/* Mobile Artifact Content */}
                        {activeArtifact && artifacts[activeArtifact] && (
                            <div className="flex-1 overflow-auto relative">
                                <div className="absolute top-4 right-4 z-10">
                                    <button
                                        onClick={copyToClipboard}
                                        className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-slate-700 transition-all shadow-lg"
                                    >
                                        {copied ? <Check className="w-4 h-4"/> : <Copy className="w-4 h-4"/>}
                                        <span className="text-sm">{copied ? 'Copied!' : 'Copy'}</span>
                                    </button>
                                </div>
                                <pre className="p-4 text-slate-300 text-xs font-mono">
                                    <code>{artifacts[activeArtifact].content}</code>
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default ClaudeClone;
