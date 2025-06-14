import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Building, Calendar, BarChart3, LogOut, CalendarDays } from "lucide-react"; // Added LogOut & CalendarDays
import { jwtDecode } from 'jwt-decode'; // Added
import { useEffect, useState } from 'react'; // Added
import { Button } from '@/components/ui/button'; // Added

interface DecodedToken {
  username: string;
  userId: string;
  iat: number;
  exp: number;
}

const navigationItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Employees",
    href: "/employees",
    icon: Users,
  },
  {
    title: "Departments",
    href: "/departments",
    icon: Building,
  },
  {
    title: "Leave Management",
    href: "/leave",
    icon: Calendar,
  },
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
  },
  {
    title: "Calendar",
    href: "/calendar",
    icon: CalendarDays,
  },
];

export default function Sidebar() {
  const [location, navigate] = useLocation(); // Corrected to use useLocation
  const [username, setUsername] = useState<string | null>(null); // Added

  useEffect(() => { // Added
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decodedToken = jwtDecode<DecodedToken>(token);
        setUsername(decodedToken.username);
      } catch (error) {
        console.error("Failed to decode JWT:", error);
        // Handle invalid token, e.g., by logging out
        localStorage.removeItem('token');
        navigate('/login');
      }
    }
  }, [location, navigate]);

  const isActive = (href: string) => {
    if (href === "/") {
      return location === "/";
    }
    return location.startsWith(href);
  };

  const handleLogout = () => { // Added
    localStorage.removeItem('token');
    setUsername(null);
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-card shadow-lg flex flex-col border-r border-border">
      {/* Logo Section */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Users className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">GoHR</h1>
            <p className="text-sm text-muted-foreground">HR Management</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link href={item.href}>
                  <div
                    className={`sidebar-link ${
                      isActive(item.href) ? "sidebar-link-active" : "sidebar-link-inactive"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.title}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile Section & Logout Button */}
      <div className="p-4 border-t border-border mt-auto">
        {username && (
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {username.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{username}</p>
              {/* <p className="text-xs text-muted-foreground truncate">User Role</p>  Optional: if role is in JWT */}
            </div>
          </div>
        )}
        <Button variant="outline" className="w-full" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
