import { appointments, departments, employees, leaveRequests, users, type Appointment, type InsertAppointment, type User, type InsertUser, type Department, type Employee, type LeaveRequest, type InsertLeaveRequest, notifications, type InsertNotification, type Notification, leave_types, leave_balances, LeaveType, LeaveBalance, InsertLeaveType } from "@shared/schema";
import { db } from "./db";
import { eq, ilike, or, count, sql, and, desc } from "drizzle-orm"; // Added 'and' and 'desc'
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

  // Leave Types
  getLeaveTypes(): Promise<LeaveType[]>;
  createLeaveType(data: InsertLeaveType): Promise<LeaveType>;
  updateLeaveType(id: number, data: Partial<InsertLeaveType>): Promise<LeaveType | undefined>;
  deleteLeaveType(id: number): Promise<boolean>;

  // Leave Balances
  getLeaveBalancesByEmployee(employeeId: number, year?: number): Promise<Array<LeaveBalance & { leaveTypeName: string | null }>>;
  adjustLeaveBalance(employeeId: number, leaveTypeId: number, year: number, daysToAdjust: number): Promise<boolean>;
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
    const [employee] = await db.select({
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
      .where(eq(employees.id, id));

    if (!employee) return undefined;
    return {...employee, departmentName: employee.departmentName || null } as Employee;
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
    // Destructure to get all parts of insertLeaveRequest
    const { employeeId, leaveType: leaveTypeName, startDate, endDate, reason, ...restOfInsert } = insertLeaveRequest;

    if (!employeeId || !leaveTypeName || !startDate || !endDate) {
      throw new Error("Missing required fields for leave request (employeeId, leaveType, startDate, endDate).");
    }

    const numberOfDaysRequested = calculateDaysBetween(startDate, endDate);
    if (numberOfDaysRequested <= 0) {
      throw new Error("Leave duration must be at least one day.");
    }

    const requestYear = new Date(startDate).getFullYear();

    // 1. Fetch leave_type_id based on leaveTypeName
    const [leaveTypeRecord] = await db
      .select({ id: leave_types.id })
      .from(leave_types)
      .where(eq(leave_types.name, leaveTypeName));

    if (!leaveTypeRecord) {
      throw new Error(`Invalid leave type: ${leaveTypeName}.`);
    }
    const leaveTypeId = leaveTypeRecord.id;

    // 2. Fetch employee's leave balance
    const [balance] = await db
      .select()
      .from(leave_balances)
      .where(
        and(
          eq(leave_balances.employeeId, employeeId),
          eq(leave_balances.leaveTypeId, leaveTypeId),
          eq(leave_balances.year, requestYear)
        )
      );

    if (!balance) {
      throw new Error(`No leave balance found for ${leaveTypeName} in ${requestYear}.`);
    }

    // 3. Validation Logic
    if (balance.totalEntitlement <= 0) {
      throw new Error(`Not entitled for ${leaveTypeName}.`);
    }
    if ((balance.daysUsed + numberOfDaysRequested) > balance.totalEntitlement) {
      const availableDays = balance.totalEntitlement - balance.daysUsed;
      throw new Error(`Insufficient leave balance for ${leaveTypeName}. Requested: ${numberOfDaysRequested}, Available: ${availableDays}.`);
    }

    // 4. If valid, create the leave request
    const [createdLeaveRequest] = await db
      .insert(leaveRequests)
      .values({
        ...insertLeaveRequest, // this includes employeeId, reason, etc.
        // Ensure leaveType in the table stores the name, as per current schema
        leaveType: leaveTypeName,
      })
      .returning();

    if (!createdLeaveRequest) {
      throw new Error("Failed to create leave request record.");
    }

    // 5. Update leave_balances.daysUsed
    const newDaysUsed = balance.daysUsed + numberOfDaysRequested;
    const updateResult = await db
      .update(leave_balances)
      .set({ daysUsed: newDaysUsed })
      .where(
        and(
          eq(leave_balances.id, balance.id) // Use balance.id for precision
        )
      );

    if ((updateResult.rowCount ?? 0) === 0) {
      // This is a critical issue, potentially rollback or compensate
      console.error(`Failed to update leave balance for request ${createdLeaveRequest.id}. Attempting to compensate.`);
      // Attempt to delete the just-created leave request to maintain consistency
      await db.delete(leaveRequests).where(eq(leaveRequests.id, createdLeaveRequest.id));
      throw new Error("Failed to update leave balance. Leave request creation rolled back.");
    }

    return createdLeaveRequest;
  }

  async updateLeaveRequest(id: number, updateData: Partial<InsertLeaveRequest>): Promise<LeaveRequest | undefined> {
    const [leaveRequest] = await db
      .update(leaveRequests)
      .set(updateData)
      .where(eq(leaveRequests.id, id))
      .returning();
    return leaveRequest || undefined;
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

  // Leave Types
  async getLeaveTypes(): Promise<LeaveType[]> {
    try {
      const result = await db.select().from(leave_types);
      return result;
    } catch (error) {
      console.error("Error fetching leave types:", error);
      throw new Error("Could not fetch leave types.");
    }
  }

  async createLeaveType(data: InsertLeaveType): Promise<LeaveType> {
    // Ensure data is validated against insertLeaveTypeSchema before this, typically in routes.ts
    const [newLeaveType] = await db.insert(leave_types).values(data).returning();
    if (!newLeaveType) {
      throw new Error("Failed to create leave type."); // Or a more specific error
    }
    return newLeaveType;
  }

  async updateLeaveType(id: number, data: Partial<InsertLeaveType>): Promise<LeaveType | undefined> {
    const [updatedLeaveType] = await db.update(leave_types).set(data).where(eq(leave_types.id, id)).returning();
    return updatedLeaveType || undefined;
  }

  async deleteLeaveType(id: number): Promise<boolean> {
    // TODO: Consider implications for existing leave requests/balances.
    // For now, direct deletion.
    const result = await db.delete(leave_types).where(eq(leave_types.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Leave Balances
  async getLeaveBalancesByEmployee(employeeId: number, year?: number): Promise<Array<LeaveBalance & { leaveTypeName: string | null }>> {
    try {
      const currentYear = year || new Date().getFullYear();
      const result = await db
        .select({
          ...leave_balances, // Select all columns from leave_balances
          leaveTypeName: leave_types.name,
        })
        .from(leave_balances)
        .leftJoin(leave_types, eq(leave_balances.leaveTypeId, leave_types.id))
        .where(
          and(
            eq(leave_balances.employeeId, employeeId),
            eq(leave_balances.year, currentYear)
          )
        );

      // Ensure all fields from LeaveBalance are present and cast correctly
      return result.map(row => ({
        id: row.id,
        employeeId: row.employeeId,
        leaveTypeId: row.leaveTypeId,
        year: row.year,
        totalEntitlement: row.totalEntitlement,
        daysUsed: row.daysUsed,
        leaveTypeName: row.leaveTypeName,
        // Add any other fields from leave_balances that are not explicitly listed but are part of LeaveBalance type
        // For example, if there were createdAt/updatedAt fields on leave_balances, they'd be row.createdAt, etc.
      })) as Array<LeaveBalance & { leaveTypeName: string | null }>;
    } catch (error) {
      console.error(`Error fetching leave balances for employee ${employeeId}:`, error);
      throw new Error("Could not fetch leave balances.");
    }
  }

  async adjustLeaveBalance(employeeId: number, leaveTypeId: number, year: number, daysToAdjust: number): Promise<boolean> {
    try {
      // Fetch current balance to ensure daysUsed doesn't go < 0 or exceed entitlement (though entitlement check is more for creation)
      const [currentBalance] = await db
        .select({ daysUsed: leave_balances.daysUsed, totalEntitlement: leave_balances.totalEntitlement })
        .from(leave_balances)
        .where(and(
          eq(leave_balances.employeeId, employeeId),
          eq(leave_balances.leaveTypeId, leaveTypeId),
          eq(leave_balances.year, year)
        ));

      if (!currentBalance) {
        console.warn(`No leave balance found for employee ${employeeId}, type ${leaveTypeId}, year ${year} when trying to adjust by ${daysToAdjust} days.`);
        // Depending on strictness, this could be an error or a handled case.
        // If adjusting due to cancellation, the balance record should exist.
        return false;
      }

      const newDaysUsed = currentBalance.daysUsed + daysToAdjust;

      // Ensure daysUsed does not go below 0.
      // It could potentially exceed totalEntitlement if daysToAdjust is positive and large,
      // but this function is primarily for adjustments (like cancellations, making daysUsed smaller).
      // The creation logic should handle the upper bound check.
      const finalDaysUsed = Math.max(0, newDaysUsed);

      const result = await db
        .update(leave_balances)
        .set({ daysUsed: finalDaysUsed })
        .where(
          and(
            eq(leave_balances.employeeId, employeeId),
            eq(leave_balances.leaveTypeId, leaveTypeId),
            eq(leave_balances.year, year)
          )
        );
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error(`Error adjusting leave balance for employee ${employeeId}, type ${leaveTypeId}, year ${year} by ${daysToAdjust} days:`, error);
      throw new Error("Could not adjust leave balance.");
    }
  }

  async seedInitialLeaveTypes() {
    const coreLeaveTypes = [
      { name: "Sick Leave", description: "Leave taken due to illness.", defaultDays: 10 },
      { name: "Personal Leave", description: "Leave taken for personal reasons.", defaultDays: 5 },
      { name: "Business Leave", description: "Leave taken for business-related travel or activities.", defaultDays: 7 },
      { name: "Annual Leave", description: "Standard annual vacation leave.", defaultDays: 15 }
    ];

    console.log("Attempting to seed initial leave types...");

    for (const lt of coreLeaveTypes) {
      try {
        const existing = await this.db
          .select()
          .from(leave_types)
          .where(eq(leave_types.name, lt.name))
          .limit(1);

        if (existing.length === 0) {
          await this.db.insert(leave_types).values(lt);
          console.log(`Seeded leave type: ${lt.name}`);
        } else {
          console.log(`Leave type already exists: ${lt.name}`);
        }
      } catch (error) {
        console.error(`Error seeding leave type ${lt.name}:`, error);
      }
    }
    console.log("Finished seeding initial leave types.");
  }
}

export const storage = new DatabaseStorage();
