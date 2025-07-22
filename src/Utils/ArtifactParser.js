/**
 * Parse artifacts from LLM response text
 * Handles both complete and incomplete <LLMArtifact> blocks
 */

export const parseArtifactsFromResponse = (responseText) => {
    const artifacts = [];
    let cleanedText = responseText;

    // Regular expression to match complete <LLMArtifact> blocks
    const completeArtifactRegex = /<LLMArtifact\s+([^>]+)>([\s\S]*?)<\/LLMArtifact>/g;

    // Regular expression to match incomplete <LLMArtifact> blocks (no closing tag)
    const incompleteArtifactRegex = /<LLMArtifact\s+([^>]+)>([\s\S]*)$/;

    let match;

    // First, find all complete artifacts
    while ((match = completeArtifactRegex.exec(responseText)) !== null) {
        const attributesStr = match[1];
        const content = match[2];

        // Parse attributes
        const attributes = parseAttributes(attributesStr);

        // Create artifact object
        const artifact = {
            id: attributes.id || `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: attributes.type || 'text/plain',
            language: attributes.language,
            title: attributes.title || 'Untitled',
            content: content.trim(),
            version: 1,
            timestamp: Date.now(),
            isComplete: true
        };

        artifacts.push(artifact);

        // Remove the complete artifact block from the text
        cleanedText = cleanedText.replace(match[0], '');
    }

    // Then, check for incomplete artifact at the end
    const incompleteMatch = incompleteArtifactRegex.exec(cleanedText);
    if (incompleteMatch) {
        const attributesStr = incompleteMatch[1];
        const content = incompleteMatch[2];

        // Parse attributes
        const attributes = parseAttributes(attributesStr);

        // Create incomplete artifact object
        const artifact = {
            id: attributes.id || `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: attributes.type || 'text/plain',
            language: attributes.language,
            title: attributes.title || 'Untitled',
            content: content.trim(),
            version: 1,
            timestamp: Date.now(),
            isComplete: false  // Mark as incomplete
        };

        artifacts.push(artifact);

        // Remove the incomplete artifact from the text
        cleanedText = cleanedText.replace(incompleteMatch[0], '');
    }

    // Clean up extra whitespace
    cleanedText = cleanedText.trim();

    return {
        text: cleanedText,
        artifacts
    };
};

/**
 * Parse attributes from attribute string
 */
const parseAttributes = (attributesStr) => {
    const attributes = {};
    const attrRegex = /(\w+)="([^"]*)"/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attributesStr)) !== null) {
        attributes[attrMatch[1]] = attrMatch[2];
    }
    return attributes;
};

/**
 * Generate update tool definitions for existing artifacts
 * Only generate tools for complete artifacts
 */
export const generateArtifactUpdateTools = (artifacts) => {
    return Object.values(artifacts)
        .filter(artifact => artifact.isComplete) // Only complete artifacts can be updated
        .map(artifact => ({
            type: "custom",
            name: `update_artifact_${artifact.id}`,
            description: `Updates the artifact with the id: ${artifact.id}. This can only be used to update ${artifact.id}`,
            input_schema: {
                type: "object",
                properties: {
                    old_str: {
                        type: "string",
                        description: "The exact old string to replace with the new string"
                    },
                    new_str: {
                        type: "string",
                        description: "The exact new string to replace the old string with"
                    }
                },
                required: ["old_str", "new_str"]
            }
        }));
};

/**
 * Process artifact update tool call
 */
export const processArtifactUpdate = (toolCall, currentArtifacts) => {
    // Extract artifact ID from tool name (update_artifact_<id>)
    const artifactId = toolCall.name.replace('update_artifact_', '');
    console.log(artifactId, currentArtifacts);

    if (!currentArtifacts[artifactId]) {
        return {
            success: false,
            error: `Artifact ${artifactId} not found`
        };
    }

    const artifact = currentArtifacts[artifactId];
    const { old_str, new_str } = toolCall.input;

    // Check if old_str exists in content
    if (!artifact.content.includes(old_str)) {
        // Try trimmed match as fallback
        const trimmedOld = old_str.trim();
        if (artifact.content.includes(trimmedOld)) {
            return {
                success: true,
                updatedArtifact: {
                    ...artifact,
                    content: artifact.content.replace(trimmedOld, new_str.trim()),
                    version: artifact.version + 1,
                    timestamp: Date.now()
                }
            };
        }

        return {
            success: false,
            error: `String "${old_str}" not found in artifact content`
        };
    }

    // Perform the replacement
    return {
        success: true,
        updatedArtifact: {
            ...artifact,
            content: artifact.content.replace(old_str, new_str),
            version: artifact.version + 1,
            timestamp: Date.now()
        }
    };
};

/**
 * Handle artifact rewrite (when same ID is used in new <LLMArtifact> block)
 */
export const handleArtifactRewrite = (newArtifact, existingArtifact) => {
    return {
        ...newArtifact,
        version: existingArtifact ? existingArtifact.version + 1 : 1,
        timestamp: Date.now()
    };
};

/**
 * Merge partial artifact content during streaming
 * This is for handling streaming updates where we get incremental content
 */
export const mergeStreamingArtifact = (existingArtifact, newContent, isComplete) => {
    return {
        ...existingArtifact,
        content: newContent,
        isComplete: isComplete,
        timestamp: Date.now()
    };
};
