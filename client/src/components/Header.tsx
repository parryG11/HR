import { useState } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Bell } from "lucide-react";

const pageConfig = {
  "/": {
    title: "Dashboard",
    subtitle: "Overview of HR metrics and recent activity",
  },
  "/employees": {
    title: "Employee Management",
    subtitle: "Manage employee profiles and information",
  },
  "/departments": {
    title: "Department Management",
    subtitle: "Organize and manage company departments",
  },
  "/leave": {
    title: "Leave Management",
    subtitle: "Review and manage employee leave requests",
  },
  "/reports": {
    title: "Reports & Analytics",
    subtitle: "Generate reports and view HR analytics",
  },
};

export default function Header() {
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const currentPage = pageConfig[location as keyof typeof pageConfig] || {
    title: "HR Management",
    subtitle: "Manage your human resources efficiently",
  };

  return (
    <header className="bg-card shadow-sm border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{currentPage.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{currentPage.subtitle}</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-10"
            />
          </div>
          
          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            <Badge variant="destructive" className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs">
              3
            </Badge>
          </Button>
        </div>
      </div>
    </header>
  );
}
