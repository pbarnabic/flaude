export const executeREPL = (code) => {
    const logs = [];
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    // Capture console output
    console.log = (...args) => logs.push({type: 'log', content: args.join(' ')});
    console.error = (...args) => logs.push({type: 'error', content: args.join(' ')});
    console.warn = (...args) => logs.push({type: 'warn', content: args.join(' ')});

    try {
        // Create a sandboxed function
        const func = new Function(code);
        func();

        // Restore console
        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;

        return logs.map(l => l.content).join('\n') || 'Code executed successfully';
    } catch (error) {
        // Restore console
        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;

        return `Error: ${error.message}`;
    }
};
