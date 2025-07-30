import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ProgressHeader from "@/components/progress-header";
import CameraInterface from "@/components/camera-interface";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, CheckCircle, AlertTriangle, Upload, Info } from "lucide-react";

interface PhotoTask {
  title: string;
  description: string;
  expectedObject: string;
  exampleImage?: string;
  tips: string[];
}

interface PhotoSession {
  id: string;
  currentStep: number;
  completedSteps: string[];
}

interface VerificationResult {
  isCorrectObject: boolean;
  confidence: number;
  detectedObjects: string[];
  errorMessage?: string;
}

const photoTasks: PhotoTask[] = [
  {
    title: "Take a photo of your smartphone",
    description: "Position your phone clearly in the frame. Make sure the entire device is visible and well-lit.",
    expectedObject: "smartphone",
    tips: [
      "Use another device or camera to take the photo",
      "Place phone on a flat surface",
      "Ensure good lighting",
      "Show the entire device"
    ]
  },
  {
    title: "Take a photo of your keys",
    description: "Place your keys on a flat surface with good lighting. Ensure all keys are visible.",
    expectedObject: "keys",
    tips: [
      "Lay keys flat on a surface",
      "Separate keys so they're all visible",
      "Use natural light if possible",
      "Include keychain if attached"
    ]
  },
  {
    title: "Take a photo of a water bottle",
    description: "Hold or place a water bottle where it's clearly visible and well-lit.",
    expectedObject: "water bottle",
    tips: [
      "Show the full bottle including cap",
      "Place on neutral background",
      "Ensure label is readable",
      "Avoid glare or reflections"
    ]
  },
  {
    title: "Take a photo of your wallet",
    description: "Place your wallet on a flat surface. Make sure it's the main object in the frame.",
    expectedObject: "wallet",
    tips: [
      "Show wallet closed",
      "Place on flat surface",
      "Center in frame",
      "Good lighting without shadows"
    ]
  }
];

export default function PhotoVerification() {
  const [currentStep, setCurrentStep] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [capturedPhotos, setCapturedPhotos] = useState<Array<{task: string, imageData: string}>>([]);
  const [verificationState, setVerificationState] = useState<'idle' | 'capturing' | 'verifying' | 'success' | 'error'>('idle');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const { toast } = useToast();

  const maxAttempts = 2;
  const totalSteps = photoTasks.length + 2; // welcome + tasks + completion

  // Create session on component mount
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/sessions', {
        currentStep: 0,
        completedSteps: []
      });
      return response.json();
    },
    onSuccess: (data: PhotoSession) => {
      setSessionId(data.id);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start photo verification session",
        variant: "destructive"
      });
    }
  });

  // Verify photo mutation
  const verifyPhotoMutation = useMutation({
    mutationFn: async ({ imageData, expectedObject }: { imageData: string, expectedObject: string }) => {
      if (!sessionId) throw new Error("No session ID");
      
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      formData.append('stepIndex', String(currentStep - 1));
      formData.append('attemptNumber', String(attemptCount + 1));
      formData.append('expectedObject', expectedObject);
      formData.append('imageData', imageData);

      const response = await fetch(`/api/sessions/${sessionId}/verify`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: (data) => {
      setAttemptCount(prev => prev + 1);
      setVerificationResult(data.verification);
      
      if (data.verification.isCorrectObject) {
        setVerificationState('success');
        const taskIndex = currentStep - 1;
        setCapturedPhotos(prev => [...prev, {
          task: photoTasks[taskIndex].title,
          imageData: data.imageData
        }]);
      } else {
        setVerificationState('error');
      }
    },
    onError: (error) => {
      setVerificationState('error');
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify photo",
        variant: "destructive"
      });
    }
  });

  useEffect(() => {
    createSessionMutation.mutate();
  }, []);

  const handlePhotoCapture = (imageData: string) => {
    if (currentStep === 0 || currentStep > photoTasks.length) return;
    
    setCapturedImage(imageData);
    setVerificationState('capturing');
  };

  const handleVerifyPhoto = () => {
    if (!capturedImage || currentStep === 0 || currentStep > photoTasks.length) return;
    
    setVerificationState('verifying');
    const taskIndex = currentStep - 1;
    const expectedObject = photoTasks[taskIndex].expectedObject;
    
    verifyPhotoMutation.mutate({ imageData: capturedImage, expectedObject });
  };

  const handleNextStep = () => {
    setCurrentStep(prev => prev + 1);
    setAttemptCount(0);
    setVerificationState('idle');
    setVerificationResult(null);
    setCapturedImage(null);
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setAttemptCount(0);
      setVerificationState('idle');
      setVerificationResult(null);
      setCapturedImage(null);
    }
  };

  const handleRetry = () => {
    setVerificationState('idle');
    setVerificationResult(null);
    setCapturedImage(null);
  };

  const handleUseAnyway = () => {
    setVerificationState('success');
    const taskIndex = currentStep - 1;
    setCapturedPhotos(prev => [...prev, {
      task: photoTasks[taskIndex].title,
      imageData: capturedImage || '' // use captured image even if verification failed
    }]);
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setAttemptCount(0);
    setCapturedPhotos([]);
    setVerificationState('idle');
    setVerificationResult(null);
    setCapturedImage(null);
    createSessionMutation.mutate();
  };

  // Welcome Step
  if (currentStep === 0) {
    return (
      <div className="min-h-screen bg-bg-light">
        <ProgressHeader 
          currentStep={currentStep + 1}
          totalSteps={totalSteps}
          progress={(currentStep / (totalSteps - 1)) * 100}
          showBackButton={false}
        />
        
        <main className="mobile-container py-6 pb-24">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-brand-green rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="text-white text-2xl" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Photo Verification</h1>
            <p className="text-brand-gray">We'll guide you through taking photos of specific objects for verification.</p>
          </div>

          <Card className="mb-6">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-gray-900 mb-3">What you'll need:</h3>
              <ul className="space-y-2 text-sm text-brand-gray">
                <li className="flex items-center">
                  <CheckCircle className="text-brand-green mr-3" size={16} />
                  Camera access on your device
                </li>
                <li className="flex items-center">
                  <CheckCircle className="text-brand-green mr-3" size={16} />
                  Good lighting for clear photos
                </li>
                <li className="flex items-center">
                  <CheckCircle className="text-brand-green mr-3" size={16} />
                  The objects we'll ask you to photograph
                </li>
              </ul>
            </CardContent>
          </Card>

          <Button 
            onClick={handleNextStep}
            className="typeform-button typeform-button-primary"
          >
            Get Started
          </Button>
        </main>
      </div>
    );
  }

  // Photo Capture Steps
  if (currentStep <= photoTasks.length) {
    const taskIndex = currentStep - 1;
    const task = photoTasks[taskIndex];

    return (
      <div className="min-h-screen bg-bg-light">
        <ProgressHeader 
          currentStep={currentStep + 1}
          totalSteps={totalSteps}
          progress={(currentStep / (totalSteps - 1)) * 100}
          showBackButton={true}
          onBackClick={handlePreviousStep}
        />
        
        <main className="mobile-container py-6 pb-24 space-y-6">
          {/* 1. Title & Description */}
          <div className="text-center">
            <span className="text-sm text-brand-gray font-medium">Step {currentStep}</span>
            <h2 className="text-2xl font-bold text-gray-900 mt-1 mb-3">{task.title}</h2>
            <p className="text-brand-gray">{task.description}</p>
          </div>

          {/* 2. Example Image Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center mb-3">
                <Info className="text-brand-green mr-2" size={16} />
                <h3 className="font-semibold text-gray-900">Photo Tips</h3>
              </div>
              <ul className="space-y-2">
                {task.tips.map((tip, index) => (
                  <li key={index} className="flex items-start text-sm text-brand-gray">
                    <span className="text-brand-green mr-2 mt-0.5">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* 3. Camera/Upload Interface */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4 text-center">Take or Upload Photo</h3>
            <CameraInterface 
              onPhotoCapture={handlePhotoCapture}
              isVerifying={verificationState === 'verifying'}
            />
          </div>

          {/* 4. Verify Photo Button */}
          {verificationState === 'capturing' && capturedImage && (
            <Button 
              onClick={handleVerifyPhoto}
              className="typeform-button typeform-button-primary"
              disabled={verificationState === 'verifying'}
            >
              {verificationState === 'verifying' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Verifying Photo...
                </>
              ) : (
                'Verify Photo'
              )}
            </Button>
          )}

          {/* 5. Verification Results */}
          {verificationState === 'success' && (
            <div className="verification-success">
              <div className="flex items-center">
                <CheckCircle className="text-green-500 text-xl mr-3" />
                <div>
                  <p className="font-medium text-green-800">Photo verified successfully!</p>
                  <p className="text-sm text-green-600">We detected the correct object in your photo.</p>
                </div>
              </div>
            </div>
          )}

          {verificationState === 'error' && (
            <div className="verification-error">
              <div className="flex items-center">
                <AlertTriangle className="text-red-500 text-xl mr-3" />
                <div>
                  <p className="font-medium text-red-800">Photo verification failed</p>
                  <p className="text-sm text-red-600">
                    {verificationResult?.errorMessage || `We couldn't detect a ${task.expectedObject} in your photo. Please try again.`}
                  </p>
                </div>
              </div>
              {attemptCount < maxAttempts && (
                <div className="text-center text-sm text-brand-gray mt-4">
                  Attempt {attemptCount} of {maxAttempts}
                </div>
              )}
            </div>
          )}

          {/* 6. Action Buttons */}
          <div className="space-y-3">
            {verificationState === 'success' && (
              <Button 
                onClick={handleNextStep}
                className="typeform-button typeform-button-primary"
              >
                Continue
              </Button>
            )}
            
            {verificationState === 'error' && attemptCount < maxAttempts && (
              <Button 
                onClick={handleRetry}
                className="typeform-button typeform-button-secondary"
              >
                Try Again
              </Button>
            )}
            
            {verificationState === 'error' && attemptCount >= maxAttempts && (
              <Button 
                onClick={handleUseAnyway}
                className="typeform-button typeform-button-destructive"
              >
                Use Photo Anyway
              </Button>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Completion Step
  return (
    <div className="min-h-screen bg-bg-light">
      <ProgressHeader 
        currentStep={totalSteps}
        totalSteps={totalSteps}
        progress={100}
        showBackButton={false}
      />
      
      <main className="mobile-container py-6 pb-24">
        <div className="text-center">
          <div className="w-20 h-20 bg-brand-green rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-white text-3xl" size={48} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">All photos captured!</h2>
          <p className="text-brand-gray mb-8">Thank you for completing the photo verification process.</p>
          
          <Card className="mb-6">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Photos captured:</h3>
              <div className="grid grid-cols-2 gap-3">
                {capturedPhotos.map((photo, index) => (
                  <div key={index} className="bg-gray-100 rounded-lg p-3 text-center">
                    <div className="w-full aspect-square bg-gray-200 rounded mb-2 overflow-hidden">
                      {photo.imageData ? (
                        <img src={photo.imageData} alt={photo.task} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Camera className="text-gray-400" size={24} />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 font-medium">
                      {photo.task.split(' ').slice(-1)[0]}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button 
            onClick={handleRestart}
            className="typeform-button typeform-button-primary"
          >
            Start Over
          </Button>
        </div>
      </main>
    </div>
  );
}
