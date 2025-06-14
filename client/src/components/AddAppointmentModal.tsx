import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Appointment } from '@/pages/CalendarPage';
import { useToast } from "@/hooks/use-toast"; // Added useToast
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Added Alert
import { AlertTriangle } from 'lucide-react'; // Added AlertTriangle

interface AddAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Function to refresh appointments list
  appointmentToEdit?: Appointment | null;
}

const AddAppointmentModal = ({ isOpen, onClose, onSuccess, appointmentToEdit }: AddAppointmentModalProps) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast(); // Added

  useEffect(() => {
    if (appointmentToEdit) {
      setTitle(appointmentToEdit.title);
      setDate(new Date(appointmentToEdit.date));
      setDescription(appointmentToEdit.description || '');
    } else {
      // Reset form for new appointment
      setTitle('');
      setDate(undefined);
      setDescription('');
    }
    setError(null); // Reset error when modal opens or appointmentToEdit changes
  }, [isOpen, appointmentToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title || !date) {
      setError('Title and Date are required.');
      return;
    }
    setIsLoading(true);

    const appointmentData = {
      title,
      date: date.toISOString(), // Ensure date is in ISO format for backend
      description,
    };

    const endpoint = appointmentToEdit
      ? `/api/appointments/${appointmentToEdit.id}`
      : '/api/appointments';
    const method = appointmentToEdit ? 'PUT' : 'POST';

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(appointmentData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || (appointmentToEdit ? 'Failed to update appointment' : 'Failed to create appointment'));
      }

      toast({ // Added toast notification
        title: appointmentToEdit ? "Appointment Updated" : "Appointment Created",
        description: appointmentToEdit ? "Your appointment has been successfully updated." : "Your new appointment has been successfully scheduled.",
        variant: "default", // Or "success" if you have that variant
      });
      onSuccess();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      toast({ // Error toast
        title: "Operation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{appointmentToEdit ? 'Edit Appointment' : 'Add New Appointment'}</DialogTitle>
          {appointmentToEdit && <DialogDescription>Make changes to your appointment here. Click save when you're done.</DialogDescription>}
          {!appointmentToEdit && <DialogDescription>Fill in the details below to schedule a new appointment.</DialogDescription>}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Team Meeting"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date <span className="text-red-500">*</span></Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Discuss Q3 roadmap"
            />
          </div>
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => { setError(null); onClose();}} disabled={isLoading}> {/* Clear error on close */}
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? (appointmentToEdit ? 'Saving...' : 'Creating...') : (appointmentToEdit ? 'Save Changes' : 'Create Appointment')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddAppointmentModal;
