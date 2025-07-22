/**
 * Utility functions for conversation management
 * Updated to handle artifact parsing from response text
 */

import { parseArtifactsFromResponse } from './ArtifactParser.js';

/**
 * Build API message history from UI messages
 * Converts UI message format to Claude API format
 * @param {Array} messages - Array of UI messages
 * @param {string} currentInput - The current user input
 * @returns {Array} API-formatted message array
 */
export const buildApiMessages = (messages, currentInput) => {
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
                    i++; // Skip tool result in next iteration
                }
            } else if (msg.content) {
                apiMessages.push({role: 'assistant', content: msg.content});
            }
        }
    }

    // Add current user message
    apiMessages.push({role: 'user', content: currentInput});
    return apiMessages;
};

/**
 * Extract content, artifacts, and tool calls from Claude's response
 * Now also parses <LLMArtifact> blocks from the text
 * @param {Object} response - Claude API response object
 * @returns {Object} { assistantContent: string, toolCalls: Array, artifacts: Array, usage: Object }
 */
export const parseClaudeResponse = (response) => {
    console.log('Parsing Claude response:', response);
    let assistantContent = '';
    let toolCalls = [];
    let artifacts = [];

    if (response.content) {
        for (const block of response.content) {
            if (block.type === 'text') {
                // Parse artifacts from text content
                const { text: cleanedText, artifacts: extractedArtifacts } = parseArtifactsFromResponse(block.text);
                assistantContent += cleanedText;
                artifacts = artifacts.concat(extractedArtifacts);
            } else if (block.type === 'tool_use') {
                toolCalls.push({
                    id: block.id,
                    name: block.name,
                    input: block.input
                });
            }
        }
    }

    // Extract usage information
    const usage = response.usage || {
        input_tokens: 0,
        output_tokens: 0
    };

    return { assistantContent, toolCalls, artifacts, usage };
};

/**
 * Format tool results for API consumption
 * @param {Array} toolResults - Array of tool execution results
 * @returns {Array} API-formatted tool result content
 */
export const formatToolResults = (toolResults) => {
    return toolResults.map(r => ({
        type: 'tool_result',
        tool_use_id: r.tool_use_id,
        content: r.content
    }));
}
