import { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { ScrollArea } from './ui/scroll-area';
import { db, type Flow } from '../db/database';

// Validation Schema
const saveAsSchema = z.object({
  flowName: z
    .string()
    .min(1, 'Flow name is required')
    .max(100, 'Flow name must be less than 100 characters')
    .regex(
      /^[^<>:"/\\|?*\x00-\x1F]+$/,
      'Flow name contains invalid characters (< > : " / \\ | ? *)'
    )
    .refine(
      (name) => !['CON', 'PRN', 'AUX', 'NUL'].includes(name.toUpperCase()),
      'Flow name cannot be a reserved system name'
    ),
});

type SaveAsFormValues = z.infer<typeof saveAsSchema>;

interface SaveAsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, overwrite: boolean) => Promise<void>;
  currentFlowName: string;
  currentFlowId: string | null;
}

export function SaveAsModal({
  isOpen,
  onClose,
  onSave,
  currentFlowName,
  currentFlowId,
}: SaveAsModalProps) {
  const [existingFlows, setExistingFlows] = useState<Flow[]>([]);
  const [duplicateName, setDuplicateName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form initialization
  const methods = useForm<SaveAsFormValues>({
    resolver: zodResolver(saveAsSchema),
    defaultValues: {
      flowName: currentFlowName || 'Untitled Flow',
    },
    mode: 'onChange', // Validate on change for better UX
  });

  const { control, handleSubmit, formState, setValue, watch, setError, reset } = methods;

  // Reset form with current flow name when modal opens
  useEffect(() => {
    if (isOpen) {
      reset({
        flowName: currentFlowName || 'Untitled Flow',
      });
    }
  }, [isOpen, currentFlowName, reset]);

  // Load existing flows for reference
  useEffect(() => {
    if (isOpen) {
      db.flows
        .orderBy('updatedAt')
        .reverse()
        .limit(10)
        .toArray()
        .then(setExistingFlows)
        .catch(console.error);
    }
  }, [isOpen]);

  // Check for duplicate names (debounced)
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'flowName' && value.flowName) {
        const timer = setTimeout(async () => {
          const existing = await db.flows
            .where('name')
            .equals(value.flowName)
            .first();

          if (existing && existing.id !== currentFlowId) {
            setDuplicateName(existing.id);
          } else {
            setDuplicateName(null);
          }
        }, 300);

        return () => clearTimeout(timer);
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, currentFlowId]);

  // Handle save
  const handleSave = async (values: SaveAsFormValues, overwrite = false) => {
    setIsSubmitting(true);
    try {
      await onSave(values.flowName.trim(), overwrite);
      methods.reset();
      onClose();
    } catch (error) {
      console.error('Save failed:', error);
      setError('root', {
        message: 'Failed to save flow. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-rename helper
  const handleAutoRename = () => {
    const baseName = watch('flowName');
    const newName = generateUniqueName(baseName, existingFlows);
    setValue('flowName', newName);
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter to save (if no duplicate warning)
      if (e.key === 'Enter' && !e.shiftKey && !duplicateName) {
        e.preventDefault();
        handleSubmit((values) => handleSave(values))();
      }
      // Escape to cancel
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, duplicateName, handleSubmit, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Save Flow As</DialogTitle>
          <DialogDescription>
            Give your flow a unique name. Autosave will activate after saving.
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit((values) => handleSave(values))}>
            <div className="space-y-4 py-4">
              {/* Flow Name Input */}
              <FormField
                control={control}
                name="flowName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Flow Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter flow name..."
                        autoFocus
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      Choose a descriptive name for your workflow
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Duplicate Warning */}
              {duplicateName && (
                <Alert variant="destructive">
                  <AlertDescription className="flex items-center justify-between">
                    <span>A flow with this name already exists</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAutoRename}
                    >
                      Auto-rename
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Existing Flows List */}
              {existingFlows.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Recent Flows (for reference)
                  </label>
                  <ScrollArea className="h-32 rounded-md border p-2">
                    <div className="space-y-1">
                      {existingFlows.map((flow) => (
                        <button
                          key={flow.id}
                          type="button"
                          onClick={() => setValue('flowName', flow.name)}
                          className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded transition-colors"
                          disabled={isSubmitting}
                        >
                          {flow.name}
                          <span className="text-xs text-gray-500 ml-2">
                            {new Date(flow.updatedAt).toLocaleDateString()}
                          </span>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Form Error */}
              {formState.errors.root && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {formState.errors.root.message}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>

              {duplicateName ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => handleSubmit((values) => handleSave(values, true))()}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Overwrite Existing'}
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting || !formState.isValid}>
                  {isSubmitting ? 'Saving...' : 'Save Flow'}
                </Button>
              )}
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

// Helper: Generate unique name with counter suffix
function generateUniqueName(baseName: string, existingFlows: Flow[]): string {
  const existingNames = new Set(existingFlows.map(f => f.name));

  // Remove existing counter suffix if present
  const cleanBase = baseName.replace(/\s*\(\d+\)$/, '');

  // Find available counter
  let counter = 2;
  let newName = `${cleanBase} (${counter})`;

  while (existingNames.has(newName)) {
    counter++;
    newName = `${cleanBase} (${counter})`;
  }

  return newName;
}
