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
  getEmployees(): Promise<Employee[]>;
  getEmployee(id: number): Promise<Employee | undefined>;
  getEmployeesByDepartment(departmentId: number): Promise<Employee[]>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: number): Promise<boolean>;
  searchEmployees(query: string): Promise<Employee[]>;

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
  async getEmployees(): Promise<Employee[]> {
    const result = await db.select().from(employees);
    return result;
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
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
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    if (!employee) return false;

    const result = await db.delete(employees).where(eq(employees.id, id));

    // Update department employee count
    if (employee.departmentId) {
      await db
        .update(departments)
        .set({ 
          employeeCount: sql`GREATEST(0, ${departments.employeeCount} - 1)`
        })
        .where(eq(departments.id, employee.departmentId));
    }

    return (result.rowCount ?? 0) > 0;
  }

  async searchEmployees(query: string): Promise<Employee[]> {
    const result = await db
      .select()
      .from(employees)
      .where(
        or(
          ilike(employees.firstName, `%${query}%`),
          ilike(employees.lastName, `%${query}%`),
          ilike(employees.email, `%${query}%`),
          ilike(employees.position, `%${query}%`),
          ilike(employees.departmentName, `%${query}%`)
        )
      );
    return result;
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
