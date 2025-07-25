import React from 'react';
import {BrowserRouter as Router, Navigate, Route, Routes} from 'react-router-dom';
import ChatPage from "./Pages/ChatPage.jsx";
import ArtifactPreviewPage from "./Pages/ArtifactPreviewPage.jsx";
import PasswordModal from './Components/PasswordModal/PasswordModal.jsx';
import {ChatsProvider} from './Contexts/ChatsContext.jsx';
import {PasswordProvider, usePassword} from './Contexts/PasswordContext.jsx';

const AuthenticatedApp = () => {
    const {isAuthenticated} = usePassword();
    return (
        <>
            <PasswordModal/>
            {isAuthenticated && (
                <ChatsProvider>
                    <Routes>
                        {/* Redirect root to new chat */}
                        <Route path="/" element={<Navigate to="/chat" replace/>}/>

                        {/* Handle /chat (will create new chat) */}
                        <Route path="/chat" element={<ChatPage/>}/>

                        {/* Handle specific chat routes */}
                        <Route path="/chats/:chatId" element={<ChatPage/>}/>

                        {/* Handle artifact preview routes */}
                        <Route path="/preview/:chatId" element={<ArtifactPreviewPage/>}/>

                        {/* Fallback route */}
                        <Route path="*" element={<Navigate to="/chat" replace/>}/>
                    </Routes>
                </ChatsProvider>
            )}
        </>
    );
};

const App = () => {
    return (
        <Router>
            <PasswordProvider>
                <AuthenticatedApp/>
            </PasswordProvider>
        </Router>
    );
};

export default App;
