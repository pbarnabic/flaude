import {SYSTEM_MESSAGE} from "../Constants/SystemMessages.js";
import {BASE_TOOLS} from "../Constants/Tools.jsx";
import {generateArtifactUpdateTools} from "../Utils/ToolUtils.js";

export const streamClaudeAPI = async (messages, apiKey, modelSettings, existingArtifacts = {}, onChunk) => {
    // tools
    const artifactUpdateTools = generateArtifactUpdateTools(existingArtifacts);
    const allTools = [...BASE_TOOLS, ...artifactUpdateTools];

    const body = {
        model: modelSettings.model,
        max_tokens: modelSettings.maxTokens,
        temperature: modelSettings.temperature,
        messages: messages,
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
