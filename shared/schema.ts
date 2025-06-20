import { pgTable, text, serial, integer, boolean, timestamp, date, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  manager: text("manager"),
  employeeCount: integer("employee_count").default(0),
});

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  position: text("position").notNull(),
  departmentId: integer("department_id").references(() => departments.id),
  departmentName: text("department_name"),
  startDate: date("start_date").notNull(),
  phone: text("phone"),
  status: text("status").notNull().default("active"),
});

export const leaveRequests = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  employeeName: text("employee_name").notNull(),
  employeePosition: text("employee_position").notNull(),
  leaveType: text("leave_type").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: text("status").notNull().default("pending"),
  appliedDate: date("applied_date").notNull(),
  reason: text("reason"),
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  employeeCount: true,
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
});

export const insertLeaveRequestSchema = createInsertSchema(leaveRequests).omit({
  id: true,
});

export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departments.$inferSelect;

export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;

export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;
export type LeaveRequest = typeof leaveRequests.$inferSelect;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
});

export type User = typeof users.$inferSelect;
export const insertUserSchema = createInsertSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  date: timestamp("date").notNull(), // Using timestamp to include time
  description: text("description"), // Optional description
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({ id: true });
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text("type").notNull(), // E.g., 'leave_request_created', 'appointment_reminder'
  message: text("message").notNull(),
  link: text("link"), // Optional link to the relevant item
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// Leave Types Table
export const leave_types = pgTable("leave_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // e.g., "Annual", "Sick", "Unpaid"
  description: text("description"), // optional
  defaultDays: integer("default_days").default(0), // standard allocation for this leave type
});

export const insertLeaveTypeSchema = createInsertSchema(leave_types, {
  name: z.string().min(1, "Name cannot be empty"),
  description: z.string().nullable().optional(), // Allow null or undefined
  defaultDays: z.coerce.number().int().nonnegative("Default days must be a non-negative integer").default(0),
}).omit({ id: true });

export type LeaveType = typeof leave_types.$inferSelect;
export type InsertLeaveType = z.infer<typeof insertLeaveTypeSchema>;

// Leave Balances Table
export const leave_balances = pgTable("leave_balances", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  leaveTypeId: integer("leave_type_id").references(() => leave_types.id).notNull(),
  year: integer("year").notNull(), // e.g., 2023, 2024
  totalEntitlement: integer("total_entitlement").default(0), // total days allocated for the year
  daysUsed: integer("days_used").default(0), // days already taken
}, (table) => {
  return {
    unique_employee_leave_year: unique().on(table.employeeId, table.leaveTypeId, table.year),
  };
});

export const insertLeaveBalanceSchema = createInsertSchema(leave_balances).omit({
  id: true,
});

export type LeaveBalance = typeof leave_balances.$inferSelect;
export type InsertLeaveBalance = z.infer<typeof insertLeaveBalanceSchema>;
