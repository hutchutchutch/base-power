import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSessionSchema, 
  insertPhotoAttemptSchema, 
  insertSurveySchema,
  insertSurveyStepSchema,
  insertSurveyInvitationSchema,
  insertAdminUserSchema
} from "@shared/schema";
import { verifyPhotoObject } from "./services/openai";
import multer from "multer";
import crypto from "crypto";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB limit
    fieldSize: 10 * 1024 * 1024 // 10MB field size limit for base64 images
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // ========== ADMIN ROUTES ==========
  
  // Admin login
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const admin = await storage.getAdminUserByEmail(email);
      
      if (!admin || admin.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Simple session - in production use proper JWT or session management
      res.json({ id: admin.id, email: admin.email, name: admin.name });
    } catch (error) {
      res.status(500).json({ message: "Login failed", error: (error as Error).message });
    }
  });

  // Create admin user
  app.post("/api/admin/register", async (req, res) => {
    try {
      const adminData = insertAdminUserSchema.parse(req.body);
      const admin = await storage.createAdminUser(adminData);
      res.json({ id: admin.id, email: admin.email, name: admin.name });
    } catch (error) {
      res.status(400).json({ message: "Registration failed", error: (error as Error).message });
    }
  });

  // Create survey
  app.post("/api/admin/surveys", async (req, res) => {
    try {
      const surveyData = insertSurveySchema.parse(req.body);
      const survey = await storage.createSurvey(surveyData);
      res.json(survey);
    } catch (error) {
      res.status(400).json({ message: "Failed to create survey", error: (error as Error).message });
    }
  });

  // Get surveys for admin
  app.get("/api/admin/:adminId/surveys", async (req, res) => {
    try {
      const surveys = await storage.getSurveysByAdmin(req.params.adminId);
      res.json(surveys);
    } catch (error) {
      res.status(500).json({ message: "Failed to get surveys", error: (error as Error).message });
    }
  });

  // Create survey step
  app.post("/api/admin/surveys/:surveyId/steps", async (req, res) => {
    try {
      const stepData = insertSurveyStepSchema.parse({
        ...req.body,
        surveyId: req.params.surveyId
      });
      const step = await storage.createSurveyStep(stepData);
      res.json(step);
    } catch (error) {
      res.status(400).json({ message: "Failed to create step", error: (error as Error).message });
    }
  });

  // Get survey steps
  app.get("/api/surveys/:surveyId/steps", async (req, res) => {
    try {
      const steps = await storage.getSurveySteps(req.params.surveyId);
      res.json(steps);
    } catch (error) {
      res.status(500).json({ message: "Failed to get steps", error: (error as Error).message });
    }
  });

  // Create survey invitation
  app.post("/api/admin/surveys/:surveyId/invitations", async (req, res) => {
    try {
      const { userEmail } = req.body;
      const invitationToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

      const invitationData = insertSurveyInvitationSchema.parse({
        surveyId: req.params.surveyId,
        userEmail,
        invitationToken,
        expiresAt
      });

      const invitation = await storage.createSurveyInvitation(invitationData);
      
      // Return the invitation link
      const invitationLink = `${req.protocol}://${req.get('host')}/survey/${invitationToken}`;
      res.json({ ...invitation, invitationLink });
    } catch (error) {
      res.status(400).json({ message: "Failed to create invitation", error: (error as Error).message });
    }
  });

  // Get survey invitations
  app.get("/api/admin/surveys/:surveyId/invitations", async (req, res) => {
    try {
      const invitations = await storage.getSurveyInvitations(req.params.surveyId);
      res.json(invitations);
    } catch (error) {
      res.status(500).json({ message: "Failed to get invitations", error: (error as Error).message });
    }
  });

  // ========== USER SURVEY ROUTES ==========

  // Get survey by invitation token
  app.get("/api/survey/:token", async (req, res) => {
    try {
      const invitation = await storage.getSurveyInvitation(req.params.token);
      if (!invitation) {
        return res.status(404).json({ message: "Survey not found" });
      }

      if (new Date() > invitation.expiresAt) {
        return res.status(410).json({ message: "Survey invitation has expired" });
      }

      const survey = await storage.getSurvey(invitation.surveyId);
      const steps = await storage.getSurveySteps(invitation.surveyId);

      res.json({ survey, steps, invitation });
    } catch (error) {
      res.status(500).json({ message: "Failed to get survey", error: (error as Error).message });
    }
  });

  // Start user session
  app.post("/api/survey/:token/session", async (req, res) => {
    try {
      const invitation = await storage.getSurveyInvitation(req.params.token);
      if (!invitation) {
        return res.status(404).json({ message: "Survey not found" });
      }

      const sessionData = insertUserSessionSchema.parse({
        invitationId: invitation.id,
        currentStep: 0,
        completedSteps: []
      });

      const session = await storage.createUserSession(sessionData);
      res.json(session);
    } catch (error) {
      res.status(400).json({ message: "Failed to create session", error: (error as Error).message });
    }
  });

  // Get user session
  app.get("/api/sessions/:id", async (req, res) => {
    try {
      const session = await storage.getUserSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to get session", error: (error as Error).message });
    }
  });

  // Update user session
  app.patch("/api/sessions/:id", async (req, res) => {
    try {
      const updates = req.body;
      const session = await storage.updateUserSession(req.params.id, updates);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to update session", error: (error as Error).message });
    }
  });

  // Verify a photo
  app.post("/api/sessions/:id/verify", upload.single('photo'), async (req, res) => {
    try {
      const { stepId, attemptNumber, expectedObject } = req.body;
      
      if (!req.file && !req.body.imageData) {
        return res.status(400).json({ message: "No image provided" });
      }

      let base64Image: string;
      
      if (req.file) {
        const base64 = req.file.buffer.toString('base64');
        base64Image = `data:${req.file.mimetype};base64,${base64}`;
      } else {
        base64Image = req.body.imageData;
      }

      // Verify the photo using OpenAI Vision API
      const verificationResult = await verifyPhotoObject(base64Image, expectedObject);

      // Store the attempt
      const attemptData = insertPhotoAttemptSchema.parse({
        sessionId: req.params.id,
        stepId,
        attemptNumber: parseInt(attemptNumber),
        imageData: base64Image,
        verificationResult: verificationResult.isCorrectObject,
        errorMessage: verificationResult.errorMessage
      });

      const attempt = await storage.createPhotoAttempt(attemptData);

      res.json({
        ...attempt,
        verification: verificationResult
      });
    } catch (error) {
      console.error("Photo verification error:", error);
      res.status(500).json({ message: "Failed to verify photo", error: (error as Error).message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
