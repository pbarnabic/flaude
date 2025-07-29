
import React from 'react';
import { Users } from 'lucide-react';
import UsernameSelector from '../UsernameSelector/UsernameSelector.jsx';
import ModalHeader from '../ModalHeader/ModalHeader.jsx';

const UserSelectionMode = ({
                               existingUsers,
                               selectedUser,
                               setSelectedUser,
                               setShowDeleteConfirm,
                               isSubmitting,
                               setMode,
                               onGuestLogin
                           }) => {
    return (
        <>
            <ModalHeader
                icon={<Users className="w-8 h-8 text-white" />}
                title="Select User"
                subtitle="Choose your account or create a new one"
            />

            <UsernameSelector
                existingUsers={existingUsers}
                selectedUser={selectedUser}
                setSelectedUser={setSelectedUser}
                setMode={setMode}
                setShowDeleteConfirm={setShowDeleteConfirm}
                isSubmitting={isSubmitting}
                onGuestLogin={onGuestLogin}
            />
        </>
    );
};

export default UserSelectionMode;
