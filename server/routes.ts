import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDepartmentSchema, insertEmployeeSchema, insertLeaveRequestSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Department routes
  app.get("/api/departments", async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch departments" });
    }
  });

  app.get("/api/departments/:id", async (req, res) => {
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

  app.post("/api/departments", async (req, res) => {
    try {
      const validatedData = insertDepartmentSchema.parse(req.body);
      const department = await storage.createDepartment(validatedData);
      res.status(201).json(department);
    } catch (error) {
      res.status(400).json({ message: "Invalid department data" });
    }
  });

  app.put("/api/departments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertDepartmentSchema.partial().parse(req.body);
      const department = await storage.updateDepartment(id, validatedData);
      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }
      res.json(department);
    } catch (error) {
      res.status(400).json({ message: "Invalid department data" });
    }
  });

  app.delete("/api/departments/:id", async (req, res) => {
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
  app.get("/api/employees", async (req, res) => {
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

  app.get("/api/employees/:id", async (req, res) => {
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

  app.post("/api/employees", async (req, res) => {
    try {
      const validatedData = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(validatedData);
      res.status(201).json(employee);
    } catch (error) {
      res.status(400).json({ message: "Invalid employee data" });
    }
  });

  app.put("/api/employees/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertEmployeeSchema.partial().parse(req.body);
      const employee = await storage.updateEmployee(id, validatedData);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      res.status(400).json({ message: "Invalid employee data" });
    }
  });

  app.delete("/api/employees/:id", async (req, res) => {
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
  app.get("/api/leave-requests", async (req, res) => {
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

  app.get("/api/leave-requests/:id", async (req, res) => {
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

  app.post("/api/leave-requests", async (req, res) => {
    try {
      const validatedData = insertLeaveRequestSchema.parse(req.body);
      const leaveRequest = await storage.createLeaveRequest(validatedData);
      res.status(201).json(leaveRequest);
    } catch (error) {
      res.status(400).json({ message: "Invalid leave request data" });
    }
  });

  app.put("/api/leave-requests/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertLeaveRequestSchema.partial().parse(req.body);
      const leaveRequest = await storage.updateLeaveRequest(id, validatedData);
      if (!leaveRequest) {
        return res.status(404).json({ message: "Leave request not found" });
      }
      res.json(leaveRequest);
    } catch (error) {
      res.status(400).json({ message: "Invalid leave request data" });
    }
  });

  app.delete("/api/leave-requests/:id", async (req, res) => {
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
  app.get("/api/analytics/metrics", async (req, res) => {
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
  return httpServer;
}
