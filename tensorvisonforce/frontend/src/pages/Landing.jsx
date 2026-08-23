// src/pages/Landing.jsx
import { Link } from 'react-router-dom';
import {
  Zap, ShieldCheck, MapPin, BarChart2, Users, Clock, ChevronRight,
  AlertTriangle, Cpu, CheckCircle2, ArrowRight, Building2
} from 'lucide-react';

const STEPS = [
  { n: '01', icon: MapPin,      title: 'Report Your Issue',    desc: 'Submit a complaint with photo and location. Runs on your phone, no app needed.' },
  { n: '02', icon: Cpu,         title: 'AI Verification',      desc: 'Our AI checks image quality, detects duplicates, classifies the issue, and sets priority.' },
  { n: '03', icon: Building2,   title: 'Smart Routing',        desc: 'Complaint is routed to the right department automatically and assigned to a field worker.' },
  { n: '04', icon: CheckCircle2,title: 'Resolution with Proof',desc: 'Field worker uploads before/after photos. Admin verifies. You receive confirmation.' },
];

const FEATURES = [
  { icon: Cpu,         title: 'AI-Powered Pipeline',     desc: 'Image quality check, category classification, duplicate detection, and priority scoring — all automated.' },
  { icon: ShieldCheck, title: 'Suspicious Complaint Guard', desc: 'Rule-based detection prevents fraudulent or repeat complaints from clogging the system.' },
  { icon: MapPin,      title: 'Location Verification',   desc: 'Leaflet map with GPS current-location capture. Reverse geocoding via OpenStreetMap.' },
  { icon: BarChart2,   title: 'Admin Analytics',         desc: 'Real-time dashboard with category, status, and priority charts. Full complaint lifecycle tracking.' },
  { icon: Clock,       title: 'SLA Tracking',            desc: 'Each complaint has a deadline. High-priority issues are escalated automatically.' },
  { icon: Users,       title: 'Three-Role System',       desc: 'Citizen, Admin, and Field Worker each have purpose-built interfaces and workflows.' },
];

const STATS = [
  { value: '3', label: 'User Roles' },
  { value: '7', label: 'AI Features' },
  { value: '6', label: 'Issue Categories' },
  { value: '6', label: 'Complaint Statuses' },
];

export default function Landing() {
  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="bg-white border-b border-surface-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-200 mb-6">
              <Zap className="w-3.5 h-3.5" />
              Hackspora 2.0 — Team HS082-TVF
            </div>
            <h1 className="text-5xl lg:text-6xl font-extrabold text-ink leading-[1.1] text-balance">
              Report Smart.<br />
              <span className="text-brand-600">Resolve Fast.</span>
            </h1>
            <p className="mt-6 text-xl text-ink-muted leading-relaxed max-w-2xl">
              CivicPulse is an AI-assisted civic complaint management platform that manages
              the complete lifecycle — from citizen report to verified resolution with before/after proof.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="btn btn-primary btn-xl">
                Report an Issue <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/login?role=admin" className="btn btn-secondary btn-xl">
                <Building2 className="w-5 h-5" /> Authority Login
              </Link>
            </div>
            <div className="mt-6">
              <Link to="/login" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline font-medium">
                Track existing complaint <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-brand-700 py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map(s => (
              <div key={s.label} className="text-center">
                <p className="text-4xl font-extrabold text-white">{s.value}</p>
                <p className="text-sm text-blue-200 mt-1 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="py-20 bg-surface-muted">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 mb-4">
                <AlertTriangle className="w-3.5 h-3.5" /> The Problem
              </div>
              <h2 className="text-3xl font-bold text-ink mb-4">Traditional complaint systems fall short</h2>
              <ul className="space-y-3">
                {[
                  'No image quality or evidence verification',
                  'Duplicate complaints flood the system',
                  'No AI-based classification or prioritisation',
                  'Complaints routed to wrong departments',
                  'No before/after resolution proof',
                  'Zero SLA tracking or escalation',
                  'Citizen has no visibility after submission',
                ].map(p => (
                  <li key={p} className="flex items-start gap-2.5 text-ink-muted text-sm">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 text-xs mt-0.5">✕</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-2xl border border-surface-border p-6 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-ink">CivicPulse Solution</span>
              </div>
              <ul className="space-y-3">
                {[
                  'Image quality analysis & enhancement',
                  'AI-powered duplicate detection (TF-IDF + cosine similarity)',
                  'Automatic category classification (Logistic Regression)',
                  'Suspicious complaint detection (rule-based)',
                  'Smart priority scoring engine',
                  'Automated department routing',
                  'Before/after photo proof with admin verification',
                ].map(s => (
                  <li key={s} className="flex items-start gap-2.5 text-ink-muted text-sm">
                    <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0 text-xs mt-0.5">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white border-t border-b border-surface-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-ink">How CivicPulse Works</h2>
            <p className="text-ink-muted mt-2">Complete lifecycle from report to resolution</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <div key={step.n} className="relative">
                <div className="card p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-brand-50 rounded-lg">
                      <step.icon className="w-5 h-5 text-brand-600" />
                    </div>
                    <span className="text-xs font-mono font-bold text-brand-400 mt-1">{step.n}</span>
                  </div>
                  <h3 className="font-semibold text-ink text-sm mb-1">{step.title}</h3>
                  <p className="text-xs text-ink-muted leading-relaxed">{step.desc}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:flex absolute top-1/2 -right-3 z-10">
                    <ChevronRight className="w-6 h-6 text-ink-subtle" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-surface-muted">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-ink">Key Features</h2>
            <p className="text-ink-muted mt-2">Built for a real hackathon, designed for real cities</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="card p-5">
                <div className="p-2 bg-brand-50 rounded-lg w-fit mb-3">
                  <f.icon className="w-5 h-5 text-brand-600" />
                </div>
                <h3 className="font-semibold text-ink text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-ink-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-brand-700">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Build a better city together</h2>
          <p className="text-blue-200 mb-8 text-lg">
            Join CivicPulse to report, track, and resolve civic issues faster than ever.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/register" className="btn bg-white text-brand-700 hover:bg-blue-50 btn-lg font-semibold">
              Register as Citizen
            </Link>
            <Link to="/login?role=admin" className="btn border border-blue-400 text-white hover:bg-brand-800 btn-lg">
              Admin / Authority Login
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-surface-border py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-600 rounded flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-ink">CivicPulse</span>
            <span className="text-sm text-ink-subtle">— Team HS082-TVF</span>
          </div>
          <p className="text-xs text-ink-subtle">Hackspora 2.0 &copy; 2026</p>
        </div>
      </footer>
    </div>
  );
}
