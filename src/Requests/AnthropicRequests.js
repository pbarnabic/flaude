import {SYSTEM_MESSAGE} from "../Constants/SystemMessages.js";
import {TOOLS_V2} from "../Constants/ToolsV2.jsx";

// Non-streaming API call to Claude
export const callClaudeAPI = async (messages, apiKey, modelSettings) => {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
            model: modelSettings.model,
            max_tokens: modelSettings.maxTokens,
            temperature: modelSettings.temperature,
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
