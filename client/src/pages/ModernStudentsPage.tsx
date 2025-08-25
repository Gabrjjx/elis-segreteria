import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Upload, 
  UserPlus, 
  Trash2, 
  Pencil, 
  Users, 
  Hash, 
  User, 
  Calendar,
  Eye,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  AlertTriangle
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { it } from "date-fns/locale";

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

export default function ModernStudentsPage() {
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
  
  // State for editing student
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // State for adding new student
  const [newStudent, setNewStudent] = useState({
    sigla: '',
    firstName: '',
    lastName: ''
  });

  const { toast } = useToast();

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
        if (/^\d+$/.test(searchQuery)) {
          params.append('sigla', searchQuery);
        } else if (searchQuery.includes(" ")) {
          const [first, last] = searchQuery.split(" ", 2);
          params.append('firstName', first);
          params.append('lastName', last);
        } else {
          params.append('firstName', searchQuery);
          params.append('lastName', searchQuery);
        }
      }
      
      const response = await fetch(`/api/students?${params.toString()}`);
      if (!response.ok) throw new Error('Errore nel caricamento degli studenti');
      
      const data: StudentsResponse = await response.json();
      setStudents(data.students);
      setTotalStudents(data.total);
    } catch (err) {
      setError('Errore nel caricamento degli studenti');
      console.error('Error fetching students:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStudent = async () => {
    if (!newStudent.sigla || !newStudent.firstName || !newStudent.lastName) {
      toast({
        title: "Campi mancanti",
        description: "Compila tutti i campi per aggiungere lo studente",
        variant: "destructive",
      });
      return;
    }

    setIsAddingStudent(true);
    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newStudent),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Errore nell\'aggiunta dello studente');
      }

      toast({
        title: "Studente aggiunto",
        description: `${newStudent.firstName} ${newStudent.lastName} è stato aggiunto con successo`,
      });

      setNewStudent({ sigla: '', firstName: '', lastName: '' });
      fetchStudents();
    } catch (err: any) {
      toast({
        title: "Errore",
        description: err.message || "Errore nell'aggiunta dello studente",
        variant: "destructive",
      });
    } finally {
      setIsAddingStudent(false);
    }
  };

  const handleDeleteStudent = async (studentId: number, studentName: string) => {
    if (!confirm(`Sei sicuro di voler eliminare ${studentName}?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/students/${studentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Errore nell\'eliminazione dello studente');

      toast({
        title: "Studente eliminato",
        description: `${studentName} è stato eliminato con successo`,
      });

      fetchStudents();
    } catch (err) {
      toast({
        title: "Errore",
        description: "Errore nell'eliminazione dello studente",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditStudent = async () => {
    if (!editingStudent) return;

    setIsEditing(true);
    try {
      const response = await fetch(`/api/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sigla: editingStudent.sigla,
          firstName: editingStudent.firstName,
          lastName: editingStudent.lastName,
        }),
      });

      if (!response.ok) throw new Error('Errore nell\'aggiornamento dello studente');

      toast({
        title: "Studente aggiornato",
        description: "Le informazioni sono state aggiornate con successo",
      });

      setEditDialogOpen(false);
      setEditingStudent(null);
      fetchStudents();
    } catch (err) {
      toast({
        title: "Errore",
        description: "Errore nell'aggiornamento dello studente",
        variant: "destructive",
      });
    } finally {
      setIsEditing(false);
    }
  };

  const handleImportCsv = async () => {
    if (!csvData.trim()) {
      toast({
        title: "Dati CSV mancanti",
        description: "Inserisci i dati CSV per procedere con l'importazione",
        variant: "destructive",
      });
      return;
    }

    setIsImportingCsv(true);
    try {
      const response = await fetch('/api/students/import-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csvData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Errore nell\'importazione CSV');
      }

      const result = await response.json();
      toast({
        title: "Importazione completata",
        description: `${result.imported} studenti importati con successo`,
      });

      setCsvData('');
      fetchStudents();
    } catch (err: any) {
      toast({
        title: "Errore nell'importazione",
        description: err.message || "Errore nell'importazione del file CSV",
        variant: "destructive",
      });
    } finally {
      setIsImportingCsv(false);
    }
  };

  const totalPages = Math.ceil(totalStudents / limit);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  if (isLoading && students.length === 0) {
    return (
      <div className="space-y-6 p-6 bg-gradient-to-br from-gray-50 via-white to-blue-50/30 min-h-screen">
        <div className="premium-card">
          <div className="p-8">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-gray-50 via-white to-blue-50/30 min-h-screen">
      {/* Premium Header */}
      <div className="premium-card border-0 bg-gradient-to-r from-white via-purple-50/30 to-indigo-50/20 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-600/10 to-indigo-600/5 rounded-full -mr-16 -mt-16" />
        
        <div className="p-8 relative">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-4 mb-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/25 border-2 border-white/20">
                  <Users className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-black bg-gradient-to-r from-gray-800 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    Gestione Studenti
                  </h1>
                  <p className="text-gray-600 text-lg mt-1">
                    Anagrafica completa degli studenti della Residenza ELIS
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full shadow-lg shadow-purple-500/30"></div>
                  <span className="text-gray-700 font-medium">Totale Studenti: {totalStudents}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">{format(new Date(), 'dd MMMM yyyy', { locale: it })}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 lg:mt-0">
              <Button 
                variant="outline" 
                className="bg-white/80 border-gray-200/60 hover:bg-gray-50 mr-3"
                onClick={() => fetchStudents()}
                disabled={isLoading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Aggiorna
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserPlus className="h-5 w-5 text-green-500" />
              <span>Aggiungi Studente</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Sigla</label>
              <Input
                type="text"
                placeholder="es. 12345"
                value={newStudent.sigla}
                onChange={(e) => setNewStudent(prev => ({ ...prev, sigla: e.target.value }))}
                className="premium-input"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Nome</label>
              <Input
                type="text"
                placeholder="Nome"
                value={newStudent.firstName}
                onChange={(e) => setNewStudent(prev => ({ ...prev, firstName: e.target.value }))}
                className="premium-input"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Cognome</label>
              <Input
                type="text"
                placeholder="Cognome"
                value={newStudent.lastName}
                onChange={(e) => setNewStudent(prev => ({ ...prev, lastName: e.target.value }))}
                className="premium-input"
              />
            </div>
            <Button 
              onClick={handleAddStudent} 
              disabled={isAddingStudent}
              className="w-full btn-success"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {isAddingStudent ? 'Aggiungendo...' : 'Aggiungi Studente'}
            </Button>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5 text-blue-500" />
              <span>Cerca Studenti</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Ricerca</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Sigla, nome o cognome..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 premium-input"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full btn-premium">
                <Search className="mr-2 h-4 w-4" />
                Cerca
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5 text-purple-500" />
              <span>Importa CSV</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Dati CSV</label>
              <textarea
                placeholder="sigla,firstName,lastName&#10;12345,Mario,Rossi&#10;67890,Luca,Bianchi"
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                className="w-full h-20 p-3 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <Button 
              onClick={handleImportCsv} 
              disabled={isImportingCsv}
              className="w-full btn-premium"
            >
              <Upload className="mr-2 h-4 w-4" />
              {isImportingCsv ? 'Importando...' : 'Importa'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Students List */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-500" />
              <span>Elenco Studenti</span>
              <Badge variant="outline" className="ml-2">
                {totalStudents} studenti
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl animate-pulse">
                  <div className="h-12 w-12 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                  <div className="h-8 w-20 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : students.length > 0 ? (
            <div className="space-y-3">
              {students.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-white via-purple-50/20 to-indigo-50/20 rounded-xl border border-purple-100/60 hover:shadow-md transition-all duration-200 group">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <User className="h-6 w-6 text-purple-500" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-1">
                        <span className="font-bold text-lg text-gray-900">{student.firstName} {student.lastName}</span>
                        <Badge variant="outline" className="text-xs">
                          ID: {student.id}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center space-x-1">
                          <Hash className="h-3 w-3" />
                          <span className="font-mono font-medium">Sigla: {student.sigla}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>Aggiunto: {format(new Date(student.createdAt), 'dd/MM/yyyy', { locale: it })}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setEditingStudent(student);
                        setEditDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteStudent(student.id, `${student.firstName} ${student.lastName}`)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nessuno studente trovato</h3>
              <p className="text-gray-600 mb-6">Non ci sono studenti che corrispondono ai criteri di ricerca.</p>
              <Button 
                onClick={() => {
                  setSearchQuery('');
                  setPage(1);
                }}
                className="btn-premium"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Mostra Tutti
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Pagina {page} di {totalPages} - Totale: {totalStudents} studenti
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Precedente
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className={pageNum === page ? "btn-premium" : ""}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                >
                  Successiva
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Student Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Studente</DialogTitle>
          </DialogHeader>
          {editingStudent && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Sigla</label>
                <Input
                  type="text"
                  value={editingStudent.sigla}
                  onChange={(e) => setEditingStudent(prev => prev ? { ...prev, sigla: e.target.value } : null)}
                  className="premium-input"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Nome</label>
                <Input
                  type="text"
                  value={editingStudent.firstName}
                  onChange={(e) => setEditingStudent(prev => prev ? { ...prev, firstName: e.target.value } : null)}
                  className="premium-input"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Cognome</label>
                <Input
                  type="text"
                  value={editingStudent.lastName}
                  onChange={(e) => setEditingStudent(prev => prev ? { ...prev, lastName: e.target.value } : null)}
                  className="premium-input"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setEditDialogOpen(false);
                setEditingStudent(null);
              }}
            >
              Annulla
            </Button>
            <Button 
              onClick={handleEditStudent}
              disabled={isEditing}
              className="btn-premium"
            >
              {isEditing ? 'Salvando...' : 'Salva Modifiche'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error State */}
      {error && (
        <Card className="premium-card border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <h3 className="font-medium text-red-900">Errore nel caricamento</h3>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
              <Button variant="outline" onClick={() => fetchStudents()} size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Riprova
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}