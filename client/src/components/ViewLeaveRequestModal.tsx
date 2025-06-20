import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient"; // Explicitly set correct import
import { LeaveRequest } from "@/lib/types";
import { formatDate, calculateDaysBetween } from "@/lib/utils"; // Assuming utils has these

interface ViewLeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaveRequestId: number | null;
}

const ViewLeaveRequestModal = ({
  isOpen,
  onClose,
  leaveRequestId,
}: ViewLeaveRequestModalProps) => {
  const {
    data: leaveRequest,
    isLoading,
    error,
  } = useQuery<LeaveRequest>({
    queryKey: ["leaveRequest", leaveRequestId],
    queryFn: async () => {
      if (!leaveRequestId) throw new Error("No leave request ID provided.");
      return apiRequest<LeaveRequest>(`/api/leave-requests/${leaveRequestId}`, "GET");
    },
    enabled: !!leaveRequestId && isOpen, // Only run query if ID is present and modal is open
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "success";
      case "rejected":
        return "destructive";
      case "pending":
      default:
        return "outline";
    }
  };

  const duration = leaveRequest
    ? calculateDaysBetween(new Date(leaveRequest.startDate), new Date(leaveRequest.endDate))
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Leave Request Details</DialogTitle>
          <DialogDescription>
            Review the details of the leave request.
          </DialogDescription>
        </DialogHeader>
        {isLoading && <p>Loading...</p>}
        {error && <p className="text-red-500">Error: {error.message}</p>}
        {leaveRequest && !isLoading && !error && (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <p className="text-sm font-medium text-muted-foreground col-span-1">Employee</p>
              <p className="col-span-3">{leaveRequest.employeeName}</p>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <p className="text-sm font-medium text-muted-foreground col-span-1">Position</p>
              <p className="col-span-3">{leaveRequest.employeePosition}</p>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <p className="text-sm font-medium text-muted-foreground col-span-1">Leave Type</p>
              <p className="col-span-3">{leaveRequest.leaveType}</p>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <p className="text-sm font-medium text-muted-foreground col-span-1">Start Date</p>
              <p className="col-span-3">{formatDate(leaveRequest.startDate)}</p>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <p className="text-sm font-medium text-muted-foreground col-span-1">End Date</p>
              <p className="col-span-3">{formatDate(leaveRequest.endDate)}</p>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <p className="text-sm font-medium text-muted-foreground col-span-1">Duration</p>
              <p className="col-span-3">{duration} day(s)</p>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <p className="text-sm font-medium text-muted-foreground col-span-1">Reason</p>
              <p className="col-span-3 break-all">{leaveRequest.reason || "N/A"}</p>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <p className="text-sm font-medium text-muted-foreground col-span-1">Status</p>
              <p className="col-span-3">
                <Badge variant={getStatusBadgeVariant(leaveRequest.status) as any}>
                  {leaveRequest.status}
                </Badge>
              </p>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <p className="text-sm font-medium text-muted-foreground col-span-1">Applied On</p>
              <p className="col-span-3">{formatDate(leaveRequest.appliedDate)}</p>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ViewLeaveRequestModal;
