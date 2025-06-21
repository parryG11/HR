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

// LeaveTypes Table
export const leaveTypes = pgTable("leave_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  // Example: default_days_entitled: integer("default_days_entitled").notNull().default(0),
});

export const insertLeaveTypeSchema = createInsertSchema(leaveTypes).omit({ id: true });
export type LeaveType = typeof leaveTypes.$inferSelect;
export type InsertLeaveType = z.infer<typeof insertLeaveTypeSchema>;

// LeaveBalances Table
export const leaveBalances = pgTable("leave_balances", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  leaveTypeId: integer("leave_type_id").notNull().references(() => leaveTypes.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  totalEntitlement: integer("total_entitlement").notNull().default(0), // Total days allocated for the year
  daysUsed: integer("days_used").notNull().default(0), // Total days used so far
}, (table) => ({
  unq: unique().on(table.employeeId, table.leaveTypeId, table.year), // Ensure one balance entry per employee, per leave type, per year
}));

export const insertLeaveBalanceSchema = createInsertSchema(leaveBalances).omit({ id: true });
export type LeaveBalance = typeof leaveBalances.$inferSelect;
export type InsertLeaveBalance = z.infer<typeof insertLeaveBalanceSchema>;

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
