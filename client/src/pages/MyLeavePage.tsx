import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient"; // Use a common apiRequest
import type { LeaveRequest, LeaveType, LeaveBalanceDisplay } from "@/lib/types";
import { formatDate, formatToYYYYMMDD, calculateDaysBetween } from "@/lib/utils";
import { cn } from "@/lib/utils"; // For Popover Calendar button styling

// ASSUMPTION: Hardcoded employee details. Replace with actual auth context.
const HARDCODED_EMPLOYEE_ID = 1;
const HARDCODED_EMPLOYEE_NAME = "John Doe"; // Example, ensure this employee exists for testing
const HARDCODED_EMPLOYEE_POSITION = "Software Engineer"; // Example

// Define variants based on ShadCN/UI's default Badge component variants
// and custom ones like "success" and "destructive" if styled separately.
type BadgeVariant = "default" | "secondary" | "outline" | "destructive" | "success";

export default function MyLeavePage() {
  const { toast } = useToast();

  // Form State
  // Stores the NAME of the selected leave type directly from the Select component.
  const [selectedLeaveTypeNameValue, setSelectedLeaveTypeNameValue] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [reason, setReason] = useState<string>("");

  // Fetch Leave Types
  const { data: leaveTypes = [], isLoading: isLoadingLeaveTypes } = useQuery<LeaveType[]>({
    queryKey: ["leaveTypes"],
    queryFn: () => apiRequest<LeaveType[]>("/api/leave-types", "GET"),
  });

  // Fetch Leave Balance for selected type and current year
  const currentYear = new Date().getFullYear();
  const { data: leaveBalance, isLoading: isLoadingLeaveBalance } = useQuery<LeaveBalanceDisplay[]>({
    queryKey: ["leaveBalance", HARDCODED_EMPLOYEE_ID, selectedLeaveTypeNameValue, currentYear],
    queryFn: async () => {
      if (!selectedLeaveTypeNameValue) return []; // Don't fetch if no type selected
      // Find the selected leave type object to get its ID for the balance query
      // This check might be redundant if selectedLeaveTypeNameValue guarantees a valid type from leaveTypes
      const selectedTypeObj = leaveTypes.find(lt => lt.name === selectedLeaveTypeNameValue);
      if (!selectedTypeObj) return []; // Or handle as error / no balance

      // The API /api/employees/:employeeId/leave-balances already joins with leave_types and returns leaveTypeName
      const balances = await apiRequest<LeaveBalanceDisplay[]>(
        `/api/employees/${HARDCODED_EMPLOYEE_ID}/leave-balances?year=${currentYear}`, "GET"
      );
      // Filter for the selected leave type by its name
      return balances.filter(b => b.leaveTypeName === selectedLeaveTypeNameValue);
    },
    enabled: !!selectedLeaveTypeNameValue && leaveTypes.length > 0,
  });
  
  const currentBalanceForSelectedType: LeaveBalanceDisplay | undefined = leaveBalance?.[0];


  // Mutation for Submitting Leave Request
  const mutation = useMutation({
    mutationFn: (newLeaveRequest: Omit<LeaveRequest, "id" | "status" >) => // Backend assigns ID and default status
      apiRequest<LeaveRequest>("/api/leave-requests", "POST", newLeaveRequest),
    onSuccess: (data, variables) => { // Access submitted variables if needed for invalidation
      toast({ title: "Success", description: "Leave request submitted successfully." });
      queryClient.invalidateQueries({ queryKey: ["employeeLeaveRequests", HARDCODED_EMPLOYEE_ID] });
      // Invalidate based on the leaveType name that was actually submitted
      queryClient.invalidateQueries({ queryKey: ["leaveBalance", HARDCODED_EMPLOYEE_ID, variables.leaveType, currentYear] });
      // Reset form
      setSelectedLeaveTypeNameValue("");
      setStartDate(undefined);
      setEndDate(undefined);
      setReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit leave request.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !selectedLeaveTypeNameValue) {
      toast({ title: "Validation Error", description: "Please fill all required fields (Leave Type, Start Date, End Date).", variant: "destructive" });
      return;
    }
    if (endDate < startDate) {
      toast({ title: "Validation Error", description: "End date cannot be before start date.", variant: "destructive" });
      return;
    }

    const appliedDate = formatToYYYYMMDD(new Date());

    mutation.mutate({
      employeeId: HARDCODED_EMPLOYEE_ID,
      employeeName: HARDCODED_EMPLOYEE_NAME,
      employeePosition: HARDCODED_EMPLOYEE_POSITION,
      leaveType: selectedLeaveTypeNameValue, // Send name string as per schema
      startDate: formatToYYYYMMDD(startDate),
      endDate: formatToYYYYMMDD(endDate),
      reason: reason,
      appliedDate: appliedDate,
    });
  };

  // Fetch Employee's Leave Requests
  const { data: employeeLeaveRequests = [], isLoading: isLoadingEmployeeRequests } = useQuery<LeaveRequest[]>({
    queryKey: ["employeeLeaveRequests", HARDCODED_EMPLOYEE_ID],
    queryFn: () => apiRequest<LeaveRequest[]>(`/api/leave-requests?employee=${HARDCODED_EMPLOYEE_ID}`, "GET"),
    enabled: !!HARDCODED_EMPLOYEE_ID,
  });
  
  const getStatusBadgeVariant = (status: string | undefined): BadgeVariant => {
    switch (status?.toLowerCase()) {
      case "approved": return "success";
      case "rejected": return "destructive";
      case "pending": 
      default: return "outline"; // Default to "outline" for pending or unknown statuses
    }
  };

  // Removed useEffect for selectedLeaveTypeName as it's no longer needed.
  // selectedLeaveTypeNameValue now directly holds the name from the Select component.

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Apply for Leave Section */}
      <Card>
        <CardHeader>
          <CardTitle>Apply for Leave</CardTitle>
          <CardDescription>Fill out the form below to request time off.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Leave Type Select */}
              <div className="space-y-2">
                <Label htmlFor="leaveType">Leave Type</Label>
                <Select
                  value={selectedLeaveTypeNameValue} // Stores the name of the leave type
                  onValueChange={setSelectedLeaveTypeNameValue} // Sets the name
                  disabled={isLoadingLeaveTypes || mutation.isPending}
                >
                  <SelectTrigger id="leaveType">
                    <SelectValue placeholder="Select a leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingLeaveTypes ? (
                      <SelectItem value="loading" disabled>Loading types...</SelectItem>
                    ) : (
                      leaveTypes.map((type) => (
                        <SelectItem key={type.id} value={type.name}>
                          {type.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Leave Balance Display */}
              <div className="space-y-2">
                <Label>Leave Balance (Current Year: {currentYear})</Label>
                <div className="p-3 border rounded-md bg-muted min-h-[60px]">
                  {isLoadingLeaveBalance && selectedLeaveTypeNameValue && <p className="text-sm text-muted-foreground">Loading balance...</p>}
                  {!selectedLeaveTypeNameValue && <p className="text-sm text-muted-foreground">Select a leave type to see balance.</p>}
                  {selectedLeaveTypeNameValue && !isLoadingLeaveBalance && !currentBalanceForSelectedType && <p className="text-sm text-destructive">No balance record found for {selectedLeaveTypeNameValue}.</p>}
                  {currentBalanceForSelectedType && (
                    <div>
                      <p className="text-sm">
                        <strong>{currentBalanceForSelectedType.leaveTypeName}:</strong> Entitled: {currentBalanceForSelectedType.totalEntitlement} days, Used: {currentBalanceForSelectedType.daysUsed} days
                      </p>
                      <p className="text-sm text-primary">
                        Available: {currentBalanceForSelectedType.totalEntitlement - currentBalanceForSelectedType.daysUsed} days
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Start Date */}
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                      disabled={mutation.isPending}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? formatDate(startDate) : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) || mutation.isPending}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                      disabled={mutation.isPending}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? formatDate(endDate) : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      disabled={(date) => (startDate && date < startDate) || date < new Date(new Date().setHours(0,0,0,0)) || mutation.isPending}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            {/* Duration Display (Optional) */}
            {startDate && endDate && calculateDaysBetween(startDate, endDate) > 0 && (
                 <div className="space-y-2">
                    <Label>Duration</Label>
                    <p className="text-sm p-3 border rounded-md bg-muted">
                        {calculateDaysBetween(startDate, endDate)} day(s)
                    </p>
                </div>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for leave (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={mutation.isPending}
                rows={3}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={mutation.isPending || !startDate || !endDate || !selectedLeaveTypeNameValue}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* My Leave Requests Section */}
      <Card>
        <CardHeader>
          <CardTitle>My Leave History</CardTitle>
          <CardDescription>Your past and current leave requests.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingEmployeeRequests && <p>Loading your leave requests...</p>}
          {!isLoadingEmployeeRequests && employeeLeaveRequests.length === 0 && (
            <p className="text-sm text-muted-foreground">You have not submitted any leave requests yet.</p>
          )}
          {!isLoadingEmployeeRequests && employeeLeaveRequests.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeLeaveRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.leaveType}</TableCell>
                    <TableCell>{formatDate(request.startDate)}</TableCell>
                    <TableCell>{formatDate(request.endDate)}</TableCell>
                    <TableCell>{calculateDaysBetween(request.startDate, request.endDate)} day(s)</TableCell>
                    <TableCell className="max-w-[200px] truncate">{request.reason || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(request.status)}>
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(request.appliedDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
