import type { Notification } from "@/lib/types";
import { Link } from "wouter";
import { cn } from "@/lib/utils"; // For conditional class names

// Helper for basic date formatting (can be expanded or replaced with a library)
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

interface NotificationItemProps {
  notification: Notification;
  onNotificationClick?: (notification: Notification) => void; // Optional: if clicking should mark as read via API
}

export default function NotificationItem({ notification, onNotificationClick }: NotificationItemProps) {
  const itemContent = (
    <div
      className={cn(
        "p-3 hover:bg-muted/50 block", // Use block for full-width click area if not a link
        !notification.isRead && "bg-primary/10" // Example: different background for unread
      )}
      onClick={() => onNotificationClick?.(notification)}
      role={onNotificationClick ? "button" : undefined}
      tabIndex={onNotificationClick ? 0 : undefined}
      onKeyDown={onNotificationClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onNotificationClick(notification) : undefined}
    >
      <div className="flex items-center justify-between mb-1">
        <p className={cn("text-sm font-medium", !notification.isRead && "font-bold")}>
          {notification.message}
        </p>
        {!notification.isRead && (
          <div className="w-2 h-2 bg-primary rounded-full" title="Unread"></div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {formatDate(notification.createdAt)}
      </p>
    </div>
  );

  if (notification.link) {
    // Assuming internal links are handled by wouter's Link
    // For external links, a regular <a> tag would be better.
    return (
      <Link href={notification.link} className="block no-underline text-current">
        {itemContent}
      </Link>
    );
  }

  return itemContent;
}
