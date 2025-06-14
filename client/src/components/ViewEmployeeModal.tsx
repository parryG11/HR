import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Employee } from "@/lib/types";

interface ViewEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
}

const ViewEmployeeModal = ({ isOpen, onClose, employee }: ViewEmployeeModalProps) => {
  if (!employee) {
    return null;
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    // Using descriptive class names that might exist in global CSS or Badge variants
    // Fallback to generic badge if specific status class isn't hit.
    switch (status?.toLowerCase()) {
      case "active":
        return <Badge className="status-active">Active</Badge>;
      case "on leave":
        return <Badge className="status-on-leave">On Leave</Badge>;
      case "inactive":
        return <Badge className="status-inactive">Inactive</Badge>;
      default:
        return <Badge>{status || "N/A"}</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Employee Details</DialogTitle>
          <DialogDescription>
            Viewing information for {employee.firstName} {employee.lastName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-muted-foreground">Full Name</dt>
              <dd className="mt-1 text-sm text-foreground">{employee.firstName} {employee.lastName}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-muted-foreground">Email</dt>
              <dd className="mt-1 text-sm text-foreground">{employee.email}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-muted-foreground">Position</dt>
              <dd className="mt-1 text-sm text-foreground">{employee.position}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-muted-foreground">Department</dt>
              <dd className="mt-1 text-sm text-foreground">{employee.departmentName || "N/A"}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-muted-foreground">Start Date</dt>
              <dd className="mt-1 text-sm text-foreground">{formatDate(employee.startDate)}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-muted-foreground">Phone</dt>
              <dd className="mt-1 text-sm text-foreground">{employee.phone || "N/A"}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-muted-foreground">Status</dt>
              <dd className="mt-1 text-sm text-foreground">{getStatusBadge(employee.status)}</dd>
            </div>
          </dl>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ViewEmployeeModal;
