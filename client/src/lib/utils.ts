import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatDate = (dateString: string | Date, options?: Intl.DateTimeFormatOptions): string => {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  try {
    return new Date(dateString).toLocaleDateString("en-US", options || defaultOptions);
  } catch (e) {
    return "Invalid Date";
  }
};

// Calculates number of days between two dates, inclusive of start and end.
export const calculateDaysBetween = (startDate: string | Date, endDate: string | Date): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    // console.error("Invalid date format for calculating days between.");
    return 0; // Or throw error, depending on desired handling
  }

  // Calculate the difference in time (milliseconds)
  // Reset time to midnight to compare dates only
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const timeDiff = end.getTime() - start.getTime();

  // Convert time difference from milliseconds to days and add 1 for inclusive count
  const dayDiff = Math.round(timeDiff / (1000 * 60 * 60 * 24)) + 1;

  return dayDiff > 0 ? dayDiff : 0; // Ensure non-negative result
};

// Format date to 'YYYY-MM-DD' for API submission
export const formatToYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};
