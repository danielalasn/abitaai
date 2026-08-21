'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, MessageSquare, BarChart3, Users, Zap, Clock, Shield, Check } from 'lucide-react'
import { HeroChatDemo } from '@/components/HeroChatDemo'
import './landing.css'

export function LandingClient() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="bg-[#E9E4D8] min-h-dvh font-sans selection:bg-[#F36A2D]/20">
      {/* ─── Nav ─── */}
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-logo">
          <div className="nav-logo-icon">
            <span>a</span>
          </div>
          <span className="nav-logo-text">abita.ai</span>
        </div>

        <div className="nav-actions">
          <a href="#contact" className="btn-contact">Contacto</a>
          <Link href="/login" className="btn-login">
            Iniciar sesion
            <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="hero-section">
        <div className="animate-fade-up">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            Inteligencia Artificial para cada interacción
          </div>
        </div>

        <h1 className="hero-title animate-fade-up delay-100">
          Atención impecable en cada mensaje. <em>Disponibilidad absoluta.</em>
        </h1>

        <p className="hero-subtitle animate-fade-up delay-200">
          Automatiza la atención en WhatsApp e Instagram. Desde ventas y soporte hasta
          concierge para hoteles o FAQ. Gestiona flujos constantes de mensajes sin esfuerzo.
        </p>

        <div className="hero-cta-group animate-fade-up delay-300">
          <a href="#contact" className="btn-primary">
            Solicitar demo
            <ArrowRight size={16} />
          </a>
          <a href="#features" className="btn-secondary">
            Conocer mas
          </a>
        </div>

      </section>

      {/* ─── Interactive Demo ─── */}
      <HeroChatDemo />

      {/* ─── Features ─── */}
      <section id="features" className="landing-section">
        <div className="section-label">
          <span className="section-label-line" />
          Funcionalidades
        </div>
        <h2 className="section-title">
          Automatización inteligente para<br />cualquier flujo de trabajo
        </h2>
        <p className="section-subtitle">
          Una plataforma completa que combina inteligencia artificial con tus canales de comunicacion.
        </p>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <MessageSquare size={22} />
            </div>
            <h3>Respuestas automaticas inteligentes</h3>
            <p>
              El agente de IA responde a tus clientes en segundos, con contexto de tu negocio
              y personalidad de marca.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Users size={22} />
            </div>
            <h3>Difusión profesional a leads</h3>
            <p>
              Envía notificaciones, recordatorios y actualizaciones a tus prospectos usando templates oficiales
              de Meta. Comunicación a gran escala con un solo click.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <BarChart3 size={22} />
            </div>
            <h3>Metricas y analiticos</h3>
            <p>
              Monitorea el rendimiento de tus agentes, volumen de mensajes y
              conversiones desde un dashboard diseñado para la acción.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Zap size={22} />
            </div>
            <h3>Multi-canal integrado</h3>
            <p>
              WhatsApp e Instagram en un mismo lugar. Gestiona todas las
              conversaciones sin cambiar de plataforma.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Clock size={22} />
            </div>
            <h3>Disponibilidad 24/7</h3>
            <p>
              Tu agente de IA nunca duerme. Atiende consultas fuera de horario
              y no pierdas ni una venta.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Shield size={22} />
            </div>
            <h3>Traspaso a humano</h3>
            <p>
              Cuando el cliente lo requiere, la IA transfiere la conversacion
              a un agente humano sin perder contexto.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Showcase: Conversations ─── */}
      <section className="showcase-section">
        <div className="showcase-item">
          <div className="showcase-image">
            <Image
              src="/assets/landing/feature-conversations.png"
              alt="Conversaciones con IA en WhatsApp e Instagram"
              width={580}
              height={400}
              unoptimized
              style={{ width: '100%', height: 'auto' }}
            />
          </div>
          <div className="showcase-content">
            <div className="section-label">
              <span className="section-label-line" />
              Conversaciones
            </div>
            <h3 className="section-title">
              Atención inteligente, contexto infinito
            </h3>
            <p className="section-subtitle">
              Ya sea para vender un producto, dar soporte técnico o recomendar el mejor restaurante
              cercano a tu Airbnb, la IA tiene el contexto completo.
            </p>
            <ul className="showcase-list">
              <li>
                <span className="showcase-list-icon"><Check size={12} /></span>
                Respuestas contextuales basadas en tu informacion
              </li>
              <li>
                <span className="showcase-list-icon"><Check size={12} /></span>
                Deteccion de intencion de compra en tiempo real
              </li>
              <li>
                <span className="showcase-list-icon"><Check size={12} /></span>
                Historial completo de cada conversacion
              </li>
            </ul>
          </div>
        </div>

        <div className="showcase-item reverse">
          <div className="showcase-image">
            <Image
              src="/assets/landing/feature-analytics.png"
              alt="Dashboard de analiticos y metricas"
              width={580}
              height={400}
              unoptimized
              style={{ width: '100%', height: 'auto' }}
            />
          </div>
          <div className="showcase-content">
            <div className="section-label">
              <span className="section-label-line" />
              Analiticos
            </div>
            <h3 className="section-title">
              Alcance profesional a gran escala
            </h3>
            <p className="section-subtitle">
              Utiliza templates oficiales de WhatsApp para enviar actualizaciones,
              seguimientos personalizados o promociones a tus leads registrados.
            </p>
            <ul className="showcase-list">
              <li>
                <span className="showcase-list-icon"><Check size={12} /></span>
                Metricas de conversion y engagement
              </li>
              <li>
                <span className="showcase-list-icon"><Check size={12} /></span>
                Reportes de consumo y costos
              </li>
              <li>
                <span className="showcase-list-icon"><Check size={12} /></span>
                Insights sobre el comportamiento de tus leads
              </li>
            </ul>
          </div>
        </div>

        <div className="showcase-item">
          <div className="showcase-image">
            <Image
              src="/assets/landing/feature-leads.png"
              alt="Gestion de leads inteligente"
              width={580}
              height={400}
              unoptimized
              style={{ width: '100%', height: 'auto' }}
            />
          </div>
          <div className="showcase-content">
            <div className="section-label">
              <span className="section-label-line" />
              Leads
            </div>
            <h3 className="section-title">
              Versatilidad para cada industria
            </h3>
            <p className="section-subtitle">
              Desde Hospitality y Real Estate hasta E-commerce y Salud.
              abita.ai se adapta a cualquier flujo de mensajería constante.
            </p>
            <ul className="showcase-list">
              <li>
                <span className="showcase-list-icon"><Check size={12} /></span>
                Clasificacion automatica por nivel de interes
              </li>
              <li>
                <span className="showcase-list-icon"><Check size={12} /></span>
                Importacion masiva de contactos
              </li>
              <li>
                <span className="showcase-list-icon"><Check size={12} /></span>
                Seguimiento de interacciones por lead
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="stats-section">
        <div className="stats-bar">
          <div className="stat-item">
            <div className="stat-number">2.1s</div>
            <div className="stat-label">Tiempo promedio de respuesta</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">24/7</div>
            <div className="stat-label">Disponibilidad continua</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">85%</div>
            <div className="stat-label">Respuestas resueltas por IA</div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section id="contact" className="cta-section">
        <div className="cta-box">
          <div className="section-label" style={{ justifyContent: 'center' }}>
            <span className="section-label-line" />
            Comienza hoy
          </div>
          <h2 className="section-title">
            Lleva tu comunicación al siguiente nivel
          </h2>
          <p className="section-subtitle">
            Agenda una demo personalizada y descubre cómo abita.ai puede automatizar tu negocio.
          </p>
          <a href="#contact" className="btn-primary">
            Solicitar demo
            <ArrowRight size={16} />
          </a>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-brand-icon">
              <span>a</span>
            </div>
            <span className="footer-brand-text">abita.ai</span>
          </div>

          <div className="footer-links">
            <Link href="/terms">Términos</Link>
            <Link href="/privacy">Privacidad</Link>
            <a href="#contact">Contacto</a>
          </div>
        </div>

        <div className="footer-bottom">
          <span className="footer-copy">&copy; 2026 abita.ai</span>
          <div className="footer-alnovu">
            By <a href="https://alnovu.com" target="_blank" rel="noopener noreferrer">Alnovu.</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
