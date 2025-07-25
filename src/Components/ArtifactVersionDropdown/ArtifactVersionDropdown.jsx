import React, {useEffect} from 'react';
import {Check} from "lucide-react";

const ArtifactVersionDropdown = ({
                                     showVersionDropdown,
                                     artifactVersions,
                                     selectedVersions,
                                     setSelectedVersions,
                                     setShowVersionDropdown
                                 }) => {

    useEffect(() => {
        const handleClickOutside = (e) => {
            // Check if click is on a version selector button
            const isVersionButton = e.target.closest('[data-artifact-id]');

            // Check if click is inside any dropdown
            const isInsideDropdown = e.target.closest('.version-dropdown');

            if (!isVersionButton && !isInsideDropdown) {
                setShowVersionDropdown({});
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);


    const handleVersionSelected = (artifactId, version) => {
        setSelectedVersions(prev => ({
            ...prev,
            [artifactId]: version
        }));
        setShowVersionDropdown(prev => ({
            ...prev,
            [artifactId]: false
        }));
    };


    return (
        <>
            {Object.entries(showVersionDropdown).map(([artifactId, isOpen]) => {
                if (!isOpen) return null;

                const versions = artifactVersions[artifactId] || [];
                const selectedVersion = selectedVersions[artifactId] || versions.length;
                const button = document.querySelector(`[data-artifact-id="${artifactId}"]`);

                if (!button) return null;

                const rect = button.getBoundingClientRect();

                return (
                    <div
                        key={`dropdown-${artifactId}`}
                        className="fixed bg-white border border-slate-200 rounded-lg shadow-lg min-w-32 z-[9999] version-dropdown"
                        style={{
                            top: rect.bottom + 4,
                            left: rect.left,
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="py-1">
                            {versions.map((version, index) => {
                                const versionNumber = index + 1;
                                const isSelected = selectedVersion === versionNumber;
                                const isLatestVersion = versionNumber === versions.length;

                                return (
                                    <button
                                        key={versionNumber}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleVersionSelected(artifactId, versionNumber);
                                        }}
                                        className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 ${
                                            isSelected ? 'bg-slate-50 text-slate-900' : 'text-slate-600'
                                        }`}
                                    >
                                        <span>v{versionNumber}</span>
                                        {isLatestVersion && (
                                            <span className="text-green-600 text-xs">(latest)</span>
                                        )}
                                        {isSelected && <Check className="w-3 h-3 ml-auto text-purple-600"/>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </>
    )

}

export default ArtifactVersionDropdown;
