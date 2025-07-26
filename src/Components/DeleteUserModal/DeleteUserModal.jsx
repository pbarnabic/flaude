import React from 'react';
import {Trash2} from 'lucide-react';

const DeleteUserModal = ({username, onDelete, onCancel, isSubmitting}) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
                <div className="text-center">
                    <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <Trash2 className="w-6 h-6 text-red-600"/>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Delete User
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Are you sure you want to delete <strong>{username}</strong>?
                        This will permanently delete all their chats and data.
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => onDelete(username)}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Deleting...' : 'Delete'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteUserModal;
