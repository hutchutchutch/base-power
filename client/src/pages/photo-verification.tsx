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
    title: "🍿 Discover the Source of Snackery",
    description: "Riddle: 'Where hunger meets its match and cravings find their cure, this sacred space holds treasures sweet and salty, that's for sure. With shelves that gleam and options vast, from chips to bars divine - what place provides the fuel we need to keep our spirits fine?'",
    expectedObject: "snack area or kitchen",
    tips: [
      "Look for the office kitchen, pantry, or snack area",
      "Find where snacks and treats are stored",
      "Capture the snack shelves, vending machine, or pantry",
      "Show the area where office snacks are kept"
    ]
  },
  {
    title: "💪 Find Where Calories Meet Their Doom",
    description: "Riddle: 'When guilt from snacking weighs you down and energy seeks release, this space awaits with tools and weights to bring your mind some peace. With mats and bands and iron strong, where sweat becomes your friend - what room transforms the office warrior from beginning to the end?'",
    expectedObject: "gym or exercise area",
    tips: [
      "Search for the office gym, fitness room, or exercise area",
      "Look for workout equipment, yoga mats, or fitness space",
      "Capture weights, exercise bikes, or any fitness equipment",
      "Find where office wellness activities happen"
    ]
  },
  {
    title: "🚀 Seek the Chamber of Destiny",
    description: "Riddle: 'In this hallowed hall where futures are made, where spirits are lifted or hopes can fade. With seats arranged for judgment's call, where presentations rise or fall - what room decides if you ascend or if your dreams are at an end?'",
    expectedObject: "conference room or meeting room",
    tips: [
      "Find the main conference room or boardroom",
      "Look for the room where important meetings happen",
      "Capture the space with presentation setup or meeting table",
      "Show where big decisions and presentations are made"
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
        
        <main className="mobile-container py-6 pb-20">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-6">
              <img 
                src="/src/gauntlet.png" 
                alt="Gauntlet Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Gauntlet Hunt</h1>
            <p className="text-brand-gray">Discover the secrets of Gauntlet HQ</p>
          </div>

          <Card className="mb-6 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
            <CardContent className="pt-6">
              <ul className="space-y-2 text-sm text-brand-gray">
                <li className="flex items-center">
                  <span className="text-purple-500 mr-3">🔍</span>
                  Sharp detective skills to solve riddles
                </li>
                <li className="flex items-center">
                  <span className="text-purple-500 mr-3">📱</span>
                  Camera access to capture evidence
                </li>
                <li className="flex items-center">
                  <span className="text-purple-500 mr-3">💡</span>
                  Creative thinking for hidden clues
                </li>
              </ul>
            </CardContent>
          </Card>

        </main>
        
        {/* Fixed CTA Button for Mobile */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 border-t border-gray-200 shadow-lg z-50 fixed-cta">
          <div className="mobile-container pt-4 pb-6">
            <Button 
              onClick={handleNextStep}
              className="typeform-button typeform-button-primary bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 w-full py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              🚀 Begin the Hunt
            </Button>
          </div>
        </div>
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
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="pt-6">
              <div className="flex items-center mb-3">
                <span className="text-amber-600 mr-2 text-lg">💡</span>
                <h3 className="font-semibold text-gray-900">Detective Hints</h3>
              </div>
              <ul className="space-y-2">
                {task.tips.map((tip, index) => (
                  <li key={index} className="flex items-start text-sm text-brand-gray">
                    <span className="text-amber-600 mr-2 mt-0.5">🔸</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* 3. Camera/Upload Interface */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4 text-center">📸 Capture Your Evidence</h3>
            <CameraInterface 
              onPhotoCapture={handlePhotoCapture}
              isVerifying={verificationState === 'verifying'}
            />
          </div>

          {/* 4. Verify Photo Button */}
          {capturedImage && verificationState === 'idle' && (
            <Button 
              onClick={handleVerifyPhoto}
              className="typeform-button typeform-button-primary"
            >
              Verify Photo
            </Button>
          )}

          {/* 5. Verification Results */}
          {verificationState === 'success' && (
            <div className="verification-success bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
              <div className="flex items-center">
                <span className="text-green-500 text-xl mr-3">🎉</span>
                <div>
                  <p className="font-medium text-green-800">Treasure Found!</p>
                  <p className="text-sm text-green-600">Excellent detective work! You've discovered one of the Gauntlet HQ artifacts.</p>
                </div>
              </div>
            </div>
          )}

          {verificationState === 'error' && (
            <div className="verification-error bg-gradient-to-r from-red-50 to-pink-50 border border-red-200">
              <div className="flex items-center">
                <span className="text-red-500 text-xl mr-3">🕵️</span>
                <div>
                  <p className="font-medium text-red-800">The Mystery Continues...</p>
                  <p className="text-sm text-red-600">
                    {verificationResult?.errorMessage || `The artifact remains hidden. Review the riddle and search again for the ${task.expectedObject}.`}
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
          <h2 className="text-2xl font-bold text-gray-900 mb-3">🏆 Gauntlet Hunt Complete!</h2>
          <p className="text-brand-gray mb-8">Congratulations, Agent! You've successfully completed the Gauntlet Hunt and mastered all three mystical locations of Gauntlet HQ.</p>
          
          <Card className="mb-6 bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">🗂️ Your Discovered Artifacts:</h3>
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
            className="typeform-button typeform-button-primary bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            🔄 New Adventure
          </Button>
        </div>
      </main>
    </div>
  );
}
