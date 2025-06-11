import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface AddDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DepartmentFormData {
  name: string;
  description: string;
  manager: string;
}

export default function AddDepartmentModal({ isOpen, onClose }: AddDepartmentModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<DepartmentFormData>({
    name: "",
    description: "",
    manager: "",
  });

  const createDepartmentMutation = useMutation({
    mutationFn: async (departmentData: DepartmentFormData) => {
      const response = await apiRequest("POST", "/api/departments", departmentData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/metrics"] });
      toast({
        title: "Success",
        description: "Department created successfully",
      });
      onClose();
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create department",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      manager: "",
    });
  };

  const handleInputChange = (field: keyof DepartmentFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Department name is required",
        variant: "destructive",
      });
      return;
    }

    createDepartmentMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Create New Department</DialogTitle>
          <DialogDescription>
            Set up a new department to organize your workforce.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Department Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="e.g., Engineering, Marketing, Sales"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Brief description of the department's role and responsibilities"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="manager">Department Manager</Label>
            <Input
              id="manager"
              value={formData.manager}
              onChange={(e) => handleInputChange("manager", e.target.value)}
              placeholder="Manager's name (optional)"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createDepartmentMutation.isPending}>
              {createDepartmentMutation.isPending ? "Creating..." : "Create Department"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
