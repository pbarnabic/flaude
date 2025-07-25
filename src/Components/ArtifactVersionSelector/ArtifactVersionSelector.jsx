import {ChevronDown, History} from "lucide-react";
import React from "react";

const ArtifactVersionSelector = ({
                                     artifact,
                                     versions,
                                     selectedVersion,
                                     setShowVersionDropdown
                                 }) => {
    // const artifact = artifacts[artifactId];
    // const versions = artifactVersions[artifactId] || [];

    if (!artifact || versions.length <= 1) return null;

    // const selectedVersion = selectedVersions[artifactId] || versions.length;
    const isLatest = selectedVersion === versions.length;

    return (
        <button
            data-artifact-id={artifact?.id}
            onClick={(e) => {
                e.stopPropagation();
                setShowVersionDropdown(prev => ({
                    ...prev,
                    [artifact?.id]: !prev[artifact?.id]
                }));
            }}
            className={`text-xs flex items-center gap-1 px-2 py-1 rounded-md transition-all ${
                isLatest
                    ? 'text-slate-500 hover:bg-slate-100'
                    : 'text-amber-600 bg-amber-50 hover:bg-amber-100'
            }`}
        >
            <History className="w-3 h-3"/>
            v{selectedVersion}
            <ChevronDown className="w-3 h-3"/>
        </button>
    );
};

export default ArtifactVersionSelector;
