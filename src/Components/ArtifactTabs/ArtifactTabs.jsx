import {Code, FileText, Play, X} from "lucide-react";
import ArtifactVersionSelector from "../ArtifactVersionSelector/ArtifactVersionSelector.jsx";
import React from "react";
import ArtifactStatusIndicator from "../ArtifactStatusIndicator/ArtifactStatusIndicator.jsx";

const ArtifactTabs = ({
                          artifacts,
                          activeArtifact,
                          setActiveArtifact,
                          artifactVersions,
                          selectedVersions,
                          setShowVersionDropdown,
                          setShowArtifacts
                      }) => {
    return (
        <div className="bg-white border-b border-slate-200 shadow-sm">
            <div className="flex items-center">
                <div className="flex items-center overflow-x-auto flex-1">
                    {Object.values(artifacts).map((artifact, index) => (
                        <div
                            key={artifact.id}
                            className={`px-4 py-3 flex items-center gap-2 whitespace-nowrap border-r border-slate-200 transition-all flex-shrink-0 ${
                                activeArtifact === artifact.id
                                    ? 'bg-gradient-to-br from-blue-50 to-purple-50 text-slate-800 border-b-2 border-b-purple-500'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                            }`}
                        >
                            <button
                                onClick={() => setActiveArtifact(artifact.id)}
                                className="flex items-center gap-2 hover:text-purple-600 transition-colors"
                            >
                                {artifact.type === 'application/vnd.ant.code' || artifact.language ? (
                                    <Code className="w-4 h-4"/>
                                ) : artifact.type === 'application/vnd.ant.react' ? (
                                    <Play className="w-4 h-4"/>
                                ) : (
                                    <FileText className="w-4 h-4"/>
                                )}
                                <span className="text-sm font-medium">{artifact.title || 'Untitled'}</span>
                            </button>
                            <ArtifactVersionSelector
                                artifact={artifact}
                                versions={artifactVersions[artifact.id]}
                                selectedVersion={selectedVersions[artifact.id] || artifactVersions[artifact.id]?.length}
                                setShowVersionDropdown={setShowVersionDropdown}

                            />
                            <ArtifactStatusIndicator artifact={artifact}/>
                        </div>
                    ))}
                </div>
                {/* Close button */}
                <button
                    onClick={() => setShowArtifacts(false)}
                    className="p-3 text-slate-400 hover:text-slate-600 transition-colors border-l border-slate-200"
                >
                    <X className="w-4 h-4"/>
                </button>
            </div>
        </div>
    )
}

export default ArtifactTabs;
