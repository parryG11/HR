import { useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"; // Ensure this is imported
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
  DialogClose, // Import DialogClose
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  // AlertDialogTrigger, // May not be needed if controlling open state manually
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // For description
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient as appQueryClient } from "@/lib/queryClient"; // Use appQueryClient
import type { LeaveType } from "@/lib/types"; // Assuming InsertLeaveType might be needed for form
import { PlusCircle, Edit, Trash2, Loader2 } from "lucide-react"; // Icons

// Placeholder for the form data state
interface LeaveTypeFormData {
  id?: number; // For editing
  name: string;
  description: string;
  defaultDays: number;
}

const initialFormData: LeaveTypeFormData = {
  name: "",
  description: "",
  defaultDays: 0,
};

export default function ManageLeaveTypesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient(); // Use the hook here

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLeaveType, setEditingLeaveType] = useState<LeaveType | null>(null);
  const [formData, setFormData] = useState<LeaveTypeFormData>(initialFormData);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [leaveTypeIdToDelete, setLeaveTypeIdToDelete] = useState<number | null>(null);

  // Fetch Leave Types
  const { data: leaveTypes = [], isLoading: isLoadingLeaveTypes, error: errorLeaveTypes } = useQuery<LeaveType[]>({
    queryKey: ["leaveTypes"], // Matches the key used in MyLeavePage
    queryFn: () => apiRequest<LeaveType[]>("/api/leave-types", "GET"),
  });

  const createLeaveTypeMutation = useMutation({
    mutationFn: (newLeaveType: Omit<LeaveTypeFormData, 'id'>) =>
      apiRequest<LeaveType>("/api/leave-types", "POST", newLeaveType),
    onSuccess: () => {
      toast({ title: "Success", description: "Leave type created successfully." });
      queryClient.invalidateQueries({ queryKey: ["leaveTypes"] });
      setIsModalOpen(false);
      setFormData(initialFormData); // Reset form
    },
    onError: (error: any) => { // Use 'any' or a more specific error type if available
      const errorMessage = error?.response?.data?.message || error.message || "Failed to create leave type.";
      toast({
        title: "Error Creating Leave Type",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const deleteLeaveTypeMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest<void>(`/api/leave-types/${id}`, "DELETE"), // Expecting no content on successful delete
    onSuccess: () => {
      toast({ title: "Success", description: "Leave type deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ["leaveTypes"] });
      setLeaveTypeIdToDelete(null); // Reset the ID
      setIsDeleteDialogOpen(false); // Close the dialog
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || "Failed to delete leave type.";
      toast({
        title: "Error Deleting Leave Type",
        description: errorMessage,
        variant: "destructive",
      });
      setLeaveTypeIdToDelete(null); // Reset the ID
      setIsDeleteDialogOpen(false); // Close the dialog on error too
    },
  });

  const updateLeaveTypeMutation = useMutation({
    mutationFn: (updatedLeaveType: LeaveTypeFormData) => {
      if (!updatedLeaveType.id) throw new Error("ID is required for updating.");
      // Prepare data for PUT request, only send fields that can be updated.
      // The API expects name, description, defaultDays.
      const { id, ...dataToUpdate } = updatedLeaveType;
      return apiRequest<LeaveType>(`/api/leave-types/${id}`, "PUT", dataToUpdate);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Leave type updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["leaveTypes"] });
      setIsModalOpen(false);
      setEditingLeaveType(null);
      setFormData(initialFormData);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || "Failed to update leave type.";
      toast({
        title: "Error Updating Leave Type",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleFormInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'defaultDays' ? parseInt(value, 10) || 0 : value,
    }));
  };

  const handleAddNew = () => {
    setEditingLeaveType(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  // Placeholder for submit, edit, delete handlers
  const handleFormSubmit = () => {
    // Client-side validation
    if (!formData.name.trim()) {
      toast({ title: "Validation Error", description: "Name is required.", variant: "destructive" });
      return;
    }
    if (formData.defaultDays < 0 || !Number.isInteger(formData.defaultDays)) {
      toast({ title: "Validation Error", description: "Default days must be a non-negative integer.", variant: "destructive" });
      return;
    }

    if (editingLeaveType && formData.id) { // Ensure formData.id is present for updates
      updateLeaveTypeMutation.mutate(formData);
    } else {
      const { id, ...dataToCreate } = formData;
      createLeaveTypeMutation.mutate(dataToCreate);
    }
  };
  const handleEdit = (leaveType: LeaveType) => {
    setEditingLeaveType(leaveType);
    setFormData({
      id: leaveType.id,
      name: leaveType.name,
      // Ensure description is not null, provide empty string if it is
      description: leaveType.description ?? "",
      defaultDays: leaveType.defaultDays,
    });
    setIsModalOpen(true);
  };

  const openDeleteDialog = (id: number) => {
    setLeaveTypeIdToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  // Function to be called by the AlertDialog's "Confirm" / "Delete" action
  const confirmDelete = () => {
    if (leaveTypeIdToDelete !== null) {
      deleteLeaveTypeMutation.mutate(leaveTypeIdToDelete);
    }
  };

  if (isLoadingLeaveTypes) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading leave types...</p>
      </div>
    );
  }

  if (errorLeaveTypes) {
    toast({
       title: "Error",
       description: "Could not fetch leave types. " + (errorLeaveTypes as Error).message,
       variant: "destructive"
    });
    // Display a user-friendly error message on the page as well
    return <div className="p-6 text-red-600">Error loading leave types. Please try again later.</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Leave Types</h1>
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Leave Type
        </Button>
      </div>

      {/* Table to display leave types */}
      <div className="overflow-x-auto bg-white shadow-md rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Default Days</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaveTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                  No leave types found.
                </TableCell>
              </TableRow>
            ) : (
              leaveTypes.map((lt) => (
                <TableRow key={lt.id}>
                  <TableCell className="font-medium">{lt.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {lt.description || "N/A"}
                  </TableCell>
                  <TableCell className="text-right">{lt.defaultDays}</TableCell>
                  <TableCell className="text-center space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(lt)}>
                      <Edit className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(lt.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog for Add/Edit Leave Type */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingLeaveType ? "Edit Leave Type" : "Add New Leave Type"}</DialogTitle>
            <DialogDescription>
              {editingLeaveType ? "Update the details of the leave type." : "Fill in the details for the new leave type."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleFormInputChange}
                className="col-span-3"
                placeholder="e.g., Annual, Sick"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleFormInputChange}
                className="col-span-3"
                placeholder="(Optional) A brief description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="defaultDays" className="text-right">Default Days</Label>
              <Input
                id="defaultDays"
                name="defaultDays"
                type="number"
                value={formData.defaultDays}
                onChange={handleFormInputChange}
                className="col-span-3"
                placeholder="e.g., 20"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
               <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              type="submit"
              onClick={handleFormSubmit}
              disabled={createLeaveTypeMutation.isPending || updateLeaveTypeMutation.isPending}
            >
              {(createLeaveTypeMutation.isPending || updateLeaveTypeMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingLeaveType ? "Save Changes" : "Create Leave Type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog for Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the leave type.
              Make sure this leave type is not currently associated with any existing leave requests or balances, as this might cause issues.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLeaveTypeIdToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteLeaveTypeMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90" // Destructive styling
            >
              {deleteLeaveTypeMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
