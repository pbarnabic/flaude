import {Check, Code, Copy, FileText, Play, X} from "lucide-react";
import React, {useEffect, useRef, useState} from "react";

const ArtifactCanvas = ({
                            artifacts,
                            showArtifacts,
                            setShowArtifacts,
                            activeArtifact,
                            setActiveArtifact,
                            showDebugInfo = false,
                        }) => {
    const codeRef = useRef(null);
    const [prismLoaded, setPrismLoaded] = useState(false);
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
        if (activeArtifact && artifacts[activeArtifact]) {
            navigator.clipboard.writeText(artifacts[activeArtifact].content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Load Prism.js properly with sequential loading
    useEffect(() => {
        const loadPrism = async () => {
            // Check if already loaded
            if (window.Prism && prismLoaded) return;

            try {
                // Load CSS first
                if (!document.querySelector('link[href*="prism-tomorrow"]')) {
                    const cssLink = document.createElement('link');
                    cssLink.rel = 'stylesheet';
                    cssLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css';
                    document.head.appendChild(cssLink);
                }

                // Load Prism core
                if (!window.Prism) {
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js';
                        script.onload = resolve;
                        script.onerror = reject;
                        document.head.appendChild(script);
                    });
                }

                // Ensure Prism is ready and has basic structure
                if (!window.Prism || !window.Prism.languages) {
                    return;
                }

                // Load essential languages sequentially to avoid race conditions
                const essentialLanguages = [
                    'prism-markup.min.js',      // HTML, XML, SVG
                    'prism-css.min.js',         // CSS
                    'prism-clike.min.js',       // Base for many C-like languages
                    'prism-javascript.min.js'   // JavaScript
                ];

                for (const lang of essentialLanguages) {
                    await new Promise((resolve) => {
                        const script = document.createElement('script');
                        script.src = `https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/${lang}`;
                        script.onload = () => {
                            resolve();
                        };
                        script.onerror = () => {
                            resolve(); // Continue even if one fails
                        };
                        document.head.appendChild(script);
                    });
                }

                // Wait a moment for essential languages to fully initialize
                await new Promise(resolve => setTimeout(resolve, 200));

                // Load additional languages sequentially with proper dependencies
                const additionalLanguages = [
                    'prism-typescript.min.js',  // Depends on javascript
                    'prism-jsx.min.js',         // Depends on markup + javascript
                    'prism-tsx.min.js',         // Depends on typescript + jsx
                    'prism-python.min.js',      // Independent
                    'prism-json.min.js',        // Independent
                    'prism-yaml.min.js',        // Independent
                    'prism-bash.min.js',        // Independent
                    'prism-markdown.min.js',    // Depends on markup
                    'prism-java.min.js',        // Depends on clike
                    'prism-c.min.js',           // Depends on clike
                    'prism-cpp.min.js'          // Depends on c
                ];

                // Load additional languages sequentially with delays
                for (let i = 0; i < additionalLanguages.length; i++) {
                    const lang = additionalLanguages[i];
                    await new Promise(resolve => {
                        setTimeout(() => {
                            const script = document.createElement('script');
                            script.src = `https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/${lang}`;
                            script.onload = () => {
                                resolve();
                            };
                            script.onerror = () => {
                                resolve();
                            };
                            document.head.appendChild(script);
                        }, i * 100); // Stagger loading
                    });
                }

                setPrismLoaded(true);

            } catch (error) {
                // Silent error handling
            }
        };

        loadPrism();
    }, []);

    // Highlight code when content changes
    useEffect(() => {
        if (prismLoaded && window.Prism && codeRef.current && activeArtifact && artifacts[activeArtifact]) {
            // Wait longer to ensure all dependencies are loaded
            const timeoutId = setTimeout(() => {
                if (window.Prism.highlightElement && codeRef.current) {
                    try {
                        const language = getLanguageFromType(artifacts[activeArtifact]);

                        // Clear any existing Prism classes and content to avoid conflicts
                        const codeElement = codeRef.current;
                        codeElement.className = `language-${language}`;

                        // Remove any existing Prism-generated elements
                        const existingHighlights = codeElement.querySelectorAll('.token');
                        existingHighlights.forEach(el => {
                            if (el.parentNode === codeElement) {
                                el.replaceWith(document.createTextNode(el.textContent || ''));
                            }
                        });

                        // Check if the language is actually available
                        if (language !== 'text' && !window.Prism.languages[language]) {
                            codeElement.className = 'language-text';
                        }

                        window.Prism.highlightElement(codeElement);
                    } catch (error) {
                        // Clear any existing highlighting classes on error
                        if (codeRef.current) {
                            codeRef.current.className = codeRef.current.className.replace(/language-\w+/g, 'language-text');
                        }
                    }
                }
            }, 300);

            return () => clearTimeout(timeoutId);
        }
    }, [activeArtifact, artifacts, prismLoaded]);

    const getLanguageFromType = (artifact) => {
        if (!artifact) return 'text';

        // Enhanced language mapping with more specific detection
        if (artifact.language) {
            const langMap = {
                'html': 'markup',
                'htm': 'markup',
                'xml': 'markup',
                'svg': 'markup',
                'css': 'css',
                'scss': 'scss',
                'sass': 'sass',
                'less': 'less',
                'javascript': 'javascript',
                'js': 'javascript',
                'typescript': 'typescript',
                'ts': 'typescript',
                'jsx': 'jsx',
                'tsx': 'tsx',
                'react': 'jsx',
                'python': 'python',
                'py': 'python',
                'java': 'java',
                'c': 'c',
                'cpp': 'cpp',
                'c++': 'cpp',
                'php': 'php',
                'rb': 'ruby',
                'ruby': 'ruby',
                'json': 'json',
                'yaml': 'yaml',
                'yml': 'yaml',
                'bash': 'bash',
                'shell': 'bash',
                'sh': 'bash',
                'markdown': 'markdown',
                'md': 'markdown'
            };
            const detected = langMap[artifact.language.toLowerCase()];
            return detected || 'text';
        }

        // Enhanced type detection
        if (artifact.type === 'application/vnd.ant.react') return 'jsx';
        if (artifact.type === 'text/html') return 'markup';
        if (artifact.type === 'text/css') return 'css';
        if (artifact.type === 'text/markdown') return 'markdown';
        if (artifact.type === 'application/json') return 'json';

        // Try to detect from title/filename
        if (artifact.title) {
            const title = artifact.title.toLowerCase();
            if (title.includes('.html') || title.includes('.htm')) return 'markup';
            if (title.includes('.css')) return 'css';
            if (title.includes('.js')) return 'javascript';
            if (title.includes('.jsx')) return 'jsx';
            if (title.includes('.ts')) return 'typescript';
            if (title.includes('.tsx')) return 'tsx';
            if (title.includes('.py')) return 'python';
            if (title.includes('.java')) return 'java';
            if (title.includes('.json')) return 'json';
            if (title.includes('.md')) return 'markdown';
        }

        return 'text';
    };

    const shouldShowSyntaxHighlighting = (artifact) => {
        if (!artifact || !prismLoaded) return false;
        return artifact.type === 'application/vnd.ant.code' ||
            artifact.language ||
            artifact.type === 'application/vnd.ant.react' ||
            artifact.type === 'text/html';
    };

    // Version indicator component
    const VersionIndicator = ({ version }) => (
        <span className="text-xs text-slate-500 ml-2">v{version}</span>
    );

    // Status indicator for incomplete artifacts
    const StatusIndicator = ({ isComplete }) => {
        if (isComplete) return null;
        return (
            <span className="text-xs text-amber-500 ml-2 flex items-center gap-1">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                Incomplete
            </span>
        );
    };

    return (
        <>
            {(Object.keys(artifacts).length > 0 || showArtifacts) && (
                <div
                    className={`hidden md:flex w-1/2 border-l border-slate-200 bg-slate-900 flex-col ${showArtifacts ? '' : 'md:hidden'}`}>
                    {/* Artifact Tabs */}
                    <div className="bg-slate-800 border-b border-slate-700 flex items-center overflow-x-auto">
                        {Object.values(artifacts).map((artifact) => (
                            <button
                                key={artifact.id}
                                onClick={() => setActiveArtifact(artifact.id)}
                                className={`px-4 py-3 flex items-center gap-2 whitespace-nowrap border-r border-slate-700 transition-all ${
                                    activeArtifact === artifact.id
                                        ? 'bg-slate-900 text-white'
                                        : 'text-slate-400 hover:bg-slate-700 hover:text-slate-300'
                                }`}
                            >
                                {artifact.type === 'application/vnd.ant.code' || artifact.language ? (
                                    <Code className="w-4 h-4"/>
                                ) : artifact.type === 'application/vnd.ant.react' ? (
                                    <Play className="w-4 h-4"/>
                                ) : (
                                    <FileText className="w-4 h-4"/>
                                )}
                                <span className="text-sm font-medium">{artifact.title || 'Untitled'}</span>
                                <VersionIndicator version={artifact.version} />
                                <StatusIndicator isComplete={artifact.isComplete} />
                            </button>
                        ))}
                        <button
                            onClick={() => setShowArtifacts(false)}
                            className="ml-auto p-2 text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4"/>
                        </button>
                    </div>

                    {/* Artifact Content */}
                    {activeArtifact && artifacts[activeArtifact] && (
                        <div className="flex-1 overflow-auto relative">
                            {/* Debug info */}
                            {process.env.NODE_ENV === 'development' && showDebugInfo && (
                                <div
                                    className="absolute top-20 right-4 z-10 bg-slate-700 text-xs p-2 rounded text-slate-300 max-w-xs">
                                    <div>Type: {artifacts[activeArtifact].type}</div>
                                    <div>Language: {artifacts[activeArtifact].language}</div>
                                    <div>Version: {artifacts[activeArtifact].version}</div>
                                    <div>Complete: {artifacts[activeArtifact].isComplete ? 'Yes' : 'No'}</div>
                                    <div>Content Length: {artifacts[activeArtifact].content?.length || 0}</div>
                                    <div>Should Highlight: {shouldShowSyntaxHighlighting(artifacts[activeArtifact]).toString()}</div>
                                    <div>Detected Lang: {getLanguageFromType(artifacts[activeArtifact])}</div>
                                </div>
                            )}

                            <div className="absolute top-4 right-4 z-10">
                                <button
                                    onClick={copyToClipboard}
                                    className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-slate-700 transition-all shadow-lg"
                                >
                                    {copied ? <Check className="w-4 h-4"/> : <Copy className="w-4 h-4"/>}
                                    <span className="text-sm font-medium">{copied ? 'Copied!' : 'Copy'}</span>
                                </button>
                            </div>

                            {shouldShowSyntaxHighlighting(artifacts[activeArtifact]) ? (
                                <pre className="p-6 text-sm font-mono h-full overflow-auto">
                                    <code
                                        ref={codeRef}
                                        className={`language-${getLanguageFromType(artifacts[activeArtifact])}`}
                                        key={`${activeArtifact}-${artifacts[activeArtifact].version}`}
                                    >
                                        {artifacts[activeArtifact].content || ''}
                                    </code>
                                </pre>
                            ) : artifacts[activeArtifact].type === 'text/html' ? (
                                <iframe
                                    srcDoc={artifacts[activeArtifact].content || '<p>Loading...</p>'}
                                    className="w-full h-full border-0"
                                    sandbox="allow-scripts allow-same-origin"
                                />
                            ) : artifacts[activeArtifact].type === 'application/vnd.ant.react' ? (
                                <div className="p-6 text-slate-300 text-sm h-full overflow-auto">
                                    <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4 mb-4">
                                        <p className="text-yellow-400 text-sm">
                                            🚧 React Component Preview - This would normally render the component
                                        </p>
                                    </div>
                                    <pre className="text-slate-300 font-mono text-xs whitespace-pre-wrap">
                                        <code>
                                            {artifacts[activeArtifact].content || ''}
                                        </code>
                                    </pre>
                                </div>
                            ) : (
                                <div className="p-6 text-slate-300 text-sm h-full overflow-auto whitespace-pre-wrap">
                                    {artifacts[activeArtifact].content || ''}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </>
    );
}

export default ArtifactCanvas;
