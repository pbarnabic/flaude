import React from "react";

const ReactPreview = ({ componentCode }) => {
    const generateReactPreviewHTML = (componentCode) => {
        // Extract lucide icon imports
        const lucideIcons = [];
        let processedCode = componentCode
            .replace(/import\s+React(?:\s*,\s*{[^}]*})?\s+from\s+['"]react['"];?\s*/g, '')
            .replace(/import\s+{\s*([^}]+)\s*}\s+from\s+['"]react['"];?\s*/g, '')
            .replace(/import\s+{\s*([^}]+)\s*}\s+from\s+['"]lucide-react['"];?\s*/g, (match, imports) => {
                lucideIcons.push(...imports.split(',').map(i => i.trim()));
                return '';
            })
            .replace(/export\s+default\s+function\s+(\w+)/g, 'function $1')
            .replace(/export\s+default\s+/g, 'const Component = ');

        // Create icon component definitions
        const iconDefinitions = lucideIcons.map(iconName => {
            // Convert PascalCase to kebab-case for lucide icon names
            const kebabName = iconName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
            return `
            const ${iconName} = (props) => {
                const iconRef = React.useRef(null);
                React.useEffect(() => {
                    if (iconRef.current && window.lucide) {
                        iconRef.current.innerHTML = '<i data-lucide="${kebabName}"></i>';
                        window.lucide.createIcons();
                    }
                }, []);
                return React.createElement('span', { ref: iconRef, ...props });
            };`;
        }).join('\n');

        return `<!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>React Component Preview</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
                    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
                    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
                    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
                    <style>
                        body {
                            margin: 0;
                            padding: 0;
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                            background: white;
                        }
                        .error-container {
                            background-color: #fef2f2;
                            border: 1px solid #fecaca;
                            border-radius: 8px;
                            padding: 16px;
                            margin: 16px;
                            color: #dc2626;
                            font-family: monospace;
                            white-space: pre-wrap;
                            font-size: 14px;
                        }
                        #root {
                            min-height: 100vh;
                        }
                    </style>
                </head>
                <body>
                    <div id="root"></div>
                    <script type="text/babel">
                        const { useState, useEffect, useRef, useMemo, useCallback, useReducer, useContext } = React;
                        
                        ${iconDefinitions}
                        
                        ${processedCode}
                        
                        // Render the component
                        try {
                            const ComponentToRender = typeof Component !== 'undefined' ? Component : ${processedCode.match(/function\s+([A-Z]\w*)/)?.[1] || 'null'};
                            
                            if (ComponentToRender) {
                                const root = ReactDOM.createRoot(document.getElementById('root'));
                                root.render(React.createElement(ComponentToRender));
                            } else {
                                throw new Error('No React component found');
                            }
                        } catch (error) {
                            console.error(error);
                            document.getElementById('root').innerHTML = \`
                                <div class="error-container">
                                    <strong>Error:</strong> \${error.message}
                                </div>
                            \`;
                        }
                    </script>
                </body>
                </html>`;
    };

    return (
        <iframe
            srcDoc={generateReactPreviewHTML(componentCode || '')}
            className="w-full h-full border-0"
            sandbox="allow-scripts"
        />
    );
};

export default ReactPreview;
