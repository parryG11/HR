import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Building, Calendar, BarChart3 } from "lucide-react";

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
];

export default function Sidebar() {
  const [location] = useLocation();

  const isActive = (href: string) => {
    if (href === "/") {
      return location === "/";
    }
    return location.startsWith(href);
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

      {/* User Profile Section */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-primary">SJ</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">Sarah Johnson</p>
            <p className="text-xs text-muted-foreground truncate">HR Manager</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
