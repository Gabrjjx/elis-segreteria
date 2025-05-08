import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ServiceType } from "@shared/schema";
import { defaultPrices } from "@shared/schema";

// Define the schema for price settings
const priceSettingsSchema = z.object({
  siglaturaPrice: z.coerce.number().min(0.1).step(0.1),
  happyHourPrice: z.coerce.number().min(0.1).step(0.1),
  riparazionePrice: z.coerce.number().min(0.1).step(0.1),
});

// Define the schema for user settings
const userSettingsSchema = z.object({
  currentPassword: z.string().min(1, "La password attuale è obbligatoria"),
  newPassword: z.string().min(6, "La nuova password deve essere di almeno 6 caratteri"),
  confirmPassword: z.string().min(6, "Conferma la nuova password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Le password non corrispondono",
  path: ["confirmPassword"],
});

// Define the schema for notification settings
const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  paymentReminders: z.boolean(),
  newServiceAlert: z.boolean(),
});

export default function SettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");

  // Price settings form
  const priceForm = useForm<z.infer<typeof priceSettingsSchema>>({
    resolver: zodResolver(priceSettingsSchema),
    defaultValues: {
      siglaturaPrice: defaultPrices[ServiceType.SIGLATURA],
      happyHourPrice: defaultPrices[ServiceType.HAPPY_HOUR],
      riparazionePrice: defaultPrices[ServiceType.RIPARAZIONE],
    },
  });

  // User settings form
  const userForm = useForm<z.infer<typeof userSettingsSchema>>({
    resolver: zodResolver(userSettingsSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Notification settings form
  const notificationForm = useForm<z.infer<typeof notificationSettingsSchema>>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      emailNotifications: true,
      smsNotifications: false,
      paymentReminders: true,
      newServiceAlert: true,
    },
  });

  // Handle price settings submission
  const onPriceSubmit = (data: z.infer<typeof priceSettingsSchema>) => {
    // In a real application, this would send the data to the server
    console.log("Price settings updated:", data);
    toast({
      title: "Impostazioni aggiornate",
      description: "I prezzi standard sono stati aggiornati con successo.",
    });
  };

  // Handle user settings submission
  const onUserSubmit = (data: z.infer<typeof userSettingsSchema>) => {
    // In a real application, this would send the data to the server
    console.log("User settings updated:", data);
    toast({
      title: "Password aggiornata",
      description: "La tua password è stata aggiornata con successo.",
    });
    userForm.reset({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  // Handle notification settings submission
  const onNotificationSubmit = (data: z.infer<typeof notificationSettingsSchema>) => {
    // In a real application, this would send the data to the server
    console.log("Notification settings updated:", data);
    toast({
      title: "Impostazioni aggiornate",
      description: "Le preferenze di notifica sono state aggiornate con successo.",
    });
  };

  return (
    <>
      {/* Page Header */}
      <div className="mb-6">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-semibold text-gray-800">Impostazioni</h2>
            <p className="text-gray-500 text-sm">Gestisci le preferenze e le configurazioni dell'applicazione</p>
          </div>
        </div>
      </div>
      
      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full md:w-auto justify-start">
          <TabsTrigger value="general">Generali</TabsTrigger>
          <TabsTrigger value="prices">Prezzi</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="notifications">Notifiche</TabsTrigger>
        </TabsList>
        
        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Impostazioni Generali</CardTitle>
              <CardDescription>
                Configura le impostazioni generali dell'applicazione.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Lingua e Regione</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="language" className="text-sm font-medium">
                      Lingua
                    </label>
                    <select
                      id="language"
                      className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                      defaultValue="it"
                      disabled
                    >
                      <option value="it">Italiano</option>
                      <option value="en">English</option>
                    </select>
                    <p className="text-sm text-gray-500 mt-1">
                      Supporto multilingua in arrivo nelle prossime versioni
                    </p>
                  </div>
                  <div>
                    <label htmlFor="region" className="text-sm font-medium">
                      Regione
                    </label>
                    <select
                      id="region"
                      className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                      defaultValue="IT"
                      disabled
                    >
                      <option value="IT">Italia</option>
                      <option value="EU">Europa</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Tema</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Tema Scuro</p>
                    <p className="text-sm text-gray-500">
                      Attiva il tema scuro per l'interfaccia
                    </p>
                  </div>
                  <Switch disabled />
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button disabled>Salva Modifiche</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Price Settings */}
        <TabsContent value="prices">
          <Card>
            <CardHeader>
              <CardTitle>Impostazioni Prezzi</CardTitle>
              <CardDescription>
                Configura i prezzi standard per le diverse tipologie di servizio.
              </CardDescription>
            </CardHeader>
            <Form {...priceForm}>
              <form onSubmit={priceForm.handleSubmit(onPriceSubmit)}>
                <CardContent className="space-y-4">
                  <FormField
                    control={priceForm.control}
                    name="siglaturaPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prezzo Siglatura (€)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.10"
                            min="0"
                            placeholder="0.50"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Prezzo standard per ogni pezzo di siglatura
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={priceForm.control}
                    name="happyHourPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prezzo Happy Hour (€)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.10"
                            min="0"
                            placeholder="1.00"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Prezzo standard per ogni consumazione Happy Hour
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={priceForm.control}
                    name="riparazionePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prezzo Riparazione (€)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.10"
                            min="0"
                            placeholder="4.00"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Prezzo standard per ogni riparazione
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="justify-end">
                  <Button type="submit">Salva Prezzi</Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </TabsContent>
        
        {/* Account Settings */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Impostazioni Account</CardTitle>
              <CardDescription>
                Gestisci il tuo account e le informazioni personali.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-medium">Informazioni Utente</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Nome Utente</label>
                    <Input value="admin" disabled />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Ruolo</label>
                    <Input value="Responsabile Segreteria" disabled />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <Form {...userForm}>
                <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-4">
                  <h3 className="font-medium">Cambia Password</h3>
                  
                  <FormField
                    control={userForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password Attuale</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={userForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nuova Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={userForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conferma Nuova Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit">Aggiorna Password</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Impostazioni Notifiche</CardTitle>
              <CardDescription>
                Configura le preferenze di notifica.
              </CardDescription>
            </CardHeader>
            <Form {...notificationForm}>
              <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)}>
                <CardContent className="space-y-6">
                  <FormField
                    control={notificationForm.control}
                    name="emailNotifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between">
                        <div className="space-y-0.5">
                          <FormLabel>Notifiche Email</FormLabel>
                          <FormDescription>
                            Ricevi notifiche via email
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={notificationForm.control}
                    name="smsNotifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between">
                        <div className="space-y-0.5">
                          <FormLabel>Notifiche SMS</FormLabel>
                          <FormDescription>
                            Ricevi notifiche via SMS
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <Separator />
                  
                  <FormField
                    control={notificationForm.control}
                    name="paymentReminders"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between">
                        <div className="space-y-0.5">
                          <FormLabel>Promemoria Pagamenti</FormLabel>
                          <FormDescription>
                            Ricevi notifiche per i pagamenti in scadenza
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={notificationForm.control}
                    name="newServiceAlert"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between">
                        <div className="space-y-0.5">
                          <FormLabel>Avvisi Nuovi Servizi</FormLabel>
                          <FormDescription>
                            Ricevi notifiche quando vengono registrati nuovi servizi
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="justify-end">
                  <Button type="submit">Salva Preferenze</Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}