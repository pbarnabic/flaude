export const BASE_TOOLS = [
    // {
    //     name: "artifacts",
    //     description: "Creates and updates artifacts. Artifacts are self-contained pieces of content that can be referenced and updated throughout the conversation in collaboration with the user.",
    //     input_schema: {
    //         "properties": {
    //             "artifacts": {
    //                 "type": "array",
    //                 "items": {
    //                     "type": "object",
    //                     "properties": {
    //                         "command": {
    //                             "title": "Command",
    //                             "type": "string",
    //                             "maxLength": 20,
    //                             "description": "The command to execute. Must be 'create', 'update', or 'rewrite'."
    //                         },
    //                         "content": {
    //                             "anyOf": [
    //                                 {
    //                                     "type": "string",
    //                                     "maxLength": 1000,
    //                                     "description": "The artifact content. Limited to 1000 characters."
    //                                 },
    //                                 {
    //                                     "type": "null"
    //                                 }
    //                             ],
    //                             "default": null,
    //                             "title": "Content"
    //                         },
    //                         "id": {
    //                             "title": "Id",
    //                             "type": "string",
    //                             "maxLength": 100,
    //                             "description": "Unique identifier for the artifact."
    //                         },
    //                         "language": {
    //                             "anyOf": [
    //                                 {
    //                                     "type": "string",
    //                                     "maxLength": 50,
    //                                     "description": "Programming language name."
    //                                 },
    //                                 {
    //                                     "type": "null"
    //                                 }
    //                             ],
    //                             "default": null,
    //                             "title": "Language"
    //                         },
    //                         "new_str": {
    //                             "anyOf": [
    //                                 {
    //                                     "type": "string",
    //                                     "maxLength": 200,
    //                                     "description": "Replacement string for updates. Cannot be more than 200 characters long including whitespace"
    //                                 },
    //                                 {
    //                                     "type": "null"
    //                                 }
    //                             ],
    //                             "default": null,
    //                             "title": "New Str"
    //                         },
    //                         "old_str": {
    //                             "anyOf": [
    //                                 {
    //                                     "type": "string",
    //                                     "maxLength": 200,
    //                                     "description": "String to be replaced in updates. Cannot be more than 200 characters long including whitespace"
    //                                 },
    //                                 {
    //                                     "type": "null"
    //                                 }
    //                             ],
    //                             "default": null,
    //                             "title": "Old Str"
    //                         },
    //                         "title": {
    //                             "anyOf": [
    //                                 {
    //                                     "type": "string",
    //                                     "maxLength": 200,
    //                                     "description": "Artifact title."
    //                                 },
    //                                 {
    //                                     "type": "null"
    //                                 }
    //                             ],
    //                             "default": null,
    //                             "title": "Title"
    //                         },
    //                         "type": {
    //                             "anyOf": [
    //                                 {
    //                                     "type": "string",
    //                                     "maxLength": 50,
    //                                     "description": "MIME type of the artifact."
    //                                 },
    //                                 {
    //                                     "type": "null"
    //                                 }
    //                             ],
    //                             "default": null,
    //                             "title": "Type"
    //                         }
    //                     },
    //                     "required": [
    //                         "command",
    //                         "id"
    //                     ],
    //                     "title": "ArtifactOperation"
    //                 },
    //                 "maxItems": 5,
    //                 "description": "Array of artifact operations. Use multiple operations to break large content into chunks - first operation creates, subsequent operations update with additional content."
    //             }
    //         },
    //         "required": [
    //             "artifacts"
    //         ],
    //         "type": "object",
    //         "title": "ArtifactsInput"
    //     }
    // },
    // {
    //     name: "repl",
    //     description: "Execute JavaScript code in a sandboxed environment",
    //     input_schema: {
    //         type: "object",
    //         properties: {
    //             code: { type: "string" }
    //         },
    //         required: ["code"]
    //     }
    // }
];
