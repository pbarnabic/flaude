import React from "react";
import {ChevronLeft, Code} from "lucide-react";
import {ArtifactParsingUtilsV2} from "../../Utils/ArtifactParsingUtilsV2.js";

const MobileArtifactsViewer = ({
                                   apiMessages = [],
                                   streamingContent = '',
                                   showArtifacts,
                                   setShowArtifacts
                               }) => {
    // Use shared parsing utility to derive artifacts from props
    const artifactVersions = ArtifactParsingUtilsV2.parseArtifactsFromMessages(apiMessages, streamingContent);
    const artifacts = ArtifactParsingUtilsV2.getLatestArtifacts(artifactVersions);

    return (
        <>
            {
                // Show button whenever there are artifacts, regardless of showArtifacts state
                Object.keys(artifacts).length > 0 && (
                    <button
                        onClick={() => setShowArtifacts(!showArtifacts)}
                        className="md:hidden fixed bottom-20 right-4 p-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all z-10"
                    >
                        {showArtifacts ? <ChevronLeft className="w-5 h-5"/> : <Code className="w-5 h-5"/>}
                    </button>
                )
            }
        </>
    )
}

export default MobileArtifactsViewer;
