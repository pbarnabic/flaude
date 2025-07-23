import {DEFAULT_RATE_LIMITS} from "../Constants/Models.js";

class RateLimiter {
    constructor() {
        this.usage = {};
        this.windowSize = 60000; // 1 minute in milliseconds
    }

    initializeModel(model) {
        if (!this.usage[model]) {
            this.usage[model] = {
                requests: [],
                inputTokens: [],
                outputTokens: []
            };
        }
    }

    recordUsage(model, inputTokens, outputTokens) {
        this.initializeModel(model);
        const now = Date.now();

        // Record the usage with timestamps
        this.usage[model].requests.push(now);
        this.usage[model].inputTokens.push({ time: now, tokens: inputTokens });
        this.usage[model].outputTokens.push({ time: now, tokens: outputTokens });

        // Clean up old entries
        this.cleanupOldEntries(model);
    }

    cleanupOldEntries(model) {
        const cutoff = Date.now() - this.windowSize;

        // Remove old requests
        this.usage[model].requests = this.usage[model].requests.filter(time => time > cutoff);

        // Remove old token usage
        this.usage[model].inputTokens = this.usage[model].inputTokens.filter(entry => entry.time > cutoff);
        this.usage[model].outputTokens = this.usage[model].outputTokens.filter(entry => entry.time > cutoff);
    }

    getCurrentUsage(model) {
        this.initializeModel(model);
        this.cleanupOldEntries(model);

        const requestCount = this.usage[model].requests.length;
        const inputTokenCount = this.usage[model].inputTokens.reduce((sum, entry) => sum + entry.tokens, 0);
        const outputTokenCount = this.usage[model].outputTokens.reduce((sum, entry) => sum + entry.tokens, 0);

        return {
            requests: requestCount,
            inputTokens: inputTokenCount,
            outputTokens: outputTokenCount
        };
    }

    calculateWaitTime(model, estimatedInputTokens, rateLimits) {
        this.initializeModel(model);
        const current = this.getCurrentUsage(model);
        const limits = rateLimits || DEFAULT_RATE_LIMITS[model];

        if (!limits) {
            console.warn(`No rate limits found for model ${model}`);
            return 0;
        }

        let maxWaitTime = 0;

        // Check request limit
        if (current.requests >= limits.requestsPerMinute) {
            const oldestRequest = Math.min(...this.usage[model].requests);
            const waitForRequest = oldestRequest + this.windowSize - Date.now();
            maxWaitTime = Math.max(maxWaitTime, waitForRequest);
        }

        // Check input token limit
        if (current.inputTokens + estimatedInputTokens > limits.inputTokensPerMinute) {
            // Find how many tokens we need to free up
            const tokensNeeded = (current.inputTokens + estimatedInputTokens) - limits.inputTokensPerMinute;

            // Find when enough tokens will be freed
            let tokenSum = 0;
            let oldestTokenTime = Date.now();

            for (const entry of this.usage[model].inputTokens) {
                tokenSum += entry.tokens;
                if (tokenSum >= tokensNeeded) {
                    oldestTokenTime = entry.time;
                    break;
                }
            }

            const waitForTokens = oldestTokenTime + this.windowSize - Date.now();
            maxWaitTime = Math.max(maxWaitTime, waitForTokens);
        }

        return Math.max(0, maxWaitTime);
    }

    async waitIfNeeded(model, estimatedInputTokens, rateLimits) {
        const waitTime = this.calculateWaitTime(model, estimatedInputTokens, rateLimits);

        if (waitTime > 0) {
            console.log(`Rate limit approaching. Waiting ${Math.ceil(waitTime / 1000)} seconds...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
}

// Create a singleton instance
export const rateLimiter = new RateLimiter();

// Helper function to estimate tokens from text
// This is a rough estimate - actual tokens may vary
export const estimateTokens = (text) => {
    // Rough estimate: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
};
