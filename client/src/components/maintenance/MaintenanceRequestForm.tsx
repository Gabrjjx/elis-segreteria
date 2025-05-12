import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Schema corrispondente a quello del server
const formSchema = z.object({
  sigla: z.string().min(1, "La sigla è obbligatoria"),
  place: z.string().min(1, "Il luogo è obbligatorio"),
  specificLocation: z.string().min(1, "L'ubicazione specifica è obbligatoria"),
  defectDetails: z.string().min(1, "I dettagli del difetto sono obbligatori"),
  priority: z.number().int().min(1).max(5),
  canBeSolvedByMaintainers: z.boolean().default(false),
  possibleSolution: z.string().optional(),
});

export default function MaintenanceRequestForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sigla: "",
      place: "",
      specificLocation: "",
      defectDetails: "",
      priority: 3,
      canBeSolvedByMaintainers: false,
      possibleSolution: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/public/maintenance", values);
      
      // La funzione apiRequest restituisce già i dati come oggetto JSON
      // non c'è bisogno di chiamare response.json()
      const data = response;
      
      if (!data.requestId) {
        throw new Error("Si è verificato un errore nell'invio della richiesta");
      }
      
      setSucceeded(true);
      toast({
        title: "Richiesta inviata",
        description: "La tua richiesta di manutenzione è stata registrata con successo",
      });
      
      // Reset del form
      form.reset();
    } catch (error) {
      console.error("Errore nell'invio della richiesta:", error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Si è verificato un errore",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (succeeded) {
    return (
      <div className="max-w-xl mx-auto mt-8 overflow-hidden shadow-lg rounded-xl">
        <div className="bg-gradient-to-r from-green-500 to-green-600 py-6 px-8 text-white">
          <div className="flex flex-col items-center">
            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h2 className="text-2xl font-bold tracking-tight">Richiesta inviata con successo!</h2>
            <p className="text-green-100 mt-2 text-center">
              La tua segnalazione è stata registrata e verrà presa in carico al più presto.
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-6 flex justify-center">
          <Button 
            onClick={() => setSucceeded(false)}
            className="py-6 px-8 text-base font-semibold bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 border-0"
          >
            Invia una nuova segnalazione
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white dark:bg-gray-900 rounded-xl shadow-md overflow-hidden mt-6">
      <div className="py-6 px-8 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <h2 className="text-2xl font-bold tracking-tight mb-1">Segnalazione di manutenzione</h2>
        <p className="text-blue-50">Invia una richiesta di manutenzione per la residenza ELIS</p>
      </div>

      <div className="p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="sigla"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Sigla</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Inserisci la tua sigla" 
                        {...field} 
                        className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Inserisci la tua sigla identificativa.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="place"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Luogo</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Es. Camera 123, Bagno, Corridoio" 
                        {...field} 
                        className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Indica il luogo dove è richiesta la manutenzione.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="specificLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">Ubicazione specifica</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Es. Doccia, Lavandino, Porta" 
                      {...field} 
                      className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Specifica più in dettaglio l'ubicazione all'interno del luogo.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="defectDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">Dettagli del difetto</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descrivi il problema in dettaglio" 
                      className="min-h-[120px] bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Priorità (1-5)</FormLabel>
                    <Select 
                      onValueChange={(val) => field.onChange(parseInt(val))} 
                      defaultValue={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500">
                          <SelectValue placeholder="Seleziona la priorità" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1 - Molto bassa</SelectItem>
                        <SelectItem value="2">2 - Bassa</SelectItem>
                        <SelectItem value="3">3 - Media</SelectItem>
                        <SelectItem value="4">4 - Alta</SelectItem>
                        <SelectItem value="5">5 - Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      Scegli la priorità della tua segnalazione.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="canBeSolvedByMaintainers"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-base font-medium">
                        Risolvibile dai manutentori autarchici?
                      </FormLabel>
                      <FormDescription className="text-xs">
                        Indica se pensi che il problema possa essere risolto dai manutentori interni.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="possibleSolution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">Possibile soluzione (facoltativo)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Se hai suggerimenti su come risolvere il problema..." 
                      className="min-h-[80px] bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full py-6 text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 border-0" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Invio in corso...
                  </>
                ) : (
                  "Invia segnalazione"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}