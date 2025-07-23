
import {CLOSING_TAG, OPENING_TAG} from "../Constants/ArtifactDelimiters.jsx";

/**
 * Shared artifact parsing utilities for Messages, ArtifactCanvas, and MobileArtifactsPanel
 */
export const ArtifactParsingUtils = {
    /**
     * Parse artifacts by extracting complete artifact tags from messages
     * @param {Array} apiMessages - Array of API messages
     * @param {string} streamingContent - Current streaming content
     * @returns {Object} - Object containing parsed artifacts
     */
    parseArtifactsFromMessages: (apiMessages = [], streamingContent = '') => {
        const artifacts = {};

        // Helper to extract artifacts from content
        const extractArtifacts = (content, isStreaming = false) => {
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

                if (idMatch) {
                    let artifactContent = '';
                    let isComplete = true;

                    if (endTag === -1) {
                        // Incomplete artifact - take content from tag end to end of string
                        if (isStreaming) {
                            artifactContent = content.substring(tagEnd + 1);
                            isComplete = false;
                        }
                    } else {
                        // Complete artifact
                        artifactContent = content.substring(tagEnd + 1, endTag);
                        isComplete = true;
                    }

                    foundArtifacts[idMatch[1]] = {
                        id: idMatch[1],
                        type: typeMatch ? typeMatch[1] : 'text/plain',
                        language: languageMatch ? languageMatch[1] : undefined,
                        title: titleMatch ? titleMatch[1] : 'Untitled',
                        content: artifactContent,
                        version: 1,
                        timestamp: Date.now(),
                        isComplete: isComplete
                    };
                }

                pos = endTag === -1 ? content.length : endTag + 14;
            }

            return foundArtifacts;
        };

        // Process API messages
        for (const apiMsg of apiMessages) {
            if (apiMsg.role === 'assistant' && typeof apiMsg.content === 'string') {
                const messageArtifacts = extractArtifacts(apiMsg.content, false);
                Object.assign(artifacts, messageArtifacts);
            }
        }

        // Process streaming content
        if (streamingContent) {
            const streamingArtifacts = extractArtifacts(streamingContent, true);
            Object.assign(artifacts, streamingArtifacts);
        }

        return artifacts;
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
