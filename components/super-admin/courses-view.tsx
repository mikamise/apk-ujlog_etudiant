'use client';

import { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  FileText,
  User,
  X,
  AlertTriangle,
  Plus
} from 'lucide-react';
import { CourseItem } from '@/lib/admin-types';
import { motion, AnimatePresence } from 'motion/react';

interface CoursesViewProps {
  courses: CourseItem[];
  onAddCourse?: (courseData: any) => Promise<{ success: boolean; error?: string }> | void;
  onUpdateStatus: (courseId: string, status: 'publié' | 'brouillon' | 'archivé') => void;
  onUpdateMetadata: (courseId: string, updates: Partial<CourseItem>) => Promise<{ success: boolean; error?: string }> | void;
  onDeleteCourse: (courseId: string) => void;
}

export function CoursesView({
  courses,
  onAddCourse,
  onUpdateStatus,
  onUpdateMetadata,
  onDeleteCourse
}: CoursesViewProps) {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [matiereFilter, setMatiereFilter] = useState('');

  const [selectedCourseForView, setSelectedCourseForView] = useState<CourseItem | null>(null);
  const [editingCourse, setEditingCourse] = useState<CourseItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Add course modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'CM' | 'TD' | 'TP' | 'Sujet' | 'PV'>('CM');
  const [newLevel, setNewLevel] = useState('Licence 2');
  const [newSemestre, setNewSemestre] = useState('Semestre 1');
  const [newMatiere, setNewMatiere] = useState('');
  const [newEnseignant, setNewEnseignant] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newStatus, setNewStatus] = useState<'published' | 'draft'>('published');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<string>('2.4 Mo');
  const [addError, setAddError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setUploadedFileSize(`${sizeMB} Mo`);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMatiere.trim()) return;

    if (onAddCourse) {
      // NOTE : ce formulaire ne collecte pas encore l'année universitaire / le semestre /
      // la filière (identifiants réels requis côté serveur) — voir limitation connue.
      const result = await onAddCourse({
        title: newTitle.trim(),
        subjectName: newMatiere.trim(),
        type: newType,
        levelCode: newLevel,
        teacherName: newEnseignant.trim() || undefined,
        description: newDescription.trim() || undefined,
        status: newStatus,
      });
      if (result && !result.success) {
        setAddError(result.error || 'Impossible de créer ce cours. Vérifiez les champs (année universitaire et semestre requis).');
        return;
      }
    }

    setShowAddModal(false);
    setNewTitle('');
    setNewMatiere('');
    setNewEnseignant('');
    setNewDescription('');
    setUploadedFileName(null);
  };

  // Extract unique matiere options from courses
  const uniqueMatieres = useMemo(() => {
    const set = new Set<string>();
    courses.forEach((c) => {
      if (c.matiere) set.add(c.matiere);
    });
    return Array.from(set);
  }, [courses]);

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchSearch =
        !search ||
        c.titre.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase()) ||
        c.enseignant.toLowerCase().includes(search.toLowerCase()) ||
        c.authorName.toLowerCase().includes(search.toLowerCase());

      const matchLevel = !levelFilter || c.niveau.toLowerCase() === levelFilter.toLowerCase();
      const matchSemester = !semesterFilter || String(c.semestre) === String(semesterFilter);
      const matchType = !typeFilter || c.type === typeFilter;
      const matchStatus = !statusFilter || c.status === statusFilter;
      const matchMatiere = !matiereFilter || c.matiere.toLowerCase().includes(matiereFilter.toLowerCase());

      return matchSearch && matchLevel && matchSemester && matchType && matchStatus && matchMatiere;
    });
  }, [courses, search, levelFilter, semesterFilter, typeFilter, statusFilter, matiereFilter]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-ujlog-primary uppercase tracking-wider mb-1">
            <BookOpen className="w-4 h-4" />
            <span>Support de cours & ressources</span>
          </div>
          <h1 className="font-display text-xl font-bold text-ujlog-ink tracking-tight">
            Gestion des cours
          </h1>
          <p className="text-xs text-ujlog-ink-soft">
            Contrôle global des cours, épreuves et résultats publiés par les délégués académiques.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-ujlog-primary bg-ujlog-primary-light border border-ujlog-primary/20 px-3 py-2 rounded-xl">
            {filteredCourses.length} cours
          </span>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-terracotta-gradient text-white font-bold text-xs rounded-xl shadow-glow-orange flex items-center gap-2 cursor-pointer hover:brightness-105 active:scale-[0.99] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter une ressource</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white border border-ujlog-border rounded-3xl space-y-3 shadow-soft-warm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Global Search */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-ujlog-ink-soft/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par titre, enseignant, auteur..."
              className="w-full pl-10 pr-3.5 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink placeholder-ujlog-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-ujlog-primary/20 focus:border-ujlog-primary font-medium"
            />
          </div>

          {/* Level Filter */}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink font-medium focus:outline-none cursor-pointer"
          >
            <option value="">Tous les niveaux</option>
            <option value="Licence 1">Licence 1</option>
            <option value="Licence 2">Licence 2</option>
            <option value="Licence 3">Licence 3</option>
            <option value="Master 1">Master 1</option>
            <option value="Master 2">Master 2</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink font-medium focus:outline-none cursor-pointer"
          >
            <option value="">Tous les types</option>
            <option value="CM">CM (Cours Magistral)</option>
            <option value="TD">TD (Travaux Dirigés)</option>
            <option value="TP">TP (Travaux Pratiques)</option>
            <option value="Sujet">Sujet d&apos;Examen</option>
            <option value="PV">PV de Résultats</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink font-medium focus:outline-none cursor-pointer"
          >
            <option value="">Tous les statuts</option>
            <option value="publié">Publié</option>
            <option value="brouillon">Brouillon</option>
            <option value="archivé">Archivé</option>
          </select>
        </div>

        {/* Matières Filters */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-ujlog-border">
          <span className="text-[10px] font-bold uppercase text-ujlog-ink-soft/70 flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3 text-ujlog-ink-soft" />
            Filtrer par matière :
          </span>
          <button
            type="button"
            onClick={() => setMatiereFilter('')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              !matiereFilter ? 'bg-ujlog-primary text-white' : 'bg-ujlog-cream text-ujlog-ink-soft hover:text-ujlog-ink'
            }`}
          >
            Toutes les matières
          </button>
          {uniqueMatieres.slice(0, 8).map((mat) => (
            <button
              key={mat}
              type="button"
              onClick={() => setMatiereFilter(mat)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                matiereFilter === mat ? 'bg-ujlog-primary text-white' : 'bg-ujlog-cream text-ujlog-ink-soft hover:text-ujlog-ink'
              }`}
            >
              {mat}
            </button>
          ))}
        </div>
      </div>

      {/* Courses List Table */}
      <div className="bg-white border border-ujlog-border rounded-3xl overflow-hidden shadow-soft-warm">
        {filteredCourses.length === 0 ? (
          <div className="p-12 text-center text-xs text-ujlog-ink-soft space-y-2">
            <BookOpen className="w-8 h-8 text-ujlog-ink-soft/60 mx-auto" />
            <p className="font-bold text-ujlog-ink-soft">Aucun cours disponible</p>
            <p className="text-[11px]">Modifiez les critères de filtrage ou de recherche.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {filteredCourses.map((c) => {
              const isPublished = c.status === 'published' || (c.status as string) === 'publié';
              const isDraft = c.status === 'draft' || (c.status as string) === 'brouillon';
              return (
                <div
                  key={c.id}
                  className="bg-white border border-ujlog-border rounded-3xl p-4 shadow-soft-warm hover:border-ujlog-primary/30 transition-all flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-ujlog-primary-light text-ujlog-primary-dark font-black text-[11px] flex items-center justify-center shrink-0">
                        {c.type}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-ujlog-ink text-xs truncate">{c.titre}</p>
                        <p className="text-[10px] text-ujlog-ink-soft truncate">{c.description}</p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        isPublished
                          ? 'bg-ujlog-primary-light text-ujlog-primary-dark border border-ujlog-primary/20'
                          : isDraft
                          ? 'bg-ujlog-secondary-50 text-ujlog-secondary-dark border border-ujlog-secondary-100'
                          : 'bg-ujlog-cream text-ujlog-ink-soft border border-ujlog-border'
                      }`}
                    >
                      {isPublished ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                      <span>{isPublished ? 'Publié' : isDraft ? 'Brouillon' : c.status === 'pending' ? 'En attente' : c.status}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] py-2.5 border-y border-ujlog-border">
                    <div>
                      <p className="text-[9px] uppercase font-bold text-ujlog-ink-soft/60">Matière</p>
                      <p className="font-bold text-ujlog-primary-dark truncate">{c.matiere}</p>
                      <p className="text-[10px] text-ujlog-ink-soft truncate">Prof. {c.enseignant}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-bold text-ujlog-ink-soft/60">Niveau</p>
                      <p className="font-bold text-ujlog-ink">{c.niveau}</p>
                      <p className="text-[10px] font-mono text-ujlog-ink-soft">{c.semestre}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[9px] uppercase font-bold text-ujlog-ink-soft/60">Auteur délégué</p>
                      <p className="font-bold text-ujlog-secondary-dark truncate">{c.authorName}</p>
                      <p className="text-[10px] font-mono text-ujlog-ink-soft/60">
                        {new Date(c.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedCourseForView(c)}
                        className="p-1.5 bg-ujlog-cream hover:bg-ujlog-border text-ujlog-secondary-dark rounded-lg cursor-pointer"
                        title="Consulter"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCourse(c)}
                        className="p-1.5 bg-ujlog-cream hover:bg-ujlog-border text-ujlog-primary-dark rounded-lg cursor-pointer"
                        title="Modifier les métadonnées"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(c.id)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg cursor-pointer"
                        title="Supprimer définitivement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {isPublished ? (
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(c.id, 'brouillon')}
                        className="px-2.5 py-1.5 bg-ujlog-secondary-50 hover:bg-ujlog-secondary-100 text-ujlog-secondary-dark font-bold text-[10px] rounded-lg cursor-pointer"
                      >
                        Dépublier
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(c.id, 'publié')}
                        className="px-2.5 py-1.5 bg-ujlog-primary-dark hover:brightness-105 text-white font-bold text-[10px] rounded-lg cursor-pointer"
                      >
                        Publier
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Consult Course Modal */}
      <AnimatePresence>
        {selectedCourseForView && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-ujlog-border rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-soft-warm text-ujlog-ink"
            >
              <div className="flex items-center justify-between border-b border-ujlog-border pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  <h3 className="font-display text-sm font-bold text-ujlog-ink">Détails du cours</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCourseForView(null)}
                  className="p-1 text-ujlog-ink-soft/60 hover:text-ujlog-ink-soft"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-4 bg-ujlog-cream rounded-2xl border border-ujlog-border space-y-2">
                  <span className="px-2.5 py-0.5 bg-green-100 text-green-900 border border-green-200 text-[10px] font-bold rounded-full">
                    {selectedCourseForView.type}
                  </span>
                  <h4 className="text-base font-bold text-ujlog-ink">{selectedCourseForView.titre}</h4>
                  <p className="text-ujlog-ink-soft text-xs leading-relaxed">{selectedCourseForView.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs p-3 bg-ujlog-cream rounded-xl border border-ujlog-border">
                  <div>
                    <span className="text-[10px] text-ujlog-ink-soft/60 uppercase font-bold block">Matière</span>
                    <span className="font-bold text-ujlog-primary-dark">{selectedCourseForView.matiere}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-ujlog-ink-soft/60 uppercase font-bold block">Enseignant</span>
                    <span className="font-bold text-ujlog-ink-soft">Prof. {selectedCourseForView.enseignant}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-ujlog-ink-soft/60 uppercase font-bold block">Niveau & Semestre</span>
                    <span className="font-mono text-ujlog-ink">{selectedCourseForView.niveau} ({selectedCourseForView.semestre})</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-ujlog-ink-soft/60 uppercase font-bold block">Publié par</span>
                    <span className="font-bold text-green-800">{selectedCourseForView.authorName}</span>
                  </div>
                </div>

                {selectedCourseForView.documentUrl && (
                  <a
                    href={selectedCourseForView.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 bg-orange-800 hover:bg-orange-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Download className="w-4 h-4 text-orange-200" />
                    <span>Télécharger la ressource PDF ({selectedCourseForView.fileSize || '2.4 Mo'})</span>
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Metadata Modal */}
      <AnimatePresence>
        {editingCourse && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-ujlog-border rounded-3xl p-6 max-w-md w-full space-y-4 shadow-soft-warm text-ujlog-ink"
            >
              <div className="flex items-center justify-between border-b border-ujlog-border pb-3">
                <h3 className="font-display text-sm font-bold text-ujlog-ink">Modifier les métadonnées</h3>
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className="p-1 text-ujlog-ink-soft/60 hover:text-ujlog-ink-soft"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase text-ujlog-ink-soft">Titre du cours</label>
                  <input
                    type="text"
                    value={editingCourse.titre}
                    onChange={(e) => setEditingCourse({ ...editingCourse, titre: e.target.value })}
                    className="w-full px-3 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase text-ujlog-ink-soft">Matière</label>
                  <input
                    type="text"
                    value={editingCourse.matiere}
                    onChange={(e) => setEditingCourse({ ...editingCourse, matiere: e.target.value })}
                    className="w-full px-3 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase text-ujlog-ink-soft">Enseignant</label>
                  <input
                    type="text"
                    value={editingCourse.enseignant}
                    onChange={(e) => setEditingCourse({ ...editingCourse, enseignant: e.target.value })}
                    className="w-full px-3 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase text-ujlog-ink-soft">Description</label>
                  <textarea
                    rows={3}
                    value={editingCourse.description}
                    onChange={(e) => setEditingCourse({ ...editingCourse, description: e.target.value })}
                    className="w-full px-3 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className="flex-1 py-2.5 px-3 bg-ujlog-cream text-ujlog-ink-soft font-bold text-xs rounded-xl hover:bg-ujlog-border"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const result = await onUpdateMetadata(editingCourse.id, {
                      titre: editingCourse.titre,
                      description: editingCourse.description,
                      matiere: editingCourse.matiere,
                      enseignant: editingCourse.enseignant
                    });
                    if (!result || result.success) {
                      setEditingCourse(null);
                    }
                  }}
                  className="flex-1 py-2.5 px-3 bg-orange-800 hover:bg-orange-900 text-white font-bold text-xs rounded-xl shadow-2xs"
                >
                  Enregistrer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm Delete Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-ujlog-border rounded-3xl p-6 max-w-md w-full space-y-4 shadow-soft-warm text-ujlog-ink"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-100 border border-rose-200 rounded-2xl text-rose-700">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-ujlog-ink">Suppression définitive</h3>
                  <p className="text-[11px] text-ujlog-ink-soft">Action irréversible sur la ressource</p>
                </div>
              </div>

              <p className="text-xs text-ujlog-ink-soft bg-ujlog-cream p-3.5 rounded-2xl border border-ujlog-border leading-relaxed font-medium">
                Êtes-vous sûr de vouloir supprimer définitivement ce cours de la plateforme ? Il ne sera plus accessible ni aux étudiants ni aux délégués.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2.5 px-3 bg-ujlog-cream hover:bg-ujlog-border text-ujlog-ink-soft font-bold text-xs rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteCourse(deleteConfirmId);
                    setDeleteConfirmId(null);
                  }}
                  className="flex-1 py-2.5 px-3 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-2xs cursor-pointer"
                >
                  Confirmer la suppression
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Resource Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-ujlog-border rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-soft-warm text-ujlog-ink max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-ujlog-border pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-orange-800 rounded-xl text-white">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold text-ujlog-ink">Ajouter une ressource / un cours</h3>
                    <p className="text-[10px] text-ujlog-ink-soft">Espace Super Administration - Publication directe</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 text-ujlog-ink-soft/60 hover:text-ujlog-ink-soft rounded-lg hover:bg-ujlog-cream cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4 overflow-y-auto pr-1">
                {addError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-700 font-semibold">
                    {addError}
                  </div>
                )}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-ujlog-ink-soft">
                    Titre du support / document <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="ex: CM Climatologie Générale - Chapitre 1 & 2"
                    className="w-full px-3 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 font-medium"
                  />
                </div>

                {/* File Upload Zone */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-ujlog-ink-soft">
                    Fichier du Cours / Document (PDF, Word, PV)
                  </label>
                  <div className="relative border-2 border-dashed border-stone-300 hover:border-orange-500 bg-ujlog-cream hover:bg-orange-50/30 rounded-2xl p-4 text-center transition-all cursor-pointer">
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {uploadedFileName ? (
                      <div className="flex items-center justify-center gap-2 text-ujlog-primary-dark font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4 text-orange-600" />
                        <span>Fichier chargé : {uploadedFileName} ({uploadedFileSize})</span>
                      </div>
                    ) : (
                      <div className="space-y-1 text-ujlog-ink-soft">
                        <Download className="w-5 h-5 mx-auto text-ujlog-ink-soft/60" />
                        <p className="text-xs font-bold text-ujlog-ink-soft">Cliquez ou glissez-déposez un fichier ici</p>
                        <p className="text-[10px] text-ujlog-ink-soft/60">PDF, Word, PowerPoint jusqu&apos;à 25 Mo</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-ujlog-ink-soft">Type</label>
                    <select
                      value={newType}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'CM' || val === 'TD' || val === 'TP' || val === 'Sujet' || val === 'PV') {
                          setNewType(val);
                        }
                      }}
                      className="w-full px-2.5 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-medium cursor-pointer"
                    >
                      <option value="CM">CM (Cours Magistral)</option>
                      <option value="TD">TD (Travaux Dirigés)</option>
                      <option value="TP">TP (Travaux Pratiques)</option>
                      <option value="Sujet">Sujet d&apos;Examen</option>
                      <option value="PV">PV de Résultats</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-ujlog-ink-soft">Niveau</label>
                    <select
                      value={newLevel}
                      onChange={(e) => setNewLevel(e.target.value)}
                      className="w-full px-2.5 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-medium cursor-pointer"
                    >
                      <option value="Licence 1">Licence 1</option>
                      <option value="Licence 2">Licence 2</option>
                      <option value="Licence 3">Licence 3</option>
                      <option value="Master 1">Master 1</option>
                      <option value="Master 2">Master 2</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-ujlog-ink-soft">Semestre</label>
                    <select
                      value={newSemestre}
                      onChange={(e) => setNewSemestre(e.target.value)}
                      className="w-full px-2.5 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-medium cursor-pointer"
                    >
                      <option value="Semestre 1">Semestre 1</option>
                      <option value="Semestre 2">Semestre 2</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-ujlog-ink-soft">
                      Matière / UE <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newMatiere}
                      onChange={(e) => setNewMatiere(e.target.value)}
                      placeholder="ex: Histoire Moderne, Cartographie"
                      className="w-full px-3 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-ujlog-ink-soft">Professeur / Enseignant</label>
                    <input
                      type="text"
                      value={newEnseignant}
                      onChange={(e) => setNewEnseignant(e.target.value)}
                      placeholder="ex: Dr. KOFFI Emmanuel"
                      className="w-full px-3 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-ujlog-ink-soft">Description / Instructions</label>
                  <textarea
                    rows={2}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Précisions sur le contenu, la date d'examen ou les exercices requis..."
                    className="w-full px-3 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-ujlog-ink-soft">Statut de la publication</label>
                  <select
                    value={newStatus}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'published' || val === 'draft') {
                        setNewStatus(val);
                      }
                    }}
                    className="w-full px-3 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer"
                  >
                    <option value="published">Publié directement (visible par tous les étudiants)</option>
                    <option value="draft">Brouillon (sauvegardé en privé)</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 px-3 bg-ujlog-cream hover:bg-ujlog-border text-ujlog-ink-soft font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-3 bg-orange-800 hover:bg-orange-900 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-2"
                  >
                    <BookOpen className="w-4 h-4 text-orange-200" />
                    <span>Publier la ressource</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
