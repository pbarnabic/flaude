// ImageDropZone.jsx - Converts files directly to API format
import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { ImageUtils } from '../../Utils/ImageUtils.js';

const ImageDropZone = ({ onImagesAdded, children, className = "", showUploadButton = true }) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Only set dragOver to false if we're leaving the main container
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsDragOver(false);
        }
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        await handleFiles(files);
    };

    const handleFileInput = async (e) => {
        const files = Array.from(e.target.files);
        await handleFiles(files);

        // Reset input
        e.target.value = '';
    };

    const handleFiles = async (files) => {
        // Filter for valid images only
        const imageFiles = files.filter(ImageUtils.isValidImage);

        if (imageFiles.length > 0) {
            // Pass files directly - parent will process them
            onImagesAdded(imageFiles);
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div
            className={`relative ${className}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {children}

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileInput}
                className="hidden"
            />

            {/* Upload button for manual selection - only show if enabled */}
            {showUploadButton && (
                <button
                    onClick={handleUploadClick}
                    className="p-2 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Upload images"
                >
                    <ImageIcon className="w-5 h-5" />
                </button>
            )}

            {/* Drag overlay */}
            {isDragOver && (
                <div className="absolute inset-0 bg-purple-500/10 border-2 border-dashed border-purple-500 rounded-xl flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="text-center">
                        <Upload className="w-12 h-12 text-purple-600 mx-auto mb-2" />
                        <p className="text-purple-700 font-medium">Drop images here</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageDropZone;
