export interface Department {
  id: number;
  name: string;
  description?: string;
  manager?: string;
  employeeCount?: number;
}

export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  departmentId?: number;
  departmentName?: string;
  startDate: string;
  phone?: string;
  status: string;
}

export interface LeaveRequest {
  id: number;
  employeeId: number;
  employeeName: string;
  employeePosition: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: string;
  appliedDate: string;
  reason?: string;
}

export interface Metrics {
  totalEmployees: number;
  activeDepartments: number;
  pendingRequests: number;
  avgAttendance: string;
}

export interface Notification {
  id: number;
  userId: number;
  type: string;
  message: string;
  link?: string | null; // Link can be optional or null
  isRead: boolean;
  createdAt: string; // Assuming ISO date string
}

export interface LeaveType {
  id: number;
  name: string;
  description?: string | null;
  defaultDays: number;
}

// For displaying leave balance, including the leave type name
export interface LeaveBalanceDisplay {
  id: number; // balance id
  employeeId: number;
  leaveTypeId: number;
  year: number;
  totalEntitlement: number;
  daysUsed: number;
  leaveTypeName?: string | null; // Joined from leave_types table
}
