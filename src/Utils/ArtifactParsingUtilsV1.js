import {CLOSING_TAG, OPENING_TAG} from "../Constants/ArtifactDelimiters.js";

/**
 * Shared artifact parsing utilities for Messages, ArtifactCanvas, and MobileArtifactsPanel
 */
export const ArtifactParsingUtils = {

    /**
     * Check if a line appears to be incomplete (ends mid-statement)
     * Language-agnostic approach focusing on common syntax patterns
     */
    isLineIncomplete: (line) => {
        const trimmed = line.trim();

        // Empty lines are complete
        if (!trimmed) return false;

        // Language-agnostic patterns for incomplete lines
        const incompletePatterns = [
            // Operators and punctuation that typically expect continuation
            /[,=+\-*\/<>!&|%]\s*$/,     // Binary operators at end
            /\(\s*$/,                    // Opening parenthesis
            /\[\s*$/,                    // Opening bracket
            /\{\s*$/,                    // Opening brace
            /:\s*$/,                     // Colon (Python, labels, etc.)
            /\\\s*$/,                    // Explicit line continuation
            /\.\s*$/,                    // Dot (method chaining, property access)
            /->\s*$/,                    // Arrow (C++, PHP, etc.)
            /=>\s*$/,                    // Fat arrow (JS, C#, etc.)
            /::\s*$/,                    // Scope resolution (C++, Rust)

            // Incomplete string literals (odd number of quotes)
            /^[^"]*("[^"]*"[^"]*)*"[^"]*$/, // Unclosed double quotes
            /^[^']*('[^']*'[^']*)*'[^']*$/, // Unclosed single quotes
            /^[^`]*(`[^`]*`[^`]*)*`[^`]*$/, // Unclosed backticks
        ];

        // Check if line ends with an incomplete pattern
        if (incompletePatterns.some(pattern => pattern.test(trimmed))) {
            return true;
        }

        // Check for unbalanced brackets/parens (more opens than closes)
        const opens = (trimmed.match(/[\(\[\{]/g) || []).length;
        const closes = (trimmed.match(/[\)\]\}]/g) || []).length;
        if (opens > closes) {
            return true;
        }

        // Lines ending with certain keywords are often incomplete
        const incompleteKeywords = /\b(if|else|elif|while|for|with|try|catch|finally|do|then|begin|case|when)\s*$/i;
        if (incompleteKeywords.test(trimmed)) {
            return true;
        }

        return false;
    },

    /**
     * Find the best overlap between two text segments
     * Returns the number of characters that overlap
     */
    findOverlap: (existing, incoming) => {
        // Check if the last line of existing content is incomplete
        const existingLines = existing.split('\n');
        const lastLine = existingLines[existingLines.length - 1];

        // If the last line looks incomplete, assume continuation rather than overlap
        if (ArtifactParsingUtils.isLineIncomplete(lastLine)) {
            // This is likely a continuation, not an overlap
            return 0;
        }

        // Try different overlap lengths, starting from the most likely scenarios
        const maxOverlap = Math.min(existing.length, incoming.length);

        // First, check for exact continuation (no overlap)
        if (!incoming.startsWith(existing.slice(-Math.min(100, existing.length)))) {
            // Not a direct continuation, check for overlaps

            // Try common overlap patterns first (more efficient)
            const commonLengths = [
                Math.min(50, maxOverlap),  // Common for partial lines
                Math.min(100, maxOverlap), // Common for full lines
                Math.min(200, maxOverlap), // Common for multiple lines
            ];

            for (const len of commonLengths) {
                const suffix = existing.slice(-len);
                if (incoming.startsWith(suffix)) {
                    return len;
                }
            }

            // If no common length worked, do exhaustive search
            for (let len = Math.min(existing.length, incoming.length); len > 0; len--) {
                const suffix = existing.slice(-len);
                if (incoming.startsWith(suffix)) {
                    return len;
                }
            }
        }

        return 0;
    },

    /**
     * Smart content concatenation that handles various LLM behaviors
     */
    smartConcat: (existing, incoming) => {
        // Normalize line endings for consistency
        existing = existing.replace(/\r\n/g, '\n');
        incoming = incoming.replace(/\r\n/g, '\n');

        // Find overlap
        const overlapLength = ArtifactParsingUtils.findOverlap(existing, incoming);

        if (overlapLength > 0) {
            // Remove the overlapping part from incoming
            return existing + incoming.slice(overlapLength);
        }

        // No overlap found - check if this is a mid-statement break
        const existingLines = existing.split('\n');
        const lastLine = existingLines[existingLines.length - 1];

        if (ArtifactParsingUtils.isLineIncomplete(lastLine)) {
            // The last line is incomplete, incoming content likely continues it
            // Don't add a newline in this case
            return existing + incoming;
        }

        // Standard concatenation with newline handling
        const needsNewline = existing.length > 0 &&
            !existing.endsWith('\n') &&
            !incoming.startsWith('\n');

        return existing + (needsNewline ? '\n' : '') + incoming;
    },

    /**
     * Parse artifacts by extracting complete artifact tags from messages
     * @param {Array} apiMessages - Array of API messages
     * @param {string} streamingContent - Current streaming content
     * @returns {Object} - Object containing parsed artifacts with all versions
     */
    parseArtifactsFromMessages: (apiMessages = [], streamingContent = '') => {
        const artifactVersions = {}; // { artifactId: [version1, version2, ...] }

        // Helper to extract artifacts from content
        const extractArtifacts = (content, messageIndex = -1, isStreaming = false, existingVersions = artifactVersions) => {
            const foundArtifacts = {};
            let pos = 0;

            while (pos < content.length) {
                const startTag = content.indexOf(OPENING_TAG, pos);
                if (startTag === -1) break;

                const tagEnd = content.indexOf('>', startTag);
                if (tagEnd === -1) {
                    // Incomplete opening tag during streaming
                    if (isStreaming) break;
                    else continue;
                }

                const endTag = content.indexOf(CLOSING_TAG, tagEnd);
                const openingTag = content.substring(startTag, tagEnd + 1);

                // Extract attributes
                const idMatch = openingTag.match(/id=["']([^"']+)["']/);
                const typeMatch = openingTag.match(/type=["']([^"']+)["']/);
                const languageMatch = openingTag.match(/language=["']([^"']+)["']/);
                const titleMatch = openingTag.match(/title=["']([^"']+)["']/);
                const continueMatch = openingTag.match(/continue=["']([^"']+)["']/);

                if (idMatch) {
                    let artifactContent = '';
                    let isComplete = true;

                    if (endTag === -1) {
                        // Incomplete artifact - take content from tag end to end of string
                        artifactContent = content.substring(tagEnd + 1);
                        isComplete = false;
                    } else {
                        // Complete artifact
                        artifactContent = content.substring(tagEnd + 1, endTag);
                        isComplete = true;
                    }

                    // Handle continuation logic with robust concatenation
                    const isContinuation = continueMatch && continueMatch[1] === 'true';
                    if (isContinuation && existingVersions[idMatch[1]]) {
                        const versions = existingVersions[idMatch[1]];
                        const lastVersion = versions[versions.length - 1];

                        if (lastVersion && lastVersion.content) {
                            // Use smart concatenation
                            artifactContent = ArtifactParsingUtils.smartConcat(
                                lastVersion.content,
                                artifactContent
                            );
                        }
                    }

                    foundArtifacts[idMatch[1]] = {
                        id: idMatch[1],
                        type: typeMatch ? typeMatch[1] : 'text/plain',
                        language: languageMatch ? languageMatch[1] : undefined,
                        title: titleMatch ? titleMatch[1] : 'Untitled',
                        content: artifactContent,
                        timestamp: Date.now() + messageIndex,
                        messageIndex: messageIndex,
                        isComplete: isComplete,
                        isStreaming: isStreaming,
                        isContinuation: isContinuation
                    };
                }

                pos = endTag === -1 ? content.length : endTag + 14;
            }

            return foundArtifacts;
        };

        // Process API messages to build version history
        for (let i = 0; i < apiMessages.length; i++) {
            const apiMsg = apiMessages[i];

            if (apiMsg.role === 'assistant' && typeof apiMsg.content === 'string') {
                const messageArtifacts = extractArtifacts(apiMsg.content, i, false, artifactVersions);

                Object.values(messageArtifacts).forEach(artifact => {
                    if (!artifactVersions[artifact.id]) {
                        artifactVersions[artifact.id] = [];
                    }

                    // Always create a new version (continuation logic already handled in extractArtifacts)
                    artifactVersions[artifact.id].push({
                        ...artifact,
                        version: artifactVersions[artifact.id].length + 1
                    });
                });
            }

            // Handle tool calls for artifact updates
            else if (apiMsg.role === 'assistant' && Array.isArray(apiMsg.content)) {
                for (const content of apiMsg.content) {
                    if (content.type === 'tool_use' && content.name.startsWith('update_artifact_')) {
                        const artifactId = content.name.replace('update_artifact_', '');
                        const { old_str, new_str } = content.input;

                        if (artifactVersions[artifactId]) {
                            const versions = artifactVersions[artifactId];
                            const lastVersion = versions[versions.length - 1];

                            if (lastVersion && lastVersion.isComplete) {
                                // Check if old_str exists in content
                                if (lastVersion.content.includes(old_str)) {
                                    // Create updated version
                                    const updatedContent = lastVersion.content.replace(old_str, new_str);
                                    versions.push({
                                        ...lastVersion,
                                        content: updatedContent,
                                        version: versions.length + 1,
                                        timestamp: Date.now() + i,
                                        messageIndex: i,
                                        isUpdated: true
                                    });
                                } else {
                                    // Try trimmed match as fallback
                                    const trimmedOld = old_str.trim();
                                    if (lastVersion.content.includes(trimmedOld)) {
                                        const updatedContent = lastVersion.content.replace(trimmedOld, new_str.trim());
                                        versions.push({
                                            ...lastVersion,
                                            content: updatedContent,
                                            version: versions.length + 1,
                                            timestamp: Date.now() + i,
                                            messageIndex: i,
                                            isUpdated: true
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Process streaming content
        if (streamingContent) {
            const streamingArtifacts = extractArtifacts(streamingContent, apiMessages.length, true, artifactVersions);

            Object.values(streamingArtifacts).forEach(artifact => {
                if (!artifactVersions[artifact.id]) {
                    artifactVersions[artifact.id] = [];
                }

                const versions = artifactVersions[artifact.id];
                const lastVersion = versions[versions.length - 1];

                if (lastVersion && lastVersion.isStreaming && !lastVersion.isComplete && !artifact.isContinuation) {
                    // Update existing streaming version (only if not a continuation)
                    lastVersion.content = artifact.content;
                    lastVersion.isComplete = artifact.isComplete;
                    lastVersion.timestamp = artifact.timestamp;
                } else {
                    // Create new version for streaming (including continuations)
                    versions.push({
                        ...artifact,
                        version: versions.length + 1
                    });
                }
            });
        }

        return artifactVersions;
    },

    /**
     * Get the latest version of each artifact
     * @param {Object} artifactVersions - All artifact versions
     * @returns {Object} - Latest version of each artifact
     */
    getLatestArtifacts: (artifactVersions) => {
        const latestArtifacts = {};

        Object.keys(artifactVersions).forEach(artifactId => {
            const versions = artifactVersions[artifactId];
            if (versions && versions.length > 0) {
                latestArtifacts[artifactId] = versions[versions.length - 1];
            }
        });

        return latestArtifacts;
    },

    /**
     * Parse content into segments (text and artifact references)
     * Used by Messages component for rendering
     * @param {string} content - Content to parse
     * @param {boolean} isStreaming - Whether this is streaming content
     * @returns {Array} - Array of segments
     */
    parseSegments: (content, isStreaming = false) => {
        const segments = [];
        let cursor = 0;

        while (cursor < content.length) {
            const start = content.indexOf(OPENING_TAG, cursor);
            if (start === -1) break;

            const tagEnd = content.indexOf(">", start);
            if (tagEnd === -1) break;

            const end = content.indexOf(CLOSING_TAG, tagEnd);
            const idMatch = content.slice(start, tagEnd + 1).match(/id=["']([^"']+)["']/);
            const id = idMatch?.[1];

            if (cursor < start) {
                const text = content.slice(cursor, start).trim();
                if (text) segments.push({ type: "text", content: text });
            }

            if (id) {
                segments.push({
                    type: "artifact",
                    id,
                    isComplete: end !== -1
                });
            }

            cursor = end !== -1 ? end + 14 : content.length;
        }

        if (cursor < content.length) {
            const text = content.slice(cursor).trim();
            if (text) segments.push({ type: "text", content: text });
        }

        return segments;
    },

    /**
     * Get language string from artifact type/language for syntax highlighting
     * @param {Object} artifact - Artifact object
     * @returns {string} - Language string for syntax highlighting
     */
    getLanguageFromType: (artifact) => {
        if (!artifact) return 'text';
        const langMap = {
            html: 'markup', htm: 'markup', xml: 'markup', svg: 'markup',
            css: 'css', scss: 'scss', sass: 'sass', less: 'less',
            javascript: 'javascript', js: 'javascript',
            typescript: 'typescript', ts: 'typescript',
            jsx: 'jsx', tsx: 'tsx', react: 'jsx',
            python: 'python', py: 'python',
            java: 'java', c: 'c', cpp: 'cpp', 'c++': 'cpp',
            php: 'php', rb: 'ruby', ruby: 'ruby',
            json: 'json', yaml: 'yaml', yml: 'yaml',
            bash: 'bash', shell: 'bash', sh: 'bash',
            markdown: 'markdown', md: 'markdown'
        };
        if (artifact.language && langMap[artifact.language.toLowerCase()]) return langMap[artifact.language.toLowerCase()];
        if (artifact.type === 'application/vnd.ant.react') return 'jsx';
        if (artifact.type === 'text/html') return 'markup';
        if (artifact.type === 'text/css') return 'css';
        if (artifact.type === 'text/markdown') return 'markdown';
        if (artifact.type === 'application/json') return 'json';
        if (artifact.title) {
            const ext = artifact.title.toLowerCase();
            for (const key in langMap) if (ext.includes(`.${key}`)) return langMap[key];
        }
        return 'text';
    },

    /**
     * Check if artifact should use syntax highlighting
     * @param {Object} artifact - Artifact object
     * @returns {boolean} - Whether to show syntax highlighting
     */
    shouldShowSyntaxHighlighting: (artifact) => {
        if (!artifact || !window.Prism) return false;
        return artifact.type === 'application/vnd.ant.code' ||
            artifact.language ||
            artifact.type === 'application/vnd.ant.react' ||
            artifact.type === 'text/html';
    }
};
