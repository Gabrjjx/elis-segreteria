import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
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

interface StudentsResponse {
  students: Student[];
  total: number;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [csvData, setCsvData] = useState("");
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch students
  useEffect(() => {
    fetchStudents();
  }, [page, limit, searchQuery]);

  const fetchStudents = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
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
      
      const response = await fetch(`/api/students?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetched students data:', data);
      
      if (data && Array.isArray(data.students)) {
        setStudents(data.students);
        setTotalStudents(data.total || 0);
      } else {
        console.error('Invalid response structure:', data);
        setError('Formato di risposta non valido');
        setStudents([]);
        setTotalStudents(0);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('Errore durante il recupero degli studenti');
      setStudents([]);
      setTotalStudents(0);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddStudent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsAddingStudent(true);
    
    try {
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
      
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ firstName, lastName, sigla }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      toast({
        title: "Studente aggiunto",
        description: "Lo studente è stato aggiunto con successo",
      });
      
      e.currentTarget.reset();
      fetchStudents();
    } catch (err) {
      console.error('Error adding student:', err);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiunta dello studente",
        variant: "destructive",
      });
    } finally {
      setIsAddingStudent(false);
    }
  };
  
  const handleImportCsv = async () => {
    if (!csvData.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci i dati CSV da importare",
        variant: "destructive",
      });
      return;
    }
    
    setIsImportingCsv(true);
    
    try {
      const response = await fetch('/api/students/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csvData }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      toast({
        title: "Importazione completata",
        description: `Importati ${result.success} studenti con successo. Falliti: ${result.failed}`,
      });
      
      setCsvData("");
      fetchStudents();
    } catch (err) {
      console.error('Error importing CSV:', err);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'importazione degli studenti",
        variant: "destructive",
      });
    } finally {
      setIsImportingCsv(false);
    }
  };
  
  const handleDeleteStudent = async (studentId: number) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo studente?")) {
      return;
    }
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/students/${studentId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      toast({
        title: "Studente eliminato",
        description: "Lo studente è stato eliminato con successo",
      });
      
      fetchStudents();
    } catch (err) {
      console.error('Error deleting student:', err);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'eliminazione dello studente",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
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
            <Button type="submit" form="addStudentForm" disabled={isAddingStudent}>
              <UserPlus className="h-4 w-4 mr-2" />
              {isAddingStudent ? "Aggiunta in corso..." : "Aggiungi Studente"}
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
            <Button onClick={handleImportCsv} disabled={isImportingCsv || !csvData.trim()}>
              <Upload className="h-4 w-4 mr-2" />
              {isImportingCsv ? "Importazione in corso..." : "Importa CSV"}
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
          {/* Desktop View */}
          <div className="rounded-md border hidden md:block">
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
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-red-500">
                      {error}
                    </TableCell>
                  </TableRow>
                ) : students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10">
                      Nessuno studente trovato.
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.sigla}</TableCell>
                      <TableCell>{student.firstName}</TableCell>
                      <TableCell>{student.lastName}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteStudent(student.id)}
                          disabled={isDeleting}
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
          
          {/* Mobile Card View */}
          <div className="md:hidden space-y-12 py-4">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">
                {error}
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-8">
                Nessuno studente trovato.
              </div>
            ) : (
              students.map((student) => (
                <div 
                  key={student.id} 
                  className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="bg-primary/10 text-primary font-mono px-2 py-1 rounded-md text-sm font-bold">
                          {student.sigla}
                        </div>
                      </div>
                      <div className="text-lg font-semibold">
                        {student.firstName} {student.lastName}
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => handleDeleteStudent(student.id)}
                      disabled={isDeleting}
                      className="h-10 w-10 rounded-full border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-5 w-5 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            {totalStudents} studenti totali
          </div>
          
          {totalStudents > limit && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Precedente
                  </Button>
                </PaginationItem>
                
                {Array.from({ length: Math.min(5, Math.ceil(totalStudents / limit)) }, (_, i) => {
                  const pageNumber = i + 1;
                  return (
                    <PaginationItem key={pageNumber}>
                      <Button
                        variant={page === pageNumber ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNumber)}
                      >
                        {pageNumber}
                      </Button>
                    </PaginationItem>
                  );
                })}
                
                {Math.ceil(totalStudents / limit) > 5 && (
                  <>
                    <PaginationItem>
                      <span className="mx-2">...</span>
                    </PaginationItem>
                    <PaginationItem>
                      <Button
                        variant={page === Math.ceil(totalStudents / limit) ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(Math.ceil(totalStudents / limit))}
                      >
                        {Math.ceil(totalStudents / limit)}
                      </Button>
                    </PaginationItem>
                  </>
                )}
                
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(Math.ceil(totalStudents / limit), p + 1))}
                    disabled={page >= Math.ceil(totalStudents / limit)}
                  >
                    Successivo
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}