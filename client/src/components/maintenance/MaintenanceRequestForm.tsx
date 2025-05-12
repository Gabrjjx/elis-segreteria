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
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Si è verificato un errore");
      }
      
      const data = await response.json();
      
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
      <Card className="w-full max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-center text-green-600">Richiesta inviata con successo!</CardTitle>
          <CardDescription className="text-center">
            La tua segnalazione è stata registrata e verrà presa in carico.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center">
          <Button onClick={() => setSucceeded(false)}>Invia una nuova segnalazione</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Segnalazione di manutenzione</CardTitle>
        <CardDescription>
          Invia una richiesta di manutenzione per la residenza ELIS
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="sigla"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sigla</FormLabel>
                  <FormControl>
                    <Input placeholder="Inserisci la tua sigla" {...field} />
                  </FormControl>
                  <FormDescription>
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
                  <FormLabel>Luogo</FormLabel>
                  <FormControl>
                    <Input placeholder="Es. Camera 123, Bagno, Corridoio" {...field} />
                  </FormControl>
                  <FormDescription>
                    Indica il luogo dove è richiesta la manutenzione.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="specificLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ubicazione specifica</FormLabel>
                  <FormControl>
                    <Input placeholder="Es. Doccia, Lavandino, Porta" {...field} />
                  </FormControl>
                  <FormDescription>
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
                  <FormLabel>Dettagli del difetto</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descrivi il problema in dettaglio"
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priorità (1-5)</FormLabel>
                  <Select 
                    onValueChange={(val) => field.onChange(parseInt(val))} 
                    defaultValue={String(field.value)}
                  >
                    <FormControl>
                      <SelectTrigger>
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
                  <FormDescription>
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
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Risolvibile dai manutentori autarchici?
                    </FormLabel>
                    <FormDescription>
                      Indica se pensi che il problema possa essere risolto dai manutentori interni.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="possibleSolution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Possibile soluzione (facoltativo)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Se hai suggerimenti su come risolvere il problema, inseriscili qui"
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Invio in corso...
                </>
              ) : (
                "Invia segnalazione"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}