import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast"; // Added useToast
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Search, Bell, Loader2, CheckCheck } from "lucide-react"; // Added Loader2 and CheckCheck
import { apiRequest } from "@/lib/queryClient"; // Assuming apiRequest and queryClient are here
import type { Notification } from "@/lib/types";
import NotificationItem from "./NotificationItem";

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
  const [isNotificationPopoverOpen, setIsNotificationPopoverOpen] = useState(false);
  const { toast } = useToast(); // Initialized useToast

  const currentPage = pageConfig[location as keyof typeof pageConfig] || {
    title: "HR Management",
    subtitle: "Manage your human resources efficiently",
  };

  const {
    data: notificationsData,
    isLoading: isLoadingNotifications,
    error: notificationsError
  } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", { limit: 10 }],
    enabled: isNotificationPopoverOpen,
  });

  const unreadCount = useMemo(() => {
    return notificationsData?.filter(n => !n.isRead).length || 0;
  }, [notificationsData]);

  const queryClient = useQueryClient();

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) => apiRequest("POST", `/api/notifications/${notificationId}/mark-read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (error) => {
      console.error("Failed to mark notification as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark notification as read.",
        variant: "destructive",
      });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/notifications/mark-all-read"),
    onSuccess: (data: { updatedCount?: number }) => { // Assuming API returns { updatedCount: number }
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Success",
        description: `${data.updatedCount || 'All'} notifications marked as read.`,
      });
    },
    onError: (error) => {
      console.error("Failed to mark all notifications as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read.",
        variant: "destructive",
      });
    }
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
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
          <Popover open={isNotificationPopoverOpen} onOpenChange={setIsNotificationPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative rounded-full">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {unreadCount}
                  </Badge>
                )}
                 {unreadCount === 0 && (
                   <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                 )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0">
              <div className="p-3 border-b flex items-center justify-between">
                <h4 className="font-medium leading-none">Notifications</h4>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAllAsReadMutation.mutate()}
                    disabled={markAllAsReadMutation.isPending}
                  >
                    <CheckCheck className="mr-2 h-4 w-4" />
                    Mark all read
                  </Button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {isLoadingNotifications && (
                  <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
                  </div>
                )}
                {notificationsError && (
                  <div className="p-4 text-center text-sm text-destructive">
                    Error fetching notifications.
                  </div>
                )}
                {!isLoadingNotifications && !notificationsError && (
                  notificationsData && notificationsData.length > 0 ? (
                    notificationsData.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onNotificationClick={handleNotificationClick}
                      />
                    ))
                  ) : (
                    <p className="p-4 text-sm text-muted-foreground text-center">
                      You have no new notifications.
                    </p>
                  )
                )}
              </div>
              {/* Consider adding a link to a dedicated "All Notifications" page here if needed */}
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
}
