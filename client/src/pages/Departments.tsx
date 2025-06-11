import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Building, Users, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import AddDepartmentModal from "@/components/AddDepartmentModal";
import type { Department } from "@/lib/types";

export default function Departments() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { toast } = useToast();

  const { data: departments = [], isLoading } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const deleteDepartmentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/departments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/metrics"] });
      toast({
        title: "Success",
        description: "Department deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete department",
        variant: "destructive",
      });
    },
  });

  const handleDeleteDepartment = (id: number) => {
    deleteDepartmentMutation.mutate(id);
  };

  const getDepartmentIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("engineering") || lowerName.includes("tech")) {
      return "fas fa-code";
    } else if (lowerName.includes("marketing")) {
      return "fas fa-chart-line";
    } else if (lowerName.includes("sales")) {
      return "fas fa-handshake";
    } else if (lowerName.includes("hr") || lowerName.includes("human")) {
      return "fas fa-users";
    } else if (lowerName.includes("finance")) {
      return "fas fa-calculator";
    }
    return "fas fa-building";
  };

  const getIconColor = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("engineering") || lowerName.includes("tech")) {
      return "text-blue-600 bg-blue-100";
    } else if (lowerName.includes("marketing")) {
      return "text-green-600 bg-green-100";
    } else if (lowerName.includes("sales")) {
      return "text-purple-600 bg-purple-100";
    } else if (lowerName.includes("hr") || lowerName.includes("human")) {
      return "text-orange-600 bg-orange-100";
    } else if (lowerName.includes("finance")) {
      return "text-yellow-600 bg-yellow-100";
    }
    return "text-gray-600 bg-gray-100";
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                  <div className="flex space-x-2">
                    <div className="w-8 h-8 bg-gray-200 rounded"></div>
                    <div className="w-8 h-8 bg-gray-200 rounded"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Department Management</h1>
          <p className="text-muted-foreground">Organize and manage company departments</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Department
        </Button>
      </div>

      {departments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No departments found</h3>
            <p className="text-muted-foreground mb-4">
              Get started by creating your first department to organize your workforce
            </p>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Department
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((department) => (
            <Card key={department.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getIconColor(department.name)}`}>
                    <i className={`${getDepartmentIcon(department.name)} text-xl`}></i>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm">
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
                          <AlertDialogTitle>Delete Department</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete the {department.name} department? 
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteDepartment(department.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{department.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {department.description || "No description available"}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>Employees: </span>
                      <span className="font-medium text-foreground">
                        {department.employeeCount || 0}
                      </span>
                    </div>
                    
                    {department.manager && (
                      <div className="text-muted-foreground">
                        <span>Manager: </span>
                        <span className="font-medium text-foreground">
                          {department.manager}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* Add Department Card */}
          <Card 
            className="border-2 border-dashed border-muted-foreground/25 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer"
            onClick={() => setIsAddModalOpen(true)}
          >
            <CardContent className="flex flex-col items-center justify-center p-6 min-h-[200px] text-center">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-4">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-muted-foreground mb-2">Add Department</h3>
              <p className="text-sm text-muted-foreground">
                Create a new department to organize your workforce
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <AddDepartmentModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />
    </div>
  );
}
