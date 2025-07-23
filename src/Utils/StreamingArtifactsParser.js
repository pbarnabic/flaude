import {CLOSING_TAG, OPENING_TAG} from "../Constants/ArtifactDelimiters.jsx";

export class StreamingArtifactParser {
    constructor() {
        this.reset();
    }

    reset() {
        this.buffer = '';
        this.artifacts = [];
        this.inArtifact = false;
        this.currentArtifact = null;
        this.incompleteArtifactId = null; // Track artifact that hit max tokens
    }

    // Check if we should continue an incomplete artifact
    checkForContinuation(previousMessages) {
        if (!previousMessages || previousMessages.length === 0) return null;

        // Look at the last assistant message
        const lastMessage = previousMessages[previousMessages.length - 1];
        if (lastMessage.role !== 'assistant') return null;

        // Check if the last message had an incomplete artifact
        // This would be set by the main conversation handler
        if (lastMessage.incompleteArtifactId) {
            return lastMessage.incompleteArtifactId;
        }

        return null;
    }

    parseChunk(chunk, continuationArtifactId = null) {
        // If we're continuing an incomplete artifact from a previous message
        if (continuationArtifactId && !this.inArtifact && !this.currentArtifact) {
            // Start in artifact mode without looking for opening tag
            this.inArtifact = true;
            this.currentArtifact = {
                id: continuationArtifactId,
                isContinuation: true,
                content: '',
                isComplete: false
            };
        }

        this.buffer += chunk;

        const updates = {
            artifacts: [],
            cleanedTextDelta: '',
            activeArtifactUpdate: null
        };

        let position = 0;

        while (position < this.buffer.length) {
            if (!this.inArtifact) {
                // Find Opening Artifact Tag
                const artifactStart = this.buffer.indexOf(OPENING_TAG, position);

                if (artifactStart === -1) {
                    // No artifact start found
                    // Check if buffer ends with partial OPENING_TAG
                    let keepInBuffer = 0;
                    const bufferEnd = this.buffer.substring(position);
                    for (let i = 1; i <= Math.min(13, bufferEnd.length); i++) {
                        if (OPENING_TAG.startsWith(bufferEnd.substring(bufferEnd.length - i))) {
                            keepInBuffer = i;
                            break;
                        }
                    }

                    if (keepInBuffer > 0) {
                        // Emit everything except potential partial tag
                        updates.cleanedTextDelta += bufferEnd.substring(0, bufferEnd.length - keepInBuffer);
                        this.buffer = bufferEnd.substring(bufferEnd.length - keepInBuffer);
                    } else {
                        // No partial tag, emit everything
                        updates.cleanedTextDelta += bufferEnd;
                        this.buffer = '';
                    }
                    break;
                }

                // Emit text before artifact
                if (artifactStart > position) {
                    updates.cleanedTextDelta += this.buffer.substring(position, artifactStart);
                }

                // Find the > after Opening Tag
                const tagEnd = this.buffer.indexOf('>', artifactStart);
                if (tagEnd === -1) {
                    // No > yet, save for next chunk
                    this.buffer = this.buffer.substring(artifactStart);
                    break;
                }

                // Parse the tag
                const tagContent = this.buffer.substring(artifactStart, tagEnd + 1);
                const attrs = {};
                const attrRegex = /(\w+)=["']([^"']*?)["']/g;
                let match;
                while ((match = attrRegex.exec(tagContent))) {
                    attrs[match[1]] = match[2];
                }

                this.currentArtifact = {
                    id: attrs.id || `artifact-${Date.now()}`,
                    type: attrs.type || 'text/plain',
                    language: attrs.language,
                    title: attrs.title || 'Untitled',
                    content: '',
                    isComplete: false,
                    isContinuation: false
                };

                this.inArtifact = true;
                updates.artifacts.push({ ...this.currentArtifact });
                position = tagEnd + 1;

            } else {
                // Find </LLMArtifact>
                const endTag = CLOSING_TAG;
                const endIndex = this.buffer.indexOf(endTag, position);

                if (endIndex === -1) {
                    // No end tag found
                    // Check if buffer ends with partial </LLMArtifact
                    let keepInBuffer = 0;
                    const bufferEnd = this.buffer.substring(position);
                    for (let i = 1; i <= Math.min(14, bufferEnd.length); i++) {
                        if ('</LLMArtifact'.startsWith(bufferEnd.substring(bufferEnd.length - i))) {
                            keepInBuffer = i;
                            break;
                        }
                    }

                    if (keepInBuffer > 0) {
                        // Add everything except potential partial tag
                        const content = bufferEnd.substring(0, bufferEnd.length - keepInBuffer);
                        if (content) {
                            this.currentArtifact.content += content;
                            updates.activeArtifactUpdate = {
                                id: this.currentArtifact.id,
                                content: this.currentArtifact.content,
                                isComplete: false,
                                isContinuation: this.currentArtifact.isContinuation
                            };
                        }
                        this.buffer = bufferEnd.substring(bufferEnd.length - keepInBuffer);
                    } else {
                        // No partial tag, add everything
                        this.currentArtifact.content += bufferEnd;
                        updates.activeArtifactUpdate = {
                            id: this.currentArtifact.id,
                            content: this.currentArtifact.content,
                            isComplete: false,
                            isContinuation: this.currentArtifact.isContinuation
                        };
                        this.buffer = '';
                    }
                    break;
                }

                // Add content before end tag
                const content = this.buffer.substring(position, endIndex);
                this.currentArtifact.content += content;
                this.currentArtifact.isComplete = true;

                updates.activeArtifactUpdate = {
                    id: this.currentArtifact.id,
                    content: this.currentArtifact.content,
                    isComplete: true,
                    isContinuation: this.currentArtifact.isContinuation
                };

                this.artifacts.push({ ...this.currentArtifact });
                this.inArtifact = false;
                this.currentArtifact = null;

                position = endIndex + endTag.length;
            }
        }

        // Keep unprocessed part
        this.buffer = this.buffer.substring(position);
        return updates;
    }

    finalize() {
        const updates = {
            artifacts: [],
            cleanedTextDelta: '',
            activeArtifactUpdate: null,
            incompleteArtifactId: null
        };

        if (this.buffer) {
            if (this.inArtifact && this.currentArtifact) {
                // Artifact was incomplete (likely hit max tokens)
                this.currentArtifact.content += this.buffer;
                this.currentArtifact.isComplete = false;
                updates.activeArtifactUpdate = {
                    id: this.currentArtifact.id,
                    content: this.currentArtifact.content,
                    isComplete: false,
                    isContinuation: this.currentArtifact.isContinuation
                };
                updates.incompleteArtifactId = this.currentArtifact.id;
                this.artifacts.push({ ...this.currentArtifact });
            } else {
                updates.cleanedTextDelta = this.buffer;
            }
        }

        // If we're still in an artifact, it means we hit max tokens
        if (this.inArtifact && this.currentArtifact) {
            updates.incompleteArtifactId = this.currentArtifact.id;
        }

        this.reset();
        return updates;
    }

    getArtifacts() {
        return [...this.artifacts];
    }
}
