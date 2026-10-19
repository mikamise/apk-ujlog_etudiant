"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, Check, Monitor, Moon, Palette, RotateCcw, Sun, Smartphone, Camera, HardDrive, ShieldCheck } from "lucide-react";

type Theme = "light" | "dark" | "system";
type Preferences = { theme: Theme; reduceMotion: boolean; compactMode: boolean };
const KEY = "ujlog-ui-preferences";
const defaults: Preferences = { theme: "system", reduceMotion: false, compactMode: false };

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<Preferences>(defaults);
  const [saved, setSaved] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<string>("unsupported");
  const [permissionMessage, setPermissionMessage] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) setNotificationPermission(Notification.permission);
  }, []);

  async function enableNotifications() {
    if (!("Notification" in window)) { setNotificationPermission("unsupported"); setPermissionMessage("Les notifications système ne sont pas prises en charge par ce navigateur."); return; }
    try {
      const result = await Notification.requestPermission();
      setNotificationPermission(result);
      setPermissionMessage(result === "granted" ? "Notifications système autorisées sur cet appareil." : result === "denied" ? "Autorisation refusée. Modifie-la dans les paramètres du navigateur ou du téléphone." : "Autorisation non accordée.");
      if (result === "granted" && "serviceWorker" in navigator && "PushManager" in window) {
        const registration = await navigator.serviceWorker.ready;
        const publicKeyResponse = await fetch("/api/push/public-key", { cache: "no-store" });
        if (!publicKeyResponse.ok) throw new Error("Le serveur push n’est pas configuré.");
        const { publicKey } = await publicKeyResponse.json() as { publicKey: string };
        const applicationServerKey = Uint8Array.from(atob(publicKey.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
        const saved = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription }) });
        if (!saved.ok) throw new Error("L’appareil n’a pas pu être enregistré auprès du serveur push.");
        await registration.showNotification("UJLOG Étudiant", { body: "Les notifications système sont activées sur cet appareil.", icon: "/icon-192.png", badge: "/icon-192.png", tag: "ujlog-notification-test" });
        setPermissionMessage("Notifications activées et appareil enregistré. Les notifications nécessitent une connexion Internet au moment de leur livraison.");
      }
    } catch { setPermissionMessage("Impossible d'activer les notifications dans ce navigateur."); }
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setPrefs({ ...defaults, ...JSON.parse(raw) });
    } catch { /* les paramètres par défaut restent disponibles */ }
  }, []);

  function update(next: Preferences) {
    setPrefs(next);
    setSaved(false);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      const dark = next.theme === "dark" || (next.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      document.documentElement.dataset.reduceMotion = next.reduceMotion ? "true" : "false";
      setSaved(true);
    } catch { setSaved(false); }
  }

  const themes: { id: Theme; label: string; description: string; Icon: typeof Sun }[] = [
    { id: "light", label: "Clair", description: "Interface lumineuse", Icon: Sun },
    { id: "dark", label: "Sombre", description: "Confort dans les lieux peu éclairés", Icon: Moon },
    { id: "system", label: "Système", description: "Suit les préférences de l’appareil", Icon: Monitor },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-5 sm:px-6 lg:pb-10 lg:pt-8">
      <Link href="/dashboard" className="mb-5 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-ujlog-ink-soft hover:bg-white">
        <ArrowLeft className="h-4 w-4" /> Retour à l’accueil
      </Link>
      <header className="mb-7">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-700"><Palette className="h-6 w-6" /></div>
        <p className="text-xs font-bold uppercase tracking-[.16em] text-orange-700">Personnalisation</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Paramètres</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-ujlog-ink-soft">Adapte UJLoG Étudiant à ton appareil et à tes préférences. Ces réglages d’apparence sont conservés sur cet appareil.</p>
      </header>

      <section className="mb-5 rounded-3xl border border-ujlog-border bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-xl bg-orange-50 p-2 text-orange-700"><Palette className="h-5 w-5" /></div>
          <div><h2 className="font-bold">Apparence</h2><p className="mt-1 text-sm text-ujlog-ink-soft">Choisis le thème qui te convient.</p></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {themes.map(({ id, label, description, Icon }) => (
            <button key={id} type="button" onClick={() => update({ ...prefs, theme: id })} aria-pressed={prefs.theme === id}
              className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${prefs.theme === id ? "border-orange-500 bg-orange-50 ring-2 ring-orange-100" : "border-ujlog-border bg-white hover:border-orange-200"}`}>
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-orange-700 shadow-sm"><Icon className="h-5 w-5" /></span>
              <span className="flex items-center justify-between font-bold">{label}{prefs.theme === id && <Check className="h-4 w-4 text-orange-700" />}</span>
              <span className="mt-1 block text-xs leading-5 text-ujlog-ink-soft">{description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-5 rounded-3xl border border-ujlog-border bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-xl bg-orange-50 p-2 text-orange-700"><Bell className="h-5 w-5" /></div>
          <div><h2 className="font-bold">Notifications</h2><p className="mt-1 text-sm text-ujlog-ink-soft">Les nouvelles alertes peuvent apparaître dans l’application. Les notifications système nécessitent l’autorisation de l’appareil.</p></div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-semibold">Autorisation de l’appareil</p><p className="mt-1 text-xs text-ujlog-ink-soft">État : {notificationPermission === "granted" ? "autorisée" : notificationPermission === "denied" ? "refusée" : notificationPermission === "default" ? "pas encore demandée" : "non prise en charge"}</p></div>
          <button type="button" onClick={enableNotifications} disabled={notificationPermission === "unsupported"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"><Bell className="h-4 w-4" /> Autoriser les notifications</button>
        </div>
        {permissionMessage && <p role="status" className="mt-3 rounded-xl bg-orange-50 p-3 text-xs leading-5 text-orange-900">{permissionMessage}</p>}
        <div className="mt-4 grid gap-3 border-t border-ujlog-border pt-4 sm:grid-cols-2">
          <div className="flex gap-3 rounded-2xl bg-stone-50 p-3"><Camera className="mt-0.5 h-5 w-5 shrink-0 text-orange-700" /><div><p className="text-sm font-semibold">Photo de profil</p><p className="mt-1 text-xs leading-5 text-ujlog-ink-soft">Le téléphone demande l’accès à l’appareil photo lorsque tu choisis de prendre une photo depuis le bouton de profil, si le navigateur le permet.</p></div></div>
          <div className="flex gap-3 rounded-2xl bg-stone-50 p-3"><HardDrive className="mt-0.5 h-5 w-5 shrink-0 text-orange-700" /><div><p className="text-sm font-semibold">Stockage et téléchargements</p><p className="mt-1 text-xs leading-5 text-ujlog-ink-soft">Le navigateur gère l’accès au stockage. Les cours téléchargés sont conservés dans le stockage local de l’application ; aucun accès global aux fichiers du téléphone n’est demandé.</p></div></div>
        </div>
        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-stone-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> Pour recevoir une notification même lorsque l’application est fermée, le serveur doit aussi être configuré pour envoyer des messages Web Push.</p>
      </section>

      <section className="rounded-3xl border border-ujlog-border bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-xl bg-orange-50 p-2 text-orange-700"><Smartphone className="h-5 w-5" /></div>
          <div><h2 className="font-bold">Confort d’utilisation</h2><p className="mt-1 text-sm text-ujlog-ink-soft">Réglages d’interface enregistrés localement.</p></div>
        </div>
        <label className="flex cursor-pointer items-center justify-between gap-4 border-b border-ujlog-border py-4">
          <span><span className="block text-sm font-semibold">Réduire les animations</span><span className="mt-1 block text-xs text-ujlog-ink-soft">Privilégie les transitions discrètes.</span></span>
          <input type="checkbox" checked={prefs.reduceMotion} onChange={(e) => update({ ...prefs, reduceMotion: e.target.checked })} className="h-5 w-5 accent-orange-600" />
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-4 py-4">
          <span><span className="block text-sm font-semibold">Interface compacte</span><span className="mt-1 block text-xs text-ujlog-ink-soft">Préférence enregistrée pour les prochaines améliorations de densité d’affichage.</span></span>
          <input type="checkbox" checked={prefs.compactMode} onChange={(e) => update({ ...prefs, compactMode: e.target.checked })} className="h-5 w-5 accent-orange-600" />
        </label>
      </section>
      <div className="mt-5 flex items-center justify-between gap-3">
        <p role="status" aria-live="polite" className="text-sm text-ujlog-ink-soft">{saved ? "Préférences enregistrées sur cet appareil." : "Les changements sont appliqués immédiatement."}</p>
        <button type="button" onClick={() => update(defaults)} className="inline-flex items-center gap-2 rounded-xl border border-ujlog-border bg-white px-4 py-2.5 text-sm font-semibold hover:bg-stone-50"><RotateCcw className="h-4 w-4" /> Réinitialiser</button>
      </div>
      <p className="mt-5 rounded-2xl bg-orange-50 p-4 text-xs leading-5 text-orange-950"><Bell className="mr-1 inline h-4 w-4" /> Les alertes et notifications de cours restent gérées par les services de l’application. Cette page ne désactive pas les notifications serveur ou système.</p>
    </main>
  );
}
