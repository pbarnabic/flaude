import React from "react";

const MarkdownRenderer = ({content}) => {
    const renderMarkdown = (text) => {
        if (!text) return [];

        const lines = text.split('\n');
        const elements = [];
        let currentCodeBlock = null;
        let currentCodeLanguage = '';
        let listItems = [];
        let inOrderedList = false;
        let inUnorderedList = false;

        const flushList = () => {
            if (listItems.length > 0) {
                if (inOrderedList) {
                    elements.push(
                        <ol key={`ol-${elements.length}`} className="list-decimal list-inside space-y-1 my-2 ml-4">
                            {listItems.map((item, idx) => (
                                <li key={idx} dangerouslySetInnerHTML={{__html: item}}/>
                            ))}
                        </ol>
                    );
                } else if (inUnorderedList) {
                    elements.push(
                        <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-1 my-2 ml-4">
                            {listItems.map((item, idx) => (
                                <li key={idx} dangerouslySetInnerHTML={{__html: item}}/>
                            ))}
                        </ul>
                    );
                }
                listItems = [];
                inOrderedList = false;
                inUnorderedList = false;
            }
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Code blocks
            if (line.startsWith('```')) {
                if (currentCodeBlock === null) {
                    flushList();
                    currentCodeLanguage = line.slice(3).trim();
                    currentCodeBlock = [];
                } else {
                    // End of code block
                    elements.push(
                        <div key={`code-${elements.length}`} className="my-3">
                            <div
                                className="bg-slate-800 rounded-t-lg px-3 py-2 text-xs text-slate-300 font-mono border-b border-slate-700">
                                {currentCodeLanguage || 'code'}
                            </div>
                            <pre className="bg-slate-900 rounded-b-lg p-3 overflow-x-auto">
                                <code className="text-slate-300 text-sm font-mono whitespace-pre">
                                    {currentCodeBlock.join('\n')}
                                </code>
                            </pre>
                        </div>
                    );
                    currentCodeBlock = null;
                    currentCodeLanguage = '';
                }
                continue;
            }

            if (currentCodeBlock !== null) {
                currentCodeBlock.push(line);
                continue;
            }

            // Headers
            if (line.startsWith('# ')) {
                flushList();
                elements.push(
                    <h1 key={`h1-${elements.length}`} className="text-xl font-bold my-3 text-slate-800">
                        {line.slice(2)}
                    </h1>
                );
                continue;
            }
            if (line.startsWith('## ')) {
                flushList();
                elements.push(
                    <h2 key={`h2-${elements.length}`} className="text-lg font-bold my-2 text-slate-800">
                        {line.slice(3)}
                    </h2>
                );
                continue;
            }
            if (line.startsWith('### ')) {
                flushList();
                elements.push(
                    <h3 key={`h3-${elements.length}`} className="text-base font-bold my-2 text-slate-800">
                        {line.slice(4)}
                    </h3>
                );
                continue;
            }

            // Lists
            const orderedMatch = line.match(/^(\d+)\.\s+(.+)$/);
            const unorderedMatch = line.match(/^[-*+]\s+(.+)$/);

            if (orderedMatch) {
                if (!inOrderedList) {
                    flushList();
                    inOrderedList = true;
                }
                listItems.push(processInlineMarkdown(orderedMatch[2]));
                continue;
            }

            if (unorderedMatch) {
                if (!inUnorderedList) {
                    flushList();
                    inUnorderedList = true;
                }
                listItems.push(processInlineMarkdown(unorderedMatch[1]));
                continue;
            }

            // Not a list item, flush any pending list
            flushList();

            // Empty line
            if (line.trim() === '') {
                elements.push(<br key={`br-${elements.length}`}/>);
                continue;
            }

            // Regular paragraph
            elements.push(
                <p key={`p-${elements.length}`} className="my-1"
                   dangerouslySetInnerHTML={{__html: processInlineMarkdown(line)}}/>
            );
        }

        // Flush any remaining list
        flushList();

        return elements;
    };

    const processInlineMarkdown = (text) => {
        return text
            // Bold
            .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
            .replace(/__(.+?)__/g, '<strong class="font-semibold">$1</strong>')
            // Italic
            .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
            .replace(/_(.+?)_/g, '<em class="italic">$1</em>')
            // Inline code
            .replace(/`(.+?)`/g, '<code class="bg-slate-200 px-1 py-0.5 rounded text-sm font-mono text-slate-800">$1</code>')
            // Links
            .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$1</a>');
    };

    return (
        <div className="markdown-content" style={{wordBreak: 'break-word', overflowWrap: 'anywhere'}}>
            {renderMarkdown(content)}
        </div>
    );
};

export default MarkdownRenderer;
