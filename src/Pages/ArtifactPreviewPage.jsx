import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useChats } from '../Contexts/ChatsContext.jsx';
import { useAuthentication } from '../Contexts/AuthenticationContext.jsx';
import { ArtifactParsingUtils } from '../Utils/ArtifactParsingUtils.js';
import ReactPreview from '../Components/ReactPreview/ReactPreview.jsx';

const ArtifactPreviewPage = () => {
    const { chatId } = useParams();
    const [searchParams] = useSearchParams();
    const artifactId = searchParams.get('artifactId');
    const requestedVersion = searchParams.get('version');

    const { isAuthenticated, isLoading: isPasswordLoading } = useAuthentication();
    const { loadCurrentChat, currentChat, currentMessages, isDatabaseReady } = useChats();

    const [artifact, setArtifact] = useState(null);
    const [versionToRender, setVersionToRender] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [isLatestVersion, setIsLatestVersion] = useState(false);

    const lastKnownTimestampRef = useRef(0);

    useEffect(() => {
        const loadData = async () => {
            if (isPasswordLoading || !isAuthenticated || !isDatabaseReady || !chatId || !artifactId) {
                return;
            }

            if (currentChat?.id === chatId && currentMessages.length > 0) {
                return;
            }

            try {
                setIsLoading(true);
                setError(null);
                await loadCurrentChat(chatId);
            } catch (err) {
                setError('Failed to load chat');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [chatId, artifactId, isAuthenticated, isPasswordLoading, isDatabaseReady]);

    useEffect(() => {
        if (!currentMessages || !artifactId || !isAuthenticated) return;

        if (currentMessages.length === 0) return;

        try {
            const artifactVersions = ArtifactParsingUtils.parseArtifactsFromMessages(currentMessages);
            const versions = artifactVersions[artifactId];

            if (!versions || versions.length === 0) {
                setError(`Artifact "${artifactId}" not found`);
                return;
            }

            const isRequestingLatest = requestedVersion === 'latest' || !requestedVersion;
            setIsLatestVersion(isRequestingLatest);

            let targetVersion;
            if (isRequestingLatest) {
                targetVersion = versions[versions.length - 1];
            } else {
                const versionNumber = parseInt(requestedVersion, 10);
                targetVersion = versions.find(v => v.version === versionNumber);

                if (!targetVersion) {
                    setError(`Version ${requestedVersion} not found`);
                    return;
                }
            }

            if (targetVersion.type !== 'text/html' && targetVersion.type !== 'application/vnd.ant.react') {
                setError(`This artifact type (${targetVersion.type}) is not supported for preview`);
                return;
            }

            if (!versionToRender || versionToRender.content !== targetVersion.content || versionToRender.version !== targetVersion.version) {
                setArtifact({
                    ...targetVersion,
                    _allVersions: versions
                });
                setVersionToRender(targetVersion);
                setError(null);
            }

        } catch (err) {
            setError('Failed to process artifact');
        }
    }, [currentMessages, artifactId, requestedVersion, isAuthenticated]);

    useEffect(() => {
        if (versionToRender?.timestamp) {
            lastKnownTimestampRef.current = versionToRender.timestamp;
        }
    }, [versionToRender?.timestamp]);

    const refreshContent = async () => {
        if (!isLatestVersion || !currentChat || !isAuthenticated) return;

        try {
            setIsRefreshing(true);
            await loadCurrentChat(chatId);
        } catch (err) {
            // Silent error handling
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        if (!isLatestVersion || !chatId || !artifactId || !isAuthenticated) return;

        const pollForUpdates = () => {
            const storageKey = `${chatId}_${artifactId}_updated`;
            const storedTimestamp = localStorage.getItem(storageKey);

            if (storedTimestamp) {
                const timestamp = parseInt(storedTimestamp, 10);

                if (timestamp > lastKnownTimestampRef.current) {
                    refreshContent();
                }
            }
        };

        const interval = setInterval(pollForUpdates, 3000);
        return () => clearInterval(interval);
    }, [isLatestVersion, chatId, artifactId, isAuthenticated]);

    useEffect(() => {
        if (artifact) {
            const versionText = isLatestVersion ? 'Latest' : `v${versionToRender?.version}`;
            document.title = `${artifact.title} (${versionText}) - Artifact Preview`;
        } else {
            document.title = 'Artifact Preview';
        }
    }, [artifact, versionToRender, isLatestVersion]);

    if (isPasswordLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="flex items-center gap-3">
                    <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-lg text-gray-600">
                        {isPasswordLoading ? 'Checking authentication...' : 'Waiting for authentication...'}
                    </span>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="flex items-center gap-3">
                    <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-lg text-gray-600">Loading artifact...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 text-6xl mb-4">⚠️</div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Error</h1>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={() => window.close()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Close Window
                    </button>
                </div>
            </div>
        );
    }

    if (!artifact || !versionToRender) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="text-gray-400 text-6xl mb-4">📄</div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">No Artifact</h1>
                    <p className="text-gray-600">The requested artifact could not be found.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <div className="h-screen">
                {artifact.type === 'text/html' ? (
                    <iframe
                        srcDoc={versionToRender.content || '<p>Loading...</p>'}
                        className="w-full h-full border-0"
                        sandbox="allow-scripts allow-same-origin"
                        title={artifact.title}
                    />
                ) : artifact.type === 'application/vnd.ant.react' ? (
                    <ReactPreview componentCode={versionToRender.content} />
                ) : null}
            </div>
        </div>
    );
};

export default ArtifactPreviewPage;
