import { useState } from "react";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { LeaveRequest } from "@/lib/types";
import { formatDate, formatToYYYYMMDD, calculateDaysBetween } from "@/lib/utils";
import { cn } from "@/lib/utils";

// Import Select components from the UI library
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const HARDCODED_EMPLOYEE_ID = 1;
const HARDCODED_EMPLOYEE_NAME = "John Doe";
const HARDCODED_EMPLOYEE_POSITION = "Software Engineer";
const currentYear = new Date().getFullYear();

type BadgeVariant = "default" | "secondary" | "outline" | "destructive" | "success";

export default function MyLeavePage() {
  const { toast } = useToast();

  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [reason, setReason] = useState<string>("");
  const [selectedLeaveTypeNameValue, setSelectedLeaveTypeNameValue] = useState<string>("");

  const mutation = useMutation({
    mutationFn: async (newLeaveRequest: Omit<LeaveRequest, "id" | "status">): Promise<LeaveRequest> => {
      const response = await apiRequest(
        "POST",
        "/api/leave-requests",
        newLeaveRequest
      );
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Leave request submitted successfully." });
      queryClient.invalidateQueries({ queryKey: ["employeeLeaveRequests", HARDCODED_EMPLOYEE_ID] });
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
      toast({
        title: "Validation Error",
        description: "Please fill all required fields (Leave Type, Start Date, End Date).",
        variant: "destructive"
      });
      return;
    }
    if (endDate < startDate) {
      toast({
        title: "Validation Error",
        description: "End date cannot be before start date.",
        variant: "destructive"
      });
      return;
    }

    const appliedDate = formatToYYYYMMDD(new Date());

    mutation.mutate({
      employeeId: HARDCODED_EMPLOYEE_ID,
      employeeName: HARDCODED_EMPLOYEE_NAME,
      employeePosition: HARDCODED_EMPLOYEE_POSITION,
      leaveType: selectedLeaveTypeNameValue,
      startDate: formatToYYYYMMDD(startDate),
      endDate: formatToYYYYMMDD(endDate),
      reason,
      appliedDate,
    });
  };

  const { data: employeeLeaveRequests = [], isLoading: isLoadingEmployeeRequests } = useQuery<LeaveRequest[]>({
    queryKey: ["employeeLeaveRequests", HARDCODED_EMPLOYEE_ID],
    enabled: !!HARDCODED_EMPLOYEE_ID,
  });

  const getStatusBadgeVariant = (status: string | undefined): BadgeVariant => {
    switch (status?.toLowerCase()) {
      case "approved": return "success";
      case "rejected": return "destructive";
      case "pending":
      default: return "outline";
    }
  };

  const staticLeaveTypes = [
    "Annual Leave",
    "Personal Leave",
    "Sick Leave",
    "Business Leave",
  ];

  return (
    <div className="container mx-auto p-6 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Apply for Leave</CardTitle>
          <CardDescription>Fill out the form below to request time off.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="leaveType" className="text-sm font-medium">Leave Type</label>
              <Select
                value={selectedLeaveTypeNameValue}
                onValueChange={setSelectedLeaveTypeNameValue}
                disabled={mutation.isPending}
              >
                <SelectTrigger id="leaveType">
                  <SelectValue placeholder="Select a leave type" />
                </SelectTrigger>
                <SelectContent>
                  {staticLeaveTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
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
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0)) || mutation.isPending}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
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
                      disabled={(date) => (startDate && date < startDate) || date < new Date(new Date().setHours(0, 0, 0, 0)) || mutation.isPending}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {startDate && endDate && calculateDaysBetween(startDate, endDate) > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Duration</label>
                <p className="text-sm p-3 border rounded-md bg-muted">
                  {calculateDaysBetween(startDate, endDate)} day(s)
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Reason</label>
              <Textarea
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
