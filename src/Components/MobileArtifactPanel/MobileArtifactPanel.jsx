import React, {useEffect, useRef, useState} from "react";
import {Check, Code, Copy, FileText, Play, X} from "lucide-react";
import {ArtifactParsingUtils} from "../../Utils/ArtifactParsingUtils.js";

const MobileArtifactPanel = ({
                                 apiMessages = [],
                                 streamingContent = '',
                                 showArtifacts,
                                 setShowArtifacts,
                                 activeArtifact,
                                 setActiveArtifact,
                             }) => {
    const codeRef = useRef(null);
    const [copied, setCopied] = useState(false);

    // Use shared parsing utility
    const artifacts = ArtifactParsingUtils.parseArtifactsFromMessages(apiMessages, streamingContent);

    const copyToClipboard = () => {
        if (activeArtifact && artifacts[activeArtifact]) {
            navigator.clipboard.writeText(artifacts[activeArtifact].content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    useEffect(() => {
        if (window.Prism && codeRef.current && showArtifacts && activeArtifact && artifacts[activeArtifact]) {
            const language = ArtifactParsingUtils.getLanguageFromType(artifacts[activeArtifact]);
            const codeElement = codeRef.current;
            codeElement.className = `language-${language}`;
            window.Prism.highlightElement(codeElement);
        }
    }, [activeArtifact, artifacts, showArtifacts]);

    // Auto-select newest artifact when artifacts change, prioritizing incomplete ones
    useEffect(() => {
        const artifactEntries = Object.entries(artifacts);
        if (artifactEntries.length > 0) {
            // First check for incomplete artifacts (currently being written)
            const incompleteArtifact = artifactEntries.find(([id, artifact]) => !artifact.isComplete);

            if (incompleteArtifact) {
                // Switch to the artifact being written
                if (activeArtifact !== incompleteArtifact[0]) {
                    setActiveArtifact(incompleteArtifact[0]);
                }
            } else {
                // No incomplete artifacts, select newest complete one
                artifactEntries.sort((a, b) => (a[1].timestamp || 0) - (b[1].timestamp || 0));
                const newestId = artifactEntries[artifactEntries.length - 1][0];

                // If no artifact is selected or the current selection doesn't exist, select the newest
                if (!activeArtifact || !artifacts[activeArtifact]) {
                    setActiveArtifact(newestId);
                }
            }
        }
    }, [artifacts, activeArtifact, setActiveArtifact]);

    const VersionIndicator = ({ version }) => (
        <span className="text-xs text-slate-500 ml-2">v{version}</span>
    );

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
                            <VersionIndicator version={artifact.version} />
                            <StatusIndicator isComplete={artifact.isComplete} />
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

                        {ArtifactParsingUtils.shouldShowSyntaxHighlighting(artifacts[activeArtifact]) ? (
                            <pre className="p-4 text-xs font-mono h-full overflow-auto">
                                <code
                                    ref={codeRef}
                                    className={`language-${ArtifactParsingUtils.getLanguageFromType(artifacts[activeArtifact])}`}
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
                            <div className="p-4 text-slate-300 text-xs h-full overflow-auto">
                                <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-3 mb-3">
                                    <p className="text-yellow-400 text-xs">
                                        🚧 React Component Preview - This would normally render the component
                                    </p>
                                </div>
                                <pre className="text-slate-300 font-mono whitespace-pre-wrap">
                                    <code>
                                        {artifacts[activeArtifact].content || ''}
                                    </code>
                                </pre>
                            </div>
                        ) : (
                            <div className="p-4 text-slate-300 text-xs h-full overflow-auto whitespace-pre-wrap">
                                {artifacts[activeArtifact].content || ''}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default MobileArtifactPanel;
