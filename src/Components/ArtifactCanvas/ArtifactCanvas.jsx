import React, {useEffect, useRef, useState} from "react";
import {Check, Copy, Code, Eye, ExternalLink} from "lucide-react";
import {useParams} from "react-router-dom";
import {ArtifactParsingUtilsV2} from "../../Utils/ArtifactParsingUtilsV2.js";
import ReactPreview from "../ReactPreview/ReactPreview.jsx";

const ArtifactCanvas = ({activeArtifact, artifacts, selectedVersions, artifactVersions}) => {
    const {chatId} = useParams();
    const codeRef = useRef(null);
    const codeContainerRef = useRef(null);
    const [copied, setCopied] = useState(false);
    const [artifact, setArtifact] = useState(null);
    const [versionToRender, setVersionToRender] = useState(null);
    const [showSyntaxHighlighting, setShowSyntaxHighlighting] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [autoScroll, setAutoScroll] = useState(true);

    // Auto-scroll function for code view only
    const scrollCodeToBottom = () => {
        if (!autoScroll || !codeContainerRef.current) return;

        codeContainerRef.current.scrollTop = codeContainerRef.current.scrollHeight;
    };

    const supportsPreview = artifact && (
        artifact.type === 'text/html' ||
        artifact.type === 'application/vnd.ant.react'
    );

    const shouldShowCode = !showPreview || !supportsPreview;

    useEffect(() => {
        if (window.Prism && codeRef.current && activeArtifact && artifacts[activeArtifact]) {
            const language = ArtifactParsingUtilsV2.getLanguageFromType(artifacts[activeArtifact]);
            const codeElement = codeRef.current;
            codeElement.className = `language-${language}`;
            window.Prism.highlightElement(codeElement);

            // Auto-scroll after syntax highlighting (only for code view)
            if (shouldShowCode) {
                setTimeout(scrollCodeToBottom, 100);
            }
        }
    }, [activeArtifact, artifacts, showPreview, autoScroll, shouldShowCode]);

    useEffect(() => {
        if (!activeArtifact) {
            setArtifact(null);
        } else {
            setArtifact(artifacts[activeArtifact]);
        }
    }, [artifacts, activeArtifact]);

    useEffect(() => {
        if (artifact) {
            const selectedVersionNumber = selectedVersions[artifact.id] || artifactVersions[artifact.id]?.length;
            setVersionToRender(artifact._allVersions[selectedVersionNumber - 1]);
        }
    }, [artifact, artifactVersions, selectedVersions]);

    useEffect(() => {
        if (artifact) {
            setShowSyntaxHighlighting(ArtifactParsingUtilsV2.shouldShowSyntaxHighlighting(artifact));
        }
    }, [artifact]);

    // Auto-scroll when content changes (only for code view)
    useEffect(() => {
        if (versionToRender && shouldShowCode) {
            setTimeout(scrollCodeToBottom, 100);
        }
    }, [versionToRender, shouldShowCode, autoScroll]);

    const openInNewTab = () => {
        if (!chatId || !activeArtifact || !artifact) return;

        const selectedVersionNumber = selectedVersions[artifact.id] || artifactVersions[artifact.id]?.length;
        const isLatestVersion = selectedVersionNumber === artifactVersions[artifact.id]?.length;

        const version = isLatestVersion ? 'latest' : selectedVersionNumber;
        const url = `/preview/${chatId}?artifactId=${activeArtifact}&version=${version}`;

        window.open(url, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
    };

    const copyToClipboard = () => {
        if (versionToRender) {
            navigator.clipboard.writeText(versionToRender.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const togglePreview = () => {
        setShowPreview(!showPreview);
    };

    const toggleAutoScroll = () => {
        setAutoScroll(!autoScroll);
    };

    if (!artifact || !versionToRender) return null;

    return (
        <div className="h-full overflow-auto relative bg-white" style={{height: 'calc(100vh - 120px)'}}>
            <div className="absolute top-4 right-4 z-10 flex gap-2">
                {/* Auto-scroll toggle - only show when in code view */}
                {shouldShowCode && (
                    <button
                        onClick={toggleAutoScroll}
                        className={`backdrop-blur px-3 py-1.5 rounded-lg flex items-center gap-2 hover:shadow-md transition-all shadow border text-sm font-medium ${
                            autoScroll
                                ? 'bg-blue-500/90 text-white border-blue-400'
                                : 'bg-white/90 text-slate-600 border-slate-200'
                        }`}
                    >
                        <span>Auto-scroll</span>
                    </button>
                )}

                {supportsPreview && (
                    <>
                        <button onClick={togglePreview}
                                className="bg-white/90 backdrop-blur text-slate-600 px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-white hover:shadow-md transition-all shadow border border-slate-200">
                            {showPreview ? <Code className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                            <span className="text-sm font-medium">{showPreview ? 'Code' : 'Preview'}</span>
                        </button>
                        <button onClick={openInNewTab}
                                className="bg-white/90 backdrop-blur text-slate-600 px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-white hover:shadow-md transition-all shadow border border-slate-200">
                            <ExternalLink className="w-4 h-4"/>
                            <span className="text-sm font-medium">Open in Tab</span>
                        </button>
                    </>
                )}
                {!supportsPreview && (
                    <button onClick={togglePreview}
                            className="bg-white/90 backdrop-blur text-slate-600 px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-white hover:shadow-md transition-all shadow border border-slate-200">
                        {showPreview ? <Code className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                        <span className="text-sm font-medium">{showPreview ? 'Code' : 'Preview'}</span>
                    </button>
                )}
                <button onClick={copyToClipboard}
                        className="bg-white/90 backdrop-blur text-slate-600 px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-white hover:shadow-md transition-all shadow border border-slate-200">
                    {copied ? <Check className="w-4 h-4 text-green-600"/> : <Copy className="w-4 h-4"/>}
                    <span className="text-sm font-medium">{copied ? 'Copied!' : 'Copy'}</span>
                </button>
            </div>

            {shouldShowCode ? (
                <pre ref={codeContainerRef} className="p-6 text-sm font-mono h-full overflow-auto bg-slate-50">
                    <code
                        style={{userSelect: 'text'}} // allows selection of only parts of the code
                        ref={codeRef}
                        key={`${activeArtifact}-${artifact.version}-${showPreview}`}
                        className={`language-${ArtifactParsingUtilsV2.getLanguageFromType(artifacts[activeArtifact])}`}
                    >
                        {versionToRender?.content || ''}
                    </code>
                </pre>
            ) : artifact.type === 'text/html' ? (
                <iframe
                    srcDoc={versionToRender?.content || '<p>Loading...</p>'}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts"
                />
            ) : artifact.type === 'application/vnd.ant.react' ? (
                <ReactPreview componentCode={versionToRender?.content}/>
            ) : (
                <div className="p-6 text-slate-700 text-sm h-full overflow-auto whitespace-pre-wrap">
                    {versionToRender.content || ''}
                </div>
            )}
        </div>
    );
};

export default ArtifactCanvas;
