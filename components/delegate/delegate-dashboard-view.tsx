'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useUser } from '@/hooks/use-user';
import { DelegateStore } from '@/lib/delegate-store';
import { DelegateCourse, DelegateScope, CourseType, CourseStatus } from '@/lib/delegate-types';
import { 
  ShieldCheck, 
  BookOpen, 
  UploadCloud, 
  FileText, 
  PlusCircle, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Clock, 
  Bell, 
  History, 
  LogOut, 
  Sparkles, 
  Lock, 
  Download, 
  AlertCircle, 
  Eye, 
  Layers, 
  X, 
  Check,
  Search,
  Filter,
  FileCheck2,
  Calendar,
  User,
  GraduationCap,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DelegateDashboardViewProps {
  onLogoutDelegate: () => void;
}

const COURSE_TYPES: { value: CourseType; label: string; badgeColor: string }[] = [
  { value: 'CM', label: 'Cours Magistral (CM)', badgeColor: 'bg-orange-50 text-ujlog-primary-dark border-orange-200' },
  { value: 'TD', label: 'Travaux Dirigés (TD)', badgeColor: 'bg-green-50 text-green-800 border-green-200' },
  { value: 'Résultats de TD', label: 'Résultats de TD', badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  { value: 'Résultats d\'examen', label: 'Résultats d\'examen', badgeColor: 'bg-purple-50 text-purple-800 border-purple-200' },
  { value: 'Sujets d\'examen', label: 'Sujets d\'examen', badgeColor: 'bg-blue-50 text-blue-800 border-blue-200' },
];

export function DelegateDashboardView({ onLogoutDelegate }: DelegateDashboardViewProps) {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'overview' | 'publish' | 'publications' | 'drafts' | 'notifications' | 'history'>('overview');

  // Delegate scope
  const scope: DelegateScope = user.delegateScope || {
    level: 'Licence 2',
    section: 'Tronc commun',
    levelCode: 'l2',
    academicYear: '2026-2027',
    permissions: ['publish_course', 'edit_own_course', 'delete_own_course', 'draft_course'],
  };

  const isTroncCommun = scope.levelCode === 'l1' || scope.levelCode === 'l2';

  // State for courses, notifications, logs
  const [courses, setCourses] = useState<DelegateCourse[]>(() => DelegateStore.getCourses());
  const [notifications, setNotifications] = useState(() => DelegateStore.getNotifications());
  const [logs, setLogs] = useState(() => DelegateStore.getLogs());

  // Publish Form State
  const [formTitre, setFormTitre] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSemestre, setFormSemestre] = useState<number>(1);
  const [formMatiere, setFormMatiere] = useState('Géographie');
  const [formType, setFormType] = useState<CourseType>('CM');
  const [formEnseignant, setFormEnseignant] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: string; type: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [publishSuccess, setPublishSuccess] = useState<boolean>(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Edit / Delete Modals
  const [courseToEdit, setCourseToEdit] = useState<DelegateCourse | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<DelegateCourse | null>(null);
  const [isDeletingCourse, setIsDeletingCourse] = useState<boolean>(false);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Publications Filter
  const [pubSearch, setPubSearch] = useState('');
  const [pubSubjectFilter, setPubSubjectFilter] = useState('all');
  const [pubTypeFilter, setPubTypeFilter] = useState('all');
  const [pubSemesterFilter, setPubSemesterFilter] = useState('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = () => {
    DelegateStore.getCoursesAsync().then(setCourses);
    setNotifications(DelegateStore.getNotifications());
    setLogs(DelegateStore.getLogs());
  };

  useEffect(() => {
    const handleUpdate = () => {
      DelegateStore.getCoursesAsync().then(setCourses);
      setNotifications(DelegateStore.getNotifications());
      setLogs(DelegateStore.getLogs());
    };
    window.addEventListener('ujlog_courses_updated', handleUpdate);
    return () => window.removeEventListener('ujlog_courses_updated', handleUpdate);
  }, []);

  // Filtered by delegate scope level
  const scopedCourses = useMemo(() => {
    return courses.filter((c) => c.niveauCode === scope.levelCode && c.status !== 'deleted');
  }, [courses, scope.levelCode]);

  const publishedCourses = useMemo(() => {
    return scopedCourses.filter((c) => c.status === 'published');
  }, [scopedCourses]);

  const draftCourses = useMemo(() => {
    return scopedCourses.filter((c) => c.status === 'draft');
  }, [scopedCourses]);

  const totalDownloads = useMemo(() => {
    return publishedCourses.reduce((acc, curr) => acc + (curr.telechargements || 0), 0);
  }, [publishedCourses]);

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setSelectedFile({
        name: file.name,
        size: `${sizeMb} Mo`,
        type: file.type || 'application/pdf',
      });
      setUploadProgress(0);
      let p = 0;
      const interval = setInterval(() => {
        p += 25;
        setUploadProgress(p);
        if (p >= 100) clearInterval(interval);
      }, 60);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setSelectedFile({
        name: file.name,
        size: `${sizeMb} Mo`,
        type: file.type || 'application/pdf',
      });
      setUploadProgress(100);
    }
  };

  // Publish / Save Draft Action
  const handleExecutePublish = async (asDraft: boolean = false) => {
    setPublishError(null);
    if (!formTitre.trim()) {
      setPublishError('Veuillez saisir le titre du cours.');
      return;
    }

    setIsPublishing(true);

    try {
      const authorName = user.firstName ? `${user.firstName} ${user.lastName}` : 'Délégué Promotion';
      const authorEmail = user.email || 'delegue@ujlog.ci';

      const finalMatiere = isTroncCommun ? formMatiere : scope.section;

      const payload = {
        titre: formTitre.trim(),
        description: formDescription.trim(),
        matiere: finalMatiere,
        semestre: formSemestre,
        type: formType,
        enseignant: formEnseignant.trim() || 'Équipe Pédagogique',
        niveau: scope.level,
        section: scope.section,
        niveauCode: scope.levelCode,
        annee: scope.academicYear,
        fileName: selectedFile?.name || `${formTitre.replace(/\s+/g, '_')}.pdf`,
        fileSize: selectedFile?.size || '2.4 Mo',
        fileMimeType: selectedFile?.type || 'application/pdf',
        authorEmail,
        authorName,
        status: asDraft ? 'draft' : 'published',
      };

      // 1. Call API
      const res = await fetch('/api/delegate/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setPublishError(data.error || 'Erreur lors de la publication.');
        setIsPublishing(false);
        return;
      }

      // 2. Save in local DelegateStore
      const newCourse: DelegateCourse = data.course || {
        ...payload,
        id: `dlg-crs-${Date.now()}`,
        status: asDraft ? 'draft' : 'published',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        telechargements: 0,
      };

      // 3. Log and Notif
      DelegateStore.addLog({
        action: asDraft ? 'course_created' : 'course_published',
        description: `${asDraft ? 'Brouillon enregistré' : 'Publication'} : « ${formTitre} » (${scope.level} • ${scope.section}).`,
      });

      DelegateStore.addNotification({
        title: asDraft ? 'Brouillon sauvegardé' : 'Nouveau document publié',
        message: `Le document « ${formTitre} » est maintenant ${asDraft ? 'dans vos brouillons' : 'accessible aux étudiants de votre promotion'}.`,
        type: 'publication',
      });

      setShowPreviewModal(false);
      setIsPublishing(false);
      setPublishSuccess(true);

      // Reset form
      setFormTitre('');
      setFormDescription('');
      setFormEnseignant('');
      setSelectedFile(null);
      setUploadProgress(0);
      loadData();
    } catch {
      setPublishError('Erreur de communication avec le serveur.');
      setIsPublishing(false);
    }
  };

  // Delete course action
  const confirmDeleteCourse = async () => {
    if (!courseToDelete || isDeletingCourse) return;
    setIsDeletingCourse(true);
    try {
      await fetch(`/api/delegate/courses/${courseToDelete.id}`, { method: 'DELETE' });
      DelegateStore.addLog({
        action: 'course_deleted',
        description: `Suppression du document « ${courseToDelete.titre} ».`,
      });

      DelegateStore.addNotification({
        title: 'Document supprimé',
        message: `Le document « ${courseToDelete.titre} » a été retiré de l'espace étudiant.`,
        type: 'deletion',
      });

      setCourseToDelete(null);
      loadData();
    } catch {
      console.error('Error deleting course');
    } finally {
      setIsDeletingCourse(false);
    }
  };

  // Edit course action
  const saveEditedCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseToEdit || isSavingEdit) return;
    setIsSavingEdit(true);

    try {
      await fetch(`/api/delegate/courses/${courseToEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courseToEdit),
      });

      DelegateStore.addLog({
        action: 'course_updated',
        description: `Mise à jour du document « ${courseToEdit.titre} ».`,
      });

      setCourseToEdit(null);
      loadData();
    } catch {
      console.error('Error editing course');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleResetAllStatistics = () => {
    // Aucune donnée fictive à réinitialiser : le rafraîchissement recharge simplement l'état réel.
    loadData();
  };

  const getTypeBadgeStyle = (type: string) => {
    const item = COURSE_TYPES.find((t) => t.value === type);
    return item?.badgeColor || 'bg-ujlog-cream text-ujlog-ink-soft border-ujlog-border';
  };

  // Filtered publications list
  const filteredPubs = useMemo(() => {
    return scopedCourses.filter((c) => {
      if (isTroncCommun && pubSubjectFilter !== 'all' && c.matiere !== pubSubjectFilter) return false;
      if (pubTypeFilter !== 'all' && c.type !== pubTypeFilter) return false;
      if (pubSemesterFilter !== 'all' && String(c.semestre) !== pubSemesterFilter) return false;
      if (pubSearch.trim()) {
        const q = pubSearch.toLowerCase();
        return c.titre.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [scopedCourses, isTroncCommun, pubSubjectFilter, pubTypeFilter, pubSemesterFilter, pubSearch]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">
      
      {/* DELEGATE HEADER HERO CARD */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-ujlog-primary-dark rounded-3xl p-5 sm:p-7 text-white shadow-sm border border-ujlog-primary/20 relative overflow-hidden"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-[11px] font-bold text-orange-200">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
              <span>Espace Délégué Officiel • Session {scope.academicYear}</span>
            </div>

            <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight text-white">
              Bonjour, {user.firstName ? `${user.firstName} ${user.lastName}` : 'Délégué Promotion'}
            </h1>

            {/* Scope Badge (No lock emojis) */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/25 border border-white/15 text-xs text-orange-100 font-semibold">
              <GraduationCap className="w-3.5 h-3.5 text-white shrink-0" />
              <span>
                Périmètre assigné : <strong className="text-white font-extrabold">{scope.level}  -  {scope.section}</strong>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setPublishSuccess(false);
                setActiveTab('publish');
              }}
              className="px-4 py-2.5 bg-green-500 hover:bg-green-400 text-ujlog-ink font-extrabold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Publier une ressource</span>
            </button>

            {/* SORTIR BUTTON */}
            <button
              onClick={onLogoutDelegate}
              className="px-4 py-2.5 bg-white/10 hover:bg-red-500/80 border border-white/20 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer group shadow-xs"
              title="Sortir de l'espace délégué"
            >
              <LogOut className="w-4 h-4 text-orange-200 group-hover:text-white transition-colors" />
              <span>Sortir</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* SUB-NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-ujlog-border scrollbar-none">
        {[
          { id: 'overview', label: 'Vue d’ensemble', icon: Sparkles },
          { id: 'publish', label: 'Publier', icon: UploadCloud, badge: publishSuccess ? 'Nouveau' : undefined },
          { id: 'publications', label: 'Mes publications', icon: BookOpen, count: publishedCourses.length },
          { id: 'drafts', label: 'Brouillons', icon: FileText, count: draftCourses.length },
          { id: 'notifications', label: 'Notifications', icon: Bell, count: notifications.filter(n => !n.read).length },
          { id: 'history', label: 'Historique', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-orange-800 text-white shadow-2xs'
                  : 'text-ujlog-ink-soft hover:text-ujlog-ink hover:bg-ujlog-cream'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-ujlog-ink-soft/60'}`} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-ujlog-border text-ujlog-ink-soft'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* STATS CARDS (All initialized cleanly) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-ujlog-border shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-ujlog-ink-soft/60 block tracking-wider">
                Ressources publiées
              </span>
              <p className="text-xl font-extrabold text-ujlog-primary-dark">{publishedCourses.length}</p>
              <span className="text-[10px] text-orange-700 font-semibold block">{scope.level}</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-ujlog-border shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-ujlog-ink-soft/60 block tracking-wider">
                Brouillons
              </span>
              <p className="text-xl font-extrabold text-green-700">{draftCourses.length}</p>
              <span className="text-[10px] text-ujlog-ink-soft font-semibold block">Non visibles aux étudiants</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-ujlog-border shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-ujlog-ink-soft/60 block tracking-wider">
                Téléchargements
              </span>
              <p className="text-xl font-extrabold text-ujlog-ink">{totalDownloads}</p>
              <span className="text-[10px] text-ujlog-ink-soft font-semibold block">Par la promotion</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-ujlog-border shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-ujlog-ink-soft/60 block tracking-wider">
                Périmètre assigné
              </span>
              <p className="text-sm font-extrabold text-ujlog-primary-dark truncate">{scope.section}</p>
              <span className="text-[10px] text-ujlog-ink-soft font-semibold block">{scope.level} • {scope.academicYear}</span>
            </div>
          </div>

          {/* RECENT PUBLICATIONS */}
          <div className="bg-white rounded-3xl p-5 border border-ujlog-border shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-bold text-ujlog-ink flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-ujlog-primary-dark" />
                <span>Publications récentes dans votre section</span>
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('publications')}
                  className="text-xs font-bold text-ujlog-primary-dark hover:underline cursor-pointer"
                >
                  Tout voir ({scopedCourses.length})
                </button>
              </div>
            </div>

            <div className="divide-y divide-stone-100">
              {publishedCourses.length === 0 ? (
                <div className="p-8 text-center text-ujlog-ink-soft/60 text-xs space-y-2">
                  <BookOpen className="w-8 h-8 mx-auto text-ujlog-ink-soft" />
                  <p className="font-semibold">Aucune publication pour le moment.</p>
                  <p className="text-[11px] text-ujlog-ink-soft/60">Cliquez sur « + Publier une ressource » pour mettre à disposition des cours, TD ou résultats.</p>
                </div>
              ) : (
                publishedCourses.slice(0, 5).map((course) => (
                  <div key={course.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${getTypeBadgeStyle(course.type)}`}>
                          {course.type}
                        </span>
                        <span className="text-[10px] font-bold text-ujlog-ink-soft">
                          {isTroncCommun ? `${course.matiere} • ` : ''}Semestre {course.semestre} • {course.annee}
                        </span>
                      </div>
                      <h3 className="text-xs font-bold text-ujlog-ink truncate">{course.titre}</h3>
                      <p className="text-[11px] text-ujlog-ink-soft line-clamp-1">{course.description}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setCourseToEdit(course)}
                        className="p-1.5 rounded-lg bg-ujlog-cream hover:bg-orange-50 text-ujlog-ink-soft hover:text-ujlog-primary-dark transition-colors cursor-pointer"
                        title="Modifier"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setCourseToDelete(course)}
                        className="p-1.5 rounded-lg bg-ujlog-cream hover:bg-red-50 text-ujlog-ink-soft hover:text-red-600 transition-colors cursor-pointer"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PUBLISH NEW COURSE */}
      {activeTab === 'publish' && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-ujlog-border/90 shadow-2xs space-y-6 max-w-3xl mx-auto">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-ujlog-ink">
              Publier un document pour votre promotion
            </h2>
            <p className="text-xs text-ujlog-ink-soft mt-0.5">
              Remplissez les informations ci-dessous pour diffuser un cours, TD ou résultats aux étudiants de votre niveau.
            </p>
          </div>

          {publishSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-orange-50 border border-orange-200 rounded-2xl flex items-center justify-between gap-3 text-ujlog-primary-dark text-xs"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-orange-700 shrink-0" />
                <div>
                  <span className="font-bold block">Document publié avec succès !</span>
                  <span className="text-[11px] text-orange-700">Il est maintenant immédiatement disponible pour les étudiants de {scope.level}.</span>
                </div>
              </div>
              <button
                onClick={() => setPublishSuccess(false)}
                className="text-xs font-bold text-ujlog-primary-dark hover:underline cursor-pointer"
              >
                Fermer
              </button>
            </motion.div>
          )}

          {publishError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-bold">{publishError}</span>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); setShowPreviewModal(true); }} className="space-y-5">
            
            {/* LOCKED SCOPE FIELDS (WITHOUT EMOJIS) */}
            <div className="bg-ujlog-cream rounded-2xl p-4 border border-ujlog-border space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-ujlog-ink-soft/60 flex items-center gap-1">
                <Lock className="w-3 h-3 text-ujlog-ink-soft" />
                <span>Périmètre académique assigné</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-ujlog-border/60">
                  <span className="text-[10px] text-ujlog-ink-soft/60 block">Niveau</span>
                  <span className="font-bold text-ujlog-ink">{scope.level}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-ujlog-border/60">
                  <span className="text-[10px] text-ujlog-ink-soft/60 block">Section / Parcours</span>
                  <span className="font-bold text-ujlog-ink">{scope.section}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-ujlog-border/60">
                  <span className="text-[10px] text-ujlog-ink-soft/60 block">Année universitaire</span>
                  <span className="font-bold text-ujlog-ink">{scope.academicYear}</span>
                </div>
              </div>
            </div>

            {/* EDITABLE FIELDS */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-ujlog-ink">
                  Titre du document <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitre}
                  onChange={(e) => setFormTitre(e.target.value)}
                  placeholder="Ex: Climatologie dynamique et bilan thermique"
                  className="w-full px-3.5 py-2.5 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink focus:outline-none focus:ring-2 focus:ring-orange-700/20 focus:border-orange-700 font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-ujlog-ink">
                  Description détaillée ou résumé
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Présentation des chapitres abordés, consignes, barème ou objectifs pédagogiques..."
                  className="w-full px-3.5 py-2.5 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink focus:outline-none focus:ring-2 focus:ring-orange-700/20 focus:border-orange-700 font-medium resize-none"
                />
              </div>

              {/* GRID ADAPTED: Shows Matière only for L1 and L2 (Tronc commun) */}
              <div className={`grid grid-cols-1 ${isTroncCommun ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3`}>
                {isTroncCommun && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-ujlog-ink">Matière</label>
                    <select
                      value={formMatiere}
                      onChange={(e) => setFormMatiere(e.target.value)}
                      className="w-full px-3 py-2.5 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs font-bold text-ujlog-ink focus:outline-none focus:ring-2 focus:ring-orange-700/20"
                    >
                      <option value="Géographie">Géographie</option>
                      <option value="Histoire">Histoire</option>
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-ujlog-ink">Semestre</label>
                  <select
                    value={formSemestre}
                    onChange={(e) => setFormSemestre(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs font-bold text-ujlog-ink focus:outline-none focus:ring-2 focus:ring-orange-700/20"
                  >
                    <option value={1}>Semestre 1</option>
                    <option value={2}>Semestre 2</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-ujlog-ink">Type de ressource</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as CourseType)}
                    className="w-full px-3 py-2.5 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs font-bold text-ujlog-ink focus:outline-none focus:ring-2 focus:ring-orange-700/20"
                  >
                    {COURSE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-ujlog-ink">
                  Enseignant / Responsable du cours
                </label>
                <input
                  type="text"
                  value={formEnseignant}
                  onChange={(e) => setFormEnseignant(e.target.value)}
                  placeholder="Ex: Pr. Kouadio A. / Dr. Bamba S."
                  className="w-full px-3.5 py-2.5 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink focus:outline-none focus:ring-2 focus:ring-orange-700/20 focus:border-orange-700 font-medium"
                />
              </div>

              {/* FILE UPLOAD BOX */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-ujlog-ink">
                  Document pédagogique (PDF, Word)
                </label>
                
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-stone-300 hover:border-orange-700 bg-ujlog-cream/50 hover:bg-orange-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {selectedFile ? (
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 text-ujlog-primary-dark flex items-center justify-center mx-auto">
                        <FileCheck2 className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-ujlog-ink text-xs block">{selectedFile.name}</span>
                        <span className="text-[10px] text-ujlog-ink-soft/60">{selectedFile.size}</span>
                      </div>
                      {uploadProgress < 100 && (
                        <div className="w-48 mx-auto bg-ujlog-border rounded-full h-1.5 overflow-hidden">
                          <div className="bg-orange-700 h-full transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-ujlog-ink-soft">
                      <UploadCloud className="w-8 h-8 mx-auto text-ujlog-ink-soft/60" />
                      <p className="text-xs font-semibold text-ujlog-ink-soft">
                        Glissez-déposez le fichier ici ou <span className="text-ujlog-primary-dark underline">parcourez</span>
                      </p>
                      <p className="text-[10px] text-ujlog-ink-soft/60">PDF, DOCX, PPTX jusqu’à 50 Mo</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-ujlog-border">
              <button
                type="button"
                onClick={() => handleExecutePublish(true)}
                disabled={isPublishing}
                className="px-4 py-2.5 bg-ujlog-cream hover:bg-ujlog-border text-ujlog-ink-soft font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Sauvegarder en brouillon
              </button>

              <button
                type="submit"
                disabled={isPublishing}
                className="px-5 py-2.5 bg-orange-800 hover:bg-orange-900 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Vérifier & Publier</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: PUBLICATIONS */}
      {activeTab === 'publications' && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-ujlog-border/90 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-ujlog-border">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-ujlog-ink">
                Gestion des publications ({scopedCourses.length})
              </h2>
              <p className="text-xs text-ujlog-ink-soft">
                Liste complète des ressources publiées et brouillons pour votre niveau.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('publish')}
              className="px-3.5 py-2 bg-orange-800 hover:bg-orange-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 self-start cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Nouveau document</span>
            </button>
          </div>

          {/* FILTERS */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="relative sm:col-span-2">
              <Search className="w-3.5 h-3.5 text-ujlog-ink-soft/60 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={pubSearch}
                onChange={(e) => setPubSearch(e.target.value)}
                placeholder="Rechercher par titre, description..."
                className="w-full pl-8 pr-3 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-orange-700"
              />
            </div>

            {isTroncCommun && (
              <select
                value={pubSubjectFilter}
                onChange={(e) => setPubSubjectFilter(e.target.value)}
                className="px-2.5 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs font-bold text-ujlog-ink-soft focus:outline-none"
              >
                <option value="all">Toutes les matières</option>
                <option value="Géographie">Géographie</option>
                <option value="Histoire">Histoire</option>
              </select>
            )}

            <select
              value={pubTypeFilter}
              onChange={(e) => setPubTypeFilter(e.target.value)}
              className="px-2.5 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs font-bold text-ujlog-ink-soft focus:outline-none"
            >
              <option value="all">Tous les types</option>
              {COURSE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* TABLE / CARDS */}
          <div className="divide-y divide-stone-100">
            {filteredPubs.length === 0 ? (
              <div className="p-8 text-center text-ujlog-ink-soft/60 text-xs space-y-2">
                <BookOpen className="w-8 h-8 mx-auto text-ujlog-ink-soft" />
                <p className="font-semibold">Aucun document ne correspond aux critères.</p>
              </div>
            ) : (
              filteredPubs.map((course) => (
                <div key={course.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-ujlog-cream/60 p-2.5 rounded-2xl transition-colors">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${
                        course.status === 'published' ? 'bg-orange-50 text-ujlog-primary-dark border-orange-200' :
                        'bg-green-50 text-green-800 border-green-200'
                      }`}>
                        {course.status === 'published' ? 'Publié' : 'Brouillon'}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${getTypeBadgeStyle(course.type)}`}>
                        {course.type}
                      </span>
                      <span className="text-[10px] font-bold text-ujlog-ink-soft">
                        {isTroncCommun ? `${course.matiere} • ` : ''}Semestre {course.semestre} • {course.annee}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-ujlog-ink truncate">{course.titre}</h3>
                    <p className="text-[11px] text-ujlog-ink-soft line-clamp-1">{course.description}</p>
                    
                    <div className="flex items-center gap-3 text-[10px] text-ujlog-ink-soft/60 pt-0.5">
                      <span>Fichier : {course.fileName || 'document.pdf'}</span>
                      <span>•</span>
                      <span>{course.telechargements || 0} téléchargements</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setCourseToEdit(course)}
                      className="px-2.5 py-1.5 bg-ujlog-cream hover:bg-orange-50 hover:text-ujlog-primary-dark text-ujlog-ink-soft text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Modifier</span>
                    </button>
                    <button
                      onClick={() => setCourseToDelete(course)}
                      className="px-2.5 py-1.5 bg-ujlog-cream hover:bg-red-50 hover:text-red-600 text-ujlog-ink-soft text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Supprimer</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: BROUILLONS */}
      {activeTab === 'drafts' && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-ujlog-border/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-ujlog-border">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-ujlog-ink">
                Brouillons en attente de publication ({draftCourses.length})
              </h2>
              <p className="text-xs text-ujlog-ink-soft">
                Ces ressources sont enregistrées en privé et ne sont pas encore visibles pour les étudiants.
              </p>
            </div>
          </div>

          <div className="divide-y divide-stone-100">
            {draftCourses.length === 0 ? (
              <div className="p-8 text-center text-ujlog-ink-soft/60 text-xs">
                <FileText className="w-8 h-8 mx-auto text-ujlog-ink-soft mb-2" />
                <p className="font-semibold">Aucun brouillon actuellement.</p>
              </div>
            ) : (
              draftCourses.map((course) => (
                <div key={course.id} className="py-3.5 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-green-50 text-green-800 border border-green-200">
                      Brouillon
                    </span>
                    <h3 className="text-xs font-bold text-ujlog-ink mt-1">{course.titre}</h3>
                    <p className="text-[10px] text-ujlog-ink-soft/60">{course.matiere} • Semestre {course.semestre}</p>
                  </div>
                  <button
                    onClick={async () => {
                      await fetch(`/api/delegate/courses/${course.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'published' }),
                      }).catch(() => {});
                      loadData();
                    }}
                    className="px-3 py-1.5 bg-orange-800 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-orange-900"
                  >
                    Publier maintenant
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-ujlog-border/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-ujlog-border">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-ujlog-ink">
                Notifications administratives & diffusions
              </h2>
              <p className="text-xs text-ujlog-ink-soft">Alertes sur les publications et changements de statut.</p>
            </div>
          </div>

          <div className="divide-y divide-stone-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-ujlog-ink-soft/60 text-xs">
                <Bell className="w-8 h-8 mx-auto text-ujlog-ink-soft mb-2" />
                <p className="font-semibold">Aucune notification.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="py-3 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-orange-100 text-ujlog-primary-dark flex items-center justify-center shrink-0 mt-0.5">
                    <Bell className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-bold text-ujlog-ink">{n.title}</h3>
                    <p className="text-xs text-ujlog-ink-soft">{n.message}</p>
                    <span className="text-[10px] text-ujlog-ink-soft/60 block">{new Date(n.date).toLocaleString('fr-FR')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 6: HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-ujlog-border/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-ujlog-border">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-ujlog-ink">
                Journal d’audit des actions délégué
              </h2>
              <p className="text-xs text-ujlog-ink-soft">Traçabilité complète des publications et modifications.</p>
            </div>
          </div>

          <div className="divide-y divide-stone-100">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-ujlog-ink-soft/60 text-xs">
                <History className="w-8 h-8 mx-auto text-ujlog-ink-soft mb-2" />
                <p className="font-semibold">Aucune action enregistrée pour le moment.</p>
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-orange-600 shrink-0" />
                    <span className="font-medium text-ujlog-ink">{log.description}</span>
                  </div>
                  <span className="text-[10px] text-ujlog-ink-soft/60 shrink-0">
                    {new Date(log.timestamp).toLocaleString('fr-FR')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* PREVIEW MODAL BEFORE PUBLICATION */}
      <AnimatePresence>
        {showPreviewModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full space-y-5 shadow-2xl border border-ujlog-border"
            >
              <div className="flex items-center justify-between pb-3 border-b border-ujlog-border">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-ujlog-primary-dark" />
                  <h3 className="text-sm font-extrabold text-ujlog-ink">
                    Aperçu avant diffusion officielle
                  </h3>
                </div>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1 rounded-lg text-ujlog-ink-soft/60 hover:text-ujlog-ink-soft cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Course Card Preview */}
              <div className="bg-ujlog-cream p-4 rounded-2xl border border-ujlog-border space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${getTypeBadgeStyle(formType)}`}>
                    {formType}
                  </span>
                  <span className="text-[10px] font-bold text-ujlog-ink-soft">
                    {isTroncCommun ? `${formMatiere} • ` : ''}Semestre {formSemestre}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-ujlog-ink">{formTitre}</h4>
                  <p className="text-[11px] text-ujlog-ink-soft mt-1">{formDescription || 'Pas de description fournie.'}</p>
                </div>

                <div className="pt-2 border-t border-ujlog-border/60 grid grid-cols-2 gap-2 text-[10px] text-ujlog-ink-soft">
                  <div>
                    <span className="block font-semibold">Périmètre :</span>
                    <span className="font-bold text-ujlog-ink">{scope.level} ({scope.section})</span>
                  </div>
                  <div>
                    <span className="block font-semibold">Fichier rattaché :</span>
                    <span className="font-bold text-ujlog-ink truncate block">
                      {selectedFile?.name || 'document.pdf'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-2 bg-ujlog-cream hover:bg-ujlog-border text-ujlog-ink-soft font-bold text-xs rounded-xl cursor-pointer"
                >
                  Modifier les informations
                </button>
                <button
                  type="button"
                  disabled={isPublishing}
                  onClick={() => handleExecutePublish(false)}
                  className="px-5 py-2 bg-orange-800 hover:bg-orange-900 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer disabled:opacity-60"
                >
                  {isPublishing ? 'Publication en cours...' : 'Confirmer & Publier'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {courseToDelete && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-ujlog-border text-center"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-ujlog-ink">
                  Supprimer ce document ?
                </h3>
                <p className="text-xs text-ujlog-ink-soft mt-1">
                  « {courseToDelete.titre} » sera définitivement retiré de l&apos;espace étudiant.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  disabled={isDeletingCourse}
                  onClick={() => setCourseToDelete(null)}
                  className="px-4 py-2 bg-ujlog-cream hover:bg-ujlog-border disabled:opacity-50 text-ujlog-ink-soft text-xs font-bold rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  disabled={isDeletingCourse}
                  onClick={confirmDeleteCourse}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
                >
                  {isDeletingCourse ? 'Suppression en cours...' : 'Confirmer la suppression'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {courseToEdit && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-ujlog-border"
            >
              <div className="flex items-center justify-between pb-2 border-b border-ujlog-border">
                <h3 className="text-sm font-extrabold text-ujlog-ink">Modifier le document</h3>
                <button onClick={() => setCourseToEdit(null)} className="p-1 text-ujlog-ink-soft/60 hover:text-ujlog-ink-soft cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={saveEditedCourse} className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-ujlog-ink-soft">Titre</label>
                  <input
                    type="text"
                    required
                    value={courseToEdit.titre}
                    onChange={(e) => setCourseToEdit({ ...courseToEdit, titre: e.target.value })}
                    className="w-full px-3 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-ujlog-ink-soft">Description</label>
                  <textarea
                    rows={2}
                    value={courseToEdit.description}
                    onChange={(e) => setCourseToEdit({ ...courseToEdit, description: e.target.value })}
                    className="w-full px-3 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs font-medium resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-ujlog-ink-soft">Type de ressource</label>
                  <select
                    value={courseToEdit.type}
                    onChange={(e) => setCourseToEdit({ ...courseToEdit, type: e.target.value as CourseType })}
                    className="w-full px-2.5 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs font-bold"
                  >
                    {COURSE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={`grid ${isTroncCommun ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                  {isTroncCommun && (
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-ujlog-ink-soft">Matière</label>
                      <select
                        value={courseToEdit.matiere}
                        onChange={(e) => setCourseToEdit({ ...courseToEdit, matiere: e.target.value })}
                        className="w-full px-2.5 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs font-bold"
                      >
                        <option value="Géographie">Géographie</option>
                        <option value="Histoire">Histoire</option>
                      </select>
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-ujlog-ink-soft">Statut</label>
                    <select
                      value={courseToEdit.status}
                      onChange={(e) => setCourseToEdit({ ...courseToEdit, status: e.target.value as CourseStatus })}
                      className="w-full px-2.5 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs font-bold"
                    >
                      <option value="published">Publié</option>
                      <option value="draft">Brouillon</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    disabled={isSavingEdit}
                    onClick={() => setCourseToEdit(null)}
                    className="px-3.5 py-2 bg-ujlog-cream disabled:opacity-50 text-ujlog-ink-soft text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="px-4 py-2 bg-orange-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-orange-900"
                  >
                    {isSavingEdit ? 'Enregistrement...' : 'Enregistrer les modifications'}
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
