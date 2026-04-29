import React, { useCallback, useState } from 'react';
import { Upload, X, File, Image, FileText } from 'lucide-react';
import clsx from 'clsx';
import { formatFileSize } from '../../utils/formatters';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  maxSize?: number; // in bytes
  multiple?: boolean;
  className?: string;
  disabled?: boolean;
  label?: string;
}

const getFileIcon = (mimetype: string) => {
  if (mimetype.startsWith('image/')) return <Image size={16} className="text-blue-500" />;
  if (mimetype === 'application/pdf') return <FileText size={16} className="text-red-500" />;
  return <File size={16} className="text-gray-500" />;
};

export const FileUpload: React.FC<FileUploadProps> = ({
  onFilesSelected,
  accept,
  maxSize = 10 * 1024 * 1024, // 10MB default
  multiple = false,
  className,
  disabled = false,
  label = 'Glissez des fichiers ici ou cliquez pour parcourir',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const newFiles: File[] = [];
      const newErrors: string[] = [];

      Array.from(files).forEach((file) => {
        if (file.size > maxSize) {
          newErrors.push(`${file.name}: Fichier trop volumineux (max ${formatFileSize(maxSize)})`);
        } else {
          newFiles.push(file);
        }
      });

      if (newFiles.length > 0) {
        const updated = multiple ? [...selectedFiles, ...newFiles] : newFiles;
        setSelectedFiles(updated);
        onFilesSelected(updated);
      }
      setErrors(newErrors);
    },
    [maxSize, multiple, onFilesSelected, selectedFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (!disabled) handleFiles(e.dataTransfer.files);
    },
    [disabled, handleFiles]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const removeFile = (index: number) => {
    const updated = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updated);
    onFilesSelected(updated);
  };

  return (
    <div className={clsx('space-y-3', className)}>
      <label
        className={clsx(
          'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-colors',
          isDragging
            ? 'border-secondary bg-blue-50'
            : 'border-banking-border hover:border-secondary hover:bg-gray-50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <Upload size={24} className="text-banking-muted" />
        <span className="text-sm text-banking-muted text-center">{label}</span>
        <span className="text-xs text-gray-400">
          Taille max: {formatFileSize(maxSize)}
        </span>
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          disabled={disabled}
          className="hidden"
        />
      </label>

      {errors.map((error, i) => (
        <p key={i} className="text-xs text-red-600">{error}</p>
      ))}

      {selectedFiles.length > 0 && (
        <ul className="space-y-2">
          {selectedFiles.map((file, index) => (
            <li
              key={index}
              className="flex items-center gap-3 rounded-lg border border-banking-border bg-gray-50 px-3 py-2"
            >
              {getFileIcon(file.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-banking-text truncate">{file.name}</p>
                <p className="text-xs text-banking-muted">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="text-gray-400 hover:text-red-600 transition-colors"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
