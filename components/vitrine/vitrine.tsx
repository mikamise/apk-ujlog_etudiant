/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import './fa/css/all.min.css';
import './inter.css';
import './vitrine.css';

const CONFIG = {
  WHATSAPP_NUMBER: '2250594408458',
  ANDROID_APK_URL: '#',
  WEB_APP_URL: '#',
  CONTACT_EMAIL: 'contact@example.com',
  JSONBIN_BIN_ID: '',
  JSONBIN_API_KEY: '',
};

export function Vitrine() {
  useEffect(() => {
    const $ = (id: string) => document.getElementById(id);
    const cleanups: Array<() => void> = [];
    const on = (
      el: EventTarget | null,
      type: string,
      handler: (e: any) => void,
    ) => {
      if (!el) return;
      el.addEventListener(type, handler);
      cleanups.push(() => el.removeEventListener(type, handler));
    };

    document.documentElement.style.scrollBehavior = 'smooth';
    cleanups.push(() => {
      document.documentElement.style.scrollBehavior = '';
    });

    const yearEl = $('year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    /* ==================== MENU BURGER AVEC ANIMATION ==================== */
    const burger = $('burger') as HTMLElement;
    const header = $('site-header') as HTMLElement;

    on(burger, 'click', () => {
      const isOpen = header.classList.toggle('open');
      burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      burger.classList.toggle('active');
    });

    document.querySelectorAll('.mobile-panel a').forEach((a) => {
      on(a, 'click', () => {
        header.classList.remove('open');
        burger.classList.remove('active');
        burger.setAttribute('aria-expanded', 'false');
      });
    });

    /* ==================== WHATSAPP & EMAIL ==================== */
    const waLink = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}`;
    ['wa-float', 'contact-whatsapp', 'footer-whatsapp', 'footer-whatsapp2'].forEach((id) => {
      const el = $(id) as HTMLAnchorElement | null;
      if (el) {
        el.href = waLink;
        el.target = '_blank';
        el.rel = 'noopener';
      }
    });

    const mailLink = `mailto:${CONFIG.CONTACT_EMAIL}`;
    ['contact-email', 'footer-email'].forEach((id) => {
      const el = $(id) as HTMLAnchorElement | null;
      if (el) el.href = mailLink;
    });

    /* ==================== DOWNLOAD LINKS ==================== */
    const btnAndroid = $('btn-android') as HTMLAnchorElement;
    if (btnAndroid && CONFIG.ANDROID_APK_URL && CONFIG.ANDROID_APK_URL !== '#') {
      btnAndroid.href = CONFIG.ANDROID_APK_URL;
      btnAndroid.setAttribute('download', '');
    } else if (btnAndroid) {
      btnAndroid.href = '#';
      on(btnAndroid, 'click', (e) => {
        e.preventDefault();
        alert("Lien de téléchargement APK non configuré. Veuillez contacter l'administrateur.");
      });
    }

    (($('btn-webapp') as HTMLAnchorElement)).href = CONFIG.WEB_APP_URL;
    (($('footer-webapp') as HTMLAnchorElement)).href = CONFIG.WEB_APP_URL;

    /* ==================== CONTACT FORM ==================== */
    on($('contact-form'), 'submit', (e) => {
      e.preventDefault();
      const nom = ($('f-nom') as HTMLInputElement).value;
      const email = ($('f-email') as HTMLInputElement).value;
      const section = ($('f-section') as HTMLSelectElement).value;
      const message = ($('f-message') as HTMLTextAreaElement).value;
      const subject = encodeURIComponent(`[UJLoG Étudiants] Message de ${nom} - ${section}`);
      const body = encodeURIComponent(`Nom : ${nom}\nEmail : ${email}\nSection : ${section}\n\nMessage :\n${message}`);
      window.location.href = `mailto:${CONFIG.CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    });

    /* ==================== AVIS & SUGGESTIONS (JSONbin + localStorage) ==================== */
    const STORAGE_KEY = 'ujlog_avis';
    let cancelled = false;
    cleanups.push(() => {
      cancelled = true;
    });

    function loadLocalAvis(): any[] {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    }

    function saveLocalAvis(avisData: any) {
      const avis = loadLocalAvis();
      avis.push({ ...avisData, date: Date.now() });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(avis));
    }

    async function loadAvis(): Promise<any[]> {
      if (!CONFIG.JSONBIN_BIN_ID || !CONFIG.JSONBIN_API_KEY) {
        console.warn('JSONbin non configuré – utilisation localStorage uniquement');
        return loadLocalAvis();
      }
      try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${CONFIG.JSONBIN_BIN_ID}/latest`, {
          headers: { 'X-Master-Key': CONFIG.JSONBIN_API_KEY },
        });
        if (!response.ok) throw new Error('Erreur JSONbin');
        const data = await response.json();
        return data.record || [];
      } catch (e) {
        console.warn('JSONbin non disponible, fallback localStorage', e);
        return loadLocalAvis();
      }
    }

    async function saveAvis(avisData: any): Promise<boolean> {
      if (!CONFIG.JSONBIN_BIN_ID || !CONFIG.JSONBIN_API_KEY) {
        saveLocalAvis(avisData);
        return false;
      }
      const avis = await loadAvis();
      avis.push({ ...avisData, date: new Date().toISOString() });
      try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${CONFIG.JSONBIN_BIN_ID}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': CONFIG.JSONBIN_API_KEY,
          },
          body: JSON.stringify(avis),
        });
        if (!response.ok) throw new Error('Erreur sauvegarde JSONbin');
        return true;
      } catch (e) {
        console.warn('Sauvegarde JSONbin échouée, fallback localStorage', e);
        saveLocalAvis(avisData);
        return false;
      }
    }

    function escapeHTML(str: string) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    async function renderAvis(showAll = false) {
      const container = $('avis-container');
      const voirBtn = $('voir-plus-avis') as HTMLElement | null;
      const avis = await loadAvis();
      if (cancelled || !container || !voirBtn) return;

      if (avis.length === 0) {
        container.innerHTML = `<p style="color:var(--ink-600);font-style:italic;">Aucun avis pour le moment. Soyez le premier à donner votre avis !</p>`;
        voirBtn.style.display = 'none';
        return;
      }

      const sorted = avis.slice().reverse();
      const displayCount = showAll ? sorted.length : Math.min(5, sorted.length);
      const toDisplay = sorted.slice(0, displayCount);

      container.innerHTML = toDisplay
        .map(
          (a) => `
        <div class="avis-item">
          <div class="avis-header">
            <strong>${escapeHTML(String(a.nom))}</strong>
            <span class="avis-note">${'⭐'.repeat(Number(a.note) || 0)}</span>
            <span class="avis-date">${new Date(a.date).toLocaleDateString('fr-FR')}</span>
          </div>
          <p>${escapeHTML(String(a.message))}</p>
        </div>
      `,
        )
        .join('');

      if (avis.length > 5 && !showAll) {
        voirBtn.style.display = 'flex';
        voirBtn.innerHTML = `<i class="fas fa-chevron-down"></i> Voir plus d'avis (${avis.length - 5} restants)`;
      } else if (showAll) {
        voirBtn.style.display = 'flex';
        voirBtn.innerHTML = `<i class="fas fa-chevron-up"></i> Réduire`;
      } else {
        voirBtn.style.display = 'none';
      }
    }

    let showAllAvis = false;
    on($('voir-plus-avis'), 'click', () => {
      showAllAvis = !showAllAvis;
      renderAvis(showAllAvis);
      document.querySelector('.avis-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    on($('avis-form'), 'submit', async (e) => {
      e.preventDefault();
      const form = e.currentTarget as HTMLFormElement;
      const nom = ($('avis-nom') as HTMLInputElement).value.trim();
      const note = parseInt(($('avis-note') as HTMLSelectElement).value, 10);
      const message = ($('avis-message') as HTMLTextAreaElement).value.trim();
      const feedback = $('avis-feedback') as HTMLElement;

      if (!nom || !message) {
        feedback.textContent = 'Veuillez remplir tous les champs.';
        feedback.style.color = '#e74c3c';
        return;
      }

      const saved = await saveAvis({ nom, note, message });
      renderAvis(showAllAvis);
      feedback.textContent = saved
        ? 'Merci ! Votre avis a été enregistré en ligne.'
        : 'Merci ! Votre avis a été enregistré localement (mode hors-ligne).';
      feedback.style.color = 'var(--green-600)';
      form.reset();
    });

    renderAvis(false);

    /* ==================== SCROLL REVEAL ==================== */
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
    cleanups.push(() => io.disconnect());

    /* ==================== ANIMATED COUNTERS ==================== */
    const counters = document.querySelectorAll('[data-count]');
    let countersPlayed = false;
    function playCounters() {
      if (countersPlayed) return;
      countersPlayed = true;
      counters.forEach((el) => {
        const target = parseInt(el.getAttribute('data-count') || '0', 10);
        const suffix = el.getAttribute('data-suffix') || '';
        const duration = 1100;
        const start = performance.now();
        function tick(now: number) {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.round(eased * target) + suffix;
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }
    const statRow = document.querySelector('.stat-row');
    if (statRow) {
      const statIo = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) playCounters();
          });
        },
        { threshold: 0.4 },
      );
      statIo.observe(statRow);
      cleanups.push(() => statIo.disconnect());
    }

    /* ==================== QR CODE APK ==================== */
    const qrApk = $('qr-apk') as HTMLImageElement | null;
    if (qrApk && CONFIG.ANDROID_APK_URL && CONFIG.ANDROID_APK_URL !== '#') {
      qrApk.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(CONFIG.ANDROID_APK_URL)}`;
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return (
    <div className="vitrine-root">
    <header id="site-header">
        <div className="nav wrap">
          <a href="#top" className="brand">
            <div className="brand-marks">
              <img src="/logo-geographie.jpg" alt="Département de Géographie" className="logo-img logo-geo-img" />
            </div>
            <div className="brand-text">
              <strong>UJLoG Étudiants</strong>
              <span>Département de Géographie · UJLoG, Daloa</span>
            </div>
          </a>
          <nav className="links">
            <a href="#application">Application</a>
            <a href="#parcours">Parcours</a>
            <a href="#fonctionnalites">Fonctionnalités</a>
            <a href="#telecharger">Télécharger</a>
            <a href="#avis">Avis</a>
            <a href="#contact">Contact</a>
            <Link href="/login">Connexion</Link>
          </nav>
          <a href="#telecharger" className="nav-cta">Ouvrir l&apos;application</a>
          <Link href="/register" className="nav-cta">Inscription</Link>
          <button className="burger" id="burger" aria-label="Ouvrir le menu" aria-expanded="false">
            <span></span><span></span><span></span>
          </button>
        </div>
        <div className="mobile-panel" id="mobile-panel">
          <a href="#application">Application</a>
          <a href="#parcours">Parcours</a>
          <a href="#fonctionnalites">Fonctionnalités</a>
          <a href="#telecharger">Télécharger</a>
          <a href="#avis">Avis</a>
          <a href="#contact">Contact</a>
        </div>
      </header>

  
      <section className="hero" id="top">
        <div className="hero-media" aria-hidden="true"></div>
        <div className="wrap hero-inner">
          <span className="badge-pill reveal"><i className="fas fa-check-circle"></i> Version 1.0</span>
          <h1 className="reveal" style={{ transitionDelay: '.05s' }}>Tous vos cours, TD et résultats,<br /><span>toujours à portée de
              main</span></h1>
          <p className="lead reveal" style={{ transitionDelay: '.1s' }}>UJLoG Étudiants centralise les ressources pédagogiques du
            Département de Géographie : cours, travaux dirigés, sujets d&apos;examens et résultats, classés par niveau, filière
            et semestre.</p>
          <div className="hero-actions reveal" style={{ transitionDelay: '.15s' }}>
            <a href="#telecharger" className="btn btn-orange"><i className="fas fa-download"></i> Télécharger l&apos;application</a>
            <a href="#parcours" className="btn btn-outline-light"><i className="fas fa-graduation-cap"></i> Voir mon parcours</a>
          </div>
          <div className="stat-row reveal" style={{ transitionDelay: '.2s' }}>
            <div className="stat"><strong data-count="5">0</strong><span>niveaux, de L1 à M2</span></div>
            <div className="stat"><strong data-count="3">0</strong><span>filières dès la L3</span></div>
            <div className="stat"><strong data-count="100" data-suffix="%">0</strong><span>accessible hors ligne</span></div>
          </div>
        </div>
      </section>

  
      <section className="wrap">
        <div className="info-banner reveal">
          <div className="info-banner-icon"><i className="fas fa-sync-alt"></i></div>
          <div>
            <div className="info-banner-label">Contenu toujours à jour</div>
            <div className="info-banner-value">De nouveaux cours, TD et sujets ajoutés chaque semaine par les délégués de
              section</div>
          </div>
        </div>

        <div className="dual-card-row">
          <div className="dual-card dual-card--navy reveal">
            <span className="dual-card-eyebrow"><i className="fas fa-user-plus"></i> Nouveaux étudiants</span>
            <strong>Créez votre compte</strong>
            <p>Inscription en quelques minutes : nom, niveau et filière suffisent pour démarrer.</p>
          </div>
          <div className="dual-card dual-card--green reveal">
            <span className="dual-card-eyebrow"><i className="fas fa-sign-in-alt"></i> Étudiants déjà inscrits</span>
            <strong>Reconnectez-vous</strong>
            <p>Retrouvez votre espace et l&apos;historique des documents déjà consultés.</p>
          </div>
        </div>
      </section>

  
      <section id="application">
        <div className="wrap">
          <div className="section-head reveal">
            <span className="eyebrow">L&apos;application</span>
            <h2>Pensée pour la vie réelle d&apos;un étudiant</h2>
            <p>Trois écrans qui résument l&apos;essentiel : retrouver un document, suivre son semestre, consulter ses résultats
              sans se perdre dans les groupes WhatsApp.</p>
          </div>
          <div className="preview-grid">
            <div className="preview-card reveal">
              <div className="mini-phone">
                <div className="mini-screen">
                  <div className="row-line">
                    <div className="dot dot--navy"></div>
                    <div className="line" style={{ maxWidth: '70%' }}></div>
                  </div>
                  <div className="row-line">
                    <div className="dot dot--orange"></div>
                    <div className="line" style={{ maxWidth: '90%' }}></div>
                  </div>
                  <div className="row-line">
                    <div className="dot dot--green"></div>
                    <div className="line" style={{ maxWidth: '55%' }}></div>
                  </div>
                  <div className="row-line">
                    <div className="dot dot--navy"></div>
                    <div className="line" style={{ maxWidth: '80%' }}></div>
                  </div>
                </div>
              </div>
              <h3><i className="fas fa-search" style={{ color: 'var(--orange-500)', marginRight: '6px' }}></i>Recherche instantanée</h3>
              <p>Un mot-clé suffit pour retrouver un cours, un TD ou un sujet, filtré par niveau et par matière.</p>
            </div>
            <div className="preview-card reveal" style={{ transitionDelay: '.05s' }}>
              <div className="mini-phone">
                <div className="mini-screen">
                  <div className="row-line">
                    <div className="dot dot--orange"></div>
                    <div className="line" style={{ maxWidth: '60%' }}></div>
                  </div>
                  <div className="row-line">
                    <div className="dot dot--navy"></div>
                    <div className="line" style={{ maxWidth: '85%' }}></div>
                  </div>
                  <div className="row-line">
                    <div className="dot dot--green"></div>
                    <div className="line" style={{ maxWidth: '40%' }}></div>
                  </div>
                </div>
              </div>
              <h3><i className="fas fa-calendar-alt" style={{ color: 'var(--orange-500)', marginRight: '6px' }}></i>Suivi par semestre
              </h3>
              <p>Chaque niveau se déplie en Semestre 1 / Semestre 2, avec ses propres documents et son propre suivi.</p>
            </div>
            <div className="preview-card reveal" style={{ transitionDelay: '.1s' }}>
              <div className="mini-phone">
                <div className="mini-screen">
                  <div className="row-line">
                    <div className="dot dot--green"></div>
                    <div className="line" style={{ maxWidth: '95%' }}></div>
                  </div>
                  <div className="row-line">
                    <div className="dot dot--orange"></div>
                    <div className="line" style={{ maxWidth: '65%' }}></div>
                  </div>
                  <div className="row-line">
                    <div className="dot dot--navy"></div>
                    <div className="line" style={{ maxWidth: '75%' }}></div>
                  </div>
                </div>
              </div>
              <h3><i className="fas fa-user-tie" style={{ color: 'var(--orange-500)', marginRight: '6px' }}></i>Espace délégué</h3>
              <p>Chaque délégué de section publie et met à jour les ressources de son niveau, sous supervision.</p>
            </div>
          </div>
        </div>
      </section>

  
      <section id="parcours" className="section-tint">
        <div className="wrap">
          <div className="section-head reveal">
            <span className="eyebrow">Parcours académique</span>
            <h2>De la Licence 1 au Master 2</h2>
            <p>Chaque niveau ouvre sur ses filières et ses semestres, jusqu&apos;aux spécialisations de fin de cycle.</p>
          </div>
          <div className="timeline">
            <div className="tl-track"></div>
            <div className="tl-item reveal">
              <div className="tl-dot">L1</div>
              <div className="tl-body">
                <h3>Licence 1 Tronc commun</h3>
                <p>Semestres 1 et 2, socle commun avant le choix de filière en L3.</p>
              </div>
            </div>
            <div className="tl-item reveal">
              <div className="tl-dot">L2</div>
              <div className="tl-body">
                <h3>Licence 2 Tronc commun</h3>
                <p>Semestres 1 et 2, poursuite du socle disciplinaire en géographie.</p>
              </div>
            </div>
            <div className="tl-item reveal">
              <div className="tl-dot tl-dot--orange">L3</div>
              <div className="tl-body">
                <h3>Licence 3 Choix de filière</h3>
                <p>À partir de la L3, chaque semestre se rattache à l&apos;une des filières suivantes :</p>
                <div className="tl-options">
                  <span>Histoire</span><span>Géographie</span><span>Histoire-Géographie</span>
                </div>
              </div>
            </div>
            <div className="tl-item reveal">
              <div className="tl-dot tl-dot--orange">M1</div>
              <div className="tl-body">
                <h3>Master 1 Spécialisation</h3>
                <div className="tl-options">
                  <span>Population et Développement Territorial</span>
                  <span>Valorisation des Milieux Naturels</span>
                  <span>Enseignement Histoire-Géographie</span>
                </div>
              </div>
            </div>
            <div className="tl-item reveal">
              <div className="tl-dot tl-dot--orange">M2</div>
              <div className="tl-body">
                <h3>Master 2 Approfondissement</h3>
                <p>Poursuite de la spécialisation choisie en M1, avec mémoire de fin de cycle.</p>
              </div>
            </div>
          </div>

          <div className="section-head reveal" style={{ marginTop: '64px' }}>
            <span className="eyebrow">Découpage de l&apos;année</span>
            <h2 style={{ fontSize: '24px' }}>Chaque niveau, semestre par semestre</h2>
          </div>
          <div className="triple-card-row">
            <div className="triple-card triple-card--navy reveal">
              <span className="triple-card-label"><i className="fas fa-book"></i> 1er semestre</span>
              <strong>Cours &amp; TD</strong>
              <p>Supports de cours et travaux dirigés classés par matière.</p>
            </div>
            <div className="triple-card triple-card--green reveal" style={{ transitionDelay: '.05s' }}>
              <span className="triple-card-label"><i className="fas fa-book-open"></i> 2nd semestre</span>
              <strong>Cours &amp; TD</strong>
              <p>Mêmes fonctionnalités, contenu propre au second semestre.</p>
            </div>
            <div className="triple-card triple-card--orange reveal" style={{ transitionDelay: '.1s' }}>
              <span className="triple-card-label"><i className="fas fa-pencil-alt"></i> Examens</span>
              <strong>Sujets &amp; résultats</strong>
              <p>Sessions normale et de rattrapage, archivées par année.</p>
            </div>
          </div>
        </div>
      </section>

  
      <section id="fonctionnalites">
        <div className="wrap">
          <div className="section-head reveal">
            <span className="eyebrow">Fonctionnalités</span>
            <h2>Ce que l&apos;application fait pour vous</h2>
          </div>
          <div className="features-grid">
            <div className="feature-card reveal">
              <div className="feature-icon"><i className="fas fa-book-open"></i></div>
              <h3>Cours &amp; travaux dirigés</h3>
              <p>Tous les supports classés par matière, niveau et semestre.</p>
            </div>
            <div className="feature-card reveal" style={{ transitionDelay: '.03s' }}>
              <div className="feature-icon"><i className="fas fa-file-pdf"></i></div>
              <h3>Sujets d&apos;examens</h3>
              <p>Sessions normales et rattrapages, archivés année par année.</p>
            </div>
            <div className="feature-card reveal" style={{ transitionDelay: '.06s' }}>
              <div className="feature-icon"><i className="fas fa-chart-line"></i></div>
              <h3>Résultats</h3>
              <p>Publication dès la sortie des résultats, par niveau.</p>
            </div>
            <div className="feature-card reveal" style={{ transitionDelay: '.09s' }}>
              <div className="feature-icon"><i className="fas fa-search"></i></div>
              <h3>Recherche instantanée</h3>
              <p>Un champ de recherche par section pour tout retrouver vite.</p>
            </div>
            <div className="feature-card reveal" style={{ transitionDelay: '.12s' }}>
              <div className="feature-icon"><i className="fas fa-wifi-slash"></i></div>
              <h3>Mode hors-ligne</h3>
              <p>Les documents déjà ouverts restent accessibles sans connexion.</p>
            </div>
            <div className="feature-card reveal" style={{ transitionDelay: '.15s' }}>
              <div className="feature-icon"><i className="fas fa-lock"></i></div>
              <h3>Comptes sécurisés</h3>
              <p>Seuls les délégués autorisés peuvent publier sur leur section.</p>
            </div>
            <div className="feature-card reveal" style={{ transitionDelay: '.18s' }}>
              <div className="feature-icon"><i className="fas fa-user-tie"></i></div>
              <h3>Espace délégué</h3>
              <p>Un tableau de bord dédié pour gérer les documents de sa section.</p>
            </div>
            <div className="feature-card reveal" style={{ transitionDelay: '.21s' }}>
              <div className="feature-icon"><i className="fas fa-sync-alt"></i></div>
              <h3>Mises à jour continues</h3>
              <p>Le contenu évolue au fil du semestre, sans réinstallation.</p>
            </div>
          </div>
        </div>
      </section>


  

      <section id="telecharger">
        <div className="wrap">
          <div className="download reveal">
            <div className="download-inner">
              <div>
                <span className="eyebrow eyebrow--light"><i className="fas fa-download"></i> Installation</span>
                <h2 className="download-title">Disponible sur Android et en application web</h2>
                <p className="download-lead">Version 1.0</p>

                <div className="hero-actions" style={{ marginTop: '28px' }}>
                  <a id="btn-android" href="#" className="btn btn-orange" download><i className="fab fa-android"></i> Télécharger
                    l&apos;APK Android</a>
                  <a id="btn-webapp" href="#" className="btn btn-outline-light"><i className="fas fa-globe"></i> Ouvrir la version
                    web</a>
                </div>
            
                <div style={{ marginTop: '24px' }}>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>Scannez ce QR code pour télécharger l&apos;APK :</p>
                  <img id="qr-apk"
                    src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://exemple.com/app.apk"
                    alt="QR Code APK" style={{ background: '#fff', padding: '8px', borderRadius: '8px', width: '130px', height: '130px' }} />
                </div>
              </div>
              <div className="dl-cards">
                <div className="dl-card">
                  <h3><i className="fab fa-android"></i> Android</h3>
                  <p>Téléchargement direct de l&apos;APK installation en 3 étapes.</p>
                  <ol className="steps">
                    <li><b>1</b> Cliquez sur &quot;Télécharger l&apos;APK&quot;.</li>
                    <li><b>2</b> Autorisez l&apos;installation depuis une source inconnue.</li>
                    <li><b>3</b> Ouvrez le fichier pour installer l&apos;application.</li>
                  </ol>
                </div>
                <div className="dl-card">
                  <h3><i className="fab fa-apple"></i> iPhone / iPad (PWA)</h3>
                  <p>Ajoutez l&apos;application à votre écran d&apos;accueil en un clic.</p>
                  <ol className="steps">
                    <li><b>1</b> Cliquez sur &quot;Ouvrir la version web&quot;.</li>
                    <li><b>2</b> Appuyez sur l&apos;icône de partage <i className="fas fa-share-alt"
                        style={{ color: 'var(--orange-500)' }}></i>.</li>
                    <li><b>3</b> Choisissez « Sur l&apos;écran d&apos;accueil ».</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


  
      <section id="avis" className="section-tint">
        <div className="wrap">
          <div className="section-head reveal">
            <span className="eyebrow"><i className="fas fa-star"></i> Avis & suggestions</span>
            <h2>Partagez votre expérience</h2>
            <p>Votre retour est précieux pour améliorer l&apos;application. Laissez un avis ou une suggestion.</p>
          </div>

          <div className="avis-form reveal">
            <h3>Donnez votre avis</h3>
            <form id="avis-form">
              <div className="field">
                <label htmlFor="avis-nom">Votre nom</label>
                <input type="text" id="avis-nom" placeholder="Votre nom" required />
              </div>
              <div className="field">
                <label htmlFor="avis-note">Note <span style={{ fontWeight: '400' }}>(1 à 5)</span></label>
                <select id="avis-note">
                  <option value="5">⭐ 5 - Excellent</option>
                  <option value="4">⭐ 4 - Très bien</option>
                  <option value="3">⭐ 3 - Bien</option>
                  <option value="2">⭐ 2 - Moyen</option>
                  <option value="1">⭐ 1 - Insuffisant</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="avis-message">Votre message</label>
                <textarea id="avis-message" rows={3} placeholder="Votre avis, suggestion, ou témoignage..."
                  required></textarea>
              </div>
              <button type="submit" className="btn btn-orange" style={{ width: '100%', justifyContent: 'center' }}><i
                   className="fas fa-paper-plane"></i> Envoyer mon avis</button>
            </form>
            <div id="avis-feedback" className="form-note" style={{ marginTop: '10px' }}></div>
          </div>

          <div className="avis-list">
            <h3>Ce que les étudiants disent</h3>
            <div id="avis-container">
          
            </div>
            <button id="voir-plus-avis" className="btn btn-navy"
              style={{ marginTop: '20px', width: '100%', justifyContent: 'center', display: 'none' }}>
              <i className="fas fa-chevron-down"></i> Voir plus d&apos;avis
            </button>
          </div>
        </div>
      </section>

  
      <div id="modal-avis" className="modal">
        <div className="modal-content">
          <span className="modal-close">&times;</span>
          <h2>Tous les avis</h2>
          <div id="modal-avis-container"></div>
        </div>
      </div>

  
      <section id="contact">
        <div className="wrap">
          <div className="section-head reveal">
            <span className="eyebrow">Contact</span>
            <h2>Une question, un signalement ?</h2>
          </div>
          <div className="contact-grid">
            <div className="contact-info-card reveal">
              <h3><i className="fas fa-comments"></i> Écrivez-nous directement</h3>
              <p>Pour un problème d&apos;accès, une correction de document ou une suggestion, contactez l&apos;équipe via l&apos;un de ces
                canaux.</p>
              <a href="#" id="contact-whatsapp" className="contact-channel">
                <div className="ci"><i className="fab fa-whatsapp"></i></div> WhatsApp réponse rapide
              </a>
              <a href="#" id="contact-email" className="contact-channel">
                <div className="ci"><i className="fas fa-envelope"></i></div> Email
              </a>
            </div>
            <form className="contact-form reveal" id="contact-form" style={{ transitionDelay: '.05s' }}>
              <div className="field">
                <label htmlFor="f-nom">Nom complet</label>
                <input id="f-nom" type="text" required placeholder="Votre nom et prénom" />
              </div>
              <div className="field">
                <label htmlFor="f-email">Adresse email</label>
                <input id="f-email" type="email" required placeholder="vous@exemple.com" />
              </div>
              <div className="field">
                <label htmlFor="f-section">Section concernée</label>
                <select id="f-section">
                  <option>L1</option>
                  <option>L2</option>
                  <option>L3-Histoire</option>
                  <option>L3-Géographie</option>
                  <option>L3-Histoire-Géographie</option>
                  <option>M1 / M2 - Population et Développement Territorial</option>
                  <option>M1 / M2 - Valorisation des Milieux Naturels</option>
                  <option>M1 / M2 - Enseignement Histoire-Géographie</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="f-message">Message</label>
                <textarea id="f-message" required placeholder="Décrivez votre demande"></textarea>
              </div>
              <button type="submit" className="btn btn-navy" style={{ width: '100%', justifyContent: 'center' }}><i
                   className="fas fa-paper-plane"></i> Envoyer le message</button>
              <p className="form-note">L&apos;envoi ouvre votre messagerie avec le message pré-rempli.</p>
            </form>
          </div>
        </div>
      </section>

  
      <section id="creator" style={{ background: 'var(--navy-950)', color: '#fff', padding: '30px 0', textAlign: 'center' }}>
        <div className="wrap">
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)' }}>
            <i className="fas fa-code" style={{ color: 'var(--orange-500)' }}></i>
            Créé par <strong style={{ color: '#fff', fontWeight: '700' }}>Dossa Bossou Arnaud</strong>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}></span>
            Étudiant au Département de Géographie UJLoG Daloa
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>
            Développé avec soin pour la communauté étudiante
          </p>
        </div>
      </section>

  
      <footer>
        <div className="wrap footer-grid">
          <div>
            <div className="footer-brand">
              <img src="/logo-ujlog.png" alt="UJLoG" className="logo-img logo-ujlog-img" style={{ height: '30px' }} />
              <strong>UJLoG Étudiants</strong>
            </div>
            <p className="footer-desc">Plateforme non-officielle réalisée par et pour les étudiants du Département de Géographie
              de l&apos;UJLoG, Daloa.</p>
            <div className="footer-social">
              <a href="#" id="footer-whatsapp" aria-label="WhatsApp"><i className="fab fa-whatsapp"></i></a>
              <a href="#" id="footer-email" aria-label="Email"><i className="fas fa-envelope"></i></a>
            </div>
          </div>
          <div>
            <h4>Navigation</h4>
            <ul>
              <li><a href="#application">Application</a></li>
              <li><a href="#parcours">Parcours</a></li>
              <li><a href="#fonctionnalites">Fonctionnalités</a></li>
              <li><a href="#avis">Avis</a></li>
            </ul>
          </div>
          <div>
            <h4>Application</h4>
            <ul>
              <li><a href="#telecharger">Télécharger Android</a></li>
              <li><a href="#telecharger">Installer sur iOS</a></li>
              <li><a id="footer-webapp" href="#">Version web</a></li>
            </ul>
          </div>
          <div>
            <h4>Assistance</h4>
            <ul>
              <li><a href="#contact">Formulaire de contact</a></li>
              <li><a id="footer-whatsapp2" href="#">Signaler un problème</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom wrap">
          <span>© <span id="year"></span> UJLoG Étudiants-Département de Géographie, UJLoG Daloa-v1.0</span>
          <span>Site indépendant, non affilié administrativement à l&apos;université</span>
        </div>
      </footer>

  
      <a href="#" id="wa-float" className="wa-float" aria-label="Contacter sur WhatsApp" target="_blank" rel="noopener">
        <i className="fab fa-whatsapp fa-2x" style={{ color: '#fff' }}></i>
      </a>
    </div>
  );
}
