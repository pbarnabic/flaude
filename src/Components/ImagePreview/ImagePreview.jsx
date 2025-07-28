import React from 'react';
import {Eye, X} from 'lucide-react';
import {ImageUtils} from '../../Utils/ImageUtils.js';

const ImagePreview = ({images, onRemoveImage, onViewImage, className = ""}) => {
    if (!images || images.length === 0) return null;

    return (
        <div className={`flex flex-wrap gap-2 ${className}`}>
            {images.map((image, index) => {
                const imageKey = `img_${index}`;
                const dataURL = ImageUtils.createDataURL(image.source.data, image.source.media_type);

                return (
                    <div key={imageKey} className="relative group">
                        <div
                            className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shadow-sm">
                            <img
                                src={dataURL}
                                alt={`Image ${index + 1}`}
                                className="w-full h-full object-cover"
                            />
                        </div>

                        {/* Remove button */}
                        {onRemoveImage && (
                            <button
                                onClick={() => onRemoveImage(index)}
                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                title="Remove image"
                            >
                                <X className="w-3 h-3"/>
                            </button>
                        )}

                        {/* View button */}
                        {onViewImage && (
                            <button
                                onClick={() => onViewImage({
                                    dataURL,
                                    mediaType: image.source.media_type,
                                    index: index + 1
                                })}
                                className="absolute bottom-0 right-0 w-5 h-5 bg-slate-700 hover:bg-slate-800 text-white rounded-tl-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                title="View full image"
                            >
                                <Eye className="w-3 h-3"/>
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default ImagePreview;
