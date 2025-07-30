import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ProgressHeader from "@/components/progress-header";
import CameraInterface from "@/components/camera-interface";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, CheckCircle, AlertTriangle, Upload, Info, Building } from "lucide-react";
import { useLocation } from "wouter";

interface UserSession {
  id: string;
  invitationId: string;
  currentStep: number;
  completedSteps: string[];
  isCompleted: boolean;
}

interface PhotoAttempt {
  id: string;
  sessionId: string;
  stepId: string;
  attemptNumber: number;
  verificationResult: boolean;
  errorMessage?: string;
}

interface Survey {
  id: string;
  title: string;
  description: string;
  utilityCompany: string;
}

interface SurveyStep {
  id: string;
  stepOrder: number;
  title: string;
  description: string;
  expectedObject: string;
  tips: string[];
  isRequired: boolean;
}

interface SurveyInvitation {
  id: string;
  userEmail: string;
  invitationToken: string;
  isCompleted: boolean;
}

interface SurveyData {
  survey: Survey;
  steps: SurveyStep[];
  invitation: SurveyInvitation;
}

interface VerificationResult {
  isCorrectObject: boolean;
  confidence: number;
  detectedObjects: string[];
  errorMessage?: string;
}

interface SurveyVerificationProps {
  token: string;
}

export default function SurveyVerification({ token }: SurveyVerificationProps) {
  const [, setLocation] = useLocation();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [verificationState, setVerificationState] = useState<'idle' | 'capturing' | 'verifying' | 'success' | 'error'>('idle');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const { toast } = useToast();

  const maxAttempts = 2;

  // Fetch survey data
  const { data: surveyData, isLoading: surveyLoading, error: surveyError } = useQuery<SurveyData>({
    queryKey: [`/api/survey/${token}`],
    enabled: !!token
  });

  // Get session data
  const { data: session } = useQuery<UserSession>({
    queryKey: [`/api/sessions/${sessionId}`],
    enabled: !!sessionId
  });

  // Start session mutation
  const startSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/survey/${token}/session`, {});
      return response.json();
    },
    onSuccess: (data: UserSession) => {
      setSessionId(data.id);
      setIsStarted(true);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start survey session",
        variant: "destructive"
      });
    }
  });

  // Verify photo mutation
  const verifyPhotoMutation = useMutation({
    mutationFn: async ({ imageData, expectedObject, stepId }: { imageData: string, expectedObject: string, stepId: string }) => {
      if (!sessionId) throw new Error("No session ID");
      
      const formData = new FormData();
      formData.append('stepId', stepId);
      formData.append('attemptNumber', String(attemptCount + 1));
      formData.append('expectedObject', expectedObject);
      formData.append('imageData', imageData);

      const response = await fetch(`/api/sessions/${sessionId}/verify`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setAttemptCount(prev => prev + 1);
      setVerificationResult(data.verification);
      
      if (data.verification.isCorrectObject) {
        setVerificationState('success');
        setTimeout(() => {
          moveToNextStep();
        }, 2000);
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

  // Update session mutation
  const updateSessionMutation = useMutation({
    mutationFn: async (updates: Partial<UserSession>) => {
      if (!sessionId) throw new Error("No session ID");
      const response = await apiRequest('PATCH', `/api/sessions/${sessionId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sessions/${sessionId}`] });
    }
  });

  const currentStep = surveyData?.steps[currentStepIndex];
  const totalSteps = surveyData?.steps.length || 0;
  const progressValue = isStarted ? Math.round((currentStepIndex / Math.max(totalSteps, 1)) * 100) : 0;

  const handlePhotoCapture = (imageData: string) => {
    if (!currentStep) return;
    
    setCapturedImage(imageData);
    setVerificationState('verifying');
    setVerificationResult(null);
    
    verifyPhotoMutation.mutate({
      imageData,
      expectedObject: currentStep.expectedObject,
      stepId: currentStep.id
    });
  };

  const moveToNextStep = () => {
    if (!surveyData || !sessionId) return;

    const nextStepIndex = currentStepIndex + 1;
    
    if (nextStepIndex >= surveyData.steps.length) {
      // Survey completed
      updateSessionMutation.mutate({
        isCompleted: true
      });
      setVerificationState('idle');
      toast({
        title: "Survey Complete!",
        description: "Thank you for completing the survey.",
      });
      return;
    }

    // Move to next step
    setCurrentStepIndex(nextStepIndex);
    updateSessionMutation.mutate({
      currentStep: nextStepIndex,
      completedSteps: [...(session?.completedSteps || []), currentStep?.id || '']
    });
    
    // Reset state for next step
    setAttemptCount(0);
    setVerificationState('idle');
    setVerificationResult(null);
    setCapturedImage(null);
  };

  const handleRetry = () => {
    setVerificationState('idle');
    setVerificationResult(null);
    setCapturedImage(null);
  };

  const handleUsePhotoAnyway = () => {
    moveToNextStep();
  };

  // Handle survey loading and errors
  if (surveyLoading) {
    return (
      <div className="min-h-screen bg-bg-light flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-brand-green border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading survey...</p>
        </div>
      </div>
    );
  }

  if (surveyError || !surveyData) {
    return (
      <div className="min-h-screen bg-bg-light flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Survey Not Found</h2>
            <p className="text-gray-600">
              The survey link you're trying to access is invalid or has expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Welcome screen
  if (!isStarted) {
    return (
      <div className="min-h-screen bg-bg-light">
        <ProgressHeader 
          currentStep={0} 
          totalSteps={totalSteps + 1} 
          progress={0}
          showBackButton={false}
        />
        
        <div className="px-4 py-6 max-w-md mx-auto">
          <Card className="mb-6">
            <CardContent className="pt-6 text-center">
              <Building className="w-12 h-12 text-brand-green mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">{surveyData.survey.title}</h1>
              <p className="text-gray-600 mb-4">{surveyData.survey.description}</p>
              <Badge variant="outline" className="mb-4">
                {surveyData.survey.utilityCompany}
              </Badge>
              <p className="text-sm text-gray-500 mb-6">
                We'll guide you through {totalSteps} photo verification steps. 
                Make sure you have good lighting and the requested items nearby.
              </p>
              <Button 
                onClick={() => startSessionMutation.mutate()}
                disabled={startSessionMutation.isPending}
                className="w-full bg-brand-green text-white"
              >
                {startSessionMutation.isPending ? 'Starting...' : 'Start Survey'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Survey completion screen
  if (session?.isCompleted) {
    return (
      <div className="min-h-screen bg-bg-light">
        <ProgressHeader 
          currentStep={totalSteps + 1} 
          totalSteps={totalSteps + 1} 
          progress={100}
          showBackButton={false}
        />
        
        <div className="px-4 py-6 max-w-md mx-auto">
          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Survey Complete!</h1>
              <p className="text-gray-600 mb-6">
                Thank you for completing the {surveyData.survey.title} survey. 
                Your responses have been recorded.
              </p>
              <Badge variant="default" className="mb-4">
                Submitted to {surveyData.survey.utilityCompany}
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main verification interface
  if (!currentStep) return null;

  return (
    <div className="min-h-screen bg-bg-light">
      <ProgressHeader 
        currentStep={currentStepIndex + 1} 
        totalSteps={totalSteps} 
        progress={progressValue}
        showBackButton={false}
      />
      
      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Step Description */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-700 leading-relaxed">{currentStep.description}</p>
          </CardContent>
        </Card>

        {/* Tips */}
        {currentStep.tips.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-brand-green mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Tips for better results:</h3>
                  <ul className="space-y-1">
                    {currentStep.tips.map((tip, index) => (
                      <li key={index} className="text-sm text-gray-600">• {tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Camera Interface */}
        <Card>
          <CardContent className="pt-6">
            <CameraInterface 
              onPhotoCapture={handlePhotoCapture}
              isVerifying={verificationState === 'verifying'}
            />
          </CardContent>
        </Card>

        {/* Verification Result */}
        {verificationState === 'success' && verificationResult && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <h3 className="font-medium text-green-900">Photo verified!</h3>
                  <p className="text-sm text-green-700">
                    We found {verificationResult.detectedObjects.join(', ')} in your photo.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {verificationState === 'error' && verificationResult && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <div className="flex-1">
                  <h3 className="font-medium text-red-900">Photo needs improvement</h3>
                  <p className="text-sm text-red-700 mb-4">
                    {verificationResult.errorMessage || `We couldn't clearly identify ${currentStep.expectedObject} in your photo.`}
                  </p>
                  
                  <div className="flex space-x-2">
                    {attemptCount < maxAttempts ? (
                      <Button size="sm" onClick={handleRetry} variant="outline">
                        Try Again ({maxAttempts - attemptCount} attempts left)
                      </Button>
                    ) : (
                      <Button size="sm" onClick={handleUsePhotoAnyway} variant="outline">
                        Use Photo Anyway
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {verificationState === 'verifying' && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <p className="text-blue-900 font-medium">Verifying photo...</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}