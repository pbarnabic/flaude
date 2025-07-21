export const TOOLS = [
    {
        name: "artifacts",
        description: "Creates and updates artifacts. Artifacts are self-contained pieces of content that can be referenced and updated throughout the conversation in collaboration with the user.",
        input_schema: {
            type: "object",
            properties: {
                command: { type: "string" },
                content: { anyOf: [{ type: "string" }, { type: "null" }], default: null },
                id: { type: "string" },
                language: { anyOf: [{ type: "string" }, { type: "null" }], default: null },
                new_str: { anyOf: [{ type: "string" }, { type: "null" }], default: null },
                old_str: { anyOf: [{ type: "string" }, { type: "null" }], default: null },
                title: { anyOf: [{ type: "string" }, { type: "null" }], default: null },
                type: { anyOf: [{ type: "string" }, { type: "null" }], default: null }
            },
            required: ["command", "id"]
        }
    },
    {
        name: "repl",
        description: "Execute JavaScript code in a sandboxed environment",
        input_schema: {
            type: "object",
            properties: {
                code: { type: "string" }
            },
            required: ["code"]
        }
    }
];
