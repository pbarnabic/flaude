// Image viewer modal
import {X} from "lucide-react";
import React from "react";

const ViewImageModal = ({image, isOpen, onClose}) => {
    if (!isOpen || !image) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    className="absolute -top-2 -right-2 w-8 h-8 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center shadow-lg z-10"
                >
                    <X className="w-5 h-5"/>
                </button>

                <img
                    src={image.dataURL}
                    alt={`Image ${image.index}`}
                    className="max-w-full max-h-full rounded-lg shadow-2xl"
                />

                <div
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-lg">
                    <p className="text-white font-medium">Image {image.index}</p>
                    <p className="text-white/80 text-sm">{image.mediaType}</p>
                </div>
            </div>
        </div>
    );
};

export default ViewImageModal;
