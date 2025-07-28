import React, {useState} from "react";
import {Check, Edit3, Eye, User, X} from "lucide-react";
import {ImageUtils} from "../../Utils/ImageUtils.js";

const UserTextMessage = ({message, onEditSubmit, isLoading, onViewImage}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');

    const handleStartEdit = () => {
        let textContent = '';
        if (typeof message.content === 'string') {
            textContent = message.content;
        } else if (Array.isArray(message.content)) {
            const textPart = message.content.find(part => part.type === 'text');
            textContent = textPart ? textPart.text : '';
        }

        setIsEditing(true);
        setEditContent(textContent);
    };

    const handleSaveEdit = () => {
        if (editContent.trim()) {
            onEditSubmit(message.id, editContent.trim());
            setIsEditing(false);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditContent('');
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSaveEdit();
        }
        if (e.key === 'Escape') {
            handleCancelEdit();
        }
    };

    const getTextContent = (content) => {
        if (typeof content === 'string') return content;
        if (Array.isArray(content)) {
            const textPart = content.find(part => part.type === 'text');
            return textPart ? textPart.text : '';
        }
        return '';
    };

    const getImageContent = (content) => {
        if (Array.isArray(content)) {
            return content.filter(part => part.type === 'image');
        }
        return [];
    };

    const textContent = getTextContent(message.content);
    const imageContent = getImageContent(message.content);

    if (isEditing) {
        return (
            <div className="flex gap-2 sm:gap-3 justify-end group" style={{width: '100%'}}>
                <div style={{flex: '1 1 0', minWidth: 0}}>
                    <div className="rounded-2xl bg-white border-2 border-blue-300 shadow-sm">
                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onKeyDown={handleKeyPress}
                            className="w-full px-3 py-3 rounded-2xl resize-none text-sm sm:text-base text-slate-800 focus:outline-none"
                            rows="3"
                            autoFocus
                            disabled={isLoading}
                            style={{width: '100%'}}
                        />
                        <div className="flex gap-2 p-3 pt-0 flex-wrap">
                            <button
                                onClick={handleSaveEdit}
                                disabled={isLoading || !editContent.trim()}
                                className="flex items-center gap-1 px-3 py-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg text-sm transition-colors"
                            >
                                <Check className="w-4 h-4"/>
                                Save
                            </button>
                            <button
                                onClick={handleCancelEdit}
                                disabled={isLoading}
                                className="flex items-center gap-1 px-3 py-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white rounded-lg text-sm transition-colors"
                            >
                                <X className="w-4 h-4"/>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
                <div style={{flexShrink: 0}}>
                    <div
                        className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center shadow-md">
                        <User className="w-5 h-5 text-white"/>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex gap-2 sm:gap-3 justify-end group" style={{width: '100%'}}>
            <div style={{flex: '1 1 0', minWidth: 0}}>
                <div className="flex flex-col items-end gap-1">
                    {imageContent.length > 0 && (
                        <div className="max-w-xs sm:max-w-sm">
                            <div className="grid gap-1" style={{
                                gridTemplateColumns: imageContent.length === 1 ? '1fr' :
                                    imageContent.length === 2 ? 'repeat(2, 1fr)' :
                                        imageContent.length === 3 ? 'repeat(2, 1fr)' :
                                            'repeat(2, 1fr)'
                            }}>
                                {imageContent.map((image, index) => {
                                    const dataURL = ImageUtils.createDataURL(image.source.data, image.source.media_type);
                                    return (
                                        <div
                                            key={index}
                                            className={`relative group rounded-xl overflow-hidden bg-white/20 border border-white/30 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${
                                                imageContent.length === 3 && index === 2 ? 'col-span-2' : ''
                                            }`}
                                            style={{
                                                aspectRatio: imageContent.length === 1 ? 'auto' : '4/3',
                                                maxHeight: imageContent.length === 1 ? '300px' : '150px'
                                            }}
                                        >
                                            <img
                                                src={dataURL}
                                                alt={`Image ${index + 1}`}
                                                className="w-full h-full object-cover"
                                                onClick={() => onViewImage?.({
                                                    dataURL,
                                                    mediaType: image.source.media_type,
                                                    index: index + 1
                                                })}
                                            />
                                            <button
                                                onClick={() => onViewImage?.({
                                                    dataURL,
                                                    mediaType: image.source.media_type,
                                                    index: index + 1
                                                })}
                                                className="absolute inset-0 bg-black/0 hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                                                title="View full image"
                                            >
                                                <div className="bg-white/90 hover:bg-white p-2 rounded-full shadow-md">
                                                    <Eye className="w-5 h-5 text-slate-700"/>
                                                </div>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {textContent && (
                        <div
                            className="rounded-2xl px-3 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg relative max-w-xs sm:max-w-sm"
                            style={{wordBreak: 'break-word', overflowWrap: 'anywhere'}}>
                            <p className="whitespace-pre-wrap text-sm sm:text-base">{textContent}</p>

                            <button
                                onClick={handleStartEdit}
                                disabled={isLoading}
                                className="absolute -left-6 sm:-left-8 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white hover:bg-gray-100 disabled:bg-gray-200 rounded-full shadow-md text-gray-600"
                                title="Edit message"
                            >
                                <Edit3 className="w-3 h-3 sm:w-4 sm:h-4"/>
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <div style={{flexShrink: 0}}>
                <div
                    className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center shadow-md">
                    <User className="w-5 h-5 text-white"/>
                </div>
            </div>
        </div>
    );
};

export default UserTextMessage;
