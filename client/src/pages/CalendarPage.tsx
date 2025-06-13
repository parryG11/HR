import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, AlertTriangle } from 'lucide-react'; // Added AlertTriangle
import AddAppointmentModal from '@/components/AddAppointmentModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { format, isSameDay } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton"; // Added Skeleton
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Added Alert components


export interface Appointment {
  id: number;
  userId: number;
  title: string;
  date: string; // Assuming ISO string date from backend
  description?: string;
}

const CalendarPage = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date()); // Added selectedDate state

  // State for modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const fetchAppointments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/appointments', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to fetch appointments');
      }
      const data = await response.json();
      setAppointments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!selectedAppointment) return;

    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/appointments/${selectedAppointment.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to delete appointment');
      }
      fetchAppointments(); // Refresh list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsDeleteAlertOpen(false);
      setSelectedAppointment(null);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">My Calendar</h1>
        <Button onClick={() => setIsAddModalOpen(true)} className="w-full md:w-auto">
          <PlusCircle className="mr-2 h-5 w-5" /> Add Appointment
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-1/3 lg:w-1/4">
          <Card>
            <CardHeader>
              <CardTitle>Select Date</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
            </CardContent>
          </Card>
        </aside>

        <main className="flex-1">
          <h2 className="text-2xl font-semibold mb-4">
            Appointments for: {selectedDate ? format(selectedDate, "PPP") : "All Dates"}
          </h2>
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Fetching Appointments</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!isLoading && !error && appointments.filter(app => selectedDate ? isSameDay(new Date(app.date), selectedDate) : true).length === 0 && (
            <Card className="mt-4">
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No appointments scheduled for {selectedDate ? format(selectedDate, "PPP") : "this day"}.
                </p>
              </CardContent>
            </Card>
          )}

          {!isLoading && !error && appointments.filter(app => selectedDate ? isSameDay(new Date(app.date), selectedDate) : true).length > 0 && (
            <div className="space-y-4">
              {appointments
                .filter(app => selectedDate ? isSameDay(new Date(app.date), selectedDate) : true)
                .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((app) => (
                  <Card key={app.id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{app.title}</CardTitle>
                      <CardDescription>{new Date(app.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {new Date(app.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</CardDescription>
                    </CardHeader>
                    {app.description && (
                      <CardContent className="pt-0 pb-3">
                        <p className="text-sm text-muted-foreground line-clamp-2">{app.description}</p>
                      </CardContent>
                    )}
                    <CardFooter className="flex justify-end space-x-2 pt-2">
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedAppointment(app); setIsEditModalOpen(true); }}>
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => { setSelectedAppointment(app); setIsDeleteAlertOpen(true); }}>
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </CardFooter>
                  </Card>
              ))}
            </div>
          )}
        </main>
      </div>

      {isAddModalOpen && (
        <AddAppointmentModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => { fetchAppointments(); setIsAddModalOpen(false); }}
        />
      )}

      {isEditModalOpen && selectedAppointment && (
        <AddAppointmentModal
          isOpen={isEditModalOpen}
          onClose={() => { setIsEditModalOpen(false); setSelectedAppointment(null); }}
          onSuccess={() => { fetchAppointments(); setIsEditModalOpen(false); setSelectedAppointment(null); }}
          appointmentToEdit={selectedAppointment}
        />
      )}

      {selectedAppointment && ( // Ensure selectedAppointment is not null for AlertDialog
        <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the appointment titled "{selectedAppointment.title}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setIsDeleteAlertOpen(false); setSelectedAppointment(null); }}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default CalendarPage;
