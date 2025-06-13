import type { Express, Request } from "express"; // Added Request
import { createServer, type Server } from "http";
import { ZodError } from 'zod';
import { storage } from "./storage";
import { insertDepartmentSchema, insertEmployeeSchema, insertLeaveRequestSchema, users, insertAppointmentSchema } from "@shared/schema"; // Added insertAppointmentSchema
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthenticatedRequest } from "./authMiddleware"; // Modified import

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      // TODO: Add validation for username and password strength if desired
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }
      // In InsertUser, passwordHash will temporarily hold the plain password
      const newUser = await storage.createUser({ username, passwordHash: password });
      // Exclude passwordHash from the response
      const { passwordHash, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error in POST /api/auth/register:", error);
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      const user = await storage.verifyPassword(username, password);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
      res.json({ token });
    } catch (error) {
      console.error("Error in POST /api/auth/login:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    // For JWT, logout is typically handled client-side by deleting the token.
    // This endpoint can be used for server-side session invalidation if implemented.
    res.json({ message: "Logged out successfully" });
  });

  // Department routes
  app.get("/api/departments", authMiddleware, async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch departments" });
    }
  });

  app.get("/api/departments/:id", authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const department = await storage.getDepartment(id);
      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }
      res.json(department);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch department" });
    }
  });

  app.post("/api/departments", authMiddleware, async (req, res) => {
    try {
      const validatedData = insertDepartmentSchema.parse(req.body);
      const department = await storage.createDepartment(validatedData);
      res.status(201).json(department);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid department data", errors: error.flatten().fieldErrors });
      } else {
        console.error("Non-Zod error in POST /api/departments:", error);
        res.status(400).json({ message: "Invalid department data" });
      }
    }
  });

  app.put("/api/departments/:id", authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertDepartmentSchema.partial().parse(req.body);
      const department = await storage.updateDepartment(id, validatedData);
      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }
      res.json(department);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid department data", errors: error.flatten().fieldErrors });
      } else {
        console.error("Non-Zod error in PUT /api/departments/:id:", error);
        res.status(400).json({ message: "Invalid department data" });
      }
    }
  });

  app.delete("/api/departments/:id", authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteDepartment(id);
      if (!deleted) {
        return res.status(404).json({ message: "Department not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete department" });
    }
  });

  // Employee routes
  app.get("/api/employees", authMiddleware, async (req, res) => {
    try {
      const { search, department } = req.query;
      let employees;

      if (search) {
        employees = await storage.searchEmployees(search as string);
      } else if (department) {
        employees = await storage.getEmployeesByDepartment(parseInt(department as string));
      } else {
        employees = await storage.getEmployees();
      }

      res.json(employees);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  app.get("/api/employees/:id", authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const employee = await storage.getEmployee(id);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch employee" });
    }
  });

  app.post("/api/employees", authMiddleware, async (req, res) => {
    try {
      const validatedData = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(validatedData);
      res.status(201).json(employee);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid employee data", errors: error.flatten().fieldErrors });
      } else {
        console.error("Non-Zod error in POST /api/employees:", error);
        res.status(400).json({ message: "Invalid employee data" });
      }
    }
  });

  app.put("/api/employees/:id", authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertEmployeeSchema.partial().parse(req.body);
      const employee = await storage.updateEmployee(id, validatedData);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid employee data", errors: error.flatten().fieldErrors });
      } else {
        console.error("Non-Zod error in PUT /api/employees/:id:", error);
        res.status(400).json({ message: "Invalid employee data" });
      }
    }
  });

  app.delete("/api/employees/:id", authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteEmployee(id);
      if (!deleted) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete employee" });
    }
  });

  // Leave request routes
  app.get("/api/leave-requests", authMiddleware, async (req, res) => {
    try {
      const { employee, status } = req.query;
      let leaveRequests;

      if (employee) {
        leaveRequests = await storage.getLeaveRequestsByEmployee(parseInt(employee as string));
      } else {
        leaveRequests = await storage.getLeaveRequests();
      }

      if (status && status !== "all") {
        leaveRequests = leaveRequests.filter(request => request.status === status);
      }

      res.json(leaveRequests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leave requests" });
    }
  });

  app.get("/api/leave-requests/:id", authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const leaveRequest = await storage.getLeaveRequest(id);
      if (!leaveRequest) {
        return res.status(404).json({ message: "Leave request not found" });
      }
      res.json(leaveRequest);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leave request" });
    }
  });

  app.post("/api/leave-requests", authMiddleware, async (req, res) => {
    try {
      const validatedData = insertLeaveRequestSchema.parse(req.body);
      const leaveRequest = await storage.createLeaveRequest(validatedData);
      res.status(201).json(leaveRequest);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid leave request data", errors: error.flatten().fieldErrors });
      } else {
        console.error("Non-Zod error in POST /api/leave-requests:", error);
        res.status(400).json({ message: "Invalid leave request data" });
      }
    }
  });

  app.put("/api/leave-requests/:id", authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertLeaveRequestSchema.partial().parse(req.body);
      const leaveRequest = await storage.updateLeaveRequest(id, validatedData);
      if (!leaveRequest) {
        return res.status(404).json({ message: "Leave request not found" });
      }
      res.json(leaveRequest);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid leave request data", errors: error.flatten().fieldErrors });
      } else {
        console.error("Non-Zod error in PUT /api/leave-requests/:id:", error);
        res.status(400).json({ message: "Invalid leave request data" });
      }
    }
  });

  app.delete("/api/leave-requests/:id", authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteLeaveRequest(id);
      if (!deleted) {
        return res.status(404).json({ message: "Leave request not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete leave request" });
    }
  });

  // Analytics routes
  app.get("/api/analytics/metrics", authMiddleware, async (req, res) => { // Added authMiddleware
    try {
      const [totalEmployees, activeDepartments, pendingRequests] = await Promise.all([
        storage.getEmployeeCount(),
        storage.getDepartmentCount(),
        storage.getPendingLeaveRequestsCount(),
      ]);

      res.json({
        totalEmployees,
        activeDepartments,
        pendingRequests,
        avgAttendance: "94.2%", // Static for demo
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  const httpServer = createServer(app);

  // Appointment routes
  app.post("/api/appointments", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(400).json({ message: "User ID not found in token" });
      }

      // Validate date and title presence
      const { title, date, description } = req.body;
      if (!title || !date) {
          return res.status(400).json({ message: "Title and date are required" });
      }

      // Attempt to parse the date to ensure it's valid
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
          return res.status(400).json({ message: "Invalid date format" });
      }

      const validatedData = insertAppointmentSchema.parse({
        userId: Number(userId), // Ensure userId is a number if your schema expects it
        title,
        date: parsedDate, // Use the parsed and validated date
        description
      });
      const appointment = await storage.createAppointment(validatedData);
      res.status(201).json(appointment);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid appointment data", errors: error.flatten().fieldErrors });
      } else {
        console.error("Error in POST /api/appointments:", error);
        res.status(500).json({ message: "Failed to create appointment" });
      }
    }
  });

  app.get("/api/appointments", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(400).json({ message: "User ID not found in token" });
      }
      const appointments = await storage.getAppointmentsByUserId(Number(userId));
      res.json(appointments);
    } catch (error) {
      console.error("Error in GET /api/appointments:", error);
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  app.put("/api/appointments/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.userId;
      const appointmentId = parseInt(req.params.id);

      if (!userId) {
        return res.status(400).json({ message: "User ID not found in token" });
      }
      if (isNaN(appointmentId)) {
        return res.status(400).json({ message: "Invalid appointment ID" });
      }

      const { title, date, description } = req.body;
      let parsedDate;

      if (date) {
        parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ message: "Invalid date format" });
        }
      }

      // Filter out undefined fields to only update provided ones
      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (parsedDate !== undefined) updateData.date = parsedDate;
      if (description !== undefined) updateData.description = description;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No update data provided" });
      }

      const validatedData = insertAppointmentSchema.partial().omit({ userId: true }).parse(updateData);

      const appointment = await storage.updateAppointment(appointmentId, Number(userId), validatedData);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found or user does not have permission" });
      }
      res.json(appointment);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid appointment data", errors: error.flatten().fieldErrors });
      } else {
        console.error("Error in PUT /api/appointments/:id:", error);
        res.status(500).json({ message: "Failed to update appointment" });
      }
    }
  });

  app.delete("/api/appointments/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.userId;
      const appointmentId = parseInt(req.params.id);

      if (!userId) {
        return res.status(400).json({ message: "User ID not found in token" });
      }
      if (isNaN(appointmentId)) {
        return res.status(400).json({ message: "Invalid appointment ID" });
      }

      const deleted = await storage.deleteAppointment(appointmentId, Number(userId));
      if (!deleted) {
        return res.status(404).json({ message: "Appointment not found or user does not have permission" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error in DELETE /api/appointments/:id:", error);
      res.status(500).json({ message: "Failed to delete appointment" });
    }
  });

  return httpServer;
}
