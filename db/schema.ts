import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const learningPageState = sqliteTable("learning_page_state", {
  userId: text("user_id").notNull(),
  pageSlug: text("page_slug").notNull(),
  note: text("note").notNull(),
  diagramPayload: text("diagram_payload").notNull(),
  quizPayload: text("quiz_payload").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.pageSlug] })]);

export const handbookProgress = sqliteTable("handbook_progress", {
  userId: text("user_id").primaryKey(),
  lastPageSlug: text("last_page_slug"),
  lastHeadingId: text("last_heading_id"),
  completedSectionsPayload: text("completed_sections_payload").notNull().default("[]"),
  checkedItemsPayload: text("checked_items_payload").notNull().default("[]"),
  updatedAt: text("updated_at").notNull(),
});

export const learningComments = sqliteTable("learning_comments", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  userEmail: text("user_email").notNull(),
  pageSlug: text("page_slug").notNull(),
  pageTitle: text("page_title").notNull(),
  body: text("body").notNull(),
  status: text("status", { enum: ["new", "read"] }).notNull().default("new"),
  createdAt: text("created_at").notNull(),
}, (table) => [index("learning_comments_status_created_idx").on(table.status, table.createdAt)]);

export const apiRateLimits = sqliteTable("api_rate_limits", {
  scope: text("scope").notNull(),
  clientKey: text("client_key").notNull(),
  windowStartedAt: integer("window_started_at").notNull(),
  requestCount: integer("request_count").notNull(),
}, (table) => [
  primaryKey({ columns: [table.scope, table.clientKey] }),
  index("api_rate_limits_window_idx").on(table.windowStartedAt),
]);
