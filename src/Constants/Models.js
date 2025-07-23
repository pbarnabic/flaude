export const MODELS = {
    'claude-opus-4-20250514': 'Opus 4 (May 14, 2025)',
    'claude-sonnet-4-20250514': 'Sonnet 4 (May 14, 2025)',
    'claude-3-7-sonnet-20250219': 'Sonnet 3.7 (Feb 19, 2025)',
    'claude-3-5-sonnet-20241022': 'Sonnet 3.5 (Oct 22, 2024)',
    'claude-3-5-haiku-20241022': 'Haiku 3.5 (Oct 22, 2024)',
};

export const DEFAULT_RATE_LIMITS = {
    'claude-opus-4-20250514': {
        requestsPerMinute: 50,
        inputTokensPerMinute: 20000,
        outputTokensPerMinute: 4000
    },
    'claude-sonnet-4-20250514': {
        requestsPerMinute: 50,
        inputTokensPerMinute: 30000,
        outputTokensPerMinute: 8000
    },
    'claude-3-7-sonnet-20241029': {
        requestsPerMinute: 50,
        inputTokensPerMinute: 20000,
        outputTokensPerMinute: 8000
    },
    'claude-3-5-sonnet-20241022': {
        requestsPerMinute: 50,
        inputTokensPerMinute: 40000,
        outputTokensPerMinute: 8000
    },
    'claude-3-5-haiku-20241022': {
        requestsPerMinute: 50,
        inputTokensPerMinute: 50000,
        outputTokensPerMinute: 10000
    }
};
