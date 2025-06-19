import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import LoginPage from "@/pages/LoginPage"; // Added
import RegisterPage from "@/pages/RegisterPage"; // Added
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Employees from "@/pages/Employees";
import Departments from "@/pages/Departments";
import LeaveManagement from "@/pages/LeaveManagement";
import Reports from "@/pages/Reports";
import CalendarPage from "@/pages/CalendarPage"; // Added
import MyLeavePage from "@/pages/MyLeavePage"; // Import MyLeavePage
import NotFound from "@/pages/not-found";

// Helper function to check for JWT
const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  // TODO: Add token validation/decoding here if needed to check expiry
  return !!token;
};

// ProtectedRoute component
const ProtectedRoute = ({ component: Component, ...rest }: any) => {
  const [location] = useLocation();
  if (!isAuthenticated()) {
    return <Redirect to="/login" state={{ from: location }} />;
  }
  return <Route {...rest} component={Component} />;
};


function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <ProtectedRoute path="/" component={DashboardLayoutWrapper} />
      <ProtectedRoute path="/employees" component={EmployeesLayoutWrapper} />
      <ProtectedRoute path="/departments" component={DepartmentsLayoutWrapper} />
      <ProtectedRoute path="/leave" component={LeaveManagementLayoutWrapper} />
      <ProtectedRoute path="/my-leave" component={MyLeavePageLayoutWrapper} /> {/* Added /my-leave route */}
      <ProtectedRoute path="/reports" component={ReportsLayoutWrapper} />
      <ProtectedRoute path="/calendar" component={CalendarPageLayoutWrapper} /> {/* Added */}
      <Route component={NotFound} />
    </Switch>
  );
}

// Wrappers to include Layout for protected routes
const DashboardLayoutWrapper = () => <Layout><Dashboard /></Layout>;
const EmployeesLayoutWrapper = () => <Layout><Employees /></Layout>;
const DepartmentsLayoutWrapper = () => <Layout><Departments /></Layout>;
const LeaveManagementLayoutWrapper = () => <Layout><LeaveManagement /></Layout>;
const MyLeavePageLayoutWrapper = () => <Layout><MyLeavePage /></Layout>; // Wrapper for MyLeavePage
const ReportsLayoutWrapper = () => <Layout><Reports /></Layout>;
const CalendarPageLayoutWrapper = () => <Layout><CalendarPage /></Layout>; {/* Added */}


function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
