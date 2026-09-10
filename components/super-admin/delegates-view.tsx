'use client';

import { useState } from 'react';
import {
  UserCheck,
  Plus,
  KeyRound,
  Copy,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldCheck,
  AlertTriangle,
  Search,
  X,
  User
} from 'lucide-react';
import { DelegateManagementRecord, StudentAccount } from '@/lib/admin-types';
import { motion, AnimatePresence } from 'motion/react';

interface DelegatesViewProps {
  delegates: DelegateManagementRecord[];
  students: StudentAccount[];
  onCreateDelegate: (params: {
    studentId: string;
    level: string;
    section: string;
    permissions: string[];
  }) => void;
  onCreateDelegateDirect?: (params: {
    email: string;
    name: string;
    level: string;
    section: string;
    permissions: string[];
  }) => void;
  onRevokeDelegate: (id: string) => void;
  onReactivateDelegate: (id: string) => void;
  onRegenerateCode: (id: string) => void;
  onUpdateDelegate: (id: string, updates: any) => Promise<{ success: boolean; error?: string }> | void;
  initialSelectedStudent?: StudentAccount | null;
}

export function DelegatesView({
  delegates,
  students,
  onCreateDelegate,
  onCreateDelegateDirect,
  onRevokeDelegate,
  onReactivateDelegate,
  onRegenerateCode,
  onUpdateDelegate,
  initialSelectedStudent
}: DelegatesViewProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'codes' | 'revoked'>('active');
  const [showAddModal, setShowAddModal] = useState(Boolean(initialSelectedStudent));
  const [addMode, setAddMode] = useState<'email' | 'student'>('email');
  
  const [directEmail, setDirectEmail] = useState('');
  const [directName, setDirectName] = useState('');
  
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentForNewDelegate, setSelectedStudentForNewDelegate] = useState<StudentAccount | null>(
    initialSelectedStudent || null
  );

  const [selectedLevel, setSelectedLevel] = useState('Licence 2');
  const [selectedSection, setSelectedSection] = useState('Histoire-Géographie');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([
    'publish_course',
    'edit_own_course',
    'delete_own_course',
    'draft_course',
    'view_stats',
    'receive_notifications'
  ]);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [generatedCodeMessage, setGeneratedCodeMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);
  const [editingDelegate, setEditingDelegate] = useState<DelegateManagementRecord | null>(null);

  const LEVEL_CODE_MAP: Record<string, string> = {
    'Licence 1': 'l1',
    'Licence 2': 'l2',
    'Licence 3': 'l3',
    'Master 1': 'm1',
    'Master 2': 'm2',
  };
  const FIELD_CODE_MAP: Record<string, string> = {
    'Tronc commun': 'tronc_commun',
    'Histoire-Géographie': 'histoire_geographie',
    'Histoire': 'histoire',
    'Géographie': 'geographie',
  };

  // Filter delegates by tab
  const activeDelegates = delegates.filter((d) => d.status === 'active');
  const pendingDelegates = delegates.filter((d) => d.status === 'pending');
  const revokedDelegates = delegates.filter((d) => d.status === 'revoked');

  // Academic section options based on level (Strictly Histoire-Géographie)
  const getSectionOptions = (level: string) => {
    if (level === 'Licence 1' || level === 'Licence 2') {
      return ['Tronc commun', 'Histoire-Géographie'];
    }
    return ['Histoire-Géographie', 'Histoire', 'Géographie'];
  };

  const availableSections = getSectionOptions(selectedLevel);

  // Search candidate students for delegate assignment
  const candidateStudents = students.filter(
    (s) =>
      s.role !== 'delegate' &&
      (!studentSearch ||
        s.firstName.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.lastName.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.studentId.toLowerCase().includes(studentSearch.toLowerCase()))
  );

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleLevelChange = (lvl: string) => {
    setSelectedLevel(lvl);
    const secs = getSectionOptions(lvl);
    setSelectedSection(secs[0]);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const email = addMode === 'email' ? directEmail.trim() : selectedStudentForNewDelegate?.email;
    if (!email) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          role: 'delegate',
          levelCode: LEVEL_CODE_MAP[selectedLevel] || selectedLevel.toLowerCase(),
          fieldCode: FIELD_CODE_MAP[selectedSection] || selectedSection.toLowerCase(),
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setSubmitError(data.error || 'Impossible d’envoyer l’invitation.');
        setIsSubmitting(false);
        return;
      }

      setGeneratedCodeMessage(data.message || `Invitation envoyée à ${email}. Elle recevra un lien d'activation personnel par e-mail.`);
      setShowAddModal(false);
      setDirectEmail('');
      setDirectName('');
      setSelectedStudentForNewDelegate(null);
    } catch {
      setSubmitError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-ujlog-secondary uppercase tracking-wider mb-1">
            <UserCheck className="w-4 h-4" />
            <span>Administration Académique</span>
          </div>
          <h1 className="font-display text-xl font-bold text-ujlog-ink tracking-tight">
            Gestion des délégués
          </h1>
          <p className="text-xs text-ujlog-ink-soft/60">
            Attribuez les rôles de délégué, gérez les codes d&apos;activation et contrôlez les autorisations par filière.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowAddModal(true);
            setSelectedStudentForNewDelegate(null);
          }}
          className="px-4 py-2.5 bg-terracotta-gradient active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-glow-orange hover:brightness-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un délégué</span>
        </button>
      </div>

      {/* Tabs Bar */}
      <div className="p-1.5 bg-white border border-ujlog-border rounded-2xl flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'active' ? 'bg-ujlog-primary text-white shadow-sm' : 'text-ujlog-ink-soft/60 hover:text-ujlog-ink'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-ujlog-primary" />
          <span>Délégués actifs ({activeDelegates.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'pending' ? 'bg-ujlog-secondary text-white shadow-sm' : 'text-ujlog-ink-soft/60 hover:text-ujlog-ink'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Délégués en attente ({pendingDelegates.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('codes')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'codes' ? 'bg-ujlog-cream text-ujlog-ink shadow-sm' : 'text-ujlog-ink-soft/60 hover:text-ujlog-ink'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5 text-ujlog-secondary" />
          <span>Codes d&apos;activation ({delegates.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('revoked')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'revoked' ? 'bg-rose-500 text-white shadow-sm' : 'text-ujlog-ink-soft/60 hover:text-ujlog-ink'
          }`}
        >
          <XCircle className="w-3.5 h-3.5 text-rose-400" />
          <span>Délégués révoqués ({revokedDelegates.length})</span>
        </button>
      </div>

      {/* Notification banner for newly generated code */}
      {generatedCodeMessage && (
        <div className="p-4 bg-ujlog-primary-light/80 border border-ujlog-primary/20 rounded-2xl flex items-center justify-between text-ujlog-primary-dark text-xs shadow-soft-warm">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-ujlog-primary shrink-0" />
            <p className="font-semibold">{generatedCodeMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setGeneratedCodeMessage(null)}
            className="p-1 text-ujlog-primary hover:text-white rounded-lg hover:bg-orange-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content View per Tab */}
      <div className="bg-white border border-ujlog-border rounded-3xl p-5 shadow-soft-warm">
        {/* Active Delegates View */}
        {activeTab === 'active' && (
          <div className="space-y-4">
            {activeDelegates.length === 0 ? (
              <div className="py-12 text-center text-xs text-ujlog-ink-soft space-y-2">
                <UserCheck className="w-8 h-8 text-ujlog-ink-soft mx-auto" />
                <p className="font-bold text-ujlog-ink-soft/60">Aucun délégué actif enregistrer</p>
                <p className="text-[11px]">Cliquez sur &quot;+ Ajouter un Délégué&quot; pour en attribuer un.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeDelegates.map((dlg) => (
                  <div
                    key={dlg.id}
                    className="p-4 bg-ujlog-cream border border-ujlog-border rounded-2xl space-y-3 relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-ujlog-primary-light border border-ujlog-primary/20 flex items-center justify-center font-bold text-ujlog-primary">
                          <UserCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-ujlog-ink">{dlg.name}</h4>
                          <p className="text-xs font-mono text-ujlog-ink-soft/60">{dlg.email}</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 bg-ujlog-primary-light border border-ujlog-primary/20 text-ujlog-primary text-[10px] font-bold rounded-full">
                        ACTIF
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs p-2.5 bg-white/60 rounded-xl border border-ujlog-border">
                      <div>
                        <span className="text-[10px] text-ujlog-ink-soft uppercase font-bold block">Niveau</span>
                        <span className="font-bold text-ujlog-secondary">{dlg.level}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ujlog-ink-soft uppercase font-bold block">Section</span>
                        <span className="font-bold text-ujlog-ink truncate block">{dlg.section}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ujlog-ink-soft uppercase font-bold block">Code d&apos;activation</span>
                        <span className="font-mono text-ujlog-primary font-bold">{dlg.activationCode}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ujlog-ink-soft uppercase font-bold block">Activé le</span>
                        <span className="font-mono text-ujlog-ink-soft/60 text-[11px]">
                          {dlg.activatedAt ? new Date(dlg.activatedAt).toLocaleDateString('fr-FR') : 'Récent'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setEditingDelegate(dlg)}
                        className="text-ujlog-secondary hover:underline font-bold text-[11px]"
                      >
                        Modifier permissions
                      </button>
                      <button
                        type="button"
                        onClick={() => setRevokeConfirmId(dlg.id)}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold text-[11px] rounded-lg transition-all cursor-pointer"
                      >
                        Révoquer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pending Delegates View */}
        {activeTab === 'pending' && (
          <div className="space-y-4">
            {pendingDelegates.length === 0 ? (
              <div className="py-12 text-center text-xs text-ujlog-ink-soft">
                Aucun délégué en attente d&apos;activation.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingDelegates.map((dlg) => (
                  <div key={dlg.id} className="p-4 bg-ujlog-cream border border-ujlog-border rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-ujlog-ink">{dlg.name}</h4>
                        <p className="text-xs font-mono text-ujlog-ink-soft/60">{dlg.email}</p>
                      </div>
                      <span className="px-2.5 py-0.5 bg-ujlog-secondary-50 border border-ujlog-secondary-100 text-ujlog-secondary text-[10px] font-bold rounded-full">
                        EN ATTENTE D&apos;ACTIVATION
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-ujlog-border space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ujlog-ink-soft/60">Code à transmettre :</span>
                        <span className="font-mono font-black text-ujlog-secondary text-sm tracking-wider">{dlg.activationCode}</span>
                      </div>
                      <p className="text-[10px] text-ujlog-ink-soft">
                        {dlg.level} • {dlg.section}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleCopyCode(dlg.activationCode)}
                        className="flex-1 py-1.5 bg-ujlog-cream hover:bg-ujlog-primary-light text-ujlog-ink font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5 text-ujlog-secondary" />
                        <span>{copiedCode === dlg.activationCode ? 'Code copié !' : 'Copier le code'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onRegenerateCode(dlg.id)}
                        className="py-1.5 px-3 bg-ujlog-cream hover:bg-ujlog-primary-light text-ujlog-ink-soft font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-ujlog-primary" />
                        <span>Régénérer</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Codes Tab View */}
        {activeTab === 'codes' && (
          <div className="space-y-2.5">
            {delegates.map((dlg) => (
              <div
                key={dlg.id}
                className="p-3.5 bg-ujlog-cream/70 border border-ujlog-border rounded-2xl flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-white border border-ujlog-border flex items-center justify-center shrink-0">
                    <KeyRound className="w-4 h-4 text-ujlog-secondary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono font-bold text-ujlog-secondary-dark tracking-wider text-xs">{dlg.activationCode}</p>
                    <p className="text-xs font-bold text-ujlog-ink truncate">{dlg.name}</p>
                    <p className="text-[10px] text-ujlog-ink-soft">
                      <span className="text-ujlog-primary-dark font-bold">{dlg.level}</span> • {dlg.section} • {new Date(dlg.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      dlg.status === 'active'
                        ? 'bg-ujlog-primary-light text-ujlog-primary-dark border border-ujlog-primary/20'
                        : dlg.status === 'pending'
                        ? 'bg-ujlog-secondary-50 text-ujlog-secondary-dark border border-ujlog-secondary-100'
                        : 'bg-rose-50 text-rose-600 border border-rose-200'
                    }`}
                  >
                    {dlg.status === 'active' ? 'Utilisé' : dlg.status === 'pending' ? 'Disponible' : 'Révoqué'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(dlg.activationCode)}
                    className="p-1.5 bg-white hover:bg-ujlog-primary-light border border-ujlog-border text-ujlog-secondary rounded-lg cursor-pointer"
                    title="Copier le code"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRegenerateCode(dlg.id)}
                    className="p-1.5 bg-white hover:bg-ujlog-primary-light border border-ujlog-border text-ujlog-primary rounded-lg cursor-pointer"
                    title="Régénérer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Revoked Delegates Tab View */}
        {activeTab === 'revoked' && (
          <div className="space-y-4">
            {revokedDelegates.length === 0 ? (
              <div className="py-12 text-center text-xs text-ujlog-ink-soft">
                Aucun délégué révoqué dans les archives.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {revokedDelegates.map((dlg) => (
                  <div key={dlg.id} className="p-4 bg-ujlog-cream border border-ujlog-border rounded-2xl space-y-3 opacity-90">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-ujlog-ink-soft">{dlg.name}</h4>
                        <p className="text-xs font-mono text-ujlog-ink-soft">{dlg.email}</p>
                      </div>
                      <span className="px-2.5 py-0.5 bg-rose-50 border border-rose-200 text-rose-600 text-[10px] font-bold rounded-full">
                        RÔLE RÉVOQUÉ
                      </span>
                    </div>
                    <p className="text-xs text-ujlog-ink-soft/60">
                      Anciennement délégué <span className="font-bold text-ujlog-ink">{dlg.level}</span> ({dlg.section}).
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-ujlog-ink-soft">L&apos;étudiant conserve son compte ordinaire.</span>
                      <button
                        type="button"
                        onClick={() => onReactivateDelegate(dlg.id)}
                        className="px-3 py-1 bg-orange-800 hover:bg-orange-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                      >
                        Réactiver
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Add Delegate */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-ujlog-border rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col text-ujlog-ink"
            >
              <div className="flex items-center justify-between border-b border-ujlog-border pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-ujlog-primary-light border border-ujlog-primary/20 rounded-xl text-ujlog-primary">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-ujlog-ink">ATTRIBUER LE RÔLE DÉLÉGUÉ</h3>
                    <p className="text-[10px] text-ujlog-ink-soft/60">Sélectionnez un étudiant existant et définissez sa section</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 text-ujlog-ink-soft/60 hover:text-ujlog-ink rounded-lg hover:bg-ujlog-cream cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4 overflow-y-auto pr-1">
                {submitError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-600 font-semibold">
                    {submitError}
                  </div>
                )}
                {/* Mode Selector */}
                <div className="grid grid-cols-2 gap-2 bg-ujlog-cream p-1 rounded-xl border border-ujlog-border">
                  <button
                    type="button"
                    onClick={() => setAddMode('email')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      addMode === 'email' ? 'bg-orange-600 text-white' : 'text-ujlog-ink-soft/60 hover:text-ujlog-ink'
                    }`}
                  >
                    1. Entrer l&apos;E-mail Délégué
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddMode('student')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      addMode === 'student' ? 'bg-orange-600 text-white' : 'text-ujlog-ink-soft/60 hover:text-ujlog-ink'
                    }`}
                  >
                    2. Étudiant Existant
                  </button>
                </div>

                {/* Direct Email Mode */}
                {addMode === 'email' && (
                  <div className="space-y-3 p-3 bg-ujlog-cream rounded-2xl border border-ujlog-border">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-ujlog-ink-soft">
                        Adresse E-mail du Délégué <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={directEmail}
                        onChange={(e) => setDirectEmail(e.target.value)}
                        placeholder="Entrez votre e-mail"
                        className="w-full px-3 py-2 bg-white border border-ujlog-border rounded-xl text-xs text-ujlog-ink placeholder-ujlog-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-ujlog-ink-soft">Nom & Prénoms du Délégué</label>
                      <input
                        type="text"
                        value={directName}
                        onChange={(e) => setDirectName(e.target.value)}
                        placeholder="Entrez le nom et prénom"
                        className="w-full px-3 py-2 bg-white border border-ujlog-border rounded-xl text-xs text-ujlog-ink placeholder-ujlog-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                      />
                    </div>
                  </div>
                )}

                {/* Existing Student Mode */}
                {addMode === 'student' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-ujlog-ink-soft">
                      Sélectionner l&apos;étudiant titulaire
                    </label>
                    {selectedStudentForNewDelegate ? (
                      <div className="p-3 bg-ujlog-primary-light/60 border border-ujlog-primary/20 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <User className="w-5 h-5 text-ujlog-primary" />
                          <div>
                            <p className="font-bold text-xs text-ujlog-ink">
                              {selectedStudentForNewDelegate.firstName} {selectedStudentForNewDelegate.lastName}
                            </p>
                            <p className="text-[10px] font-mono text-ujlog-ink-soft">{selectedStudentForNewDelegate.email}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedStudentForNewDelegate(null)}
                          className="text-[11px] text-ujlog-secondary hover:underline font-bold"
                        >
                          Changer
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="w-4 h-4 text-ujlog-ink-soft absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                            placeholder="Rechercher un étudiant par nom ou email..."
                            className="w-full pl-9 pr-3 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink placeholder-ujlog-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                          />
                        </div>
                        <div className="max-h-36 overflow-y-auto divide-y divide-ujlog-border border border-ujlog-border rounded-xl bg-ujlog-cream">
                          {candidateStudents.length === 0 ? (
                            <div className="p-3 text-center text-[11px] text-ujlog-ink-soft">
                              Aucun étudiant disponible.
                            </div>
                          ) : (
                            candidateStudents.map((st) => (
                              <div
                                key={st.id}
                                onClick={() => setSelectedStudentForNewDelegate(st)}
                                className="p-2.5 hover:bg-ujlog-cream cursor-pointer flex items-center justify-between text-xs transition-colors"
                              >
                                <div>
                                  <span className="font-bold text-ujlog-ink">
                                    {st.firstName} {st.lastName}
                                  </span>
                                  <span className="text-[10px] font-mono text-ujlog-ink-soft block">{st.email}</span>
                                </div>
                                <span className="text-[10px] font-bold text-ujlog-primary">{st.level}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Level Selection */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-ujlog-ink-soft">Niveau académique</label>
                  <select
                    value={selectedLevel}
                    onChange={(e) => handleLevelChange(e.target.value)}
                    className="w-full px-3 py-2.5 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                  >
                    <option value="Licence 1">Licence 1</option>
                    <option value="Licence 2">Licence 2</option>
                    <option value="Licence 3">Licence 3</option>
                    <option value="Master 1">Master 1</option>
                    <option value="Master 2">Master 2</option>
                  </select>
                </div>

                {/* Section Selection */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-ujlog-ink-soft">Filière / Section</label>
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="w-full px-3 py-2.5 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                  >
                    {availableSections.map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Permissions checkboxes */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-ujlog-ink-soft">Permissions administratives</label>
                  <div className="p-3 bg-ujlog-cream rounded-2xl border border-ujlog-border space-y-2 text-xs">
                    {[
                      { id: 'publish_course', label: 'Publier des cours' },
                      { id: 'edit_own_course', label: 'Modifier ses publications' },
                      { id: 'delete_own_course', label: 'Supprimer ses publications' },
                      { id: 'view_stats', label: 'Voir les statistiques de sa section' },
                      { id: 'receive_notifications', label: 'Recevoir les notifications officielles' }
                    ].map((perm) => (
                      <label key={perm.id} className="flex items-center gap-2 cursor-pointer text-ujlog-ink-soft">
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(perm.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPermissions([...selectedPermissions, perm.id]);
                            } else {
                              setSelectedPermissions(selectedPermissions.filter((p) => p !== perm.id));
                            }
                          }}
                          className="rounded border-ujlog-border bg-white text-orange-500 focus:ring-orange-500"
                        />
                        <span>{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 px-3 bg-ujlog-cream hover:bg-ujlog-primary-light text-ujlog-ink-soft font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || (addMode === 'email' ? !directEmail.trim() : !selectedStudentForNewDelegate)}
                    className="flex-1 py-2.5 px-3 bg-orange-700 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4 text-orange-200" />
                    <span>{isSubmitting ? 'Envoi en cours…' : 'Envoyer l’invitation'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm Revoke Modal */}
      <AnimatePresence>
        {revokeConfirmId && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-ujlog-border rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-ujlog-ink"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-600">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-ujlog-ink">Confirmation de Révocation</h3>
                  <p className="text-[11px] text-ujlog-ink-soft/60">Rôle de Délégué Académique</p>
                </div>
              </div>

              <p className="text-xs text-ujlog-ink-soft leading-relaxed bg-ujlog-cream p-3.5 rounded-2xl border border-ujlog-border">
                &quot;Voulez-vous vraiment révoquer ce délégué ?&quot;
                <br />
                <span className="text-[11px] text-ujlog-ink-soft/60 font-normal mt-1.5 block">
                  Son nom et ses privilèges seront retirés de la base des délégués. L&apos;étudiant conserve son compte normal pour consulter et télécharger tous les cours et documents.
                </span>
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRevokeConfirmId(null)}
                  className="flex-1 py-2.5 px-3 bg-ujlog-cream hover:bg-ujlog-primary-light text-ujlog-ink-soft font-bold text-xs rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onRevokeDelegate(revokeConfirmId);
                    setRevokeConfirmId(null);
                  }}
                  className="flex-1 py-2.5 px-3 bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  Confirmer la Révocation
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Delegate Permissions Modal */}
      <AnimatePresence>
        {editingDelegate && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-ujlog-border rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-ujlog-ink"
            >
              <div className="flex items-center justify-between border-b border-ujlog-border pb-3">
                <h3 className="text-sm font-black uppercase text-ujlog-ink">MODIFIER LE DÉLÉGUÉ</h3>
                <button
                  type="button"
                  onClick={() => setEditingDelegate(null)}
                  className="p-1 text-ujlog-ink-soft/60 hover:text-ujlog-ink"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-ujlog-ink-soft/60 block text-[10px] uppercase font-bold">Titulaire</span>
                  <p className="font-bold text-ujlog-ink">{editingDelegate.name}</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase text-ujlog-ink-soft/60">Niveau</label>
                  <select
                    value={editingDelegate.level}
                    onChange={(e) => setEditingDelegate({ ...editingDelegate, level: e.target.value })}
                    className="w-full px-3 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink"
                  >
                    <option value="Licence 1">Licence 1</option>
                    <option value="Licence 2">Licence 2</option>
                    <option value="Licence 3">Licence 3</option>
                    <option value="Master 1">Master 1</option>
                    <option value="Master 2">Master 2</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase text-ujlog-ink-soft/60">Section</label>
                  <input
                    type="text"
                    value={editingDelegate.section}
                    onChange={(e) => setEditingDelegate({ ...editingDelegate, section: e.target.value })}
                    className="w-full px-3 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingDelegate(null)}
                  className="flex-1 py-2.5 px-3 bg-ujlog-cream text-ujlog-ink-soft font-bold text-xs rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const result = await onUpdateDelegate(editingDelegate.id, {
                      level: editingDelegate.level,
                      section: editingDelegate.section,
                      permissions: editingDelegate.permissions
                    });
                    if (!result || result.success) {
                      setEditingDelegate(null);
                    }
                  }}
                  className="flex-1 py-2.5 px-3 bg-orange-700 hover:bg-orange-600 text-white font-bold text-xs rounded-xl"
                >
                  Enregistrer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
