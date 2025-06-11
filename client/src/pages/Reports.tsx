import { useState } from "react";
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

  // Mock recent reports data
  const recentReports: ReportData[] = [
    {
      id: "1",
      name: "Employee Directory - Q4 2024",
      type: "PDF",
      generatedDate: "2024-12-10",
      size: "2.4 MB"
    },
    {
      id: "2",
      name: "Leave Summary - November 2024",
      type: "Excel",
      generatedDate: "2024-12-01",
      size: "1.8 MB"
    },
    {
      id: "3",
      name: "Department Analysis - Q3 2024",
      type: "PDF",
      generatedDate: "2024-11-15",
      size: "3.1 MB"
    }
  ];

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

        {/* Recent Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
          </CardHeader>
          <CardContent>
            {recentReports.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No reports generated yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentReports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center">
                        {getReportIcon(report.type)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{report.name}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <p className="text-xs text-muted-foreground">
                            Generated on {formatDate(report.generatedDate)}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {report.size}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadReport(report.name)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>HR Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Employee Growth Chart Placeholder */}
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="text-sm font-medium text-foreground mb-4">Employee Growth (Last 6 Months)</h4>
              <div className="h-40 bg-background rounded border-2 border-dashed border-border flex items-center justify-center">
                <div className="text-center">
                  <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Employee Growth Chart</p>
                  <p className="text-xs text-muted-foreground mt-1">Chart visualization would be implemented here</p>
                </div>
              </div>
            </div>

            {/* Department Distribution Placeholder */}
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="text-sm font-medium text-foreground mb-4">Department Distribution</h4>
              <div className="h-40 bg-background rounded border-2 border-dashed border-border flex items-center justify-center">
                <div className="text-center">
                  <PieChart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Department Distribution Chart</p>
                  <p className="text-xs text-muted-foreground mt-1">Pie chart would be implemented here</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
