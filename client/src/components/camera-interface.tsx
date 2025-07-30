import { useState, useRef } from "react";
import { useCamera } from "@/hooks/use-camera";
import { Button } from "@/components/ui/button";
import { Camera, Upload, CloudUpload } from "lucide-react";

interface CameraInterfaceProps {
  onPhotoCapture: (imageData: string) => void;
  isVerifying: boolean;
}

export default function CameraInterface({ onPhotoCapture, isVerifying }: CameraInterfaceProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    videoRef,
    canvasRef,
    isStreaming,
    hasPermission,
    error,
    startCamera,
    capturePhoto,
    stopCamera
  } = useCamera();

  const handleCapture = () => {
    const imageData = capturePhoto();
    if (imageData) {
      setCapturedImage(imageData);
      onPhotoCapture(imageData);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        setCapturedImage(imageData);
        onPhotoCapture(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    if (hasPermission) {
      startCamera();
    }
  };

  return (
    <div className="text-center">
      {capturedImage ? (
        <div className="space-y-4">
          <img 
            src={capturedImage} 
            alt="Captured" 
            className="w-full h-64 object-cover rounded-lg mx-auto"
          />
          <Button
            onClick={handleRetake}
            variant="outline"
            className="w-full"
            disabled={isVerifying}
          >
            Retake Photo
          </Button>
        </div>
      ) : isStreaming ? (
        <div className="relative">
          <video
            ref={videoRef}
            className="w-full h-64 object-cover rounded-lg"
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            className="hidden"
          />
          
          <div className="mt-4">
            <Button
              onClick={handleCapture}
              className="w-full bg-brand-green text-white font-medium py-3 px-6 rounded-xl shadow-md opacity-100"
              disabled={isVerifying}
            >
              Capture Photo
            </Button>
          </div>
        </div>
      ) : (
        <div className="w-full">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => {
              console.log('Take Photo clicked, hasPermission:', hasPermission);
              if (hasPermission) {
                startCamera();
              } else {
                fileInputRef.current?.click();
              }
            }}
            className="w-full bg-green-600 text-white font-medium py-4 px-6 rounded-xl shadow-lg"
            disabled={isVerifying}
          >
            Take Photo
          </button>
          {error && (
            <p className="text-sm text-red-600 text-center mt-2">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
