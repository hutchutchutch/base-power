import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPhotoSessionSchema, insertPhotoAttemptSchema } from "@shared/schema";
import { verifyPhotoObject } from "./services/openai";
import multer from "multer";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Create a new photo verification session
  app.post("/api/sessions", async (req, res) => {
    try {
      const sessionData = insertPhotoSessionSchema.parse(req.body);
      const session = await storage.createPhotoSession(sessionData);
      res.json(session);
    } catch (error) {
      res.status(400).json({ message: "Invalid session data", error: (error as Error).message });
    }
  });

  // Get session details
  app.get("/api/sessions/:id", async (req, res) => {
    try {
      const session = await storage.getPhotoSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to get session", error: (error as Error).message });
    }
  });

  // Update session progress
  app.patch("/api/sessions/:id", async (req, res) => {
    try {
      const updates = req.body;
      const session = await storage.updatePhotoSession(req.params.id, updates);
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
      const { sessionId, stepIndex, attemptNumber, expectedObject } = req.body;
      
      if (!req.file && !req.body.imageData) {
        return res.status(400).json({ message: "No image provided" });
      }

      let base64Image: string;
      
      if (req.file) {
        // Convert buffer to base64
        const base64 = req.file.buffer.toString('base64');
        base64Image = `data:${req.file.mimetype};base64,${base64}`;
      } else {
        // Use provided base64 image data
        base64Image = req.body.imageData;
      }

      // Verify the photo using OpenAI Vision API
      const verificationResult = await verifyPhotoObject(base64Image, expectedObject);

      // Store the attempt
      const attemptData = insertPhotoAttemptSchema.parse({
        sessionId: sessionId || req.params.id,
        stepIndex: parseInt(stepIndex),
        attemptNumber: parseInt(attemptNumber),
        imageData: base64Image,
        verificationResult: verificationResult.isCorrectObject,
        errorMessage: verificationResult.errorMessage,
        expectedObject
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

  // Get attempts for a session
  app.get("/api/sessions/:id/attempts", async (req, res) => {
    try {
      const stepIndex = req.query.stepIndex ? parseInt(req.query.stepIndex as string) : undefined;
      const attempts = await storage.getPhotoAttempts(req.params.id, stepIndex);
      res.json(attempts);
    } catch (error) {
      res.status(500).json({ message: "Failed to get attempts", error: (error as Error).message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
