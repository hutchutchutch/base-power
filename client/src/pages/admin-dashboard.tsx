import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Settings, Users, FileText, Link, Copy } from "lucide-react";
import { useLocation } from "wouter";

interface AdminUser {
  id: string;
  email: string;
  name: string;
}

interface Survey {
  id: string;
  title: string;
  description: string;
  utilityCompany: string;
  isActive: boolean;
  createdAt: string;
}

interface SurveyStep {
  id: string;
  surveyId: string;
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
  createdAt: string;
  invitationLink?: string;
}

interface AdminDashboardProps {
  admin: AdminUser;
  onLogout: () => void;
}

export default function AdminDashboard({ admin, onLogout }: AdminDashboardProps) {
  const [, setLocation] = useLocation();
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [showCreateSurvey, setShowCreateSurvey] = useState(false);
  const [showCreateStep, setShowCreateStep] = useState(false);
  const [showInviteUser, setShowInviteUser] = useState(false);
  const { toast } = useToast();

  // Form states
  const [surveyTitle, setSurveyTitle] = useState("");
  const [surveyDescription, setSurveyDescription] = useState("");
  const [utilityCompany, setUtilityCompany] = useState("");
  
  const [stepTitle, setStepTitle] = useState("");
  const [stepDescription, setStepDescription] = useState("");
  const [expectedObject, setExpectedObject] = useState("");
  const [tips, setTips] = useState("");
  
  const [userEmail, setUserEmail] = useState("");

  // Fetch surveys
  const { data: surveys = [], isLoading: surveysLoading } = useQuery({
    queryKey: [`/api/admin/${admin.id}/surveys`],
    enabled: !!admin.id
  });

  // Fetch survey steps
  const { data: surveySteps = [] } = useQuery({
    queryKey: [`/api/surveys/${selectedSurvey?.id}/steps`],
    enabled: !!selectedSurvey?.id
  });

  // Fetch survey invitations
  const { data: surveyInvitations = [] } = useQuery({
    queryKey: [`/api/admin/surveys/${selectedSurvey?.id}/invitations`],
    enabled: !!selectedSurvey?.id
  });

  // Create survey mutation
  const createSurveyMutation = useMutation({
    mutationFn: async (surveyData: { title: string; description: string; utilityCompany: string; adminId: string }) => {
      const response = await apiRequest('POST', '/api/admin/surveys', surveyData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/${admin.id}/surveys`] });
      setShowCreateSurvey(false);
      setSurveyTitle("");
      setSurveyDescription("");
      setUtilityCompany("");
      toast({ title: "Success", description: "Survey created successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create survey",
        variant: "destructive"
      });
    }
  });

  // Create survey step mutation
  const createStepMutation = useMutation({
    mutationFn: async (stepData: any) => {
      const response = await apiRequest('POST', `/api/admin/surveys/${selectedSurvey!.id}/steps`, stepData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/surveys/${selectedSurvey?.id}/steps`] });
      setShowCreateStep(false);
      setStepTitle("");
      setStepDescription("");
      setExpectedObject("");
      setTips("");
      toast({ title: "Success", description: "Survey step created successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create step",
        variant: "destructive"
      });
    }
  });

  // Create invitation mutation
  const createInvitationMutation = useMutation({
    mutationFn: async (invitationData: { userEmail: string }) => {
      const response = await apiRequest('POST', `/api/admin/surveys/${selectedSurvey!.id}/invitations`, invitationData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/surveys/${selectedSurvey?.id}/invitations`] });
      setShowInviteUser(false);
      setUserEmail("");
      toast({ title: "Success", description: "Invitation created successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invitation",
        variant: "destructive"
      });
    }
  });

  const handleCreateSurvey = (e: React.FormEvent) => {
    e.preventDefault();
    createSurveyMutation.mutate({
      title: surveyTitle,
      description: surveyDescription,
      utilityCompany,
      adminId: admin.id
    });
  };

  const handleCreateStep = (e: React.FormEvent) => {
    e.preventDefault();
    const tipsArray = tips.split('\n').filter(tip => tip.trim() !== '');
    const nextStepOrder = surveySteps ? Math.max(...surveySteps.map((s: SurveyStep) => s.stepOrder)) + 1 : 1;
    
    createStepMutation.mutate({
      stepOrder: nextStepOrder,
      title: stepTitle,
      description: stepDescription,
      expectedObject,
      tips: tipsArray,
      isRequired: true
    });
  };

  const handleCreateInvitation = (e: React.FormEvent) => {
    e.preventDefault();
    createInvitationMutation.mutate({ userEmail });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Link copied to clipboard" });
  };

  return (
    <div className="min-h-screen bg-bg-light">
      {/* Header */}
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Settings className="text-brand-green" size={24} />
            <h1 className="text-xl font-bold">Survey Admin Panel</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Welcome, {admin.name}</span>
            <Button variant="outline" onClick={onLogout}>Logout</Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Surveys List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg">Your Surveys</CardTitle>
                <Button
                  size="sm"
                  onClick={() => setLocation("/admin/create-survey")}
                  className="bg-brand-green text-white"
                >
                  <Plus size={16} className="mr-1" />
                  Create Survey
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {surveysLoading ? (
                  <p>Loading surveys...</p>
                ) : surveys?.length === 0 ? (
                  <p className="text-gray-500 text-sm">No surveys created yet</p>
                ) : (
                  surveys?.map((survey: Survey) => (
                    <div
                      key={survey.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedSurvey?.id === survey.id
                          ? 'border-brand-green bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedSurvey(survey)}
                    >
                      <h3 className="font-medium">{survey.title}</h3>
                      <p className="text-sm text-gray-600">{survey.utilityCompany}</p>
                      <Badge variant={survey.isActive ? "default" : "secondary"} className="mt-1">
                        {survey.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Survey Details */}
          <div className="lg:col-span-2">
            {selectedSurvey ? (
              <div className="space-y-6">
                {/* Survey Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedSurvey.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-2">{selectedSurvey.description}</p>
                    <p className="text-sm text-gray-500">Company: {selectedSurvey.utilityCompany}</p>
                  </CardContent>
                </Card>

                {/* Survey Steps */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg">Survey Steps</CardTitle>
                    <Button
                      size="sm"
                      onClick={() => setShowCreateStep(true)}
                      className="bg-brand-green text-white"
                    >
                      <Plus size={16} className="mr-1" />
                      Add Step
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {surveySteps?.length === 0 ? (
                      <p className="text-gray-500 text-sm">No steps created yet</p>
                    ) : (
                      surveySteps?.map((step: SurveyStep) => (
                        <div key={step.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">Step {step.stepOrder}: {step.title}</h4>
                            <Badge variant="outline">{step.expectedObject}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                          <div className="text-xs text-gray-500">
                            Tips: {step.tips.join(', ')}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Survey Invitations */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg">User Invitations</CardTitle>
                    <Button
                      size="sm"
                      onClick={() => setShowInviteUser(true)}
                      className="bg-brand-green text-white"
                      disabled={!surveySteps || surveySteps.length === 0}
                    >
                      <Users size={16} className="mr-1" />
                      Invite User
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {surveyInvitations?.length === 0 ? (
                      <p className="text-gray-500 text-sm">No invitations sent yet</p>
                    ) : (
                      surveyInvitations?.map((invitation: SurveyInvitation) => (
                        <div key={invitation.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{invitation.userEmail}</span>
                            <Badge variant={invitation.isCompleted ? "default" : "secondary"}>
                              {invitation.isCompleted ? "Completed" : "Pending"}
                            </Badge>
                          </div>
                          {invitation.invitationLink && (
                            <div className="flex items-center space-x-2">
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1 truncate">
                                {invitation.invitationLink}
                              </code>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(invitation.invitationLink!)}
                              >
                                <Copy size={14} />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-gray-500">
                  <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>Select a survey to view details and manage steps</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreateSurvey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create New Survey</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateSurvey} className="space-y-4">
                <div>
                  <Label htmlFor="title">Survey Title</Label>
                  <Input
                    id="title"
                    value={surveyTitle}
                    onChange={(e) => setSurveyTitle(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={surveyDescription}
                    onChange={(e) => setSurveyDescription(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="company">Utility Company</Label>
                  <Input
                    id="company"
                    value={utilityCompany}
                    onChange={(e) => setUtilityCompany(e.target.value)}
                    required
                  />
                </div>
                <div className="flex space-x-2">
                  <Button type="submit" disabled={createSurveyMutation.isPending}>
                    Create Survey
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowCreateSurvey(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {showCreateStep && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add Survey Step</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateStep} className="space-y-4">
                <div>
                  <Label htmlFor="stepTitle">Step Title</Label>
                  <Input
                    id="stepTitle"
                    value={stepTitle}
                    onChange={(e) => setStepTitle(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="stepDescription">Description</Label>
                  <Textarea
                    id="stepDescription"
                    value={stepDescription}
                    onChange={(e) => setStepDescription(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="expectedObject">Expected Object</Label>
                  <Input
                    id="expectedObject"
                    value={expectedObject}
                    onChange={(e) => setExpectedObject(e.target.value)}
                    placeholder="e.g., water meter, electrical panel"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="tips">Tips (one per line)</Label>
                  <Textarea
                    id="tips"
                    value={tips}
                    onChange={(e) => setTips(e.target.value)}
                    placeholder="Ensure good lighting&#10;Show the full object&#10;Avoid shadows"
                    rows={3}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button type="submit" disabled={createStepMutation.isPending}>
                    Add Step
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowCreateStep(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {showInviteUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Invite User to Survey</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateInvitation} className="space-y-4">
                <div>
                  <Label htmlFor="userEmail">User Email</Label>
                  <Input
                    id="userEmail"
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="flex space-x-2">
                  <Button type="submit" disabled={createInvitationMutation.isPending}>
                    Send Invitation
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowInviteUser(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Floating Action Button for Quick Add */}
      <button
        onClick={() => setShowCreateSurvey(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 z-50 flex items-center justify-center border-0 cursor-pointer"
        type="button"
      >
        <Plus size={24} strokeWidth={2} />
      </button>
    </div>
  );
}