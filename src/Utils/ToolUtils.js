
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
