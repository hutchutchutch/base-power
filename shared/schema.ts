import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const photoSessions = pgTable("photo_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  currentStep: integer("current_step").default(0),
  completedSteps: text("completed_steps").array().default([]),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const photoAttempts = pgTable("photo_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  stepIndex: integer("step_index").notNull(),
  attemptNumber: integer("attempt_number").notNull(),
  imageData: text("image_data").notNull(),
  verificationResult: boolean("verification_result"),
  errorMessage: text("error_message"),
  expectedObject: text("expected_object").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPhotoSessionSchema = createInsertSchema(photoSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPhotoAttemptSchema = createInsertSchema(photoAttempts).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type PhotoSession = typeof photoSessions.$inferSelect;
export type InsertPhotoSession = z.infer<typeof insertPhotoSessionSchema>;
export type PhotoAttempt = typeof photoAttempts.$inferSelect;
export type InsertPhotoAttempt = z.infer<typeof insertPhotoAttemptSchema>;
