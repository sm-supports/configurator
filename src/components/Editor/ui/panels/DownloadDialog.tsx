import React, { useState } from 'react';
import { X, Download, FileText, Image, File } from 'lucide-react';

export interface DownloadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: (format: 'png' | 'jpeg' | 'pdf' | 'eps' | 'tiff') => void;
  isDownloading: boolean;
  templateName: string;
}

export const DownloadDialog: React.FC<DownloadDialogProps> = ({
  isOpen,
  onClose,
  onDownload,
  isDownloading,
  templateName,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'png' | 'jpeg' | 'pdf' | 'eps' | 'tiff'>('png');

  if (!isOpen) return null;

  const formats = [
    {
      value: 'png' as const,
      label: 'PNG',
      description: 'High quality with transparency support',
      icon: Image,
      recommended: true,
    },
    {
      value: 'jpeg' as const,
      label: 'JPEG',
      description: 'Good quality, smaller file size',
      icon: Image,
      recommended: false,
    },
    {
      value: 'pdf' as const,
      label: 'PDF',
      description: 'Print-ready document format',
      icon: FileText,
      recommended: true,
    },
    {
      value: 'eps' as const,
      label: 'EPS',
      description: 'Vector format for professional printing',
      icon: File,
      recommended: false,
    },
    {
      value: 'tiff' as const,
      label: 'TIFF',
      description: 'Uncompressed high quality',
      icon: File,
      recommended: false,
    },
  ];

  const handleDownload = () => {
    onDownload(selectedFormat);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Download Design</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isDownloading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-3">
            Choose a format for your <span className="font-medium">{templateName}</span> design:
          </p>
          
          <div className="space-y-2">
            {formats.map((format) => (
              <label key={format.value} className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value={format.value}
                  checked={selectedFormat === format.value}
                  onChange={(e) => setSelectedFormat(e.target.value as 'png' | 'jpeg' | 'pdf' | 'eps' | 'tiff')}
                  className="mt-1 text-blue-600 focus:ring-blue-500"
                  disabled={isDownloading}
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <format.icon className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-900">{format.label}</span>
                    {format.recommended && (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{format.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
          <p className="text-sm text-blue-800">
            <strong>High Quality Export:</strong> All formats are exported at 600 DPI for 
            professional printing quality.
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            disabled={isDownloading}
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
          >
            {isDownloading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download {formats.find(f => f.value === selectedFormat)?.label}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DownloadDialog;