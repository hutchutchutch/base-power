import { 
  type AdminUser, 
  type InsertAdminUser, 
  type Survey, 
  type InsertSurvey,
  type SurveyStep, 
  type InsertSurveyStep,
  type SurveyInvitation, 
  type InsertSurveyInvitation,
  type UserSession, 
  type InsertUserSession,
  type PhotoAttempt, 
  type InsertPhotoAttempt,
  adminUsers,
  surveys,
  surveySteps,
  surveyInvitations,
  userSessions,
  photoAttempts,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Admin user operations
  getAdminUser(id: string): Promise<AdminUser | undefined>;
  getAdminUserByEmail(email: string): Promise<AdminUser | undefined>;
  createAdminUser(user: InsertAdminUser): Promise<AdminUser>;
  
  // Survey operations
  createSurvey(survey: InsertSurvey): Promise<Survey>;
  getSurvey(id: string): Promise<Survey | undefined>;
  getSurveysByAdmin(adminId: string): Promise<Survey[]>;
  updateSurvey(id: string, updates: Partial<Survey>): Promise<Survey | undefined>;
  deleteSurvey(id: string): Promise<boolean>;
  
  // Survey step operations
  createSurveyStep(step: InsertSurveyStep): Promise<SurveyStep>;
  getSurveySteps(surveyId: string): Promise<SurveyStep[]>;
  updateSurveyStep(id: string, updates: Partial<SurveyStep>): Promise<SurveyStep | undefined>;
  deleteSurveyStep(id: string): Promise<boolean>;
  
  // Survey invitation operations
  createSurveyInvitation(invitation: InsertSurveyInvitation): Promise<SurveyInvitation>;
  getSurveyInvitation(token: string): Promise<SurveyInvitation | undefined>;
  getSurveyInvitations(surveyId: string): Promise<SurveyInvitation[]>;
  updateSurveyInvitation(id: string, updates: Partial<SurveyInvitation>): Promise<SurveyInvitation | undefined>;
  
  // User session operations
  createUserSession(session: InsertUserSession): Promise<UserSession>;
  getUserSession(id: string): Promise<UserSession | undefined>;
  updateUserSession(id: string, updates: Partial<UserSession>): Promise<UserSession | undefined>;
  
  // Photo attempt operations
  createPhotoAttempt(attempt: InsertPhotoAttempt): Promise<PhotoAttempt>;
  getPhotoAttempts(sessionId: string, stepId?: string): Promise<PhotoAttempt[]>;
}

export class DatabaseStorage implements IStorage {
  // Admin user operations
  async getAdminUser(id: string): Promise<AdminUser | undefined> {
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
    return user;
  }

  async getAdminUserByEmail(email: string): Promise<AdminUser | undefined> {
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    return user;
  }

  async createAdminUser(insertUser: InsertAdminUser): Promise<AdminUser> {
    const [user] = await db.insert(adminUsers).values(insertUser).returning();
    return user;
  }

  // Survey operations
  async createSurvey(insertSurvey: InsertSurvey): Promise<Survey> {
    const [survey] = await db.insert(surveys).values(insertSurvey).returning();
    return survey;
  }

  async getSurvey(id: string): Promise<Survey | undefined> {
    const [survey] = await db.select().from(surveys).where(eq(surveys.id, id));
    return survey;
  }

  async getSurveysByAdmin(adminId: string): Promise<Survey[]> {
    return await db.select().from(surveys)
      .where(eq(surveys.adminId, adminId))
      .orderBy(desc(surveys.createdAt));
  }

  async updateSurvey(id: string, updates: Partial<Survey>): Promise<Survey | undefined> {
    const [survey] = await db.update(surveys)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(surveys.id, id))
      .returning();
    return survey;
  }

  async deleteSurvey(id: string): Promise<boolean> {
    const result = await db.delete(surveys).where(eq(surveys.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Survey step operations
  async createSurveyStep(insertStep: InsertSurveyStep): Promise<SurveyStep> {
    const [step] = await db.insert(surveySteps).values(insertStep).returning();
    return step;
  }

  async getSurveySteps(surveyId: string): Promise<SurveyStep[]> {
    return await db.select().from(surveySteps)
      .where(eq(surveySteps.surveyId, surveyId))
      .orderBy(surveySteps.stepOrder);
  }

  async updateSurveyStep(id: string, updates: Partial<SurveyStep>): Promise<SurveyStep | undefined> {
    const [step] = await db.update(surveySteps)
      .set(updates)
      .where(eq(surveySteps.id, id))
      .returning();
    return step;
  }

  async deleteSurveyStep(id: string): Promise<boolean> {
    const result = await db.delete(surveySteps).where(eq(surveySteps.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Survey invitation operations
  async createSurveyInvitation(insertInvitation: InsertSurveyInvitation): Promise<SurveyInvitation> {
    const [invitation] = await db.insert(surveyInvitations).values(insertInvitation).returning();
    return invitation;
  }

  async getSurveyInvitation(token: string): Promise<SurveyInvitation | undefined> {
    const [invitation] = await db.select().from(surveyInvitations)
      .where(eq(surveyInvitations.invitationToken, token));
    return invitation;
  }

  async getSurveyInvitations(surveyId: string): Promise<SurveyInvitation[]> {
    return await db.select().from(surveyInvitations)
      .where(eq(surveyInvitations.surveyId, surveyId))
      .orderBy(desc(surveyInvitations.createdAt));
  }

  async updateSurveyInvitation(id: string, updates: Partial<SurveyInvitation>): Promise<SurveyInvitation | undefined> {
    const [invitation] = await db.update(surveyInvitations)
      .set(updates)
      .where(eq(surveyInvitations.id, id))
      .returning();
    return invitation;
  }

  // User session operations
  async createUserSession(insertSession: InsertUserSession): Promise<UserSession> {
    const [session] = await db.insert(userSessions).values(insertSession).returning();
    return session;
  }

  async getUserSession(id: string): Promise<UserSession | undefined> {
    const [session] = await db.select().from(userSessions).where(eq(userSessions.id, id));
    return session;
  }

  async updateUserSession(id: string, updates: Partial<UserSession>): Promise<UserSession | undefined> {
    const [session] = await db.update(userSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userSessions.id, id))
      .returning();
    return session;
  }

  // Photo attempt operations
  async createPhotoAttempt(insertAttempt: InsertPhotoAttempt): Promise<PhotoAttempt> {
    const [attempt] = await db.insert(photoAttempts).values(insertAttempt).returning();
    return attempt;
  }

  async getPhotoAttempts(sessionId: string, stepId?: string): Promise<PhotoAttempt[]> {
    const whereCondition = stepId 
      ? and(eq(photoAttempts.sessionId, sessionId), eq(photoAttempts.stepId, stepId))
      : eq(photoAttempts.sessionId, sessionId);
    
    return await db.select().from(photoAttempts)
      .where(whereCondition)
      .orderBy(photoAttempts.createdAt);
  }
}

export const storage = new DatabaseStorage();
