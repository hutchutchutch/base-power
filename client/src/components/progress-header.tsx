import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface ProgressHeaderProps {
  currentStep: number;
  totalSteps: number;
  progress: number;
  showBackButton: boolean;
  onBackClick?: () => void;
}

export default function ProgressHeader({ 
  currentStep, 
  totalSteps, 
  progress, 
  showBackButton, 
  onBackClick 
}: ProgressHeaderProps) {
  const [, setLocation] = useLocation();
  return (
    <header className="bg-white shadow-sm p-4 sticky top-0 z-50">
      <div className="mobile-container">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBackClick}
                className="text-brand-gray hover:text-gray-800 p-2"
              >
                <ArrowLeft size={20} />
              </Button>
            )}
            <button 
              onClick={() => setLocation('/admin')}
              className="bg-gray-200 hover:bg-gray-300 transition-colors rounded-lg px-3 py-1.5 cursor-pointer"
            >
              <span className="text-gray-600 font-medium text-sm">BASE</span>
            </button>
          </div>
          <div className="text-sm text-brand-gray">
            <span>{currentStep} of {totalSteps}</span>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div 
              className="bg-brand-green h-1 rounded-full progress-bar" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    </header>
  );
}
