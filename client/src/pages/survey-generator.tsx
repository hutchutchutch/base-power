import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Plus, Trash2, Upload, Eye } from "lucide-react";
import { useLocation } from "wouter";

interface SurveyStep {
  id?: string;
  stepOrder: number;
  title: string;
  description: string;
  expectedObject: string;
  tips: string[];
  validationRules: string;
  exampleImageUrl?: string;
  isRequired: boolean;
}

interface SurveyData {
  title: string;
  description: string;
  utilityCompany: string;
  steps: SurveyStep[];
}

export default function SurveyGenerator() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [surveyData, setSurveyData] = useState<SurveyData>({
    title: "",
    description: "",
    utilityCompany: "",
    steps: []
  });
  
  const [currentStep, setCurrentStep] = useState<SurveyStep>({
    stepOrder: 1,
    title: "",
    description: "",
    expectedObject: "",
    tips: [""],
    validationRules: "",
    isRequired: true
  });
  
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [showStepEditor, setShowStepEditor] = useState(false);

  // Create survey mutation
  const createSurveyMutation = useMutation({
    mutationFn: async (data: SurveyData) => {
      return await apiRequest("/api/admin/surveys", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Survey Created",
        description: "Your survey has been successfully created and can now be used for invitations.",
      });
      setLocation("/admin");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create survey. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleAddTip = () => {
    setCurrentStep(prev => ({
      ...prev,
      tips: [...prev.tips, ""]
    }));
  };

  const handleRemoveTip = (index: number) => {
    setCurrentStep(prev => ({
      ...prev,
      tips: prev.tips.filter((_, i) => i !== index)
    }));
  };

  const handleTipChange = (index: number, value: string) => {
    setCurrentStep(prev => ({
      ...prev,
      tips: prev.tips.map((tip, i) => i === index ? value : tip)
    }));
  };

  const handleSaveStep = () => {
    const stepToSave = {
      ...currentStep,
      tips: currentStep.tips.filter(tip => tip.trim() !== "")
    };

    if (editingStepIndex !== null) {
      setSurveyData(prev => ({
        ...prev,
        steps: prev.steps.map((step, index) => 
          index === editingStepIndex ? stepToSave : step
        )
      }));
    } else {
      setSurveyData(prev => ({
        ...prev,
        steps: [...prev.steps, stepToSave]
      }));
    }

    resetStepEditor();
  };

  const resetStepEditor = () => {
    setCurrentStep({
      stepOrder: surveyData.steps.length + 1,
      title: "",
      description: "",
      expectedObject: "",
      tips: [""],
      validationRules: "",
      isRequired: true
    });
    setEditingStepIndex(null);
    setShowStepEditor(false);
  };

  const handleEditStep = (index: number) => {
    setCurrentStep(surveyData.steps[index]);
    setEditingStepIndex(index);
    setShowStepEditor(true);
  };

  const handleDeleteStep = (index: number) => {
    setSurveyData(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
        .map((step, i) => ({ ...step, stepOrder: i + 1 }))
    }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        setCurrentStep(prev => ({
          ...prev,
          exampleImageUrl: imageData
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const canSaveSurvey = surveyData.title && surveyData.utilityCompany && surveyData.steps.length > 0;

  return (
    <div className="min-h-screen bg-bg-light">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="outline" 
            onClick={() => setLocation("/admin")}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to Admin
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Survey</h1>
        </div>

        {/* Survey Basic Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Survey Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Survey Title *</Label>
              <Input
                id="title"
                value={surveyData.title}
                onChange={(e) => setSurveyData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Office Equipment Verification Survey"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={surveyData.description}
                onChange={(e) => setSurveyData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of what this survey accomplishes..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="company">Utility Company *</Label>
              <Input
                id="company"
                value={surveyData.utilityCompany}
                onChange={(e) => setSurveyData(prev => ({ ...prev, utilityCompany: e.target.value }))}
                placeholder="e.g., Pacific Gas & Electric"
              />
            </div>
          </CardContent>
        </Card>

        {/* Survey Steps */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Survey Steps ({surveyData.steps.length})</CardTitle>
            <Button 
              onClick={() => setShowStepEditor(true)}
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              Add Step
            </Button>
          </CardHeader>
          <CardContent>
            {surveyData.steps.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No steps added yet. Click "Add Step" to create your first survey step.
              </p>
            ) : (
              <div className="space-y-4">
                {surveyData.steps.map((step, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">Step {step.stepOrder}</Badge>
                          {step.isRequired && <Badge variant="secondary">Required</Badge>}
                        </div>
                        <h4 className="font-semibold text-lg">{step.title}</h4>
                        <p className="text-gray-600 mb-2">{step.description}</p>
                        <p className="text-sm text-gray-500 mb-2">
                          <strong>Expected Object:</strong> {step.expectedObject}
                        </p>
                        <div className="text-sm text-gray-500 mb-2">
                          <strong>Tips:</strong> {step.tips.join(", ")}
                        </div>
                        <div className="text-sm text-gray-500">
                          <strong>Validation Rules:</strong> {step.validationRules.substring(0, 100)}
                          {step.validationRules.length > 100 && "..."}
                        </div>
                        {step.exampleImageUrl && (
                          <div className="mt-2">
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Eye size={12} />
                              Example Image Provided
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditStep(index)}
                        >
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteStep(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step Editor Modal */}
        {showStepEditor && (
          <Card className="mb-6 border-2 border-primary">
            <CardHeader>
              <CardTitle>
                {editingStepIndex !== null ? "Edit Step" : "Add New Step"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="step-title">Step Title *</Label>
                  <Input
                    id="step-title"
                    value={currentStep.title}
                    onChange={(e) => setCurrentStep(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Locate the Main Server Room"
                  />
                </div>
                <div>
                  <Label htmlFor="expected-object">Expected Object *</Label>
                  <Input
                    id="expected-object"
                    value={currentStep.expectedObject}
                    onChange={(e) => setCurrentStep(prev => ({ ...prev, expectedObject: e.target.value }))}
                    placeholder="e.g., server rack, computer equipment"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="step-description">Step Description *</Label>
                <Textarea
                  id="step-description"
                  value={currentStep.description}
                  onChange={(e) => setCurrentStep(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what the user needs to find and photograph..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Tips for Users</Label>
                {currentStep.tips.map((tip, index) => (
                  <div key={index} className="flex gap-2 mt-2">
                    <Input
                      value={tip}
                      onChange={(e) => handleTipChange(index, e.target.value)}
                      placeholder="Enter a helpful tip..."
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleRemoveTip(index)}
                      disabled={currentStep.tips.length === 1}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAddTip}
                  className="mt-2"
                >
                  <Plus size={14} className="mr-1" />
                  Add Tip
                </Button>
              </div>

              <div>
                <Label htmlFor="validation-rules">AI Validation Rules *</Label>
                <Textarea
                  id="validation-rules"
                  value={currentStep.validationRules}
                  onChange={(e) => setCurrentStep(prev => ({ ...prev, validationRules: e.target.value }))}
                  placeholder="Detailed instructions for the AI to validate the image. For example: 'Look for server racks with blinking LED lights, network cables, and cooling systems. The image should show industrial computing equipment in a clean, organized environment.'"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="example-image">Example Image (Optional)</Label>
                <div className="mt-2">
                  <input
                    id="example-image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button 
                    variant="outline"
                    onClick={() => document.getElementById('example-image')?.click()}
                    className="flex items-center gap-2"
                  >
                    <Upload size={16} />
                    Upload Example Image
                  </Button>
                  {currentStep.exampleImageUrl && (
                    <div className="mt-4">
                      <img 
                        src={currentStep.exampleImageUrl} 
                        alt="Example" 
                        className="w-48 h-32 object-cover rounded border"
                      />
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={resetStepEditor}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveStep}
                  disabled={!currentStep.title || !currentStep.description || !currentStep.expectedObject || !currentStep.validationRules}
                >
                  {editingStepIndex !== null ? "Update Step" : "Add Step"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Save Survey */}
        <div className="flex justify-end gap-4">
          <Button 
            variant="outline" 
            onClick={() => setLocation("/admin")}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => createSurveyMutation.mutate(surveyData)}
            disabled={!canSaveSurvey || createSurveyMutation.isPending}
          >
            {createSurveyMutation.isPending ? "Creating Survey..." : "Create Survey"}
          </Button>
        </div>
      </div>
    </div>
  );
}