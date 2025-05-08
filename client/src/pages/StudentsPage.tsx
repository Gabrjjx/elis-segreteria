import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { toast } from "@/hooks/use-toast";
import { Search, Upload, UserPlus, Trash2 } from "lucide-react";

interface Student {
  id: number;
  sigla: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
}

export default function StudentsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [csvData, setCsvData] = useState("");
  const queryClient = useQueryClient();

  // Fetch students
  const { data, isLoading } = useQuery({
    queryKey: ['/api/students', page, limit, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      
      if (searchQuery) {
        // Determine if the search is for sigla, firstName, or lastName
        if (/^\d+$/.test(searchQuery)) {
          params.append('sigla', searchQuery);
        } else if (searchQuery.includes(" ")) {
          // If there's a space, search by both first and last name
          const [first, last] = searchQuery.split(" ", 2);
          params.append('firstName', first);
          params.append('lastName', last);
        } else {
          // Otherwise search in both fields
          params.append('firstName', searchQuery);
          params.append('lastName', searchQuery);
        }
      }
      
      return apiRequest("GET", `/api/students?${params.toString()}`).then(res => res.json());
    }
  });
  
  // Delete student mutation
  const deleteMutation = useMutation({
    mutationFn: async (studentId: number) => {
      return apiRequest("DELETE", `/api/students/${studentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      toast({
        title: "Studente eliminato",
        description: "Lo studente è stato eliminato con successo",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'eliminazione dello studente",
        variant: "destructive",
      });
      console.error("Error deleting student:", error);
    }
  });
  
  // Import CSV mutation
  const importMutation = useMutation({
    mutationFn: async (csvData: string) => {
      return apiRequest("POST", "/api/students/import", { csvData }).then(res => res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      toast({
        title: "Importazione completata",
        description: `Importati ${data.success} studenti con successo. Falliti: ${data.failed}`,
      });
      setCsvData("");
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'importazione degli studenti",
        variant: "destructive",
      });
      console.error("Error importing students:", error);
    }
  });
  
  // Add student mutation
  const addMutation = useMutation({
    mutationFn: async (student: { firstName: string, lastName: string, sigla: string }) => {
      return apiRequest("POST", "/api/students", student).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      toast({
        title: "Studente aggiunto",
        description: "Lo studente è stato aggiunto con successo",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiunta dello studente",
        variant: "destructive",
      });
      console.error("Error adding student:", error);
    }
  });
  
  const handleImportCsv = () => {
    if (!csvData.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci i dati CSV da importare",
        variant: "destructive",
      });
      return;
    }
    
    importMutation.mutate(csvData);
  };
  
  const handleAddStudent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const sigla = formData.get("sigla") as string;
    
    if (!firstName || !lastName || !sigla) {
      toast({
        title: "Errore",
        description: "Tutti i campi sono obbligatori",
        variant: "destructive",
      });
      return;
    }
    
    addMutation.mutate({ firstName, lastName, sigla });
    e.currentTarget.reset();
  };
  
  const handleDeleteStudent = (studentId: number) => {
    if (window.confirm("Sei sicuro di voler eliminare questo studente?")) {
      deleteMutation.mutate(studentId);
    }
  };

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Gestione Studenti</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Add Student Card */}
        <Card>
          <CardHeader>
            <CardTitle>Aggiungi Studente</CardTitle>
            <CardDescription>Inserisci i dati per un nuovo studente</CardDescription>
          </CardHeader>
          <CardContent>
            <form id="addStudentForm" onSubmit={handleAddStudent} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nome</Label>
                  <Input id="firstName" name="firstName" placeholder="Nome" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Cognome</Label>
                  <Input id="lastName" name="lastName" placeholder="Cognome" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sigla">Sigla</Label>
                <Input id="sigla" name="sigla" placeholder="Sigla" />
              </div>
            </form>
          </CardContent>
          <CardFooter>
            <Button type="submit" form="addStudentForm" disabled={addMutation.isPending}>
              <UserPlus className="h-4 w-4 mr-2" />
              {addMutation.isPending ? "Aggiunta in corso..." : "Aggiungi Studente"}
            </Button>
          </CardFooter>
        </Card>
        
        {/* Import CSV Card */}
        <Card>
          <CardHeader>
            <CardTitle>Importa da CSV</CardTitle>
            <CardDescription>Importa studenti da dati CSV (formato: NOME,COGNOME,SIGLA)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="csvData">Dati CSV</Label>
              <Textarea 
                id="csvData" 
                placeholder="NOME,COGNOME,SIGLA&#10;Mario,Rossi,123&#10;Giuseppe,Verdi,456" 
                rows={5}
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleImportCsv} disabled={importMutation.isPending || !csvData.trim()}>
              <Upload className="h-4 w-4 mr-2" />
              {importMutation.isPending ? "Importazione in corso..." : "Importa CSV"}
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {/* Search and List */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Elenco Studenti</CardTitle>
          <CardDescription>Visualizza e gestisci gli studenti</CardDescription>
          <div className="relative mt-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per nome, cognome o sigla..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Sigla</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cognome</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10">
                      <div className="flex justify-center">
                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : data?.students?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10">
                      Nessuno studente trovato
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.students?.map((student: Student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.sigla}</TableCell>
                      <TableCell>{student.firstName}</TableCell>
                      <TableCell>{student.lastName}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteStudent(student.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            {data?.total || 0} studenti totali
          </div>
          
          {data?.total > limit && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  />
                </PaginationItem>
                
                {Array.from({ length: Math.min(5, Math.ceil((data?.total || 0) / limit)) }, (_, i) => {
                  const pageNumber = i + 1;
                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        onClick={() => setPage(pageNumber)}
                        isActive={page === pageNumber}
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                
                {Math.ceil((data?.total || 0) / limit) > 5 && (
                  <>
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => setPage(Math.ceil((data?.total || 0) / limit))}
                        isActive={page === Math.ceil((data?.total || 0) / limit)}
                      >
                        {Math.ceil((data?.total || 0) / limit)}
                      </PaginationLink>
                    </PaginationItem>
                  </>
                )}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setPage(p => Math.min(Math.ceil((data?.total || 0) / limit), p + 1))}
                    disabled={page >= Math.ceil((data?.total || 0) / limit)}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}