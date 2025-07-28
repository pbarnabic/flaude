import React, {useEffect, useRef, useState} from "react";
import {Check, ChevronDown, Code, Copy, FileText, History, Play, X} from "lucide-react";
import {ArtifactParsingUtilsV2} from "../../Utils/ArtifactParsingUtilsV2.js";

const MobileArtifactCanvas = ({
                                 apiMessages = [],
                                 streamingContent = '',
                                 showArtifacts,
                                 setShowArtifacts,
                                 activeArtifact,
                                 setActiveArtifact,
                             }) => {
    const codeRef = useRef(null);
    const [copied, setCopied] = useState(false);
    const [selectedVersions, setSelectedVersions] = useState({});
    const [showVersionDropdown, setShowVersionDropdown] = useState({});

    // Get all artifact versions
    const artifactVersions = ArtifactParsingUtilsV2.parseArtifactsFromMessages(apiMessages, streamingContent);

    // Get current display artifacts (respecting version selection)
    const artifacts = {};
    Object.keys(artifactVersions).forEach(artifactId => {
        const versions = artifactVersions[artifactId];
        const selectedVersion = selectedVersions[artifactId] || versions.length; // Default to latest
        const artifact = versions[selectedVersion - 1];
        if (artifact) {
            artifacts[artifactId] = {
                ...artifact,
                _allVersions: versions,
                _selectedVersion: selectedVersion,
                _totalVersions: versions.length
            };
        }
    });

    const copyToClipboard = () => {
        if (activeArtifact && artifacts[activeArtifact]) {
            navigator.clipboard.writeText(artifacts[activeArtifact].content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const selectVersion = (artifactId, version) => {
        setSelectedVersions(prev => ({
            ...prev,
            [artifactId]: version
        }));
        setShowVersionDropdown(prev => ({
            ...prev,
            [artifactId]: false
        }));
    };

    useEffect(() => {
        if (window.Prism && codeRef.current && showArtifacts && activeArtifact && artifacts[activeArtifact]) {
            const language = ArtifactParsingUtilsV2.getLanguageFromType(artifacts[activeArtifact]);
            const codeElement = codeRef.current;
            codeElement.className = `language-${language}`;
            window.Prism.highlightElement(codeElement);
        }
    }, [activeArtifact, artifacts, showArtifacts]);

    // Auto-selection logic
    useEffect(() => {
        const artifactEntries = Object.entries(artifacts);
        if (artifactEntries.length === 0) return;

        const isCurrentlyStreaming = streamingContent && streamingContent.length > 0;
        let activeStreamingArtifact = null;

        if (isCurrentlyStreaming) {
            const streamingArtifacts = ArtifactParsingUtilsV2.parseArtifactsFromMessages([], streamingContent);
            const incompleteStreamingArtifact = Object.entries(ArtifactParsingUtilsV2.getLatestArtifacts(streamingArtifacts))
                .find(([id, artifact]) => !artifact.isComplete);

            if (incompleteStreamingArtifact) {
                activeStreamingArtifact = incompleteStreamingArtifact[0];
            }
        }

        if (activeStreamingArtifact) {
            if (activeArtifact !== activeStreamingArtifact) {
                setActiveArtifact(activeStreamingArtifact);
            }
        } else if (!activeArtifact || !artifacts[activeArtifact]) {
            artifactEntries.sort((a, b) => (a[1].timestamp || 0) - (b[1].timestamp || 0));
            const newestId = artifactEntries[artifactEntries.length - 1][0];
            setActiveArtifact(newestId);
        }
    }, [artifacts, activeArtifact, setActiveArtifact, streamingContent]);

    const VersionSelector = ({ artifactId }) => {
        const artifact = artifacts[artifactId];
        if (!artifact || artifact._totalVersions <= 1) return null;

        const isLatest = artifact._selectedVersion === artifact._totalVersions;

        return (
            <div className="relative">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowVersionDropdown(prev => ({
                            ...prev,
                            [artifactId]: !prev[artifactId]
                        }));
                    }}
                    className={`text-xs flex items-center gap-1 px-2 py-1 rounded ${
                        isLatest
                            ? 'text-slate-500 hover:bg-slate-700'
                            : 'text-amber-400 bg-amber-900/30 hover:bg-amber-900/50'
                    }`}
                >
                    <History className="w-3 h-3" />
                    v{artifact._selectedVersion}
                    <ChevronDown className="w-3 h-3" />
                </button>

                {showVersionDropdown[artifactId] && (
                    <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg min-w-32 z-50">
                        <div className="py-1">
                            {artifact._allVersions.map((version, index) => {
                                const versionNumber = index + 1;
                                const isSelected = artifact._selectedVersion === versionNumber;
                                const isLatestVersion = versionNumber === artifact._totalVersions;

                                return (
                                    <button
                                        key={versionNumber}
                                        onClick={() => selectVersion(artifactId, versionNumber)}
                                        className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-700 ${
                                            isSelected ? 'bg-slate-700 text-white' : 'text-slate-300'
                                        }`}
                                    >
                                        <span>v{versionNumber}</span>
                                        {isLatestVersion && (
                                            <span className="text-green-400 text-xs">(latest)</span>
                                        )}
                                        {isSelected && <Check className="w-3 h-3 ml-auto" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const StatusIndicator = ({ isComplete }) => {
        if (isComplete) return null;
        return (
            <span className="text-xs text-amber-500 ml-2 flex items-center gap-1">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                Streaming
            </span>
        );
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            setShowVersionDropdown({});
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

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
                <div className="bg-slate-800 border-b border-slate-700 flex overflow-visible">
                    {Object.values(artifacts).map((artifact) => (
                        <div
                            key={artifact.id}
                            className={`px-4 py-3 flex items-center gap-2 whitespace-nowrap border-r border-slate-700 transition-all ${
                                activeArtifact === artifact.id
                                    ? 'bg-slate-900 text-white'
                                    : 'text-slate-400 hover:bg-slate-700'
                            }`}
                        >
                            <button
                                onClick={() => setActiveArtifact(artifact.id)}
                                className="flex items-center gap-2 hover:text-white transition-colors"
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
                            <VersionSelector artifactId={artifact.id} />
                            <StatusIndicator isComplete={artifact.isComplete} />
                        </div>
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

                        {ArtifactParsingUtilsV2.shouldShowSyntaxHighlighting(artifacts[activeArtifact]) ? (
                            <pre className="p-4 text-xs font-mono h-full overflow-auto">
                                <code
                                    ref={codeRef}
                                    className={`language-${ArtifactParsingUtilsV2.getLanguageFromType(artifacts[activeArtifact])}`}
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

export default MobileArtifactCanvas;
