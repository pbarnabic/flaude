import React, {useEffect, useState} from "react";
import { useParams } from "react-router-dom";
import ArtifactTabs from "../ArtifactTabs/ArtifactTabs.jsx";
import ArtifactCanvas from "../ArtifactCanvas/ArtifactCanvas.jsx";
import ArtifactVersionDropdown from "../ArtifactVersionDropdown/ArtifactVersionDropdown.jsx";
import {ArtifactParsingUtils} from "../../Utils/ArtifactParsingUtils.js";

const ArtifactsPanel = ({
                            apiMessages = [],
                            streamingContent = '',
                            showArtifacts,
                            setShowArtifacts,
                            activeArtifact,
                            setActiveArtifact,
                            showDebugInfo = false,
                        }) => {

    const { chatId } = useParams();
    const [selectedVersions, setSelectedVersions] = useState({});
    const [showVersionDropdown, setShowVersionDropdown] = useState({});

    // Get all artifact versions
    const artifactVersions = ArtifactParsingUtils.parseArtifactsFromMessages(apiMessages, streamingContent);

    // Write to localStorage when artifacts change
    useEffect(() => {
        if (chatId) {
            Object.keys(artifactVersions).forEach(artifactId => {
                localStorage.setItem(`${chatId}_${artifactId}_updated`, Date.now().toString());
            });
        }
    }, [chatId, apiMessages]);

    // Check which artifacts are currently streaming
    const currentlyStreamingArtifacts = new Set();
    const isCurrentlyStreaming = streamingContent && streamingContent.length > 0;

    if (isCurrentlyStreaming) {
        const streamingArtifacts = ArtifactParsingUtils.parseArtifactsFromMessages([], streamingContent);
        Object.entries(ArtifactParsingUtils.getLatestArtifacts(streamingArtifacts))
            .forEach(([id, artifact]) => {
                if (!artifact.isComplete) {
                    currentlyStreamingArtifacts.add(id);
                }
            });
    }

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
                _totalVersions: versions.length,
                _isCurrentlyStreaming: currentlyStreamingArtifacts.has(artifactId)
            };
        }
    });

    // Auto-selection logic
    useEffect(() => {
        const artifactEntries = Object.entries(artifacts);
        if (artifactEntries.length === 0) return;

        let activeStreamingArtifact = null;

        if (isCurrentlyStreaming) {
            const streamingArtifacts = ArtifactParsingUtils.parseArtifactsFromMessages([], streamingContent);
            const incompleteStreamingArtifact = Object.entries(ArtifactParsingUtils.getLatestArtifacts(streamingArtifacts))
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

    return (
        <>
            {(Object.keys(artifacts).length > 0 && showArtifacts) && (
                <div
                    className={`w-1/2 border-l border-slate-200 bg-slate-50 ${showArtifacts ? 'block' : 'hidden'} md:block`}>
                    {/* Artifact Tabs */}
                    <ArtifactTabs
                        artifacts={artifacts}
                        activeArtifact={activeArtifact}
                        setActiveArtifact={setActiveArtifact}
                        artifactVersions={artifactVersions}
                        selectedVersions={selectedVersions}
                        setShowVersionDropdown={setShowVersionDropdown}
                        setShowArtifacts={setShowArtifacts}
                    />

                    {/* Artifact Content */}
                    <ArtifactCanvas
                        activeArtifact={activeArtifact}
                        artifacts={artifacts}
                        selectedVersions={selectedVersions}
                        artifactVersions={artifactVersions}
                    />
                </div>
            )}

            {/* Render dropdowns at document level */}
            <ArtifactVersionDropdown
                artifactVersions={artifactVersions}
                selectedVersions={selectedVersions}
                showVersionDropdown={showVersionDropdown}
                setSelectedVersions={setSelectedVersions}
                setShowVersionDropdown={setShowVersionDropdown}
            />
        </>
    );
}

export default ArtifactsPanel;
