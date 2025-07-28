import {SYSTEM_MESSAGE} from "../Constants/SystemMessages.js";
import {BASE_TOOLS} from "../Constants/Tools.js";
import {generateArtifactUpdateTools} from "../Utils/ToolUtils.js";

export const streamClaudeAPI = async (messages, apiKey, modelSettings, existingArtifacts = {}, onChunk) => {
    // Tools
    const artifactUpdateTools = generateArtifactUpdateTools(existingArtifacts);
    const allTools = [...BASE_TOOLS, ...artifactUpdateTools];

    // Process messages to ensure proper format for API
    const processedMessages = messages.map(msg => {
        if (msg.role === 'user') {
            // Handle different content formats
            if (Array.isArray(msg.content)) {
                // Already in API format with images
                return {
                    role: msg.role,
                    content: msg.content
                };
            } else if (typeof msg.content === 'string') {
                // Simple text message
                return {
                    role: msg.role,
                    content: msg.content
                };
            } else {
                // Fallback to string content
                return {
                    role: msg.role,
                    content: String(msg.content)
                };
            }
        } else {
            // Assistant messages - keep as is
            return {
                role: msg.role,
                content: msg.content
            };
        }
    });

    const body = {
        model: modelSettings.model,
        max_tokens: modelSettings.maxTokens,
        temperature: modelSettings.temperature,
        messages: processedMessages,
        system: SYSTEM_MESSAGE,
        stream: true
    };

    if (allTools?.length) {
        body.tools = allTools;
        body.tool_choice = {type: 'auto'};
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = '';
    let accumulatedContent = '';
    let currentToolUse = null;
    let toolCalls = [];
    let usage = {input_tokens: 0, output_tokens: 0};

    while (true) {
        const {done, value} = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, {stream: true});

        // Process complete SSE messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                    const event = JSON.parse(data);

                    // Handle different event types
                    switch (event.type) {
                        case 'message_start':
                            // Initial message info
                            if (event.message && event.message.usage) {
                                usage.input_tokens = event.message.usage.input_tokens || 0;
                            }
                            break;

                        case 'content_block_start':
                            // Starting a new content block
                            if (event.content_block.type === 'tool_use') {
                                currentToolUse = {
                                    id: event.content_block.id,
                                    name: event.content_block.name,
                                    input: ''
                                };
                            }
                            break;

                        case 'content_block_delta':
                            // Content updates
                            if (event.delta.type === 'text_delta') {
                                accumulatedContent += event.delta.text;
                                onChunk({
                                    type: 'text',
                                    content: event.delta.text,
                                    accumulatedContent: accumulatedContent
                                });
                            } else if (event.delta.type === 'input_json_delta' && currentToolUse) {
                                currentToolUse.input += event.delta.partial_json;
                            }
                            break;

                        case 'content_block_stop':
                            // Finished a content block
                            if (currentToolUse) {
                                try {
                                    currentToolUse.input = JSON.parse(currentToolUse.input);
                                    toolCalls.push(currentToolUse);
                                    onChunk({
                                        type: 'tool_use',
                                        toolCall: currentToolUse
                                    });
                                } catch (e) {
                                    console.error('Failed to parse tool input:', e);
                                }
                                currentToolUse = null;
                            }
                            break;

                        case 'message_delta':
                            // Message metadata updates
                            if (event.usage) {
                                usage.output_tokens = event.usage.output_tokens || 0;
                            }
                            break;

                        case 'message_stop':
                            // Message complete
                            onChunk({
                                type: 'done',
                                usage: usage
                            });
                            break;
                    }
                } catch (e) {
                    console.error('Failed to parse SSE event:', e);
                }
            }
        }
    }

    return {
        content: accumulatedContent,
        toolCalls: toolCalls,
        usage: usage
    };
};


export const callClaudeAPI = async (apiKey, messages, tools = [], modelSettings = {}, toolChoice = {type: 'auto'}) => {
    const defaultModelSettings = {
        model: 'claude-3-5-sonnet-20241022',
        maxTokens: 4096,
        temperature: 0.7
    };

    // Merge with provided settings
    const settings = { ...defaultModelSettings, ...modelSettings };

    // Process messages to ensure proper format for API
    const processedMessages = messages.map(msg => {
        if (msg.role === 'user') {
            // Handle different content formats
            if (Array.isArray(msg.content)) {
                // Already in API format with images
                return {
                    role: msg.role,
                    content: msg.content
                };
            } else if (typeof msg.content === 'string') {
                // Simple text message
                return {
                    role: msg.role,
                    content: msg.content
                };
            } else {
                // Fallback to string content
                return {
                    role: msg.role,
                    content: String(msg.content)
                };
            }
        } else {
            // Assistant messages - keep as is
            return {
                role: msg.role,
                content: msg.content
            };
        }
    });

    const body = {
        model: settings.model,
        max_tokens: settings.maxTokens,
        temperature: settings.temperature,
        messages: processedMessages,
        stream: false
    };

    if (tools?.length) {
        body.tools = tools;
        body.tool_choice = toolChoice;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Extract content and tool calls from response
    let content = '';
    let toolCalls = [];

    if (data.content) {
        for (const block of data.content) {
            if (block.type === 'text') {
                content += block.text;
            } else if (block.type === 'tool_use') {
                toolCalls.push({
                    id: block.id,
                    name: block.name,
                    input: block.input
                });
            }
        }
    }

    return {
        content: content,
        toolCalls: toolCalls,
        usage: data.usage || { input_tokens: 0, output_tokens: 0 }
    };
};

