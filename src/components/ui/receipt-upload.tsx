import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, Eye, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReceiptUploadProps {
  /** Current receipt URL (for existing receipts) */
  existingUrl?: string | null;
  /** Called when a new file is selected */
  onFileSelect: (file: File | null) => void;
  /** Label text */
  label?: string;
  /** Whether receipt is required */
  required?: boolean;
  /** Optional class name */
  className?: string;
  /** Accepted file types */
  accept?: string;
  /** Whether the component is disabled */
  disabled?: boolean;
}

export function ReceiptUpload({
  existingUrl,
  onFileSelect,
  label = 'Comprobante de pago',
  required = false,
  className,
  accept = '.jpg,.jpeg,.png,.pdf',
  disabled = false,
}: ReceiptUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    onFileSelect(file);

    if (file) {
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setPreviewUrl(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviewUrl(null);
      }
    } else {
      setPreviewUrl(null);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const hasExistingReceipt = !!existingUrl;
  const hasNewFile = !!selectedFile;

  // Determine the file extension for display
  const getFileExtension = (url: string) => {
    const ext = url.split('.').pop()?.toLowerCase() || '';
    return ext;
  };

  const isImageFile = (url: string) => {
    const ext = getFileExtension(url);
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Display current state */}
      <div className="space-y-2">
        {/* Existing receipt (when no new file selected) */}
        {hasExistingReceipt && !hasNewFile && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border">
            <div className="flex-1 flex items-center gap-2 min-w-0">
              {isImageFile(existingUrl!) ? (
                <img
                  src={existingUrl!}
                  alt="Comprobante"
                  className="w-10 h-10 object-cover rounded"
                />
              ) : (
                <div className="w-10 h-10 flex items-center justify-center bg-muted rounded">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <span className="text-sm text-muted-foreground truncate flex-1">
                Comprobante guardado
              </span>
            </div>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => window.open(existingUrl!, '_blank')}
                disabled={disabled}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary"
                onClick={handleClick}
                disabled={disabled}
              >
                <Upload className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* New file selected */}
        {hasNewFile && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/20">
            <div className="flex-1 flex items-center gap-2 min-w-0">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Vista previa"
                  className="w-10 h-10 object-cover rounded"
                />
              ) : (
                <div className="w-10 h-10 flex items-center justify-center bg-muted rounded">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <span className="text-sm font-medium truncate flex-1">
                {selectedFile?.name}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={handleClearFile}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* No file - upload button */}
        {!hasExistingReceipt && !hasNewFile && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleClick}
            disabled={disabled}
          >
            <Upload className="mr-2 h-4 w-4" />
            Subir comprobante
          </Button>
        )}

        {/* Replace button when existing but want to upload new */}
        {hasExistingReceipt && !hasNewFile && (
          <p className="text-xs text-muted-foreground">
            Haga clic en <Upload className="inline h-3 w-3" /> para reemplazar el comprobante existente
          </p>
        )}
      </div>
    </div>
  );
}
