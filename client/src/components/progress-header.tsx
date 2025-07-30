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
              className="hover:bg-gray-100 transition-colors rounded-lg p-1.5 cursor-pointer"
            >
              <img 
                src="/src/gauntlet.png" 
                alt="Gauntlet Logo" 
                className="w-8 h-8 object-contain"
              />
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
