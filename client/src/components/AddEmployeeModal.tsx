import { useState, useEffect } from "react"; // Added useEffect
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Department, Employee } from "@/lib/types"; // Added Employee type

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeToEdit?: Employee | null; // Added for editing
}

interface EmployeeFormData {
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  departmentId: string;
  departmentName: string;
  startDate: string;
  phone: string;
  status: string;
}

export default function AddEmployeeModal({ isOpen, onClose, employeeToEdit }: AddEmployeeModalProps) { // Added employeeToEdit
  const { toast } = useToast();
  const [formData, setFormData] = useState<EmployeeFormData>({
    firstName: "",
    lastName: "",
    email: "",
    position: "",
    departmentId: "",
    departmentName: "",
    startDate: "",
    phone: "",
    status: "active",
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  useEffect(() => {
    if (isOpen) {
      if (employeeToEdit) {
        setFormData({
          firstName: employeeToEdit.firstName || "",
          lastName: employeeToEdit.lastName || "",
          email: employeeToEdit.email || "",
          position: employeeToEdit.position || "",
          departmentId: employeeToEdit.departmentId?.toString() || "",
          departmentName: employeeToEdit.departmentName || "",
          startDate: employeeToEdit.startDate ? employeeToEdit.startDate.split('T')[0] : "",
          phone: employeeToEdit.phone || "",
          status: employeeToEdit.status || "active",
        });
      } else {
        resetForm();
      }
    }
  }, [isOpen, employeeToEdit]);

  const saveEmployeeMutation = useMutation({ // Renamed createEmployeeMutation
    mutationFn: async (employeeData: EmployeeFormData) => { // Use EmployeeFormData
      const apiMethod = employeeToEdit ? "PUT" : "POST";
      const apiUrl = employeeToEdit
        ? `/api/employees/${employeeToEdit.id}`
        : "/api/employees";

      const payload = {
        ...employeeData,
        departmentId: employeeData.departmentId ? parseInt(employeeData.departmentId) : null,
      };

      const response = await apiRequest(apiMethod, apiUrl, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/metrics"] });
      toast({
        title: "Success",
        description: employeeToEdit ? "Employee updated successfully" : "Employee added successfully",
      });
      onClose();
      // resetForm(); // Removed, useEffect and onClose prop should handle this
    },
    onError: () => {
      toast({
        title: "Error",
        description: employeeToEdit ? "Failed to update employee" : "Failed to add employee",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      position: "",
      departmentId: "",
      departmentName: "",
      startDate: "",
      phone: "",
      status: "active",
    });
  };

  const handleInputChange = (field: keyof EmployeeFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDepartmentChange = (departmentId: string) => {
    const department = departments.find(d => d.id.toString() === departmentId);
    setFormData(prev => ({
      ...prev,
      departmentId: departmentId, // Keep as string here, parsed in handleSubmit
      departmentName: department?.name || "",
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.position || !formData.startDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const employeeData = {
      ...formData,
      // departmentId is already string or null, will be parsed in mutationFn
    };

    saveEmployeeMutation.mutate(employeeData); // Renamed createEmployeeMutation
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{employeeToEdit ? "Edit Employee" : "Add New Employee"}</DialogTitle>
          <DialogDescription>
            {employeeToEdit
              ? "Make changes to the employee's information below."
              : "Enter the new employee's information below. Fields marked with * are required."}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                placeholder="Enter first name"
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                placeholder="Enter last name"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="employee@company.com"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="position">Position *</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => handleInputChange("position", e.target.value)}
                placeholder="Job title"
                required
              />
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Select value={formData.departmentId} onValueChange={handleDepartmentChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange("startDate", e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveEmployeeMutation.isPending}>
              {saveEmployeeMutation.isPending
                ? (employeeToEdit ? "Saving..." : "Adding...")
                : (employeeToEdit ? "Save Changes" : "Add Employee")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
