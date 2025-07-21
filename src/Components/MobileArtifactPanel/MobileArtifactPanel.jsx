import {Check, Code, Copy, FileText, Play, X} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

const MobileArtifactPanel = ({
                                 showArtifacts,
                                 setShowArtifacts,
                                 artifacts,
                                 activeArtifact,
                                 copyToClipboard,
                                 copied
                             }) => {
    const codeRef = useRef(null);
    const [prismLoaded, setPrismLoaded] = useState(false);

    // Check if Prism is loaded (it should be loaded by ArtifactCanvas first)
    useEffect(() => {
        const checkPrismLoaded = () => {
            if (window.Prism && window.Prism.languages) {
                setPrismLoaded(true);
            } else {
                // If not loaded, wait a bit and check again
                setTimeout(checkPrismLoaded, 500);
            }
        };
        checkPrismLoaded();
    }, []);

    // Highlight code when content changes
    useEffect(() => {
        if (prismLoaded && window.Prism && codeRef.current && showArtifacts && activeArtifact && artifacts[activeArtifact]) {
            setTimeout(() => {
                if (window.Prism.highlightElement && codeRef.current) {
                    try {
                        const language = getLanguageFromType(artifacts[activeArtifact]);

                        // Check if the language is actually available
                        if (language !== 'text' && !window.Prism.languages[language]) {
                            console.warn(`Language ${language} not available on mobile, falling back to text`);
                            codeRef.current.className = 'language-text';
                        }

                        window.Prism.highlightElement(codeRef.current);
                    } catch (error) {
                        console.warn('Prism highlighting failed on mobile:', error);
                        // Clear any existing highlighting classes on error
                        if (codeRef.current) {
                            codeRef.current.className = codeRef.current.className.replace(/language-\w+/g, 'language-text');
                        }
                    }
                }
            }, 400); // Even longer delay for mobile
        }
    }, [activeArtifact, artifacts, showArtifacts, prismLoaded]);

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

    return (
        <div
            className={`md:hidden fixed inset-0 bg-slate-900 z-20 transform transition-transform duration-300 ${showArtifacts ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="flex flex-col h-full">
                {/* Mobile Artifact Header */}
                <div className="bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between">
                    <h2 className="text-white font-semibold">Artifacts</h2>
                    <button
                        onClick={() => setShowArtifacts(false)}
                        className="p-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5"/>
                    </button>
                </div>

                {/* Mobile Artifact Tabs */}
                <div className="bg-slate-800 border-b border-slate-700 flex overflow-x-auto">
                    {Object.values(artifacts).map((artifact) => (
                        <button
                            key={artifact.id}
                            onClick={() => setActiveArtifact(artifact.id)}
                            className={`px-4 py-3 flex items-center gap-2 whitespace-nowrap border-r border-slate-700 transition-all ${
                                activeArtifact === artifact.id
                                    ? 'bg-slate-900 text-white'
                                    : 'text-slate-400 hover:bg-slate-700'
                            }`}
                        >
                            {artifact.type === 'application/vnd.ant.code' || artifact.language ? (
                                <Code className="w-4 h-4"/>
                            ) : artifact.type === 'application/vnd.ant.react' ? (
                                <Play className="w-4 h-4"/>
                            ) : (
                                <FileText className="w-4 h-4"/>
                            )}
                            <span className="text-sm">{artifact.title || 'Untitled'}</span>
                        </button>
                    ))}
                </div>

                {/* Mobile Artifact Content */}
                {activeArtifact && artifacts[activeArtifact] && (
                    <div className="flex-1 overflow-auto relative">
                        <div className="absolute top-4 right-4 z-10">
                            <button
                                onClick={copyToClipboard}
                                className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-slate-700 transition-all shadow-lg"
                            >
                                {copied ? <Check className="w-4 h-4"/> : <Copy className="w-4 h-4"/>}
                                <span className="text-sm">{copied ? 'Copied!' : 'Copy'}</span>
                            </button>
                        </div>

                        {shouldShowSyntaxHighlighting(artifacts[activeArtifact]) ? (
                            <pre className="p-4 text-xs font-mono h-full overflow-auto">
                                <code
                                    ref={codeRef}
                                    className={`language-${getLanguageFromType(artifacts[activeArtifact])}`}
                                >
                                    {artifacts[activeArtifact].content || (
                                        <span className="text-slate-500 italic">Creating artifact...</span>
                                    )}
                                </code>
                            </pre>
                        ) : artifacts[activeArtifact].type === 'text/html' ? (
                            <iframe
                                srcDoc={artifacts[activeArtifact].content || '<p>Loading...</p>'}
                                className="w-full h-full border-0"
                                sandbox="allow-scripts allow-same-origin"
                            />
                        ) : artifacts[activeArtifact].type === 'application/vnd.ant.react' ? (
                            <div className="p-4 text-slate-300 text-xs h-full overflow-auto">
                                <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-3 mb-3">
                                    <p className="text-yellow-400 text-xs">
                                        🚧 React Component Preview - This would normally render the component
                                    </p>
                                </div>
                                <pre className="text-slate-300 font-mono whitespace-pre-wrap">
                                    <code>{artifacts[activeArtifact].content || 'Loading...'}</code>
                                </pre>
                            </div>
                        ) : (
                            <div className="p-4 text-slate-300 text-xs h-full overflow-auto whitespace-pre-wrap">
                                {artifacts[activeArtifact].content || (
                                    <span className="text-slate-500 italic">Creating artifact...</span>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default MobileArtifactPanel;
