import React from 'react';

interface LoadingOverlayProps {
  message?: string;
  visible: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = 'Loading...',
  visible,
}) => {
  if (!visible) {
    return null;
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-black/50 z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="spinner spinner-lg text-blue-600" />
        <span className="text-foreground-2">{message}</span>
      </div>
    </div>
  );
};
