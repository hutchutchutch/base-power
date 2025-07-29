import { type User, type InsertUser, type PhotoSession, type InsertPhotoSession, type PhotoAttempt, type InsertPhotoAttempt } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createPhotoSession(session: InsertPhotoSession): Promise<PhotoSession>;
  getPhotoSession(id: string): Promise<PhotoSession | undefined>;
  updatePhotoSession(id: string, updates: Partial<PhotoSession>): Promise<PhotoSession | undefined>;
  
  createPhotoAttempt(attempt: InsertPhotoAttempt): Promise<PhotoAttempt>;
  getPhotoAttempts(sessionId: string, stepIndex?: number): Promise<PhotoAttempt[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private photoSessions: Map<string, PhotoSession>;
  private photoAttempts: Map<string, PhotoAttempt>;

  constructor() {
    this.users = new Map();
    this.photoSessions = new Map();
    this.photoAttempts = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createPhotoSession(insertSession: InsertPhotoSession): Promise<PhotoSession> {
    const id = randomUUID();
    const now = new Date();
    const session: PhotoSession = { 
      ...insertSession, 
      id,
      userId: insertSession.userId || null,
      currentStep: insertSession.currentStep || null,
      createdAt: now,
      updatedAt: now,
      completedSteps: insertSession.completedSteps || []
    };
    this.photoSessions.set(id, session);
    return session;
  }

  async getPhotoSession(id: string): Promise<PhotoSession | undefined> {
    return this.photoSessions.get(id);
  }

  async updatePhotoSession(id: string, updates: Partial<PhotoSession>): Promise<PhotoSession | undefined> {
    const session = this.photoSessions.get(id);
    if (!session) return undefined;
    
    const updatedSession: PhotoSession = {
      ...session,
      ...updates,
      updatedAt: new Date()
    };
    this.photoSessions.set(id, updatedSession);
    return updatedSession;
  }

  async createPhotoAttempt(insertAttempt: InsertPhotoAttempt): Promise<PhotoAttempt> {
    const id = randomUUID();
    const attempt: PhotoAttempt = { 
      ...insertAttempt, 
      id,
      verificationResult: insertAttempt.verificationResult || null,
      errorMessage: insertAttempt.errorMessage || null,
      createdAt: new Date()
    };
    this.photoAttempts.set(id, attempt);
    return attempt;
  }

  async getPhotoAttempts(sessionId: string, stepIndex?: number): Promise<PhotoAttempt[]> {
    return Array.from(this.photoAttempts.values()).filter(
      (attempt) => 
        attempt.sessionId === sessionId && 
        (stepIndex === undefined || attempt.stepIndex === stepIndex)
    );
  }
}

export const storage = new MemStorage();
