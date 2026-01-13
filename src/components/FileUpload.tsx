import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';

interface FileUploadProps {
  onFileSelect: (content: string, fileName: string) => void;
  accept?: string;
  disabled?: boolean;
}

export function FileUpload({
  onFileSelect,
  accept = '.txt,.text',
  disabled = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readFile(file);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      readFile(file);
    }
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setFileName(file.name);
      onFileSelect(content, file.name);
    };
    reader.readAsText(file, 'UTF-8');
  };

  return (
    <div
      className={`file-upload ${isDragging ? 'dragging' : ''}`}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      <div className="file-upload-icon">
        {fileName ? '✅' : '📁'}
      </div>

      {fileName ? (
        <>
          <p className="file-upload-text">{fileName}</p>
          <p className="file-upload-hint">다른 파일을 선택하려면 클릭하세요</p>
        </>
      ) : (
        <>
          <p className="file-upload-text">
            대화 기록 파일을 업로드하세요
          </p>
          <p className="file-upload-hint">
            txt 파일을 드래그하거나 클릭하여 선택
            <br />
            카카오톡, 라인, 텔레그램 내보내기 파일 지원
          </p>
        </>
      )}
    </div>
  );
}
