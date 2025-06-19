import { appointments, departments, employees, leaveRequests, users, type Appointment, type InsertAppointment, type User, type InsertUser, type Department, type Employee, type LeaveRequest, type InsertDepartment, type InsertEmployee, type InsertLeaveRequest } from "@shared/schema";
import { db } from "./db";
import { eq, ilike, or, count, sql, and } from "drizzle-orm"; // Added 'and'
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
  createLeaveRequest(leaveRequest: InsertLeaveRequest): Promise<LeaveRequest>;
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
}

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
    return employee || undefined;
  }

  async getEmployeesByDepartment(departmentId: number): Promise<Employee[]> {
    const result = await db.select().from(employees).where(eq(employees.departmentId, departmentId));
    return result;
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
    const [leaveRequest] = await db
      .insert(leaveRequests)
      .values(insertLeaveRequest)
      .returning();
    return leaveRequest;
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
}

export const storage = new DatabaseStorage();
