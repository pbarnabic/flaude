# Flaude

## Purpose

Flaude is meant to be a substitute for Claude's UI. The key difference: it uses your Anthropic API Key to make all requests, enabling you to only pay for what you use.

Flaude is open sourced and client-side only. All conversations, preferences and other data is encrypted using your chosen password and stored in your browser used IndexedDB.

If you don't want to password protect, you don't have to, your data will still be encrypted using a constant and stored locally.

While I have not fully cloned the entirety of the Claude UI, I have worked to implement the features I use most frequently. 

I hope this helps you as much it has helped me. I started this project with Claude — and finished it with Flaude.

[Use it here](https://app.flaude.technology)

### Issues and Smells

Issues to address

* Sometimes the continuation doesn't resume properly
* The iframe for the artifact preview is constantly rerendering
* Something about the artifacts is causing performance issues
* Better mobile, Firefox, and Safari support

Smells to address
* Some request logic is weird

