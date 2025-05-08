import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft, Save } from "lucide-react";
// Rimuovo l'import del toast che non usiamo più
// import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertServiceSchema, defaultPrices, ServiceType, PaymentStatus } from "@shared/schema";

// Extend the insertServiceSchema with client-side validations
const formSchema = insertServiceSchema.extend({
  // Accept date as string or Date, and coerce to a Date
  date: z.union([
    z.string(),
    z.date()
  ]).transform((val) => {
    if (typeof val === 'string') {
      const date = new Date(val);
      // Validate the date is real
      if (isNaN(date.getTime())) {
        throw new Error("Data non valida");
      }
      return date;
    }
    return val;
  }).refine((val) => {
    // Additional validation to make sure we have a valid date
    return val instanceof Date && !isNaN(val.getTime());
  }, {
    message: "La data non è valida",
  }),
  sigla: z.string().min(1, "La sigla è obbligatoria"),
});

type FormValues = z.infer<typeof formSchema>;

interface ServiceFormProps {
  id?: string;
}

export default function ServiceForm({ id }: ServiceFormProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isEditing = !!id;
  
  // Get service data if editing
  const { data: serviceData, isLoading: isLoadingService } = useQuery({
    queryKey: [`/api/services/${id}`],
    enabled: isEditing,
  });

  // Set up form with default values or loaded service data
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      sigla: "",
      pieces: 1,
      type: ServiceType.SIGLATURA,
      amount: defaultPrices[ServiceType.SIGLATURA],
      status: PaymentStatus.UNPAID,
      notes: "",
    },
  });

  // Update form values when service data is loaded
  useEffect(() => {
    if (serviceData) {
      // Format date from ISO string to Date object
      const formattedData = {
        ...serviceData,
        date: new Date(serviceData.date),
      };
      form.reset(formattedData);
    }
  }, [serviceData, form]);

  // Detect type changes to auto-update the amount
  const watchType = form.watch("type");
  
  useEffect(() => {
    if (watchType && !form.getFieldState("amount").isDirty) {
      form.setValue("amount", defaultPrices[watchType as keyof typeof defaultPrices]);
    }
  }, [watchType, form]);

  // Create service mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      // apiRequest già restituisce i dati JSON parseati, non serve chiamare .json()
      return await apiRequest("POST", "/api/services", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/recent-services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/pending-payments'] });
      
      // Sostituisco il toast con un log
      console.log("Servizio creato con successo");
      // alert("Il servizio è stato creato con successo.");
      
      setLocation("/services");
    },
    onError: (error) => {
      // Sostituisco il toast con un alert
      console.error("Errore durante la creazione del servizio:", error);
      alert(`Si è verificato un errore: ${error.message}`);
    },
  });

  // Update service mutation
  const updateMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      // Prepare the data for the API - convert date to YYYY-MM-DD format string
      const dateObj = data.date instanceof Date ? data.date : new Date(data.date as string);
      const formattedDate = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')}`;
      
      const apiData = {
        ...data,
        date: formattedDate
      };
      console.log("Inviando dati formattati:", apiData);
      // apiRequest già restituisce i dati JSON parseati, non serve chiamare .json()
      return await apiRequest("PUT", `/api/services/${id}`, apiData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: [`/api/services/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/recent-services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/pending-payments'] });
      
      // Sostituisco il toast con un alert per evitare errori
      console.log("Servizio aggiornato con successo");
      // alert("Il servizio è stato aggiornato con successo.");
      
      setLocation("/services");
    },
    onError: (error) => {
      // Sostituisco il toast con un alert per evitare errori
      console.error("Errore durante l'aggiornamento del servizio:", error);
      alert(`Si è verificato un errore: ${error.message}`);
    },
  });

  const onSubmit = (data: FormValues) => {
    try {
      // Prepare the data for the API - convert date to YYYY-MM-DD format string
      const dateObj = data.date instanceof Date ? data.date : new Date(data.date as string);
      const formattedDate = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')}`;
      
      const apiData = {
        ...data,
        date: formattedDate
      };
      
      console.log("Submitting data:", apiData);
      
      if (isEditing) {
        updateMutation.mutate(data); // Usa data originale, updateMutation farà già la formattazione
      } else {
        createMutation.mutate(apiData);
      }
    } catch (error) {
      console.error("Error in form submission:", error);
      // Sostituisco toast con alert
      alert("Si è verificato un errore nel processare i dati del form.");
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isLoading = isLoadingService && isEditing;

  return (
    <div className="max-w-2xl mx-auto">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => setLocation("/services")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Torna all'elenco
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Modifica Servizio" : "Nuovo Servizio"}</CardTitle>
          <CardDescription>
            {isEditing
              ? "Modifica i dettagli del servizio esistente"
              : "Inserisci i dettagli per il nuovo servizio"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                            onChange={(e) => {
                              field.onChange(new Date(e.target.value));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sigla"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sigla</FormLabel>
                        <FormControl>
                          <Input placeholder="Es. 145" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipologia</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona una tipologia" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={ServiceType.SIGLATURA}>Siglatura</SelectItem>
                            <SelectItem value={ServiceType.HAPPY_HOUR}>Happy Hour</SelectItem>
                            <SelectItem value={ServiceType.RIPARAZIONE}>Riparazione</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pieces"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>N. Pezzi</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Importo (€)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.10"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Prezzo standard per {form.getValues("type")}: €{defaultPrices[form.getValues("type") as keyof typeof defaultPrices].toFixed(2)}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stato</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona lo stato" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={PaymentStatus.PAID}>Pagato</SelectItem>
                            <SelectItem value={PaymentStatus.UNPAID}>Da pagare</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Inserisci eventuali note aggiuntive"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(createMutation.isError || updateMutation.isError) && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      Si è verificato un errore durante il salvataggio. Riprova.
                    </AlertDescription>
                  </Alert>
                )}
              </form>
            </Form>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setLocation("/services")}>
            Annulla
          </Button>
          <Button 
            onClick={form.handleSubmit(onSubmit)} 
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            {isEditing ? "Aggiorna" : "Salva"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
