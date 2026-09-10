'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Users,
  Eye,
  ShieldCheck,
  User,
  Clock,
  X,
  XCircle,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { StudentAccount, StudentAccountStatus } from '@/lib/admin-types';
import { LEVEL_LABEL_TO_CODE, FIELD_LABEL_TO_CODE } from '@/lib/academic-reference';
import { motion, AnimatePresence } from 'motion/react';

interface StudentsViewProps {
  students: StudentAccount[];
  onUpdateStatus: (studentId: string, status: StudentAccountStatus) => Promise<{ success: boolean; error?: string }> | void;
  onUpdateLevel: (
    studentId: string,
    levelCode: string,
    fieldCode: string
  ) => Promise<{ success: boolean; error?: string }> | void;
  onOpenAddDelegateForStudent?: (student: StudentAccount) => void;
}

export function StudentsView({
  students,
  onUpdateStatus,
  onUpdateLevel,
  onOpenAddDelegateForStudent
}: StudentsViewProps) {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentAccount | null>(null);
  const [isEditingLevel, setIsEditingLevel] = useState(false);
  const [pendingLevel, setPendingLevel] = useState('');
  const [pendingField, setPendingField] = useState('');
  const [isSavingLevel, setIsSavingLevel] = useState(false);
  const [levelChangeError, setLevelChangeError] = useState('');

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        !search ||
        s.lastName.toLowerCase().includes(search.toLowerCase()) ||
        s.firstName.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase()) ||
        s.studentId.toLowerCase().includes(search.toLowerCase());

      const matchLevel = !levelFilter || s.level === levelFilter;
      const matchSection = !sectionFilter || s.field === sectionFilter;
      const matchStatus = !statusFilter || s.status === statusFilter;

      return matchSearch && matchLevel && matchSection && matchStatus;
    });
  }, [students, search, levelFilter, sectionFilter, statusFilter]);

  const uniqueSections = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.field) set.add(s.field);
    });
    return Array.from(set);
  }, [students]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-ujlog-primary uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Gestion des Utilisateurs</span>
          </div>
          <h1 className="font-display text-xl font-bold text-ujlog-ink tracking-tight">
            Répertoire des étudiants
          </h1>
          <p className="text-xs text-ujlog-ink-soft mt-0.5">
            Consultez les fiches étudiants, vérifiez les inscriptions et gérez les comptes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-ujlog-secondary bg-ujlog-secondary-50 border border-ujlog-secondary-100 px-3 py-1.5 rounded-xl">
            {filteredStudents.length} / {students.length}
          </span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="p-4 bg-white border border-ujlog-border rounded-3xl space-y-3 shadow-soft-warm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Global Search */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-ujlog-ink-soft absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par Nom, Prénom, Email, N° Étudiant..."
              className="w-full pl-10 pr-3.5 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink placeholder-ujlog-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
            />
          </div>

          {/* Level Filter */}
          <div className="relative">
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="w-full px-3 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink focus:outline-none focus:ring-2 focus:ring-orange-500/40 cursor-pointer"
            >
              <option value="">Tous les niveaux</option>
              <option value="Licence 1">Licence 1</option>
              <option value="Licence 2">Licence 2</option>
              <option value="Licence 3">Licence 3</option>
              <option value="Master 1">Master 1</option>
              <option value="Master 2">Master 2</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink focus:outline-none focus:ring-2 focus:ring-orange-500/40 cursor-pointer"
            >
              <option value="">Tous les statuts</option>
              <option value="actif">Actif</option>
              <option value="suspendu">Suspendu</option>
              <option value="en_attente">En attente</option>
            </select>
          </div>
        </div>

        {/* Section Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-ujlog-border">
          <span className="text-[10px] font-bold uppercase text-ujlog-ink-soft flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" />
            Section / Parcours :
          </span>
          <button
            type="button"
            onClick={() => setSectionFilter('')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              !sectionFilter ? 'bg-green-500 text-ujlog-ink' : 'bg-ujlog-cream text-ujlog-ink-soft/60 hover:text-ujlog-ink'
            }`}
          >
            Toutes
          </button>
          {uniqueSections.map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => setSectionFilter(sec)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                sectionFilter === sec ? 'bg-green-500 text-ujlog-ink' : 'bg-ujlog-cream text-ujlog-ink-soft/60 hover:text-ujlog-ink'
              }`}
            >
              {sec}
            </button>
          ))}
        </div>
      </div>

      {/* Table / List */}
      <div className="bg-white border border-ujlog-border rounded-3xl overflow-hidden shadow-soft-warm">
        {filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-xs text-ujlog-ink-soft space-y-2">
            <Users className="w-8 h-8 text-ujlog-ink-soft mx-auto" />
            <p className="font-bold text-ujlog-ink-soft/60">Aucun étudiant trouvé</p>
            <p className="text-[11px]">Modifiez les critères de recherche ou de filtrage.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-ujlog-ink-soft">
              <thead className="bg-ujlog-cream text-ujlog-ink-soft/60 font-bold uppercase text-[10px] tracking-wider border-b border-ujlog-border">
                <tr>
                  <th className="py-3.5 px-4">Étudiant</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Niveau & Section</th>
                  <th className="py-3.5 px-4">Date Inscription</th>
                  <th className="py-3.5 px-4">Statut</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ujlog-border/60 font-medium">
                {filteredStudents.map((st) => (
                  <tr key={st.id} className="hover:bg-ujlog-cream/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-ujlog-cream border border-ujlog-border flex items-center justify-center font-bold text-ujlog-secondary shrink-0">
                          {st.firstName[0]}
                          {st.lastName[0]}
                        </div>
                        <div>
                          <p className="font-bold text-ujlog-ink">
                            {st.firstName} {st.lastName}
                          </p>
                          <p className="text-[10px] font-mono text-ujlog-ink-soft">{st.studentId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-ujlog-ink-soft">{st.email}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-ujlog-primary">{st.level}</p>
                      <p className="text-[10px] text-ujlog-ink-soft/60">{st.field}</p>
                    </td>
                    <td className="py-3.5 px-4 text-ujlog-ink-soft/60 font-mono text-[11px]">
                      {new Date(st.registrationDate).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          st.status === 'actif'
                            ? 'bg-ujlog-primary-light text-ujlog-primary border border-ujlog-primary/20'
                            : st.status === 'suspendu'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : 'bg-ujlog-secondary-50 text-ujlog-secondary border border-ujlog-secondary-100'
                        }`}
                      >
                        {st.status === 'actif' && <CheckCircle2 className="w-3 h-3" />}
                        {st.status === 'suspendu' && <XCircle className="w-3 h-3" />}
                        {st.status === 'en_attente' && <Clock className="w-3 h-3" />}
                        <span className="capitalize">{st.status}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedStudent(st)}
                          className="px-2.5 py-1 bg-ujlog-cream hover:bg-ujlog-primary-light text-ujlog-ink font-bold text-[11px] rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-ujlog-secondary" />
                          <span>Fiche</span>
                        </button>
                        {onOpenAddDelegateForStudent && st.role !== 'delegate' && (
                          <button
                            type="button"
                            onClick={() => onOpenAddDelegateForStudent(st)}
                            className="px-2.5 py-1 bg-orange-900/60 hover:bg-orange-800 text-orange-200 font-bold text-[11px] rounded-lg transition-all border border-orange-700/60 cursor-pointer"
                          >
                            + Délégué
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Fiche Étudiant Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-ujlog-border rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-ujlog-border pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-ujlog-primary-light border border-ujlog-primary/20 rounded-xl text-ujlog-primary">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-ujlog-ink uppercase tracking-wider">FICHE ÉTUDIANT</h3>
                    <p className="text-[10px] font-mono text-ujlog-secondary">{selectedStudent.studentId}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="p-1.5 text-ujlog-ink-soft/60 hover:text-ujlog-ink rounded-lg hover:bg-ujlog-cream cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Student Overview */}
              <div className="space-y-4 overflow-y-auto pr-1">
                <div className="p-4 bg-ujlog-cream rounded-2xl border border-ujlog-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-black text-ujlog-ink">
                        {selectedStudent.firstName} {selectedStudent.lastName}
                      </h4>
                      <p className="text-xs font-mono text-ujlog-ink-soft/60">{selectedStudent.email}</p>
                    </div>
                    <span className="px-3 py-1 bg-green-500/10 border border-green-500/30 text-ujlog-secondary text-xs font-bold rounded-full uppercase">
                      {selectedStudent.role}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-ujlog-border">
                    <div>
                      <span className="text-[10px] text-ujlog-ink-soft uppercase font-bold block">Niveau</span>
                      <span className="font-bold text-ujlog-primary">{selectedStudent.level}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-ujlog-ink-soft uppercase font-bold block">Section</span>
                      <span className="font-bold text-ujlog-ink truncate block">{selectedStudent.field}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-ujlog-ink-soft uppercase font-bold block">Date inscription</span>
                      <span className="font-mono text-ujlog-ink-soft">
                        {new Date(selectedStudent.registrationDate).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-ujlog-ink-soft uppercase font-bold block">Statut compte</span>
                      <span className="capitalize font-bold text-ujlog-secondary">{selectedStudent.status}</span>
                    </div>
                  </div>

                  {/* Changement de niveau/filière — effet réel : l'étudiant perd l'accès
                      aux cours de son ancien niveau et obtient celui du nouveau. */}
                  <div className="pt-2 border-t border-ujlog-border">
                    {!isEditingLevel ? (
                      <button
                        type="button"
                        onClick={() => {
                          setPendingLevel(selectedStudent.level);
                          setPendingField(selectedStudent.field);
                          setLevelChangeError('');
                          setIsEditingLevel(true);
                        }}
                        className="text-[11px] font-bold text-ujlog-primary-dark hover:underline cursor-pointer"
                      >
                        Modifier le niveau / la filière →
                      </button>
                    ) : (
                      <div className="space-y-2.5 bg-ujlog-cream/70 border border-ujlog-border rounded-2xl p-3">
                        <p className="text-[10px] text-ujlog-ink-soft leading-relaxed">
                          ⚠️ Effet immédiat : l&apos;étudiant perdra l&apos;accès aux cours de son niveau/filière actuel et recevra ceux du nouveau, comme s&apos;il venait de s&apos;y inscrire.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={pendingLevel}
                            onChange={(e) => setPendingLevel(e.target.value)}
                            className="px-2.5 py-2 bg-white border border-ujlog-border rounded-lg text-xs font-medium text-ujlog-ink"
                          >
                            {Object.keys(LEVEL_LABEL_TO_CODE).map((label) => (
                              <option key={label} value={label}>{label}</option>
                            ))}
                          </select>
                          <select
                            value={pendingField}
                            onChange={(e) => setPendingField(e.target.value)}
                            className="px-2.5 py-2 bg-white border border-ujlog-border rounded-lg text-xs font-medium text-ujlog-ink"
                          >
                            {Object.keys(FIELD_LABEL_TO_CODE).map((label) => (
                              <option key={label} value={label}>{label}</option>
                            ))}
                          </select>
                        </div>
                        {levelChangeError && (
                          <p className="text-[11px] text-red-600 font-semibold">{levelChangeError}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isSavingLevel}
                            onClick={async () => {
                              setIsSavingLevel(true);
                              setLevelChangeError('');
                              const levelCode = LEVEL_LABEL_TO_CODE[pendingLevel];
                              const fieldCode = FIELD_LABEL_TO_CODE[pendingField];
                              const result = await onUpdateLevel(selectedStudent.id, levelCode, fieldCode);
                              setIsSavingLevel(false);
                              if (!result || result.success) {
                                setSelectedStudent({ ...selectedStudent, level: pendingLevel, field: pendingField });
                                setIsEditingLevel(false);
                              } else {
                                setLevelChangeError(result.error || 'Modification impossible.');
                              }
                            }}
                            className="flex-1 py-2 bg-ujlog-primary-dark hover:brightness-105 text-white font-bold text-[11px] rounded-lg cursor-pointer disabled:opacity-60"
                          >
                            {isSavingLevel ? 'Application...' : 'Confirmer le changement'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingLevel(false)}
                            className="py-2 px-3 bg-white border border-ujlog-border text-ujlog-ink-soft font-bold text-[11px] rounded-lg cursor-pointer"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* History Section */}
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-ujlog-ink-soft/60 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-ujlog-primary" />
                    <span>Historique du compte</span>
                  </h5>
                  <div className="space-y-2">
                    {selectedStudent.history?.map((h) => (
                      <div key={h.id} className="p-3 bg-ujlog-cream/70 border border-ujlog-border rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-ujlog-ink">{h.title}</span>
                          <span className="text-[10px] font-mono text-ujlog-ink-soft">
                            {new Date(h.timestamp).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        <p className="text-[11px] text-ujlog-ink-soft/60">{h.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Account Actions */}
                <div className="pt-2 border-t border-ujlog-border flex items-center gap-2">
                  {selectedStudent.status === 'actif' ? (
                    <button
                      type="button"
                      onClick={async () => {
                        const result = await onUpdateStatus(selectedStudent.id, 'suspendu');
                        if (!result || result.success) {
                          setSelectedStudent({ ...selectedStudent, status: 'suspendu' });
                        }
                      }}
                      className="flex-1 py-2.5 px-3 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Suspendre le compte
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        const result = await onUpdateStatus(selectedStudent.id, 'actif');
                        if (!result || result.success) {
                          setSelectedStudent({ ...selectedStudent, status: 'actif' });
                        }
                      }}
                      className="flex-1 py-2.5 px-3 bg-orange-800 hover:bg-orange-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Activer le compte
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    className="py-2.5 px-4 bg-ujlog-cream hover:bg-ujlog-primary-light text-ujlog-ink-soft font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
