# Flaude

---

## Purpose

Flaude is meant to be a substitute for Claude's UI. The key difference: it uses your Anthropic API Key to make all requests, enabling you to avoid the UI's usage limits.

Flaude is open sourced and client-side only. All conversations, preferences and other data is encrypted using your chosen password and stored in your browser used IndexedDB.

If you don't want to password protect, you don't have to, your data will still be encrypted using a constant and stored locally.

While I have not fully cloned the entirety of the Claude UI, I have worked to implement the features I use most frequently. 

I hope this helps you as much it has helped me. I started this project with Claude — and finished it with Flaude.

[Use it here](https://app.flaude.technology)

---

## Features

* Versioned artifacts with Previews (Side Panel and Separate Tab)
* Images
* Change models mid-conversation
* User defined model-specific token limits and rate limits so you never get 429's

---

## Issues and Smells

Issues to address

* Sometimes the continuation doesn't resume properly
* The iframe for the artifact preview is constantly rerendering
* Something about the artifacts is causing performance issues
* Better mobile, Firefox, and Safari support

Smells to address
* Some request logic is weird

---

## License

Flaude is licensed under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).

This means you are free to use, modify, and distribute Flaude — including for commercial purposes — as long as you comply with the license terms.

The Apache 2.0 license also provides an explicit patent grant, ensuring that contributors cannot use patents to restrict your use of the software.

---

## Disclaimer

This project is not affiliated with Anthropic or Claude.

Flaude uses your own Anthropic API key to make requests and does not store or transmit your data externally.

Use Flaude responsibly and in compliance with Anthropic's terms of service.
