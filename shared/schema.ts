import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Admin users table
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Survey templates created by admins
export const surveys = pgTable("surveys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  utilityCompany: text("utility_company").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Survey steps (dynamic configuration)
export const surveySteps = pgTable("survey_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").notNull(),
  stepOrder: integer("step_order").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  expectedObject: text("expected_object").notNull(),
  tips: jsonb("tips").notNull(), // Array of tip strings
  validationRules: text("validation_rules").notNull(), // LLM validation instructions
  exampleImageUrl: text("example_image_url"),
  isRequired: boolean("is_required").default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// User survey invitations
export const surveyInvitations = pgTable("survey_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").notNull(),
  userEmail: text("user_email").notNull(),
  invitationToken: text("invitation_token").notNull().unique(),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").default(sql`now()`),
  expiresAt: timestamp("expires_at").notNull(),
});

// User survey sessions (when users take surveys)
export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invitationId: varchar("invitation_id").notNull(),
  currentStep: integer("current_step").default(0),
  completedSteps: text("completed_steps").array().default([]),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Photo attempts for user sessions
export const photoAttempts = pgTable("photo_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  stepId: varchar("step_id").notNull(),
  attemptNumber: integer("attempt_number").notNull(),
  imageData: text("image_data").notNull(),
  verificationResult: boolean("verification_result"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Schema definitions
export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
});

export const insertSurveySchema = createInsertSchema(surveys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSurveyStepSchema = createInsertSchema(surveySteps).omit({
  id: true,
  createdAt: true,
});

export const insertSurveyInvitationSchema = createInsertSchema(surveyInvitations).omit({
  id: true,
  createdAt: true,
});

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPhotoAttemptSchema = createInsertSchema(photoAttempts).omit({
  id: true,
  createdAt: true,
});

// Type exports
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type Survey = typeof surveys.$inferSelect;
export type InsertSurvey = z.infer<typeof insertSurveySchema>;
export type SurveyStep = typeof surveySteps.$inferSelect;
export type InsertSurveyStep = z.infer<typeof insertSurveyStepSchema>;
export type SurveyInvitation = typeof surveyInvitations.$inferSelect;
export type InsertSurveyInvitation = z.infer<typeof insertSurveyInvitationSchema>;
export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type PhotoAttempt = typeof photoAttempts.$inferSelect;
export type InsertPhotoAttempt = z.infer<typeof insertPhotoAttemptSchema>;
