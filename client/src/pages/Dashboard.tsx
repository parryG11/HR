import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building, Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Metrics {
  totalEmployees: number;
  activeDepartments: number;
  pendingRequests: number;
  avgAttendance: string;
}

export default function Dashboard() {
  const { data: metrics, isLoading } = useQuery<Metrics>({
    queryKey: ["/api/analytics/metrics"],
  });

  const quickActions = [
    {
      title: "Add New Employee",
      description: "Register a new team member",
      icon: Users,
      action: () => window.location.href = "/employees",
      primary: true,
    },
    {
      title: "Create Department",
      description: "Set up a new department",
      icon: Building,
      action: () => window.location.href = "/departments",
    },
    {
      title: "Review Requests",
      description: "Check pending leave requests",
      icon: Clock,
      action: () => window.location.href = "/leave",
    },
  ];

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="metric-card">
              <CardContent className="pt-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-16 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="metric-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {metrics?.totalEmployees || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <Badge variant="secondary" className="text-accent">
                Active
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Departments</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {metrics?.activeDepartments || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Building className="h-6 w-6 text-accent" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <Badge variant="secondary" className="text-accent">
                Growing
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Requests</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {metrics?.pendingRequests || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <Badge variant="secondary" className="text-orange-600">
                {metrics?.pendingRequests ? "Needs attention" : "All clear"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Attendance</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {metrics?.avgAttendance || "N/A"}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <Badge variant="secondary" className="text-accent">
                Excellent
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant={action.primary ? "default" : "outline"}
                className="w-full justify-start text-left h-auto p-4"
                onClick={action.action}
              >
                <div className="flex items-center space-x-3">
                  <action.icon className="h-5 w-5" />
                  <div>
                    <div className="font-medium">{action.title}</div>
                    <div className="text-sm text-muted-foreground">{action.description}</div>
                  </div>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* System Status */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>System Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <h4 className="font-medium">Employee Database</h4>
                  <p className="text-sm text-muted-foreground">All employee records are up to date</p>
                </div>
                <Badge className="status-active">Active</Badge>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <h4 className="font-medium">Leave Management</h4>
                  <p className="text-sm text-muted-foreground">
                    {metrics?.pendingRequests ? `${metrics.pendingRequests} requests awaiting review` : "No pending requests"}
                  </p>
                </div>
                <Badge className={metrics?.pendingRequests ? "status-pending" : "status-active"}>
                  {metrics?.pendingRequests ? "Pending" : "Current"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <h4 className="font-medium">Department Structure</h4>
                  <p className="text-sm text-muted-foreground">
                    {metrics?.activeDepartments ? `${metrics.activeDepartments} departments active` : "No departments set up"}
                  </p>
                </div>
                <Badge className="status-active">Organized</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
