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
    <div className="bg-white rounded-xl p-4 mb-6 border border-gray-200">
      <div className="relative">
        {/* Camera Preview or Captured Image */}
        <div className="camera-preview">
          {capturedImage ? (
            <img 
              src={capturedImage} 
              alt="Captured" 
              className="w-full h-full object-cover rounded-lg"
            />
          ) : isStreaming ? (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover rounded-lg"
                playsInline
                muted
              />
              <canvas
                ref={canvasRef}
                className="hidden"
              />
              
              {/* Camera Controls */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <Button
                  onClick={handleCapture}
                  className="capture-button"
                  disabled={isVerifying}
                >
                  <div className="capture-button-inner"></div>
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center">
              <Camera className="text-gray-400 text-4xl mb-3 mx-auto" size={64} />
            </div>
          )}
        </div>

        {/* File Upload Alternative */}
        {!isStreaming && !capturedImage && (
          <div className="file-upload-area mt-4">
            <CloudUpload className="text-gray-400 text-3xl mb-3 mx-auto" size={48} />
            <p className="text-gray-600 mb-2">Choose file or enable camera access</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="link"
              onClick={() => fileInputRef.current?.click()}
              className="text-brand-green font-medium hover:underline"
            >
              Select Photo
            </Button>
            <p className="text-xs text-gray-500 mt-2">Size limit: 10MB</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-4 space-y-2">
        {!hasPermission && !capturedImage && (
          <Button
            onClick={startCamera}
            className="w-full bg-brand-green text-white font-medium py-3 px-6 rounded-xl hover:bg-green-600 transition-colors"
            disabled={isVerifying}
          >
            <Camera className="mr-2" size={20} />
            Enable Camera
          </Button>
        )}

        {capturedImage && (
          <Button
            onClick={handleRetake}
            variant="outline"
            className="w-full"
            disabled={isVerifying}
          >
            Retake Photo
          </Button>
        )}

        {error && (
          <p className="text-sm text-red-600 text-center mt-2">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
