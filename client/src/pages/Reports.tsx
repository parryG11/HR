import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Metrics } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, BarChart3, PieChart, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReportData {
  id: string;
  name: string;
  type: string;
  generatedDate: string;
  size: string;
}

export default function Reports() {
  const [reportType, setReportType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { toast } = useToast();

  const { data: metricsData, isLoading: metricsIsLoading, error: metricsError } = useQuery<Metrics>({
    queryKey: ['/api/analytics/metrics'],
    // queryFn is handled by the defaultQueryFn in queryClient.ts
  });

  const handleGenerateReport = () => {
    if (!reportType) {
      toast({
        title: "Error",
        description: "Please select a report type",
        variant: "destructive",
      });
      return;
    }

    // Simulate report generation
    toast({
      title: "Report Generation Started",
      description: "Your report is being generated and will be available shortly",
    });
  };

  const handleDownloadReport = (reportName: string) => {
    toast({
      title: "Download Started",
      description: `Downloading ${reportName}...`,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getReportIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "pdf":
        return <FileText className="h-5 w-5 text-red-600" />;
      case "excel":
        return <FileText className="h-5 w-5 text-green-600" />;
      default:
        return <FileText className="h-5 w-5 text-blue-600" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Report Generation */}
        <Card>
          <CardHeader>
            <CardTitle>Generate Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="reportType" className="text-sm font-medium">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee-directory">Employee Directory</SelectItem>
                  <SelectItem value="department-summary">Department Summary</SelectItem>
                  <SelectItem value="leave-summary">Leave Summary</SelectItem>
                  <SelectItem value="attendance-report">Attendance Report</SelectItem>
                  <SelectItem value="analytics-overview">Analytics Overview</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate" className="text-sm font-medium">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="endDate" className="text-sm font-medium">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>
            
            <Button onClick={handleGenerateReport} className="w-full">
              <BarChart3 className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </CardContent>
        </Card>
        {/* The "Recent Reports" card is removed as requested */}
      </div>

      {/* Live HR Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>HR Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          {metricsIsLoading && (
            <div className="flex items-center justify-center h-40">
              <p className="text-muted-foreground">Loading analytics data...</p>
            </div>
          )}
          {metricsError && (
            <div className="flex items-center justify-center h-40">
              <p className="text-destructive">
                Error fetching analytics data: {metricsError.message}
              </p>
            </div>
          )}
          {metricsData && !metricsIsLoading && !metricsError && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metricsData.totalEmployees}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Active Departments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metricsData.activeDepartments}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metricsData.pendingRequests}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Attendance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metricsData.avgAttendance}</div>
                </CardContent>
              </Card>
            </div>
          )}
          {!metricsIsLoading && !metricsError && !metricsData && (
             <div className="flex items-center justify-center h-40">
              <p className="text-muted-foreground">Analytics data is currently unavailable.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
