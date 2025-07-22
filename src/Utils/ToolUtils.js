/**
 * Execute a single artifact operation
 * @param {Object} operation - The artifact operation to execute
 * @param {Object} currentArtifacts - Current artifacts state
 * @returns {Object} Updated artifacts state
 */
export const executeArtifactOperation = (operation, currentArtifacts) => {
    const { command, id, type, title, content, language, old_str, new_str } = operation;

    switch (command) {
        case 'create':
            return {
                ...currentArtifacts,
                [id]: { id, type, language, title, content }
            };

        case 'update':
            if (!currentArtifacts[id]) {
                console.error(`Artifact ${id} not found for update`);
                return currentArtifacts;
            }

            if (old_str && new_str) {
                return updateArtifactContent(currentArtifacts, id, old_str, new_str);
            } else if (content) {
                return appendArtifactContent(currentArtifacts, id, content);
            }
            return currentArtifacts;

        case 'rewrite':
            return {
                ...currentArtifacts,
                [id]: { id, type, language, title, content }
            };

        default:
            console.warn('Unknown artifact command:', command);
            return currentArtifacts;
    }
};

/**
 * Handle string replacement in artifact content
 */
const updateArtifactContent = (artifacts, id, oldStr, newStr) => {
    const currentContent = artifacts[id].content || '';

    // Try exact match first
    if (currentContent.includes(oldStr)) {
        return {
            ...artifacts,
            [id]: {
                ...artifacts[id],
                content: currentContent.replace(oldStr, newStr)
            }
        };
    }

    // Try trimmed match as fallback
    const trimmedOld = oldStr.trim();
    const trimmedNew = newStr.trim();

    if (currentContent.includes(trimmedOld)) {
        return {
            ...artifacts,
            [id]: {
                ...artifacts[id],
                content: currentContent.replace(trimmedOld, trimmedNew)
            }
        };
    }

    console.error(`Could not find old_str in artifact ${id}, skipping update`);
    return artifacts;
};

/**
 * Handle content append to artifact
 */
const appendArtifactContent = (artifacts, id, content) => {
    return {
        ...artifacts,
        [id]: {
            ...artifacts[id],
            content: (artifacts[id].content || '') + content
        }
    };
};

/**
 * Normalize artifact operations format (handle old vs new format)
 */
export const normalizeArtifactOperations = (toolInput) => {
    if (toolInput.artifacts && Array.isArray(toolInput.artifacts)) {
        return toolInput.artifacts; // New format
    } else if (toolInput.command) {
        return [toolInput]; // Old format - wrap in array
    }
    return [];
};
