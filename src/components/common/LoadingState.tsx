import React from 'react';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 gap-4">
      <div className="spinner spinner-md text-blue-600" />
      <span className="text-foreground-3">{message}</span>
    </div>
  );
};
