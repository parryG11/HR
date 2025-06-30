import {
  appointments, departments, employees, leaveRequests, users, leaveTypes, leaveBalances, // tables
  type Appointment, type InsertAppointment, type User, type InsertUser, type Department, type Employee, type LeaveRequest, type InsertLeaveRequest, notifications, type InsertNotification, type Notification, type LeaveType, type InsertLeaveType, type LeaveBalance, type InsertLeaveBalance // types
} from "@shared/schema";
// Define LeaveBalanceDisplay locally to avoid client path import
interface LeaveBalanceDisplay {
  id: number; // balance id
  employeeId: number;
  leaveTypeId: number;
  year: number;
  totalEntitlement: number;
  daysUsed: number;
  leaveTypeName: string | null;
}
import { db } from "./db";
import { eq, ilike, or, count, sql, and, desc, getTableColumns } from "drizzle-orm"; // Added getTableColumns
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Use environment variable in production

export interface IStorage {
  // Departments
  getDepartments(): Promise<Department[]>;
  getDepartment(id: number): Promise<Department | undefined>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: number, department: Partial<InsertDepartment>): Promise<Department | undefined>;
  deleteDepartment(id: number): Promise<boolean>;

  // Employees
  getEmployees(sortBy?: string, order?: string): Promise<Employee[]>;
  getEmployee(id: number): Promise<Employee | undefined>;
  getEmployeesByDepartment(departmentId: number, sortBy?: string, order?: string): Promise<Employee[]>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: number): Promise<boolean>;
  searchEmployees(query: string, sortBy?: string, order?: string): Promise<Employee[]>;

  // Leave Requests
  getLeaveRequests(): Promise<LeaveRequest[]>;
  getLeaveRequest(id: number): Promise<LeaveRequest | undefined>;
  getLeaveRequestsByEmployee(employeeId: number): Promise<LeaveRequest[]>;
  createLeaveRequest(leaveRequest: InsertLeaveRequest): Promise<LeaveRequest>; // Consider changing return type for validation errors
  updateLeaveRequest(id: number, leaveRequest: Partial<InsertLeaveRequest>): Promise<LeaveRequest | undefined>;
  deleteLeaveRequest(id: number): Promise<boolean>;

  // Analytics
  getEmployeeCount(): Promise<number>;
  getDepartmentCount(): Promise<number>;
  getPendingLeaveRequestsCount(): Promise<number>;

  // Leave Types
  getLeaveTypes(): Promise<LeaveType[]>;
  seedInitialLeaveTypes(): Promise<void>;
  seedInitialEmployeeAndBalances(): Promise<void>; // New seeding function

  // Leave Balances
  getLeaveBalancesForEmployee(employeeId: number, year: number): Promise<LeaveBalanceDisplay[]>;
  // updateLeaveBalance(employeeId: number, leaveTypeId: number, year: number, daysToAdjust: number): Promise<LeaveBalance | undefined>;
  getLeaveTypeByName(name: string): Promise<LeaveType | undefined>;


  // Users
  createUser(user: InsertUser): Promise<User>;
  getUserByUsername(username: string): Promise<User | undefined>;
  verifyPassword(username: string, passwordAttempt: string): Promise<User | null>;

  // Appointments
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  getAppointmentsByUserId(userId: number): Promise<Appointment[]>;
  getAppointmentById(appointmentId: number): Promise<Appointment | undefined>;
  updateAppointment(appointmentId: number, userId: number, appointmentData: Partial<Omit<InsertAppointment, 'userId'>>): Promise<Appointment | undefined>;
  deleteAppointment(appointmentId: number, userId: number): Promise<boolean>;

  // Notifications
  createNotification(userId: number, type: string, message: string, link?: string): Promise<Notification>;
  getNotifications(userId: number, limit?: number, unreadOnly?: boolean): Promise<Notification[]>;
  markNotificationAsRead(userId: number, notificationId: number): Promise<Notification | null>;
  markAllNotificationsAsRead(userId: number): Promise<{ updatedCount: number }>;
}

// Helper function to calculate day difference
const calculateDaysBetween = (startDate: string | Date, endDate: string | Date): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error("Invalid date format for calculating days between.");
  }
  // Calculate the difference in time (milliseconds)
  const timeDiff = end.getTime() - start.getTime();
  // Convert time difference from milliseconds to days and add 1 for inclusive count
  const dayDiff = Math.round(timeDiff / (1000 * 60 * 60 * 24)) + 1;
  return dayDiff;
};

export class DatabaseStorage implements IStorage {
  // Users
  async createUser(user: InsertUser): Promise<User> {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(user.passwordHash, saltRounds);
    const [newUser] = await db
      .insert(users)
      .values({ ...user, passwordHash })
      .returning();
    return newUser;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async verifyPassword(username: string, passwordAttempt: string): Promise<User | null> {
    const userRecord = await this.getUserByUsername(username); // Renamed to avoid conflict
    if (!userRecord) {
      return null;
    }
    const isMatch = await bcrypt.compare(passwordAttempt, userRecord.passwordHash);
    return isMatch ? userRecord : null;
  }

  // Appointments
  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [newAppointment] = await db
      .insert(appointments)
      .values(appointment)
      .returning();
    return newAppointment;
  }

  async getAppointmentsByUserId(userId: number): Promise<Appointment[]> {
    return db.select().from(appointments).where(eq(appointments.userId, userId));
  }

  async getAppointmentById(appointmentId: number): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, appointmentId));
    return appointment || undefined;
  }

  async updateAppointment(appointmentId: number, userId: number, appointmentData: Partial<Omit<InsertAppointment, 'userId'>>): Promise<Appointment | undefined> {
    const [updatedAppointment] = await db
      .update(appointments)
      .set(appointmentData)
      .where(and(eq(appointments.id, appointmentId), eq(appointments.userId, userId)))
      .returning();
    return updatedAppointment || undefined;
  }

  async deleteAppointment(appointmentId: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(appointments)
      .where(and(eq(appointments.id, appointmentId), eq(appointments.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Departments
  async getDepartments(): Promise<Department[]> {
    const result = await db.select().from(departments);
    return result;
  }

  async getDepartment(id: number): Promise<Department | undefined> {
    const [department] = await db.select().from(departments).where(eq(departments.id, id));
    return department || undefined;
  }

  async createDepartment(insertDepartment: InsertDepartment): Promise<Department> {
    const [department] = await db
      .insert(departments)
      .values(insertDepartment)
      .returning();
    return department;
  }

  async updateDepartment(id: number, updateData: Partial<InsertDepartment>): Promise<Department | undefined> {
    const [department] = await db
      .update(departments)
      .set(updateData)
      .where(eq(departments.id, id))
      .returning();
    return department || undefined;
  }

  async deleteDepartment(id: number): Promise<boolean> {
    const result = await db.delete(departments).where(eq(departments.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Employees
  async getEmployees(sortBy?: string, order?: string): Promise<Employee[]> {
    let query = db
      .select({
        id: employees.id,
        firstName: employees.firstName,
        lastName: employees.lastName,
        email: employees.email,
        position: employees.position,
        departmentId: employees.departmentId,
        departmentName: departments.name, // Use actual department name
        startDate: employees.startDate,
        status: employees.status,
        role: employees.role,
        profilePictureUrl: employees.profilePictureUrl,
        // Ensure all Employee fields are selected
        createdAt: employees.createdAt,
        updatedAt: employees.updatedAt,

      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id));

    if (sortBy === "department" && order && (order.toLowerCase() === "asc" || order.toLowerCase() === "desc")) {
      const orderSQL = order.toUpperCase() === "ASC" ? sql`ASC` : sql`DESC`;
      // query = query.orderBy(sql`${departments.name} ${orderSQL} NULLS LAST`); // This is how you'd do it if query was a simple select
      // For dynamic orderBy with potential NULLS LAST, we need to adjust how it's added.
      // Drizzle doesn't directly support NULLS FIRST/LAST in orderBy method in a way that easily appends.
      // We might need to use sql.raw or be more specific if this becomes an issue.
      // For now, let's assume simple ASC/DESC on departments.name.
      // A more robust way for NULLS LAST with dynamic order:
      if (order.toUpperCase() === "ASC") {
        query = query.orderBy(sql`${departments.name} ASC NULLS LAST`);
      } else {
        query = query.orderBy(sql`${departments.name} DESC NULLS LAST`);
      }
    } else {
      // Default sort or sort by other columns can be added here
      query = query.orderBy(employees.id); // Default sort by employee ID
    }

    const result = await query;
    // Map to Employee type, ensuring departmentName is correctly assigned
    return result.map(row => ({
      ...row,
      departmentName: row.departmentName || null, // Ensure departmentName is null if not present
    })) as Employee[];
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    const [result] = await db
      .select({
        // Select all fields from the employees table
        ...getTableColumns(employees),
        // And explicitly select the department name from the joined departments table,
        // aliasing it to avoid collision during selection, then map it.
        joinedDepartmentName: departments.name
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(eq(employees.id, id));

    if (!result) return undefined;

    // Construct the Employee object.
    // The Employee type (employees.$inferSelect) expects a 'departmentName' field.
    // We use the 'joinedDepartmentName' for this property.
    // The other fields are directly from 'getTableColumns(employees)'.
    const employee: Employee = {
      id: result.id,
      firstName: result.firstName,
      lastName: result.lastName,
      email: result.email,
      position: result.position,
      departmentId: result.departmentId,
      // The 'employees' table has its own 'departmentName' (employees.departmentName).
      // getTableColumns(employees) will select that.
      // We want to use the joined name. So, we override it here.
      departmentName: result.joinedDepartmentName,
      startDate: result.startDate,
      phone: result.phone,
      status: result.status,
    };
    return employee;
  }

  async getEmployeesByDepartment(departmentId: number, sortBy?: string, order?: string): Promise<Employee[]> {
    let query = db
      .select({
        id: employees.id,
        firstName: employees.firstName,
        lastName: employees.lastName,
        email: employees.email,
        position: employees.position,
        departmentId: employees.departmentId,
        departmentName: departments.name,
        startDate: employees.startDate,
        status: employees.status,
        role: employees.role,
        profilePictureUrl: employees.profilePictureUrl,
        createdAt: employees.createdAt,
        updatedAt: employees.updatedAt,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(eq(employees.departmentId, departmentId));

    if (sortBy === "department" && order && (order.toLowerCase() === "asc" || order.toLowerCase() === "desc")) {
      // Since we are filtering by departmentId, all employees will belong to the same department or departmentId is NULL.
      // If departmentId is not NULL, their department.name will be the same, so sorting by d.name won't change order much
      // unless there are multiple employees with NULL departmentId but this function filters by a specific departmentId.
      // However, for consistency and if the meaning of "department" sort for this function implies sorting by other criteria first,
      // this could be adjusted. For now, we'll assume it means to be consistent with getEmployees.
      const orderSQL = order.toUpperCase() === "ASC" ? sql`ASC` : sql`DESC`;
       if (order.toUpperCase() === "ASC") {
        query = query.orderBy(sql`${departments.name} ASC NULLS LAST`, employees.id); // Added secondary sort by id
      } else {
        query = query.orderBy(sql`${departments.name} DESC NULLS LAST`, employees.id); // Added secondary sort by id
      }
    } else {
      query = query.orderBy(employees.id); // Default sort
    }

    const result = await query;
    return result.map(row => ({
      ...row,
      departmentName: row.departmentName || null,
    })) as Employee[];
  }

  async createEmployee(insertEmployee: InsertEmployee): Promise<Employee> {
    const [employee] = await db
      .insert(employees)
      .values(insertEmployee)
      .returning();

    // Update department employee count
    if (employee.departmentId) {
      await db
        .update(departments)
        .set({ 
          employeeCount: sql`${departments.employeeCount} + 1`
        })
        .where(eq(departments.id, employee.departmentId));
    }

    return employee;
  }

  async updateEmployee(id: number, updateData: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const [employee] = await db
      .update(employees)
      .set(updateData)
      .where(eq(employees.id, id))
      .returning();
    return employee || undefined;
  }

  async deleteEmployee(id: number): Promise<boolean> {
    // Retrieve the employee first to get departmentId for count update
    const [employeeData] = await db.select({ departmentId: employees.departmentId }).from(employees).where(eq(employees.id, id));

    const result = await db.delete(employees).where(eq(employees.id, id));

    // Update department employee count if employee was found and deleted, and had a departmentId
    if (result.rowCount && result.rowCount > 0 && employeeData && employeeData.departmentId) {
      await db
        .update(departments)
        .set({ 
          employeeCount: sql`GREATEST(0, ${departments.employeeCount} - 1)`
        })
        .where(eq(departments.id, employeeData.departmentId));
    }

    return (result.rowCount ?? 0) > 0;
  }

  async searchEmployees(queryTerm: string, sortBy?: string, order?: string): Promise<Employee[]> {
    // Note: `query` is already a parameter name in the outer scope from Express. Renamed to `queryTerm`.
     let queryBuilder = db
      .select({
        id: employees.id,
        firstName: employees.firstName,
        lastName: employees.lastName,
        email: employees.email,
        position: employees.position,
        departmentId: employees.departmentId,
        departmentName: departments.name, // Use actual department name
        startDate: employees.startDate,
        status: employees.status,
        role: employees.role,
        profilePictureUrl: employees.profilePictureUrl,
        createdAt: employees.createdAt,
        updatedAt: employees.updatedAt,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(
        or(
          ilike(employees.firstName, `%${queryTerm}%`),
          ilike(employees.lastName, `%${queryTerm}%`),
          ilike(employees.email, `%${queryTerm}%`),
          ilike(employees.position, `%${queryTerm}%`),
          // Searching by department name should also use the joined departments.name
          ilike(departments.name, `%${queryTerm}%`)
        )
      );

    if (sortBy === "department" && order && (order.toLowerCase() === "asc" || order.toLowerCase() === "desc")) {
      const orderSQL = order.toUpperCase() === "ASC" ? sql`ASC` : sql`DESC`;
      if (order.toUpperCase() === "ASC") {
        queryBuilder = queryBuilder.orderBy(sql`${departments.name} ASC NULLS LAST`);
      } else {
        queryBuilder = queryBuilder.orderBy(sql`${departments.name} DESC NULLS LAST`);
      }
    } else {
      // Default sort for search results, e.g., by relevance or ID
      // For simplicity, using ID. Full-text search relevance might be different.
      queryBuilder = queryBuilder.orderBy(employees.id);
    }

    const result = await queryBuilder;
    return result.map(row => ({
      ...row,
      departmentName: row.departmentName || null,
    })) as Employee[];
  }

  // Leave Requests
  async getLeaveRequests(): Promise<LeaveRequest[]> {
    const result = await db.select().from(leaveRequests);
    return result;
  }

  async getLeaveRequest(id: number): Promise<LeaveRequest | undefined> {
    const [leaveRequest] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id));
    return leaveRequest || undefined;
  }

  async getLeaveRequestsByEmployee(employeeId: number): Promise<LeaveRequest[]> {
    const result = await db.select().from(leaveRequests).where(eq(leaveRequests.employeeId, employeeId));
    return result;
  }

  async createLeaveRequest(insertLeaveRequest: InsertLeaveRequest): Promise<LeaveRequest> {
    const { employeeId, leaveType: leaveTypeName, startDate, endDate } = insertLeaveRequest; // Status removed from destructuring as it's not used here for balance logic

    if (!employeeId || !leaveTypeName || !startDate || !endDate) {
      throw new Error("Missing required fields for leave request (employeeId, leaveType, startDate, endDate).");
    }

    const numberOfDaysRequested = calculateDaysBetween(startDate, endDate);
    if (numberOfDaysRequested <= 0) {
      throw new Error("Leave duration must be at least one day.");
    }

    // Validate leave type exists, but no balance check/deduction here.
    // Balance interaction occurs when a request is *approved* (typically via updateLeaveRequest).
    const leaveTypeRecord = await this.getLeaveTypeByName(leaveTypeName);
    if (!leaveTypeRecord) {
      throw new Error(`Leave type "${leaveTypeName}" not found.`);
    }

    // New leave requests are typically 'pending' by default (handled by DB schema or frontend).
    // No balance deduction at the point of creation of a 'pending' request.
    // If a system allows creating 'approved' requests directly, that flow would need its own balance check.
    // For this project, approval and deduction are handled in updateLeaveRequest.

    const [createdLeaveRequest] = await db
      .insert(leaveRequests)
      .values(insertLeaveRequest) // insertLeaveRequest contains all necessary fields including default status
      .returning();

    if (!createdLeaveRequest) {
      throw new Error("Failed to create leave request record.");
    }
    return createdLeaveRequest;
  }

  async updateLeaveRequest(id: number, updateData: Partial<InsertLeaveRequest>): Promise<LeaveRequest | undefined> {
    // Wrap the entire operation in a transaction
    return await db.transaction(async (tx) => {
      const originalLeaveRequest = await tx.query.leaveRequests.findFirst({
        where: eq(leaveRequests.id, id),
      });

      if (!originalLeaveRequest) {
        throw new Error(`Leave request with ID ${id} not found.`);
      }

      // Perform the actual update of the leave request first within the transaction
      const [updatedLeaveRequest] = await tx
        .update(leaveRequests)
        .set(updateData)
        .where(eq(leaveRequests.id, id))
        .returning();

      if (!updatedLeaveRequest) {
        // This should ideally not happen if originalLeaveRequest was found and tx is working
        throw new Error(`Failed to update leave request with ID ${id}.`);
      }

      // Handle balance adjustments if status changed
      if (updateData.status && updateData.status !== originalLeaveRequest.status) {
        const numberOfDays = calculateDaysBetween(originalLeaveRequest.startDate, originalLeaveRequest.endDate);
        const leaveTypeRecord = await this.getLeaveTypeByName(originalLeaveRequest.leaveType); // Use original leaveType

        if (!leaveTypeRecord) {
          // If leave type not found, something is wrong. Throw error to rollback transaction.
          console.error(`Leave type ${originalLeaveRequest.leaveType} not found while updating request ${id}. Balance not adjusted.`);
          throw new Error(`Leave type ${originalLeaveRequest.leaveType} not found. Cannot adjust balance.`);
        }

        const currentYear = new Date(originalLeaveRequest.startDate).getFullYear();

        let adjustment = 0;
        // Case 1: Was approved, now changing to something else (e.g., rejected, cancelled) -> Credit days back
        if (originalLeaveRequest.status === "approved" && (updateData.status === "rejected" || updateData.status === "cancelled")) {
          adjustment = -numberOfDays;
        }
        // Case 2: Was not approved (e.g., pending), now approved -> Debit days
        else if (originalLeaveRequest.status !== "approved" && updateData.status === "approved") {
          adjustment = numberOfDays;
        }

        if (adjustment !== 0) {
          const balance = await tx.query.leaveBalances.findFirst({
            where: and(
              eq(leaveBalances.employeeId, originalLeaveRequest.employeeId),
              eq(leaveBalances.leaveTypeId, leaveTypeRecord.id),
              eq(leaveBalances.year, currentYear)
            ),
          });

          if (!balance) {
            // If no balance record, throw error to rollback transaction.
            // Admin should ensure balances are set up.
            console.error(`No leave balance record for employee ${originalLeaveRequest.employeeId}, type ${leaveTypeRecord.name}, year ${currentYear}.`);
            throw new Error(`Leave balance record not found for ${leaveTypeRecord.name}, year ${currentYear}. Cannot approve request.`);
          }

          // If debiting days (adjustment > 0), check for sufficient balance BEFORE updating
          if (adjustment > 0) { // Approving
            if ((balance.daysUsed + adjustment) > balance.totalEntitlement) {
              throw new Error(`Insufficient leave balance for ${leaveTypeRecord.name}. Available: ${balance.totalEntitlement - balance.daysUsed}, Requested: ${adjustment}.`);
            }
          }

          // Perform balance update within the transaction
          const updateResult = await tx.update(leaveBalances)
            .set({ daysUsed: sql`${leaveBalances.daysUsed} + ${adjustment}` })
            .where(eq(leaveBalances.id, balance.id))
            .returning();

          if (!updateResult || updateResult.length === 0) {
            throw new Error(`Failed to update leave balance for employee ${originalLeaveRequest.employeeId}, type ${leaveTypeRecord.name}.`);
          }
        }
      }
      return updatedLeaveRequest;
    }); // End of transaction
  }

  async deleteLeaveRequest(id: number): Promise<boolean> {
    const result = await db.delete(leaveRequests).where(eq(leaveRequests.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Analytics
  async getEmployeeCount(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(employees);
    return result.count;
  }

  // Leave Types
  async getLeaveTypes(): Promise<LeaveType[]> {
    const result = await db.select().from(leaveTypes);
    return result;
  }

  async seedInitialLeaveTypes(): Promise<void> {
    console.log('Checking for existing leave types...');
    const existingLeaveTypes = await db.select({ count: count() }).from(leaveTypes);
    const leaveTypeCount = existingLeaveTypes[0].count;

    if (leaveTypeCount === 0) {
      console.log('No existing leave types found. Seeding initial leave types...');
      const defaultLeaveTypes: InsertLeaveType[] = [
        { name: "Annual Leave", description: "Annual paid leave", defaultDays: 20 },
        { name: "Sick Leave", description: "Leave for illness or injury", defaultDays: 10 },
        { name: "Unpaid Leave", description: "Leave without pay", defaultDays: 0 },
        { name: "Maternity Leave", description: "Leave for new mothers", defaultDays: 90 },
        { name: "Paternity Leave", description: "Leave for new fathers", defaultDays: 10 },
      ];
      console.log('Prepared default leave types for seeding:', JSON.stringify(defaultLeaveTypes, null, 2));

      try {
        console.log('Attempting to insert default leave types into database...');
        await db.insert(leaveTypes).values(defaultLeaveTypes);
        console.log('Database insert operation completed. Successfully seeded initial leave types.');
      } catch (error) {
        console.error('Error seeding initial leave types:', error);
      }
    } else {
      console.log('Leave types already exist. Skipping seeding.');
    }
  }

  async getLeaveTypeByName(name: string): Promise<LeaveType | undefined> {
    const [result] = await db.select().from(leaveTypes).where(eq(leaveTypes.name, name));
    return result;
  }

  // Leave Balances
  async getLeaveBalancesForEmployee(employeeId: number, year: number): Promise<LeaveBalanceDisplay[]> {
    const result = await db
      .select({
        id: leaveBalances.id,
        employeeId: leaveBalances.employeeId,
        leaveTypeId: leaveBalances.leaveTypeId,
        year: leaveBalances.year,
        totalEntitlement: leaveBalances.totalEntitlement,
        daysUsed: leaveBalances.daysUsed,
        leaveTypeName: leaveTypes.name,
      })
      .from(leaveBalances)
      .leftJoin(leaveTypes, eq(leaveBalances.leaveTypeId, leaveTypes.id))
      .where(and(eq(leaveBalances.employeeId, employeeId), eq(leaveBalances.year, year)));

    return result.map(r => ({
      ...r,
      // Ensure leaveTypeName is null if not found, though leftJoin handles this.
      // Type assertion might be needed if TypeScript can't infer perfectly.
      leaveTypeName: r.leaveTypeName || null
    })) as LeaveBalanceDisplay[];
  }

  async getDepartmentCount(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(departments);
    return result.count;
  }

  async getPendingLeaveRequestsCount(): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(leaveRequests)
      .where(eq(leaveRequests.status, "pending"));
    return result.count;
  }

  async seedInitialEmployeeAndBalances(): Promise<void> {
    console.log('Seeding initial employee (John Doe) and balances if necessary...');
    let employeeIdForBalances: number | null = null;

    // Check for Employee ID 1
    console.log('Checking for employee with ID 1...');
    const employeeById1 = await db.query.employees.findFirst({ where: eq(employees.id, 1) });

    if (employeeById1) {
      console.log(`Employee ID 1 found: ${employeeById1.firstName} ${employeeById1.lastName}, Email: ${employeeById1.email}`);
      if (employeeById1.email === "john.doe@example.com") {
        console.log('Employee ID 1 is "john.doe@example.com". This is the target test user.');
        employeeIdForBalances = 1;
      } else {
        console.warn(`Employee ID 1 exists but has email "${employeeById1.email}", not "john.doe@example.com".`);
        console.warn('MyLeavePage expects employee ID 1 to be "john.doe@example.com". Manual database adjustment is required.');
        console.log("Skipping balance seeding for ID 1 due to email mismatch.");
        return; // Stop seeding for ID 1
      }
    } else {
      // Employee ID 1 does not exist. Check if email "john.doe@example.com" is taken.
      console.log('Employee ID 1 not found. Checking for email "john.doe@example.com"...');
      const employeeByEmail = await db.query.employees.findFirst({ where: eq(employees.email, "john.doe@example.com") });

      if (employeeByEmail) {
        // Email is taken by someone other than ID 1 (since ID 1 was not found)
        console.warn(`Email "john.doe@example.com" is already taken by employee ID ${employeeByEmail.id} (${employeeByEmail.firstName} ${employeeByEmail.lastName}).`);
        console.warn('MyLeavePage expects employee ID 1 to be "john.doe@example.com".');
        console.warn(`To resolve, either change employee ID ${employeeByEmail.id}'s email, or delete employee ID ${employeeByEmail.id} and re-run seeding.`);
        console.log("Skipping creation of John Doe and balance seeding for ID 1 due to this conflict.");
        return; // Stop seeding for ID 1
      } else {
        // Employee ID 1 does not exist, and email "john.doe@example.com" is available.
        // Create "John Doe" with ID 1.
        console.log('Email "john.doe@example.com" is available. Attempting to create "John Doe" with ID 1...');
        let defaultDepartmentId: number | null = null;
        const depts = await this.getDepartments();
        if (depts.length > 0) defaultDepartmentId = depts[0].id;
        else console.log("No departments found. New employee will be created without a department initially.");

        try {
          const johnDoeData: InsertEmployee = {
            id: 1, // Explicitly set ID to 1
            firstName: "John",
            lastName: "Doe",
            email: "john.doe@example.com",
            position: "Software Engineer",
            departmentId: defaultDepartmentId,
            startDate: new Date().toISOString().split('T')[0], // Ensure format YYYY-MM-DD
            status: "active",
            // role and profilePictureUrl can be omitted if they have defaults or are nullable
          };
          // Use db.insert directly, as this.createEmployee might have side effects or not allow ID specification.
          const [newlyCreatedEmployee] = await db.insert(employees).values(johnDoeData).returning();

          if (newlyCreatedEmployee && newlyCreatedEmployee.id === 1) {
            console.log('Successfully created "John Doe" with ID 1 and email "john.doe@example.com".');
            employeeIdForBalances = 1;
          } else {
            // This case should ideally not be reached if insert was successful and DB constraints didn't prevent ID 1.
            console.error('Failed to create "John Doe" with ID 1, or ID was not returned as 1.');
            console.warn('Manual database check and setup required for test user ID 1.');
            return; // Stop seeding
          }
        } catch (error: any) {
          console.error('Error creating "John Doe" with ID 1:', error.message);
          if (error.message.includes("duplicate key value violates unique constraint")) {
             console.error('This likely means an employee with ID 1 already exists, but was not caught by the initial check, or another unique constraint was violated.');
          }
          console.warn('Manual database setup required for test user ID 1.');
          console.log("Skipping balance seeding due to issues creating 'John Doe' with ID 1.");
          return; // Stop seeding
        }
      }
    }

    // Proceed with balance seeding only if employeeIdForBalances was successfully determined to be 1
    if (employeeIdForBalances !== 1) {
      console.log("Employee ID for balance seeding is not 1. Skipping balance seeding for the test user.");
      return;
    }
    
    // If we reached here, employeeIdForBalances is 1.
    console.log(`Proceeding to set up leave balances for employee ID ${employeeIdForBalances}...`);
    const currentYear = new Date().getFullYear();
    const leaveTypeNamesToSeed = [
      { name: "Annual Leave", defaultDays: 20 },
      { name: "Sick Leave", defaultDays: 10 }
    ];

    for (const lt of leaveTypeNamesToSeed) {
      const leaveTypeRecord = await this.getLeaveTypeByName(lt.name);
      if (leaveTypeRecord) {
        console.log(`Checking balance for ${lt.name} for employee ${employeeIdForBalances}, year ${currentYear}...`);
        const existingBalance = await db.query.leaveBalances.findFirst({
          where: and(
            eq(leaveBalances.employeeId, employeeIdForBalances),
            eq(leaveBalances.leaveTypeId, leaveTypeRecord.id),
            eq(leaveBalances.year, currentYear)
          )
        });

        if (!existingBalance) {
          console.log(`No existing balance for ${lt.name}. Seeding...`);
          await db.insert(leaveBalances).values({
            employeeId: employeeIdForBalances,
            leaveTypeId: leaveTypeRecord.id,
            year: currentYear,
            totalEntitlement: lt.defaultDays,
            daysUsed: 0,
          });
          console.log(`Successfully seeded balance for ${lt.name}.`);
        } else {
          console.log(`Balance for ${lt.name} already exists. Current entitlement: ${existingBalance.totalEntitlement}, Used: ${existingBalance.daysUsed}.`);
          // Optionally update if values are different, e.g., if defaultDays changed.
          // For now, we only seed if it doesn't exist.
        }
      } else {
        console.warn(`Leave type "${lt.name}" not found. Cannot seed balance for it.`);
      }
    }
    console.log('Finished seeding employee and balances.');
  }

  // Notifications
  async createNotification(userId: number, type: string, message: string, link?: string): Promise<Notification> {
    const newNotificationData: Omit<InsertNotification, 'id' | 'createdAt' | 'isRead'> = {
      userId,
      type,
      message,
      link: link || null // Ensure link is explicitly null if undefined
    };
    const [result] = await db.insert(notifications).values(newNotificationData).returning();
    return result;
  }

  async getNotifications(userId: number, limit?: number, unreadOnly?: boolean): Promise<Notification[]> {
    let query = db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));

    if (unreadOnly) {
      query = query.where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    }

    if (limit !== undefined && limit > 0) {
      query = query.limit(limit);
    }

    return query;
  }

  async markNotificationAsRead(userId: number, notificationId: number): Promise<Notification | null> {
    const [updatedNotification] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
      .returning();
    return updatedNotification || null;
  }

  async markAllNotificationsAsRead(userId: number): Promise<{ updatedCount: number }> {
    const result = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

    // result for pg driver contains rowCount
    return { updatedCount: result.rowCount ?? 0 };
  }
}

export const storage = new DatabaseStorage();
