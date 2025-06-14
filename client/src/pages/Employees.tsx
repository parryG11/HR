import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Search, Eye, Edit, Trash2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import AddEmployeeModal from "@/components/AddEmployeeModal";
import ViewEmployeeModal from "@/components/ViewEmployeeModal"; // Added
import type { Employee, Department } from "@/lib/types";

export default function Employees() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // Added for edit
  const [selectedEmployeeForEdit, setSelectedEmployeeForEdit] = useState<Employee | null>(null); // Added for edit
  const [isViewModalOpen, setIsViewModalOpen] = useState(false); // Added
  const [selectedEmployeeForView, setSelectedEmployeeForView] = useState<Employee | null>(null); // Added
  const { toast } = useToast();

  const { data: employees = [], isLoading: loadingEmployees } = useQuery<Employee[]>({
    queryKey: ["/api/employees", { search: searchQuery || undefined, department: selectedDepartment !== "all" ? selectedDepartment : undefined }],
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/metrics"] });
      toast({
        title: "Success",
        description: "Employee deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete employee",
        variant: "destructive",
      });
    },
  });

  const handleDeleteEmployee = (id: number) => {
    deleteEmployeeMutation.mutate(id);
  };

  const handleViewEmployee = (employee: Employee) => { // Added
    setSelectedEmployeeForView(employee);
    setIsViewModalOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => { // Added for edit
    setSelectedEmployeeForEdit(employee);
    setIsEditModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return <Badge className="status-active">Active</Badge>;
      case "on leave":
        return <Badge className="status-on-leave">On Leave</Badge>;
      case "inactive":
        return <Badge className="status-inactive">Inactive</Badge>;
      default:
        return <Badge className="status-active">Active</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Employee Directory</CardTitle>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </div>
          
          <div className="flex items-center space-x-4 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id.toString()}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent>
          {loadingEmployees ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No employees found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || selectedDepartment !== "all" 
                  ? "Try adjusting your search criteria" 
                  : "Get started by adding your first employee"}
              </p>
              {!searchQuery && selectedDepartment === "all" && (
                <Button onClick={() => setIsAddModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Employee
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="data-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {employee.firstName[0]}{employee.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-foreground">
                              {employee.firstName} {employee.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {employee.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground">{employee.position}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {employee.departmentName || "Unassigned"}
                      </TableCell>
                      <TableCell>{getStatusBadge(employee.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(employee.startDate)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => handleViewEmployee(employee)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEditEmployee(employee)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Employee</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {employee.firstName} {employee.lastName}? 
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteEmployee(employee.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AddEmployeeModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />
      <ViewEmployeeModal // Added
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedEmployeeForView(null);
        }}
        employee={selectedEmployeeForView}
      />
      {/* Modal for Editing Employee */}
      {isEditModalOpen && (
        <AddEmployeeModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedEmployeeForEdit(null);
          }}
          employeeToEdit={selectedEmployeeForEdit}
        />
      )}
    </div>
  );
}
