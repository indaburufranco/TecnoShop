import { useState, useEffect, useRef } from 'react'
import { supabase } from './lib/supabase'
import {
  fetchProducts,
  insertProduct,
  updateProductRow,
  deleteProductRow,
  uploadProductImage,
  createOrderRow,
  fetchMyOrders,
  fetchAllOrders,
  updateOrderStatusRow,
  fetchProfile,
  updateProfile,
  type Product,
  type OrderStatus,
  type Order,
  type OrderItem,
  type OrderWithEmail,
  type ProductInput,
} from './lib/api'

// ── Types ────────────────────────────────────────────────────────────────────

type User = { id: string; name: string; email: string; isAdmin: boolean } | null
type Cart = Record<number, number> // productId → quantity

// ── Data ─────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: 'Laptops & PCs', icon: '💻' },
  { label: 'Smartphones', icon: '📱' },
  { label: 'Audio', icon: '🎧' },
  { label: 'Televisores', icon: '📺' },
  { label: 'Cámaras', icon: '📷' },
  { label: 'Gaming', icon: '🎮' },
  { label: 'Accesorios', icon: '🖱️' },
  { label: 'Smart Home', icon: '🏠' },
]

const CAROUSEL_SLIDES = [
  {
    id: 1,
    title: 'Laptops de alto rendimiento',
    subtitle: 'Hasta 40% de descuento en modelos seleccionados',
    cta: 'Ver ofertas',
    image: 'https://images.unsplash.com/photo-1542351967-d5ae722fed71?w=1400&h=560&fit=crop&auto=format',
    accent: '#00c8ff',
    category: 'Laptops & PCs',
  },
  {
    id: 2,
    title: 'Smartphones de última generación',
    subtitle: 'Los mejores precios en flagship de 2024',
    cta: 'Explorar',
    image: 'https://images.unsplash.com/photo-1654555023156-0a1c9cdf1130?w=1400&h=560&fit=crop&auto=format',
    accent: '#7c3aed',
    category: 'Smartphones',
  },
  {
    id: 3,
    title: 'Gaming sin límites',
    subtitle: 'Equipos y periféricos para los más exigentes',
    cta: 'Descubrir',
    image: 'https://images.unsplash.com/photo-1761494296583-99b15e9063c5?w=1400&h=560&fit=crop&auto=format',
    accent: '#10b981',
    category: 'Gaming',
  },
  {
    id: 4,
    title: 'Audio de estudio profesional',
    subtitle: 'Experiencia sonora que marca la diferencia',
    cta: 'Ver más',
    image: 'https://images.unsplash.com/photo-1698338854513-14758e9b9b2c?w=1400&h=560&fit=crop&auto=format',
    accent: '#f59e0b',
    category: 'Audio',
  },
]

// ── Carrito y favoritos (persistidos en localStorage del navegador) ───────────
// El catálogo, los pedidos y las cuentas viven en Supabase; el carrito y los
// favoritos quedan en el dispositivo porque son datos de sesión de compra.
const CART_KEY = 'tecnoshop_cart'
const WISHLIST_KEY = 'tecnoshop_wishlist'

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function saveJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // sin persistencia si localStorage falla
  }
}

// ── Responsive helper ──────────────────────────────────────────────────────────
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  )
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [breakpoint])
  return isMobile
}

// ── Star Rating ───────────────────────────────────────────────────────────────
function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ color: '#f59e0b', fontSize: 12 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ opacity: i < Math.round(rating) ? 1 : 0.25 }}>★</span>
      ))}
    </span>
  )
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({
  products,
  categories,
  onOpenLogin,
  user,
  onLogout,
  cartCount,
  wishlistCount,
  onSearch,
  onCategorySelect,
  onOpenCart,
  onOpenFavorites,
  onOpenOrders,
  onOpenSettings,
  onOpenAdmin,
  onGoHome,
}: {
  products: Product[]
  categories: { label: string; icon: string }[]
  onOpenLogin: () => void
  user: User
  onLogout: () => void
  cartCount: number
  wishlistCount: number
  onSearch: (q: string) => void
  onCategorySelect: (c: string | null) => void
  onOpenCart: () => void
  onOpenFavorites: () => void
  onOpenOrders: () => void
  onOpenSettings: () => void
  onOpenAdmin: () => void
  onGoHome: () => void
}) {
  const [catOpen, setCatOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const catRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()

  const suggestions = searchVal.trim().length > 0
    ? products.filter(p => p.name.toLowerCase().includes(searchVal.toLowerCase())).slice(0, 5)
    : []

  const selectSuggestion = (name: string) => {
    setSearchVal(name)
    onSearch(name)
    setShowSuggestions(false)
  }

  // Ejecuta la búsqueda con el texto actual — desde el botón de la lupa o
  // desde Enter. El filtrado en vivo (onChange) ya la dispara mientras se
  // escribe; esto además cierra sugerencias y confirma la búsqueda de forma
  // explícita, útil con teclado o lector de pantalla.
  const submitSearch = () => {
    onSearch(searchVal)
    setShowSuggestions(false)
    setMobileSearchOpen(false)
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(7,9,15,0.92)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid #1e2535',
      padding: isMobile ? '0 12px' : '0 24px',
      height: 64,
      display: 'flex',
      alignItems: 'center',
      gap: isMobile ? 8 : 20,
    }}>
      {/* Logo — lleva al inicio y sale del panel de admin o del detalle de producto */}
      <button
        onClick={onGoHome}
        aria-label="Ir al inicio"
        style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: isMobile ? 18 : 22, letterSpacing: -0.5, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
      >
        <span style={{ background: 'linear-gradient(135deg,#00c8ff,#7c3aed)', borderRadius: 6, padding: '2px 6px', fontSize: isMobile ? 15 : 18 }}>⚡</span>
        {!isMobile && <span style={{ color: '#e8eaf0' }}>Tecno<span style={{ color: '#00c8ff' }}>Shop</span></span>}
      </button>

      {/* Categories dropdown */}
      <div ref={catRef} style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setCatOpen(p => !p)}
          title="Categorías"
          aria-label="Categorías"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: catOpen ? '#1e2535' : 'transparent',
            border: '1px solid #1e2535',
            borderRadius: 8,
            color: '#e8eaf0',
            padding: isMobile ? '7px 9px' : '7px 14px',
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            fontSize: 14,
            fontWeight: 500,
            transition: 'background 0.15s',
          }}
        >
          {isMobile ? <span>📂</span> : <span>Categorías</span>}
          <span style={{ fontSize: 10, opacity: 0.6, transform: catOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
        </button>
        {catOpen && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            background: '#0e1117',
            border: '1px solid #1e2535',
            borderRadius: 12,
            padding: '8px 0',
            minWidth: 220,
            boxShadow: '0 20px 48px rgba(0,0,0,0.6)',
          }}>
            <div
              onClick={() => { onCategorySelect(null); setCatOpen(false) }}
              style={{ padding: '10px 16px', cursor: 'pointer', fontSize: 14, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 10 }}
              onMouseEnter={e => (e.currentTarget.style.background = '#161b27')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              🔍 Todas las categorías
            </div>
            <div style={{ height: 1, background: '#1e2535', margin: '4px 16px' }} />
            {categories.map(c => (
              <div
                key={c.label}
                onClick={() => { onCategorySelect(c.label); setCatOpen(false) }}
                style={{ padding: '10px 16px', cursor: 'pointer', fontSize: 14, color: '#e8eaf0', display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#161b27')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span>{c.icon}</span>
                <span>{c.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search */}
      {isMobile ? (
        <>
          <button
            onClick={() => setMobileSearchOpen(p => !p)}
            title="Buscar"
            aria-label="Buscar"
            style={{
              flex: 1,
              background: 'transparent', border: '1px solid #1e2535', borderRadius: 8,
              height: 36, cursor: 'pointer', color: '#6b7280', fontSize: 15,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            🔍
          </button>
          {mobileSearchOpen && (
            <div style={{
              position: 'absolute', top: 64, left: 0, right: 0,
              background: '#0e1117', borderBottom: '1px solid #1e2535',
              padding: '12px 16px', zIndex: 90,
            }}>
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={submitSearch}
                  aria-label="Buscar"
                  style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >🔍</button>
                <input
                  autoFocus
                  value={searchVal}
                  onChange={e => { setSearchVal(e.target.value); onSearch(e.target.value) }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitSearch() } }}
                  placeholder="Buscar productos..."
                  aria-label="Buscar productos"
                  style={{
                    width: '100%', background: '#161b27', border: '1px solid #1e2535', borderRadius: 10,
                    color: '#e8eaf0', fontFamily: 'Inter, sans-serif', fontSize: 15,
                    padding: '10px 16px 10px 36px', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              {searchVal.trim().length > 0 && suggestions.length > 0 && (
                <div style={{ marginTop: 8, background: '#161b27', border: '1px solid #1e2535', borderRadius: 10, overflow: 'hidden' }}>
                  {suggestions.map(p => (
                    <div
                      key={p.id}
                      onClick={() => { selectSuggestion(p.name); setMobileSearchOpen(false) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer', fontSize: 13, color: '#e8eaf0', borderBottom: '1px solid #1e253566' }}
                    >
                      <span style={{ color: '#6b7280' }}>🔍</span>
                      <span style={{ flex: 1 }}>{p.name}</span>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>{p.category}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div style={{ flex: 1, position: 'relative' }}>
          <button
            type="button"
            onClick={submitSearch}
            aria-label="Buscar"
            style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}
          >🔍</button>
          <input
            value={searchVal}
            onChange={e => { setSearchVal(e.target.value); onSearch(e.target.value) }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitSearch() } }}
            placeholder="Buscar productos, marcas, categorías..."
            aria-label="Buscar productos, marcas, categorías"
            style={{
              width: '100%',
              background: '#0e1117',
              border: '1px solid #1e2535',
              borderRadius: 10,
              color: '#e8eaf0',
              fontFamily: 'Inter, sans-serif',
              fontSize: 14,
              padding: '9px 16px 9px 36px',
              outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => { e.target.style.borderColor = '#00c8ff44'; setShowSuggestions(true) }}
            onBlur={e => { e.target.style.borderColor = '#1e2535'; setTimeout(() => setShowSuggestions(false), 150) }}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
              background: '#0e1117', border: '1px solid #1e2535', borderRadius: 10,
              boxShadow: '0 16px 40px rgba(0,0,0,0.4)', zIndex: 60, overflow: 'hidden',
            }}>
              {suggestions.map(p => (
                <div
                  key={p.id}
                  onMouseDown={() => selectSuggestion(p.name)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', fontSize: 13, color: '#e8eaf0' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#161b27')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ color: '#6b7280' }}>🔍</span>
                  <span style={{ flex: 1 }}>{p.name}</span>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>{p.category}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* User */}
      <div ref={userRef} style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => user ? setUserOpen(p => !p) : onOpenLogin()}
          title={user ? user.name : 'Iniciar sesión'}
          aria-label={user ? `Cuenta de ${user.name}` : 'Iniciar sesión'}
          style={{
            position: 'relative',
            background: userOpen ? '#1e2535' : 'transparent',
            border: '1px solid #1e2535',
            borderRadius: 8,
            width: isMobile ? 36 : 40, height: isMobile ? 36 : 40,
            cursor: 'pointer',
            color: user ? '#00c8ff' : '#6b7280',
            fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
        >
          👤
          {wishlistCount > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              background: '#7c3aed', color: '#fff', borderRadius: '50%',
              width: 16, height: 16, fontSize: 9, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{wishlistCount}</span>
          )}
        </button>
        {userOpen && user && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            background: '#0e1117', border: '1px solid #1e2535', borderRadius: 12,
            padding: '16px', minWidth: 220,
            boxShadow: '0 20px 48px rgba(0,0,0,0.6)',
          }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 16, color: '#e8eaf0' }}>{user.name}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{user.email}</div>
              {user.isAdmin && (
                <div style={{ marginTop: 6, background: '#7c3aed22', border: '1px solid #7c3aed44', borderRadius: 6, padding: '3px 8px', fontSize: 11, color: '#a78bfa', display: 'inline-block', fontWeight: 600 }}>
                  ⚙️ Panel de Administración
                </div>
              )}
            </div>
            <div style={{ height: 1, background: '#1e2535', marginBottom: 10 }} />
            {[
              { icon: '❤️', label: `Favoritos (${wishlistCount})`, onClick: () => { onOpenFavorites(); setUserOpen(false) } },
              { icon: '📦', label: 'Mis pedidos', onClick: () => { onOpenOrders(); setUserOpen(false) } },
              { icon: '⚙️', label: 'Configuración', onClick: () => { onOpenSettings(); setUserOpen(false) } },
              ...(user.isAdmin ? [{ icon: '🛠️', label: 'Administrar productos', onClick: () => { onOpenAdmin(); setUserOpen(false) } }] : []),
            ].map(item => (
              <div key={item.label} onClick={item.onClick}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 4px', cursor: 'pointer', fontSize: 13, color: '#e8eaf0', borderRadius: 6 }}
                onMouseEnter={e => (e.currentTarget.style.background = '#161b27')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
            <div style={{ height: 1, background: '#1e2535', margin: '10px 0' }} />
            <button onClick={() => { onLogout(); setUserOpen(false) }} style={{ width: '100%', background: '#1e2535', border: 'none', borderRadius: 8, color: '#ef4444', padding: '9px', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              Cerrar sesión
            </button>
          </div>
        )}
      </div>

      {/* Favorites — sale del panel de admin o del detalle de producto */}
      <button
        onClick={onOpenFavorites}
        title="Favoritos"
        aria-label="Favoritos"
        style={{
          position: 'relative',
          background: 'transparent',
          border: '1px solid #1e2535',
          borderRadius: 8,
          width: isMobile ? 36 : 40, height: isMobile ? 36 : 40,
          cursor: 'pointer',
          color: '#6b7280',
          fontSize: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget.style.borderColor = '#7c3aed44'); (e.currentTarget.style.color = '#a78bfa') }}
        onMouseLeave={e => { (e.currentTarget.style.borderColor = '#1e2535'); (e.currentTarget.style.color = '#6b7280') }}
      >
        ♥
        {wishlistCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: '#7c3aed', color: '#fff', borderRadius: '50%',
            width: 18, height: 18, fontSize: 10, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{wishlistCount}</span>
        )}
      </button>

      {/* Cart */}
      <button
        onClick={onOpenCart}
        title="Carrito"
        aria-label="Carrito"
        style={{
          position: 'relative',
          background: 'transparent',
          border: '1px solid #1e2535',
          borderRadius: 8,
          width: isMobile ? 36 : 40, height: isMobile ? 36 : 40,
          cursor: 'pointer',
          color: '#6b7280',
          fontSize: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget.style.borderColor = '#00c8ff44'); (e.currentTarget.style.color = '#00c8ff') }}
        onMouseLeave={e => { (e.currentTarget.style.borderColor = '#1e2535'); (e.currentTarget.style.color = '#6b7280') }}
      >
        🛒
        {cartCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: '#00c8ff', color: '#07090f', borderRadius: '50%',
            width: 18, height: 18, fontSize: 10, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{cartCount}</span>
        )}
      </button>
    </nav>
  )
}

// ── Carousel ──────────────────────────────────────────────────────────────────
function Carousel({ onCategoryFilter }: { onCategoryFilter: (category: string) => void }) {
  const [current, setCurrent] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isMobile = useIsMobile()

  const start = () => {
    intervalRef.current = setInterval(() => setCurrent(p => (p + 1) % CAROUSEL_SLIDES.length), 5000)
  }
  const stop = () => { if (intervalRef.current) clearInterval(intervalRef.current) }

  useEffect(() => { start(); return stop }, [])

  const slide = CAROUSEL_SLIDES[current]

  return (
    <div
      style={{ position: 'relative', width: '100%', height: isMobile ? 340 : 480, overflow: 'hidden', background: '#07090f' }}
      onMouseEnter={stop}
      onMouseLeave={start}
    >
      {CAROUSEL_SLIDES.map((s, i) => (
        <div
          key={s.id}
          style={{
            position: 'absolute', inset: 0,
            opacity: i === current ? 1 : 0,
            transition: 'opacity 0.7s ease',
            pointerEvents: i === current ? 'auto' : 'none',
          }}
        >
          <img
            src={s.image}
            alt={s.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.35)' }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: isMobile
              ? 'linear-gradient(0deg, rgba(7,9,15,0.97) 10%, rgba(7,9,15,0.55) 60%, rgba(7,9,15,0.3) 100%)'
              : `linear-gradient(90deg, rgba(7,9,15,0.95) 0%, rgba(7,9,15,0.4) 60%, transparent 100%)`,
          }} />
        </div>
      ))}

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, padding: isMobile ? '0 20px' : '0 72px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: isMobile ? '100%' : 700 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: slide.accent, marginBottom: isMobile ? 10 : 16, fontFamily: 'Outfit, sans-serif', textTransform: 'uppercase' }}>
          ⚡ Oferta especial
        </div>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: isMobile ? 30 : 48, lineHeight: 1.15, color: '#e8eaf0', margin: '0 0 16px', letterSpacing: -1 }}>
          {slide.title}
        </h1>
        <p style={{ fontSize: isMobile ? 15 : 18, color: '#9ca3af', marginBottom: isMobile ? 22 : 32, lineHeight: 1.5 }}>
          {slide.subtitle}
        </p>
        <button
          onClick={() => onCategoryFilter(slide.category)}
          style={{
            alignSelf: 'flex-start',
            background: slide.accent,
            color: '#07090f',
            border: 'none',
            borderRadius: 10,
            padding: isMobile ? '12px 24px' : '14px 32px',
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
            transition: 'opacity 0.15s, transform 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget.style.opacity = '0.85'); (e.currentTarget.style.transform = 'translateY(-1px)') }}
          onMouseLeave={e => { (e.currentTarget.style.opacity = '1'); (e.currentTarget.style.transform = 'none') }}
        >
          {slide.cta} →
        </button>
      </div>

      {/* Dots */}
      <div style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, zIndex: 3 }}>
        {CAROUSEL_SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Ir a la promoción ${i + 1}`}
            style={{
              width: i === current ? 28 : 8, height: 8,
              borderRadius: 4,
              background: i === current ? slide.accent : '#ffffff33',
              border: 'none', cursor: 'pointer',
              padding: 0,
              transition: 'all 0.3s',
            }}
          />
        ))}
      </div>

      {/* Arrows */}
      {(['prev', 'next'] as const).map(dir => (
        <button
          key={dir}
          onClick={() => setCurrent(p => dir === 'prev' ? (p - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length : (p + 1) % CAROUSEL_SLIDES.length)}
          aria-label={dir === 'prev' ? 'Promoción anterior' : 'Siguiente promoción'}
          style={{
            position: 'absolute',
            top: '50%', transform: 'translateY(-50%)',
            [dir === 'prev' ? 'left' : 'right']: 24,
            background: 'rgba(14,17,23,0.7)',
            border: '1px solid #1e2535',
            borderRadius: 10,
            width: 44, height: 44,
            color: '#e8eaf0',
            fontSize: 18,
            cursor: 'pointer',
            zIndex: 3,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,200,255,0.15)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(14,17,23,0.7)')}
        >
          {dir === 'prev' ? '‹' : '›'}
        </button>
      ))}
    </div>
  )
}

// ── Product Card ──────────────────────────────────────────────────────────────
function ProductCard({
  product,
  inWishlist,
  onToggleWishlist,
  onAddToCart,
  onOpenDetail,
}: {
  product: Product
  inWishlist: boolean
  onToggleWishlist: () => void
  onAddToCart: () => void
  onOpenDetail: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const [added, setAdded] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null

  const handleAdd = () => {
    onAddToCart()
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#0e1117',
        border: `1px solid ${hovered ? '#00c8ff55' : '#1e2535'}`,
        borderRadius: 14,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 0.25s ease, transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s ease',
        transform: hovered ? 'translateY(-6px) scale(1.012)' : 'none',
        boxShadow: hovered ? '0 20px 45px rgba(0,200,255,0.12), 0 4px 14px rgba(0,0,0,0.3)' : '0 1px 0 rgba(0,0,0,0)',
        cursor: 'pointer',
      }}
    >
      {/* Image — click opens detail */}
      <div onClick={onOpenDetail} style={{ position: 'relative', background: '#161b27', height: 200, overflow: 'hidden' }}>
        {!imgLoaded && (
          <div className="skeleton" style={{ position: 'absolute', inset: 0 }} />
        )}
        <img
          src={product.image}
          alt={product.name}
          onLoad={() => setImgLoaded(true)}
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease',
            transform: hovered ? 'scale(1.06)' : 'scale(1)',
            opacity: imgLoaded ? 1 : 0,
          }}
        />
        {/* Badge */}
        {product.badge && (
          <div style={{
            position: 'absolute', top: 12, left: 12,
            background: product.badge === 'Nuevo' ? '#059669' : product.badge === 'Bestseller' ? '#d97706' : '#0891b2',
            color: '#fff',
            borderRadius: 999, padding: '4px 11px', fontSize: 10, fontWeight: 800, letterSpacing: 0.6,
            fontFamily: 'Outfit, sans-serif',
            boxShadow: `0 2px 10px ${product.badge === 'Nuevo' ? 'rgba(5,150,105,0.5)' : product.badge === 'Bestseller' ? 'rgba(217,119,6,0.5)' : 'rgba(8,145,178,0.5)'}`,
            border: '1px solid rgba(255,255,255,0.15)',
          }}>
            {product.badge.toUpperCase()}
          </div>
        )}
        {/* Discount */}
        {discount && (
          <div style={{
            position: 'absolute', top: 12, right: 12,
            background: '#dc2626', color: '#fff',
            borderRadius: 999, padding: '4px 10px', fontSize: 10, fontWeight: 800,
            boxShadow: '0 2px 10px rgba(220,38,38,0.5)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}>
            -{discount}%
          </div>
        )}
        {/* Wishlist — stopPropagation para no abrir el detalle al tocarlo */}
        <button
          onClick={e => { e.stopPropagation(); onToggleWishlist() }}
          aria-label={inWishlist ? `Quitar ${product.name} de favoritos` : `Agregar ${product.name} a favoritos`}
          style={{
            position: 'absolute', bottom: 12, right: 12,
            background: inWishlist ? '#7c3aed22' : 'rgba(14,17,23,0.8)',
            border: `1px solid ${inWishlist ? '#7c3aed' : '#1e2535'}`,
            borderRadius: 8, width: 34, height: 34,
            cursor: 'pointer', color: inWishlist ? '#a78bfa' : '#6b7280',
            fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
            opacity: hovered || inWishlist ? 1 : 0,
          }}
        >
          {inWishlist ? '♥' : '♡'}
        </button>
      </div>

      {/* Info — click opens detail */}
      <div onClick={onOpenDetail} style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>{product.category}</div>
        <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 15, color: '#e8eaf0', lineHeight: 1.3 }}>{product.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Stars rating={product.rating} />
          <span style={{ fontSize: 11, color: '#6b7280' }}>{product.rating} ({product.reviews})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 20, color: '#e8eaf0' }}>
            ${product.price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </span>
          {product.originalPrice && (
            <span style={{ fontSize: 13, color: '#6b7280', textDecoration: 'line-through' }}>
              ${product.originalPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>
      </div>

      {/* Add to cart */}
      <div style={{ padding: '0 16px 16px' }}>
        <button
          onClick={handleAdd}
          style={{
            width: '100%',
            background: added ? '#10b981' : hovered ? '#00c8ff' : '#161b27',
            border: `1px solid ${added ? '#10b981' : hovered ? '#00c8ff' : '#1e2535'}`,
            borderRadius: 8,
            color: added || hovered ? '#07090f' : '#9ca3af',
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 600, fontSize: 13,
            padding: '10px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {added ? '✓ Añadido' : '+ Añadir al carrito'}
        </button>
      </div>
    </div>
  )
}

// ── Product Detail ────────────────────────────────────────────────────────────
function ProductDetail({
  product,
  inWishlist,
  onToggleWishlist,
  onAddToCart,
  onBack,
  onGoHome,
  onCategoryClick,
}: {
  product: Product
  inWishlist: boolean
  onToggleWishlist: () => void
  onAddToCart: () => void
  onBack: () => void
  onGoHome: () => void
  onCategoryClick: (category: string) => void
}) {
  const images = product.images ?? [product.image]
  const [activeImg, setActiveImg] = useState(0)
  const [added, setAdded] = useState(false)
  const isMobile = useIsMobile()
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null

  const handleAdd = () => {
    onAddToCart()
    setAdded(true)
    setTimeout(() => setAdded(false), 1600)
  }

  useEffect(() => { window.scrollTo({ top: 0 }) }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#07090f', padding: isMobile ? '20px 16px 60px' : '32px 40px 80px' }}>
      {/* Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280', marginBottom: 18, flexWrap: 'wrap' }}>
        <span
          onClick={onGoHome}
          style={{ cursor: 'pointer', transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#00c8ff')}
          onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
        >
          Inicio
        </span>
        <span style={{ opacity: 0.5 }}>›</span>
        <span
          onClick={() => onCategoryClick(product.category)}
          style={{ cursor: 'pointer', transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#00c8ff')}
          onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
        >
          {product.category}
        </span>
        <span style={{ opacity: 0.5 }}>›</span>
        <span style={{ color: '#9ca3af' }}>{product.name}</span>
      </div>

      {/* Back */}
      <button
        onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14, fontFamily: 'Inter, sans-serif', marginBottom: isMobile ? 20 : 32, padding: 0, transition: 'color 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#00c8ff')}
        onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
      >
        ← Volver a productos
      </button>

      <div style={{ display: isMobile ? 'flex' : 'grid', flexDirection: 'column', gridTemplateColumns: isMobile ? undefined : '1fr 1fr', gap: isMobile ? 24 : 56, maxWidth: 1100, margin: '0 auto' }}>
        {/* Images */}
        <div>
          {/* Main image */}
          <div style={{ background: '#161b27', borderRadius: 16, overflow: 'hidden', height: isMobile ? 300 : 420, marginBottom: 14, border: '1px solid #1e2535' }}>
            <img
              src={images[activeImg]}
              alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.2s' }}
            />
          </div>
          {/* Thumbnails */}
          {images.length > 1 && (
            <div style={{ display: 'flex', gap: 10 }}>
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  aria-label={`Ver imagen ${i + 1} de ${images.length}`}
                  style={{
                    flex: 1, height: isMobile ? 60 : 80, padding: 0, border: `2px solid ${i === activeImg ? '#00c8ff' : '#1e2535'}`,
                    borderRadius: 10, overflow: 'hidden', cursor: 'pointer', background: '#161b27',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* Category + badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>{product.category}</span>
            {product.badge && (
              <span style={{ background: product.badge === 'Nuevo' ? '#059669' : product.badge === 'Bestseller' ? '#d97706' : '#0891b2', color: '#fff', borderRadius: 999, padding: '3px 10px', fontSize: 10, fontWeight: 800, letterSpacing: 0.5, border: '1px solid rgba(255,255,255,0.15)' }}>
                {product.badge.toUpperCase()}
              </span>
            )}
            {discount && (
              <span style={{ background: '#ef4444', color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
                -{discount}%
              </span>
            )}
          </div>

          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: isMobile ? 24 : 32, color: '#e8eaf0', margin: '0 0 14px', lineHeight: 1.2, letterSpacing: -0.5 }}>
            {product.name}
          </h1>

          {/* Rating */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Stars rating={product.rating} />
            <span style={{ fontSize: 14, color: '#e8eaf0', fontWeight: 600 }}>{product.rating}</span>
            <span style={{ fontSize: 13, color: '#6b7280' }}>{product.reviews} reseñas</span>
          </div>

          {/* Price */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 24 }}>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 36, color: '#e8eaf0' }}>
              ${product.price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
            {product.originalPrice && (
              <span style={{ fontSize: 20, color: '#6b7280', textDecoration: 'line-through' }}>
                ${product.originalPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 28 }}>
              {product.description}
            </p>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
            <button
              onClick={handleAdd}
              style={{
                flex: 1,
                background: added ? '#10b981' : 'linear-gradient(135deg,#00c8ff,#0ea5e9)',
                border: 'none', borderRadius: 10,
                color: '#07090f',
                fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15,
                padding: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {added ? '✓ Añadido al carrito' : '+ Añadir al carrito'}
            </button>
            <button
              onClick={onToggleWishlist}
              aria-label={inWishlist ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              style={{
                width: 52, height: 52,
                background: inWishlist ? '#7c3aed22' : '#161b27',
                border: `1px solid ${inWishlist ? '#7c3aed' : '#1e2535'}`,
                borderRadius: 10, cursor: 'pointer',
                color: inWishlist ? '#a78bfa' : '#6b7280',
                fontSize: 22,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}
            >
              {inWishlist ? '♥' : '♡'}
            </button>
          </div>

          {/* Specs */}
          {product.specs && product.specs.length > 0 && (
            <div style={{ background: '#0e1117', border: '1px solid #1e2535', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e2535' }}>
                <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, color: '#e8eaf0' }}>
                  Especificaciones técnicas
                </span>
              </div>
              {product.specs.map((spec, i) => (
                <div
                  key={spec.label}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16,
                    padding: '12px 20px',
                    borderBottom: i < product.specs!.length - 1 ? '1px solid #1e253566' : 'none',
                    background: i % 2 === 0 ? 'transparent' : '#161b2733',
                  }}
                >
                  <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500, flexShrink: 0 }}>{spec.label}</span>
                  <span style={{ fontSize: 13, color: '#e8eaf0', textAlign: 'right' }}>{spec.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Cart Panel ────────────────────────────────────────────────────────────────
function CartPanel({
  products,
  cart,
  onClose,
  onUpdateQty,
  onRemove,
  onCheckout,
}: {
  products: Product[]
  cart: Cart
  onClose: () => void
  onUpdateQty: (id: number, delta: number) => void
  onRemove: (id: number) => void
  onCheckout: () => void
}) {
  const items = Object.entries(cart)
    .map(([id, qty]) => ({ product: products.find(p => p.id === Number(id))!, qty }))
    .filter(x => x.product)

  const total = items.reduce((sum, { product, qty }) => sum + product.price * qty, 0)
  const totalItems = items.reduce((sum, { qty }) => sum + qty, 0)
  const isMobile = useIsMobile()

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 150, backdropFilter: 'blur(2px)' }}
      />
      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: isMobile ? '100vw' : 420,
        background: '#0e1117',
        borderLeft: '1px solid #1e2535',
        zIndex: 151,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
        animation: 'slideIn 0.25s ease',
      }}>
        <style>{`@keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #1e2535', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 20, color: '#e8eaf0' }}>
              🛒 Carrito
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              {totalItems} {totalItems === 1 ? 'artículo' : 'artículos'}
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar carrito" style={{ background: '#161b27', border: '1px solid #1e2535', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', color: '#6b7280', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {items.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280' }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>🛒</div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 18, fontWeight: 600, color: '#4b5563' }}>El carrito está vacío</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Agrega productos para comenzar</div>
            </div>
          ) : items.map(({ product, qty }) => (
            <div key={product.id} style={{ display: 'flex', gap: 14, background: '#161b27', border: '1px solid #1e2535', borderRadius: 12, padding: 14 }}>
              <img src={product.image} alt={product.name} style={{ width: 70, height: 70, borderRadius: 8, objectFit: 'cover', flexShrink: 0, background: '#0e1117' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 13, color: '#e8eaf0', lineHeight: 1.3, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>{product.category}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {/* Qty controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: '#0e1117', border: '1px solid #1e2535', borderRadius: 8, overflow: 'hidden' }}>
                    <button
                      onClick={() => onUpdateQty(product.id, -1)}
                      aria-label={`Restar una unidad de ${product.name}`}
                      style={{ width: 30, height: 30, background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
                    >−</button>
                    <span style={{ minWidth: 28, textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#e8eaf0', fontFamily: 'Outfit, sans-serif' }}>{qty}</span>
                    <button
                      onClick={() => onUpdateQty(product.id, 1)}
                      aria-label={`Sumar una unidad de ${product.name}`}
                      style={{ width: 30, height: 30, background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#00c8ff')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
                    >+</button>
                  </div>
                  {/* Price */}
                  <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 14, color: '#e8eaf0' }}>
                    ${(product.price * qty).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </div>
                  {/* Delete */}
                  <button
                    onClick={() => onRemove(product.id)}
                    title="Eliminar"
                    aria-label={`Quitar ${product.name} del carrito`}
                    style={{ width: 30, height: 30, background: 'none', border: '1px solid #1e2535', borderRadius: 6, color: '#6b7280', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget.style.color = '#ef4444'); (e.currentTarget.style.borderColor = '#ef444444') }}
                    onMouseLeave={e => { (e.currentTarget.style.color = '#6b7280'); (e.currentTarget.style.borderColor = '#1e2535') }}
                  >🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer with total + buy */}
        {items.length > 0 && (
          <div style={{ padding: '20px 24px', borderTop: '1px solid #1e2535' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: '#6b7280' }}>Subtotal ({totalItems} artículos)</span>
              <span style={{ fontSize: 13, color: '#9ca3af' }}>${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 20, color: '#e8eaf0' }}>Total</span>
              <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 22, color: '#00c8ff' }}>${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>
            <button
              onClick={onCheckout}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg,#00c8ff,#7c3aed)',
                border: 'none', borderRadius: 10,
                color: '#07090f',
                fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 16,
                padding: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Comprar ahora — ${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ── Historial de pedidos ────────────────────────────────────────────────────────
const STATUS_COLOR: Record<OrderStatus, string> = {
  'Confirmado': '#00c8ff',
  'En preparación': '#f59e0b',
  'Enviado': '#a78bfa',
  'Entregado': '#10b981',
}

function OrdersPanel({ user, onClose }: { user: { name: string; email: string }; onClose: () => void }) {
  const isMobile = useIsMobile()
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetchMyOrders(user.email)
      .then(data => { if (active) setOrders(data) })
      .catch(() => { if (active) setError('No pudimos cargar tus pedidos. Intentá de nuevo más tarde.') })
    return () => { active = false }
  }, [user.email])

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 150, backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: isMobile ? '100vw' : 440,
        background: '#0e1117', borderLeft: '1px solid #1e2535', zIndex: 151,
        display: 'flex', flexDirection: 'column', boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
        animation: 'slideIn 0.25s ease',
      }}>
        <style>{`@keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>

        <div style={{ padding: '20px 24px', borderBottom: '1px solid #1e2535', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 20, color: '#e8eaf0' }}>📦 Mis pedidos</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              {orders ? `${orders.length} ${orders.length === 1 ? 'pedido' : 'pedidos'}` : 'Cargando…'}
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar mis pedidos" style={{ background: '#161b27', border: '1px solid #1e2535', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', color: '#6b7280', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#ef4444', fontSize: 13 }}>{error}</div>
          ) : orders === null ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280', fontSize: 13 }}>Cargando tus pedidos…</div>
          ) : orders.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280' }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>📦</div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 18, fontWeight: 600, color: '#4b5563' }}>Todavía no hiciste ningún pedido</div>
              <div style={{ fontSize: 13, marginTop: 6, textAlign: 'center' }}>Cuando completes una compra, aparece acá.</div>
            </div>
          ) : orders.map(order => (
            <div key={order.id} style={{ background: '#161b27', border: '1px solid #1e2535', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 14, color: '#e8eaf0' }}>{order.id}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                    {new Date(order.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999,
                  color: STATUS_COLOR[order.status], background: STATUS_COLOR[order.status] + '1a',
                  border: `1px solid ${STATUS_COLOR[order.status]}44`,
                }}>{order.status}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                {order.items.map((it, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9ca3af' }}>
                    <span>{it.qty}× {it.name}</span>
                    <span>${(it.price * it.qty).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid #1e2535' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#e8eaf0' }}>Total</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#00c8ff' }}>${order.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ── Checkout Modal ───────────────────────────────────────────────────────────
export interface CheckoutInfo {
  name: string
  email: string
  address: string
  city: string
}

function CheckoutModal({
  total,
  user,
  onClose,
  onSubmitOrder,
  onComplete,
}: {
  total: number
  user: User
  onClose: () => void
  onSubmitOrder: (info: CheckoutInfo) => Promise<void>
  onComplete: () => void
}) {
  const [step, setStep] = useState<'form' | 'processing' | 'done'>('form')
  const [form, setForm] = useState({
    name: user?.name ?? '', email: user?.email ?? '', address: '', city: '',
    cardNumber: '', cardExpiry: '', cardCvv: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState('')

  // Precarga la dirección guardada si el usuario tiene sesión iniciada.
  useEffect(() => {
    if (!user) return
    let active = true
    fetchProfile(user.id)
      .then(profile => { if (active && profile?.address) setForm(f => ({ ...f, address: profile.address ?? f.address })) })
      .catch(() => {})
    return () => { active = false }
  }, [user])

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Ingresa tu nombre'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Email inválido'
    if (!form.address.trim()) errs.address = 'Ingresa tu dirección'
    if (!form.city.trim()) errs.city = 'Ingresa tu ciudad'
    if (!/^\d{13,19}$/.test(form.cardNumber.replace(/\s/g, ''))) errs.cardNumber = 'Número de tarjeta inválido'
    if (!/^\d{2}\/\d{2}$/.test(form.cardExpiry)) errs.cardExpiry = 'Formato MM/AA'
    if (!/^\d{3,4}$/.test(form.cardCvv)) errs.cardCvv = 'CVV inválido'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitError('')
    setStep('processing')
    try {
      await onSubmitOrder({ name: form.name, email: form.email, address: form.address, city: form.city })
      setStep('done')
    } catch (err) {
      // El backend (trigger de Supabase) rechaza el pedido con un mensaje
      // legible cuando el carrito quedó desactualizado (producto borrado o
      // cambiado) o si se detecta demasiados pedidos seguidos desde el mismo
      // email; se lo mostramos tal cual en vez de un genérico. Cualquier
      // otro error (red, etc.) cae al mensaje genérico de antes.
      const message = err instanceof Error ? err.message : ''
      setSubmitError(
        message && (message.includes('carrito') || message.includes('pedidos seguidos'))
          ? message
          : 'No pudimos confirmar tu pedido. Probá de nuevo en unos segundos.'
      )
      setStep('form')
    }
  }

  const inputStyle = (field: string): React.CSSProperties => ({
    width: '100%', background: '#0e1117', border: `1px solid ${errors[field] ? '#ef4444' : '#1e2535'}`,
    borderRadius: 8, color: '#e8eaf0', fontSize: 13, padding: '10px 12px',
    fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
  })
  const labelStyle: React.CSSProperties = { fontSize: 12, color: '#9ca3af', fontWeight: 500, display: 'block', marginBottom: 4 }

  return (
    <>
      <div onClick={step === 'form' ? onClose : undefined} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 420, maxWidth: '92vw', maxHeight: '88vh', overflowY: 'auto',
        background: '#0e1117', border: '1px solid #1e2535', borderRadius: 16,
        zIndex: 201, padding: 28, boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
      }}>
        {step === 'done' ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 20, color: '#e8eaf0', marginBottom: 8 }}>
              ¡Compra confirmada!
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
              Te enviamos un correo a {form.email} con los detalles del pedido.
            </div>
            <button
              onClick={onComplete}
              style={{ width: '100%', background: 'linear-gradient(135deg,#00c8ff,#7c3aed)', border: 'none', borderRadius: 10, color: '#07090f', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, padding: '13px', cursor: 'pointer' }}
            >
              Continuar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 19, color: '#e8eaf0' }}>
                🔒 Checkout
              </div>
              {step === 'form' && (
                <button type="button" onClick={onClose} aria-label="Cerrar" style={{ background: '#161b27', border: '1px solid #1e2535', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#6b7280' }}>✕</button>
              )}
            </div>

            <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, fontWeight: 600 }}>Datos de envío</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              <div>
                <label style={labelStyle} htmlFor="checkout-name">Nombre completo</label>
                <input id="checkout-name" placeholder="Juan Pérez" value={form.name} onChange={update('name')} style={inputStyle('name')} disabled={step === 'processing'} />
                {errors.name && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{errors.name}</div>}
              </div>
              <div>
                <label style={labelStyle} htmlFor="checkout-email">Email</label>
                <input id="checkout-email" placeholder="tu@email.com" value={form.email} onChange={update('email')} style={inputStyle('email')} disabled={step === 'processing'} />
                {errors.email && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{errors.email}</div>}
              </div>
              <div>
                <label style={labelStyle} htmlFor="checkout-address">Dirección</label>
                <input id="checkout-address" placeholder="Calle y número" value={form.address} onChange={update('address')} style={inputStyle('address')} disabled={step === 'processing'} />
                {errors.address && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{errors.address}</div>}
              </div>
              <div>
                <label style={labelStyle} htmlFor="checkout-city">Ciudad</label>
                <input id="checkout-city" placeholder="Buenos Aires" value={form.city} onChange={update('city')} style={inputStyle('city')} disabled={step === 'processing'} />
                {errors.city && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{errors.city}</div>}
              </div>
            </div>

            <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, fontWeight: 600 }}>Pago</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={labelStyle} htmlFor="checkout-card">Número de tarjeta</label>
                <input id="checkout-card" placeholder="1234 5678 9012 3456" value={form.cardNumber} onChange={update('cardNumber')} style={inputStyle('cardNumber')} disabled={step === 'processing'} />
                {errors.cardNumber && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{errors.cardNumber}</div>}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle} htmlFor="checkout-expiry">Vencimiento</label>
                  <input id="checkout-expiry" placeholder="MM/AA" value={form.cardExpiry} onChange={update('cardExpiry')} style={inputStyle('cardExpiry')} disabled={step === 'processing'} />
                  {errors.cardExpiry && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{errors.cardExpiry}</div>}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle} htmlFor="checkout-cvv">CVV</label>
                  <input id="checkout-cvv" placeholder="123" value={form.cardCvv} onChange={update('cardCvv')} style={inputStyle('cardCvv')} disabled={step === 'processing'} />
                  {errors.cardCvv && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{errors.cardCvv}</div>}
                </div>
              </div>
            </div>

            {submitError && <div style={{ fontSize: 12, color: '#ef4444', background: '#ef444411', border: '1px solid #ef444422', borderRadius: 6, padding: '8px 12px', marginBottom: 14 }}>{submitError}</div>}

            <button
              type="submit"
              disabled={step === 'processing'}
              style={{
                width: '100%',
                background: step === 'processing' ? '#1e2535' : 'linear-gradient(135deg,#00c8ff,#7c3aed)',
                border: 'none', borderRadius: 10,
                color: step === 'processing' ? '#6b7280' : '#07090f',
                fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15,
                padding: '13px', cursor: step === 'processing' ? 'default' : 'pointer',
              }}
            >
              {step === 'processing' ? 'Procesando pago…' : `Pagar $${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}
            </button>
            <div style={{ fontSize: 10, color: '#4b5563', textAlign: 'center', marginTop: 10 }}>
              Este es un checkout de demostración, no se procesa ningún cobro real.
            </div>
          </form>
        )}
      </div>
    </>
  )
}

// ── Login Modal ───────────────────────────────────────────────────────────────
function LoginModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')
  const [loading, setLoading] = useState(false)

  // Login state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // Register state
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regPassword2, setRegPassword2] = useState('')
  const [regError, setRegError] = useState('')
  const [regCheckEmail, setRegCheckEmail] = useState(false)

  // Forgot password state
  const [fpEmail, setFpEmail] = useState('')
  const [fpError, setFpError] = useState('')
  const [fpDone, setFpDone] = useState(false)

  const switchMode = (m: typeof mode) => {
    setMode(m)
    setError(''); setRegError(''); setFpError(''); setFpDone(false); setRegCheckEmail(false)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (authError) {
      setError('Email o contraseña incorrectos')
      return
    }
    onClose()
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegError('')
    if (!regName.trim()) return setRegError('Ingresá tu nombre')
    if (!/^\S+@\S+\.\S+$/.test(regEmail)) return setRegError('Email inválido')
    if (regPassword.length < 6) return setRegError('La contraseña debe tener al menos 6 caracteres')
    if (regPassword !== regPassword2) return setRegError('Las contraseñas no coinciden')

    setLoading(true)
    const { data, error: authError } = await supabase.auth.signUp({
      email: regEmail.trim(),
      password: regPassword,
      options: { data: { name: regName.trim() } },
    })
    setLoading(false)

    if (authError) {
      setRegError(authError.message.includes('already registered') ? 'Ya existe una cuenta con ese email' : 'No pudimos crear la cuenta. Probá de nuevo.')
      return
    }
    if (data.session) {
      onClose()
    } else {
      setRegCheckEmail(true)
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setFpError('')
    if (!/^\S+@\S+\.\S+$/.test(fpEmail)) return setFpError('Email inválido')
    setLoading(true)
    const { error: authError } = await supabase.auth.resetPasswordForEmail(fpEmail.trim(), {
      redirectTo: window.location.origin,
    })
    setLoading(false)
    if (authError) {
      setFpError('No pudimos enviar el email. Probá de nuevo.')
      return
    }
    setFpDone(true)
  }

  const inputStyle: React.CSSProperties = { width: '100%', background: '#161b27', border: '1px solid #1e2535', borderRadius: 8, color: '#e8eaf0', fontFamily: 'Inter, sans-serif', fontSize: 14, padding: '10px 14px', outline: 'none', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { fontSize: 12, color: '#9ca3af', fontWeight: 500, display: 'block', marginBottom: 6 }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#0e1117', border: '1px solid #1e2535', borderRadius: 16, padding: 36, width: 380, maxWidth: '90vw', maxHeight: '88vh', overflowY: 'auto', position: 'relative', boxSizing: 'border-box' }}>
        <button onClick={onClose} aria-label="Cerrar" style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 18 }}>✕</button>

        {mode === 'login' && (
          <>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 24, color: '#e8eaf0', marginBottom: 6 }}>Iniciar sesión</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 28 }}>Accedé a tu cuenta de TecnoShop</div>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle} htmlFor="login-email">Email</label>
                <input id="login-email" type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }} placeholder="tu@email.com" required style={inputStyle} disabled={loading} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="login-password">Contraseña</label>
                <input id="login-password" type="password" value={password} onChange={e => { setPassword(e.target.value); setError('') }} placeholder="••••••••" required style={inputStyle} disabled={loading} />
              </div>
              {error && (
                <div style={{ fontSize: 12, color: '#ef4444', background: '#ef444411', border: '1px solid #ef444422', borderRadius: 6, padding: '8px 12px' }}>
                  {error}
                  <div style={{ marginTop: 6 }}>
                    <span onClick={() => { setFpEmail(email); switchMode('forgot') }} style={{ color: '#00c8ff', cursor: 'pointer', textDecoration: 'underline' }}>
                      ¿Olvidaste tu contraseña?
                    </span>
                  </div>
                </div>
              )}
              <button type="submit" disabled={loading} style={{ background: 'linear-gradient(135deg,#00c8ff,#7c3aed)', border: 'none', borderRadius: 8, color: '#fff', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, padding: '12px', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4 }}>
                {loading ? 'Ingresando…' : 'Ingresar'}
              </button>
            </form>
            <div style={{ marginTop: 20, fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
              ¿No tenés cuenta?{' '}
              <span onClick={() => switchMode('register')} style={{ color: '#00c8ff', cursor: 'pointer', textDecoration: 'underline' }}>
                Registrate
              </span>
            </div>
          </>
        )}

        {mode === 'register' && (
          <>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 24, color: '#e8eaf0', marginBottom: 6 }}>Crear cuenta</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 28 }}>
              {regCheckEmail ? 'Revisá tu correo para confirmar la cuenta.' : 'Registrate para comprar en TecnoShop'}
            </div>
            {regCheckEmail ? (
              <button onClick={() => switchMode('login')} style={{ width: '100%', background: 'linear-gradient(135deg,#00c8ff,#7c3aed)', border: 'none', borderRadius: 8, color: '#fff', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, padding: '12px', cursor: 'pointer' }}>
                Iniciar sesión
              </button>
            ) : (
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle} htmlFor="reg-name">Nombre</label>
                  <input id="reg-name" value={regName} onChange={e => { setRegName(e.target.value); setRegError('') }} placeholder="Tu nombre" required style={inputStyle} disabled={loading} />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="reg-email">Email</label>
                  <input id="reg-email" type="email" value={regEmail} onChange={e => { setRegEmail(e.target.value); setRegError('') }} placeholder="tu@email.com" required style={inputStyle} disabled={loading} />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="reg-password">Contraseña</label>
                  <input id="reg-password" type="password" value={regPassword} onChange={e => { setRegPassword(e.target.value); setRegError('') }} placeholder="••••••••" required style={inputStyle} disabled={loading} />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="reg-password2">Repetir contraseña</label>
                  <input id="reg-password2" type="password" value={regPassword2} onChange={e => { setRegPassword2(e.target.value); setRegError('') }} placeholder="••••••••" required style={inputStyle} disabled={loading} />
                </div>
                {regError && <div style={{ fontSize: 12, color: '#ef4444', background: '#ef444411', border: '1px solid #ef444422', borderRadius: 6, padding: '8px 12px' }}>{regError}</div>}
                <button type="submit" disabled={loading} style={{ background: 'linear-gradient(135deg,#00c8ff,#7c3aed)', border: 'none', borderRadius: 8, color: '#fff', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, padding: '12px', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4 }}>
                  {loading ? 'Creando cuenta…' : 'Crear cuenta'}
                </button>
              </form>
            )}
            {!regCheckEmail && (
              <div style={{ marginTop: 20, fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
                ¿Ya tenés cuenta?{' '}
                <span onClick={() => switchMode('login')} style={{ color: '#00c8ff', cursor: 'pointer', textDecoration: 'underline' }}>
                  Iniciá sesión
                </span>
              </div>
            )}
          </>
        )}

        {mode === 'forgot' && (
          <>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 24, color: '#e8eaf0', marginBottom: 6 }}>Recuperar contraseña</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 28 }}>
              {fpDone ? 'Te enviamos un correo con un link para elegir una nueva contraseña.' : 'Ingresá tu email y te mandamos un link para recuperarla'}
            </div>
            {fpDone ? (
              <button onClick={() => switchMode('login')} style={{ width: '100%', background: 'linear-gradient(135deg,#00c8ff,#7c3aed)', border: 'none', borderRadius: 8, color: '#fff', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, padding: '12px', cursor: 'pointer' }}>
                Volver a iniciar sesión
              </button>
            ) : (
              <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle} htmlFor="fp-email">Email</label>
                  <input id="fp-email" type="email" value={fpEmail} onChange={e => { setFpEmail(e.target.value); setFpError('') }} placeholder="tu@email.com" required style={inputStyle} disabled={loading} />
                </div>
                {fpError && <div style={{ fontSize: 12, color: '#ef4444', background: '#ef444411', border: '1px solid #ef444422', borderRadius: 6, padding: '8px 12px' }}>{fpError}</div>}
                <button type="submit" disabled={loading} style={{ background: 'linear-gradient(135deg,#00c8ff,#7c3aed)', border: 'none', borderRadius: 8, color: '#fff', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, padding: '12px', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4 }}>
                  {loading ? 'Enviando…' : 'Enviar link'}
                </button>
              </form>
            )}
            {!fpDone && (
              <div style={{ marginTop: 20, fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
                <span onClick={() => switchMode('login')} style={{ color: '#00c8ff', cursor: 'pointer', textDecoration: 'underline' }}>
                  Volver a iniciar sesión
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Restablecer contraseña (llega acá desde el link del correo) ──────────────
function ResetPasswordModal({ onClose }: { onClose: () => void }) {
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres')
    if (password !== password2) return setError('Las contraseñas no coinciden')
    setLoading(true)
    const { error: authError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (authError) { setError('No pudimos actualizar la contraseña. Probá de nuevo.'); return }
    setDone(true)
  }

  const inputStyle: React.CSSProperties = { width: '100%', background: '#161b27', border: '1px solid #1e2535', borderRadius: 8, color: '#e8eaf0', fontFamily: 'Inter, sans-serif', fontSize: 14, padding: '10px 14px', outline: 'none', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { fontSize: 12, color: '#9ca3af', fontWeight: 500, display: 'block', marginBottom: 6 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#0e1117', border: '1px solid #1e2535', borderRadius: 16, padding: 36, width: 380, maxWidth: '90vw', boxSizing: 'border-box' }}>
        <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 22, color: '#e8eaf0', marginBottom: 6 }}>🔑 Nueva contraseña</div>
        {done ? (
          <>
            <div style={{ fontSize: 13, color: '#10b981', marginBottom: 24 }}>Tu contraseña se actualizó correctamente.</div>
            <button onClick={onClose} style={{ width: '100%', background: 'linear-gradient(135deg,#00c8ff,#7c3aed)', border: 'none', borderRadius: 8, color: '#fff', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, padding: '12px', cursor: 'pointer' }}>
              Continuar
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>Elegí tu nueva contraseña para entrar a TecnoShop.</div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle} htmlFor="reset-password">Nueva contraseña</label>
                <input id="reset-password" type="password" value={password} onChange={e => { setPassword(e.target.value); setError('') }} placeholder="••••••••" required style={inputStyle} disabled={loading} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="reset-password2">Repetir contraseña</label>
                <input id="reset-password2" type="password" value={password2} onChange={e => { setPassword2(e.target.value); setError('') }} placeholder="••••••••" required style={inputStyle} disabled={loading} />
              </div>
              {error && <div style={{ fontSize: 12, color: '#ef4444', background: '#ef444411', border: '1px solid #ef444422', borderRadius: 6, padding: '8px 12px' }}>{error}</div>}
              <button type="submit" disabled={loading} style={{ background: 'linear-gradient(135deg,#00c8ff,#7c3aed)', border: 'none', borderRadius: 8, color: '#fff', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, padding: '12px', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4 }}>
                {loading ? 'Guardando…' : 'Guardar contraseña'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

// ── Configuración de cuenta ───────────────────────────────────────────────────
function SettingsModal({
  user,
  onClose,
  onUserUpdate,
}: {
  user: { id: string; name: string; email: string; isAdmin: boolean }
  onClose: () => void
  onUserUpdate: (u: User) => void
}) {
  const [name, setName] = useState(user.name)
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPassword2, setNewPassword2] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    fetchProfile(user.id)
      .then(profile => {
        if (!active || !profile) return
        setName(profile.name || user.name)
        setAddress(profile.address ?? '')
        setPhone(profile.phone ?? '')
      })
      .catch(() => { if (active) setError('No pudimos cargar tu perfil.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user.id, user.name])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    if (!name.trim()) { setError('Ingresá tu nombre'); return }

    const wantsPasswordChange = !!(currentPassword || newPassword || newPassword2)
    setSaving(true)
    try {
      if (wantsPasswordChange) {
        if (newPassword.length < 6) throw new Error('La nueva contraseña debe tener al menos 6 caracteres')
        if (newPassword !== newPassword2) throw new Error('Las contraseñas nuevas no coinciden')
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword })
        if (signInError) throw new Error('La contraseña actual no coincide')
        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
        if (updateError) throw new Error('No pudimos actualizar la contraseña')
      }

      await updateProfile(user.id, { name: name.trim(), address: address.trim() || undefined, phone: phone.trim() || undefined })
      onUserUpdate({ id: user.id, name: name.trim(), email: user.email, isAdmin: user.isAdmin })
      setSuccess(true)
      setCurrentPassword(''); setNewPassword(''); setNewPassword2('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos guardar los cambios')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = { width: '100%', background: '#161b27', border: '1px solid #1e2535', borderRadius: 8, color: '#e8eaf0', fontFamily: 'Inter, sans-serif', fontSize: 14, padding: '10px 14px', outline: 'none', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { fontSize: 12, color: '#9ca3af', fontWeight: 500, display: 'block', marginBottom: 6 }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#0e1117', border: '1px solid #1e2535', borderRadius: 16, padding: 36, width: 420, maxWidth: '90vw', maxHeight: '88vh', overflowY: 'auto', position: 'relative', boxSizing: 'border-box' }}>
        <button onClick={onClose} aria-label="Cerrar" style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 18 }}>✕</button>

        <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 24, color: '#e8eaf0', marginBottom: 6 }}>⚙️ Configuración</div>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>{user.email}</div>

        {loading ? (
          <div style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', padding: '20px 0' }}>Cargando tu perfil…</div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle} htmlFor="settings-name">Nombre</label>
              <input id="settings-name" value={name} onChange={e => { setName(e.target.value); setError('') }} style={inputStyle} disabled={saving} />
            </div>
            <div>
              <label style={labelStyle} htmlFor="settings-address">Dirección de envío</label>
              <input id="settings-address" value={address} onChange={e => { setAddress(e.target.value); setError('') }} placeholder="Calle, número, ciudad" style={inputStyle} disabled={saving} />
            </div>
            <div>
              <label style={labelStyle} htmlFor="settings-phone">Teléfono</label>
              <input id="settings-phone" value={phone} onChange={e => { setPhone(e.target.value); setError('') }} placeholder="Opcional" style={inputStyle} disabled={saving} />
            </div>

            <div style={{ height: 1, background: '#1e2535', margin: '4px 0' }} />
            <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Cambiar contraseña (opcional)</div>
            <div>
              <label style={labelStyle} htmlFor="settings-current-password">Contraseña actual</label>
              <input id="settings-current-password" type="password" value={currentPassword} onChange={e => { setCurrentPassword(e.target.value); setError('') }} placeholder="••••••••" style={inputStyle} disabled={saving} />
            </div>
            <div>
              <label style={labelStyle} htmlFor="settings-new-password">Nueva contraseña</label>
              <input id="settings-new-password" type="password" value={newPassword} onChange={e => { setNewPassword(e.target.value); setError('') }} placeholder="••••••••" style={inputStyle} disabled={saving} />
            </div>
            <div>
              <label style={labelStyle} htmlFor="settings-new-password2">Repetir nueva contraseña</label>
              <input id="settings-new-password2" type="password" value={newPassword2} onChange={e => { setNewPassword2(e.target.value); setError('') }} placeholder="••••••••" style={inputStyle} disabled={saving} />
            </div>

            {error && <div style={{ fontSize: 12, color: '#ef4444', background: '#ef444411', border: '1px solid #ef444422', borderRadius: 6, padding: '8px 12px' }}>{error}</div>}
            {success && <div style={{ fontSize: 12, color: '#10b981', background: '#10b98111', border: '1px solid #10b98122', borderRadius: 6, padding: '8px 12px' }}>Cambios guardados correctamente.</div>}

            <button type="submit" disabled={saving} style={{ background: 'linear-gradient(135deg,#00c8ff,#7c3aed)', border: 'none', borderRadius: 8, color: '#fff', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, padding: '12px', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, marginTop: 4 }}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Panel de administración ────────────────────────────────────────────────────
function AdminPanel({
  products,
  categories,
  onRefreshProducts,
  onBack,
}: {
  products: Product[]
  categories: { label: string; icon: string }[]
  onRefreshProducts: () => Promise<void>
  onBack: () => void
}) {
  const isMobile = useIsMobile()
  const [tab, setTab] = useState<'orders' | 'products'>('orders')

  // ── Pedidos ────────────────────────────────────────────────────────────────
  const [allOrders, setAllOrders] = useState<OrderWithEmail[] | null>(null)
  const [ordersError, setOrdersError] = useState('')

  const refreshOrders = () => {
    setOrdersError('')
    fetchAllOrders().then(setAllOrders).catch(() => setOrdersError('No pudimos cargar los pedidos.'))
  }

  useEffect(() => { refreshOrders() }, [])

  const changeStatus = async (id: string, status: OrderStatus) => {
    try {
      await updateOrderStatusRow(id, status)
      refreshOrders()
    } catch {
      setOrdersError('No pudimos actualizar el estado del pedido.')
    }
  }

  // ── Productos: filtros ───────────────────────────────────────────────────────
  const [filterCategory, setFilterCategory] = useState('')
  const [filterBrand, setFilterBrand] = useState('')
  const [filterName, setFilterName] = useState('')

  const brands = Array.from(new Set(products.map(p => p.brand).filter((b): b is string => !!b))).sort()
  const productCategories = Array.from(new Set(products.map(p => p.category))).sort()

  const filteredProducts = products.filter(p => {
    const matchCategory = !filterCategory || p.category === filterCategory
    const matchBrand = !filterBrand || p.brand === filterBrand
    const matchName = !filterName || p.name.toLowerCase().includes(filterName.toLowerCase())
    return matchCategory && matchBrand && matchName
  })

  const hasProductFilters = !!(filterCategory || filterBrand || filterName)
  const clearProductFilters = () => { setFilterCategory(''); setFilterBrand(''); setFilterName('') }

  // ── Productos: formulario de alta/edición ────────────────────────────────────
  type ImageEntry = { id: string; src: string; label: string }
  const makeId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2))

  const emptyForm = { name: '', price: '', originalPrice: '', category: categories[0]?.label ?? '', brand: '', badge: '', description: '' }
  const [form, setForm] = useState(emptyForm)
  const [images, setImages] = useState<ImageEntry[]>([])
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [formError, setFormError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const startEdit = (p: Product) => {
    setEditingId(p.id)
    setFormError('')
    setForm({
      name: p.name,
      price: String(p.price),
      originalPrice: p.originalPrice ? String(p.originalPrice) : '',
      category: p.category,
      brand: p.brand ?? '',
      badge: p.badge ?? '',
      description: p.description ?? '',
    })
    setImages((p.images ?? [p.image]).filter(Boolean).map(src => ({ id: makeId(), src, label: src.split('/').pop() || 'Imagen' })))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => { setEditingId(null); setForm(emptyForm); setImages([]); setImageUrlInput(''); setFormError('') }

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    setUploading(true)
    setFormError('')
    try {
      for (const file of files) {
        const url = await uploadProductImage(file)
        setImages(prev => [...prev, { id: makeId(), src: url, label: file.name }])
      }
    } catch {
      setFormError('No pudimos subir alguna imagen. Probá de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  const addImageByUrl = () => {
    const url = imageUrlInput.trim()
    if (!url) return
    setImages(prev => [...prev, { id: makeId(), src: url, label: url }])
    setImageUrlInput('')
  }

  const moveImage = (index: number, dir: -1 | 1) => {
    setImages(prev => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      const tmp = next[index]
      next[index] = next[target]
      next[target] = tmp
      return next
    })
  }

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id))
  }

  const submitProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return setFormError('Ingresá el nombre del producto')
    const price = Number(form.price)
    if (!form.price || Number.isNaN(price) || price <= 0) return setFormError('Ingresá un precio válido')
    if (images.length === 0) return setFormError('Agregá al menos una imagen')
    const originalPrice = form.originalPrice ? Number(form.originalPrice) : undefined
    if (originalPrice !== undefined && (Number.isNaN(originalPrice) || originalPrice <= price)) {
      return setFormError('El precio original debe ser mayor al precio actual')
    }

    const payload: ProductInput = {
      name: form.name.trim(),
      price,
      originalPrice,
      category: form.category,
      brand: form.brand.trim() || undefined,
      badge: form.badge.trim() || undefined,
      description: form.description.trim() || undefined,
      images: images.map(img => img.src),
    }

    setSaving(true)
    setFormError('')
    try {
      if (editingId != null) {
        await updateProductRow(editingId, payload)
      } else {
        await insertProduct(payload)
      }
      await onRefreshProducts()
      cancelEdit()
    } catch {
      setFormError('No pudimos guardar el producto. Probá de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return }
    try {
      await deleteProductRow(id)
      await onRefreshProducts()
    } catch {
      setFormError('No pudimos eliminar el producto.')
    } finally {
      setConfirmDeleteId(null)
      if (editingId === id) cancelEdit()
    }
  }

  const inputStyle: React.CSSProperties = { width: '100%', background: '#0e1117', border: '1px solid #1e2535', borderRadius: 8, color: '#e8eaf0', fontSize: 13, padding: '9px 12px', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { fontSize: 11, color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }
  const srOnlyStyle: React.CSSProperties = { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }

  return (
    <div style={{ minHeight: '100vh', background: '#07090f', padding: isMobile ? '20px 16px 60px' : '32px 40px 80px' }}>
      <button
        onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14, fontFamily: 'Inter, sans-serif', marginBottom: 24, padding: 0 }}
        onMouseEnter={e => (e.currentTarget.style.color = '#00c8ff')}
        onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
      >
        ← Volver a la tienda
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 22 }}>🛠️</span>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: isMobile ? 22 : 28, color: '#e8eaf0', margin: 0 }}>Panel de administración</h1>
      </div>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 28 }}>Gestioná pedidos y el catálogo de productos de TecnoShop.</p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #1e2535' }}>
        {[
          { key: 'orders' as const, label: `📦 Pedidos (${allOrders?.length ?? 0})` },
          { key: 'products' as const, label: `📋 Productos (${products.length})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 18px', background: 'none', border: 'none',
              borderBottom: `2px solid ${tab === t.key ? '#00c8ff' : 'transparent'}`,
              color: tab === t.key ? '#e8eaf0' : '#6b7280',
              fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 14,
              cursor: 'pointer', marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'orders' ? (
        ordersError ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#ef4444', fontSize: 13 }}>{ordersError}</div>
        ) : allOrders === null ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280', fontSize: 13 }}>Cargando pedidos…</div>
        ) : allOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 18, fontWeight: 600, color: '#4b5563' }}>Todavía no hay pedidos</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {allOrders.map(order => (
              <div key={order.id} style={{ background: '#0e1117', border: '1px solid #1e2535', borderRadius: 12, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 14, color: '#e8eaf0' }}>{order.id}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      {order.email} · {new Date(order.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <label>
                    <span style={srOnlyStyle}>Estado del pedido {order.id}</span>
                    <select
                      value={order.status}
                      onChange={e => changeStatus(order.id, e.target.value as OrderStatus)}
                      style={{
                        fontSize: 12, fontWeight: 600, padding: '6px 10px', borderRadius: 999,
                        color: STATUS_COLOR[order.status], background: STATUS_COLOR[order.status] + '1a',
                        border: `1px solid ${STATUS_COLOR[order.status]}44`, cursor: 'pointer',
                      }}
                    >
                      {(['Confirmado', 'En preparación', 'Enviado', 'Entregado'] as OrderStatus[]).map(s => (
                        <option key={s} value={s} style={{ background: '#0e1117', color: '#e8eaf0' }}>{s}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                  {order.items.map((it, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9ca3af' }}>
                      <span>{it.qty}× {it.name}</span>
                      <span>${(it.price * it.qty).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid #1e2535' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#e8eaf0' }}>Total</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#00c8ff' }}>${order.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <>
          {/* Filtros del catálogo */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 20 }}>
            <div>
              <label style={labelStyle} htmlFor="admin-filter-category">Categoría</label>
              <select id="admin-filter-category" value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', minWidth: 160 }}>
                <option value="" style={{ background: '#0e1117' }}>Todas las categorías</option>
                {productCategories.map(c => <option key={c} value={c} style={{ background: '#0e1117' }}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle} htmlFor="admin-filter-brand">Marca</label>
              <select id="admin-filter-brand" value={filterBrand} onChange={e => setFilterBrand(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', minWidth: 160 }}>
                <option value="" style={{ background: '#0e1117' }}>Todas las marcas</option>
                {brands.map(b => <option key={b} value={b} style={{ background: '#0e1117' }}>{b}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={labelStyle} htmlFor="admin-filter-name">Buscar por nombre</label>
              <input id="admin-filter-name" value={filterName} onChange={e => setFilterName(e.target.value)} placeholder="Nombre del producto…" style={inputStyle} />
            </div>
            {hasProductFilters && (
              <button type="button" onClick={clearProductFilters} style={{ fontSize: 12, color: '#00c8ff', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: '9px 0' }}>
                Limpiar filtros
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '360px 1fr', gap: 28, alignItems: 'flex-start' }}>
            {/* Formulario de alta/edición */}
            <form onSubmit={submitProduct} style={{ background: '#0e1117', border: '1px solid #1e2535', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 16, color: '#e8eaf0' }}>
                {editingId != null ? 'Editar producto' : '+ Nuevo producto'}
              </div>
              <div>
                <label style={labelStyle} htmlFor="admin-name">Nombre</label>
                <input id="admin-name" style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre del producto" />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle} htmlFor="admin-price">Precio</label>
                  <input id="admin-price" style={inputStyle} type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle} htmlFor="admin-original-price">Precio anterior</label>
                  <input id="admin-original-price" style={inputStyle} type="number" value={form.originalPrice} onChange={e => setForm(f => ({ ...f, originalPrice: e.target.value }))} placeholder="Opcional" />
                </div>
              </div>
              <div>
                <label style={labelStyle} htmlFor="admin-category">Categoría</label>
                <input id="admin-category" style={inputStyle} list="admin-category-options" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Ej: Laptops & PCs" />
                <datalist id="admin-category-options">
                  {categories.map(c => <option key={c.label} value={c.label} />)}
                </datalist>
              </div>
              <div>
                <label style={labelStyle} htmlFor="admin-brand">Marca</label>
                <input id="admin-brand" style={inputStyle} list="admin-brand-options" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="Ej: Samsung" />
                <datalist id="admin-brand-options">
                  {brands.map(b => <option key={b} value={b} />)}
                </datalist>
              </div>
              <div>
                <label style={labelStyle} htmlFor="admin-badge">Insignia</label>
                <select id="admin-badge" style={{ ...inputStyle, cursor: 'pointer' }} value={form.badge} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))}>
                  <option value="" style={{ background: '#0e1117' }}>Sin insignia</option>
                  {['Nuevo', 'Oferta', 'Bestseller', 'Popular'].map(b => <option key={b} value={b} style={{ background: '#0e1117' }}>{b}</option>)}
                </select>
              </div>

              {/* Imágenes */}
              <div>
                <label style={labelStyle} htmlFor="admin-image-files">Imágenes del producto</label>
                <input
                  id="admin-image-files"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFilesSelected}
                  disabled={uploading}
                  style={{ ...inputStyle, padding: '7px 8px', cursor: uploading ? 'default' : 'pointer' }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <label htmlFor="admin-image-url" style={srOnlyStyle}>Agregar una imagen por URL</label>
                  <input
                    id="admin-image-url"
                    value={imageUrlInput}
                    onChange={e => setImageUrlInput(e.target.value)}
                    placeholder="…o pegá una URL de imagen"
                    style={{ ...inputStyle, flex: 1 }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addImageByUrl() } }}
                  />
                  <button type="button" onClick={addImageByUrl} style={{ background: '#161b27', border: '1px solid #1e2535', borderRadius: 8, color: '#9ca3af', fontSize: 12, padding: '0 14px', cursor: 'pointer', flexShrink: 0 }}>
                    Agregar
                  </button>
                </div>

                {uploading && <div style={{ fontSize: 11, color: '#00c8ff', marginTop: 8 }} role="status">Subiendo imágenes…</div>}

                <div style={{ fontSize: 11, color: '#6b7280', margin: '10px 0 6px' }}>
                  {images.length === 0 ? 'Todavía no agregaste ninguna imagen' : `${images.length} ${images.length === 1 ? 'imagen agregada' : 'imágenes agregadas'} — la primera es la principal`}
                </div>

                {images.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {images.map((img, i) => (
                      <div key={img.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#161b27', border: '1px solid #1e2535', borderRadius: 8, padding: 6 }}>
                        <img src={img.src} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0, background: '#0e1117' }} />
                        <div style={{ flex: 1, minWidth: 0, fontSize: 11, color: '#e8eaf0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {i === 0 && <span style={{ color: '#00c8ff', fontWeight: 700 }}>Principal · </span>}
                          {img.label}
                        </div>
                        <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} aria-label={`Subir ${img.label} en el orden`} style={{ width: 26, height: 26, background: 'none', border: '1px solid #1e2535', borderRadius: 6, color: i === 0 ? '#3a4356' : '#9ca3af', cursor: i === 0 ? 'default' : 'pointer', fontSize: 12, flexShrink: 0 }}>↑</button>
                        <button type="button" onClick={() => moveImage(i, 1)} disabled={i === images.length - 1} aria-label={`Bajar ${img.label} en el orden`} style={{ width: 26, height: 26, background: 'none', border: '1px solid #1e2535', borderRadius: 6, color: i === images.length - 1 ? '#3a4356' : '#9ca3af', cursor: i === images.length - 1 ? 'default' : 'pointer', fontSize: 12, flexShrink: 0 }}>↓</button>
                        <button type="button" onClick={() => removeImage(img.id)} aria-label={`Quitar ${img.label}`} style={{ width: 26, height: 26, background: 'none', border: '1px solid #1e2535', borderRadius: 6, color: '#ef4444', cursor: 'pointer', fontSize: 12, flexShrink: 0 }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle} htmlFor="admin-description">Descripción</label>
                <textarea id="admin-description" style={{ ...inputStyle, minHeight: 70, resize: 'vertical', fontFamily: 'Inter, sans-serif' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción del producto" />
              </div>
              {formError && <div style={{ fontSize: 12, color: '#ef4444', background: '#ef444411', border: '1px solid #ef444422', borderRadius: 6, padding: '8px 12px' }}>{formError}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" disabled={saving || uploading} style={{ flex: 1, background: 'linear-gradient(135deg,#00c8ff,#7c3aed)', border: 'none', borderRadius: 8, color: '#07090f', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 14, padding: '11px', cursor: saving || uploading ? 'default' : 'pointer', opacity: saving || uploading ? 0.7 : 1 }}>
                  {saving ? 'Guardando…' : editingId != null ? 'Guardar cambios' : 'Agregar producto'}
                </button>
                {editingId != null && (
                  <button type="button" onClick={cancelEdit} style={{ background: '#161b27', border: '1px solid #1e2535', borderRadius: 8, color: '#9ca3af', fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 14, padding: '11px 16px', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>

            {/* Listado de productos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280', fontSize: 13 }}>Ningún producto coincide con los filtros.</div>
              ) : filteredProducts.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#0e1117', border: '1px solid #1e2535', borderRadius: 12, padding: 12, flexWrap: 'wrap' }}>
                  <img src={p.image} alt={p.name} style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', background: '#161b27', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 13, color: '#e8eaf0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{p.brand ? `${p.brand} · ` : ''}{p.category} · ${p.price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                  </div>
                  <button onClick={() => startEdit(p)} style={{ background: '#161b27', border: '1px solid #1e2535', borderRadius: 6, color: '#9ca3af', fontSize: 12, padding: '7px 12px', cursor: 'pointer', flexShrink: 0 }}>
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    style={{
                      background: confirmDeleteId === p.id ? '#ef4444' : '#161b27',
                      border: `1px solid ${confirmDeleteId === p.id ? '#ef4444' : '#1e2535'}`,
                      borderRadius: 6, color: confirmDeleteId === p.id ? '#fff' : '#ef4444',
                      fontSize: 12, padding: '7px 12px', cursor: 'pointer', flexShrink: 0, fontWeight: confirmDeleteId === p.id ? 700 : 400,
                    }}
                  >
                    {confirmDeleteId === p.id ? '¿Confirmar?' : '🗑 Eliminar'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState<User>(null)
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [cart, setCart] = useState<Cart>(() => loadJSON(CART_KEY, {}))
  const [wishlist, setWishlist] = useState<number[]>(() => loadJSON(WISHLIST_KEY, []))
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState('')

  useEffect(() => saveJSON(CART_KEY, cart), [cart])
  useEffect(() => saveJSON(WISHLIST_KEY, wishlist), [wishlist])

  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showFavorites, setShowFavorites] = useState(false)
  const [ordersOpen, setOrdersOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'rating'>('default')
  const isMobile = useIsMobile()
  const productsRef = useRef<HTMLDivElement>(null)

  const refreshProducts = () => {
    setProductsError('')
    return fetchProducts()
      .then(setProducts)
      .catch(() => setProductsError('No pudimos cargar el catálogo. Revisá tu conexión e intentá de nuevo.'))
  }

  useEffect(() => {
    setProductsLoading(true)
    refreshProducts().finally(() => setProductsLoading(false))
  }, [])

  // Sesión: Supabase mantiene el estado de login. Cuando cambia (login,
  // logout, registro, o el link de "olvidé mi contraseña"), se sincroniza acá.
  useEffect(() => {
    let active = true

    const applyUser = async (authUser: { id: string; email?: string | null } | null | undefined) => {
      if (!authUser) {
        if (active) setUser(null)
        return
      }
      try {
        const profile = await fetchProfile(authUser.id)
        if (!active) return
        setUser({
          id: authUser.id,
          email: authUser.email ?? '',
          name: profile?.name || authUser.email || '',
          isAdmin: profile?.isAdmin ?? false,
        })
      } catch {
        if (active) setUser(null)
      }
    }

    supabase.auth.getSession().then(({ data }) => applyUser(data.session?.user))

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setResetPasswordOpen(true)
      applyUser(session?.user)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setAdminOpen(false)
    setSettingsOpen(false)
    setOrdersOpen(false)
  }

  const cartCount = Object.values(cart).reduce((s, q) => s + q, 0)

  const handleAddToCart = (id: number) => {
    setCart(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))
  }

  const handleUpdateQty = (id: number, delta: number) => {
    setCart(prev => {
      const next = (prev[id] ?? 0) + delta
      if (next <= 0) {
        const { [id]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [id]: next }
    })
  }

  const handleRemove = (id: number) => {
    setCart(prev => {
      const { [id]: _, ...rest } = prev
      return rest
    })
  }

  const scrollToProducts = () => {
    productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Tocar el logo, favoritos, categorías o el buscador desde el panel de
  // administración (o desde el detalle de un producto) te devuelve a la tienda.
  const exitFullScreenViews = () => {
    setSelectedProduct(null)
    setAdminOpen(false)
  }

  const goHome = () => {
    exitFullScreenViews()
    setActiveCategory(null)
    setSearchQuery('')
    setShowFavorites(false)
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50)
  }

  const filteredProducts = products.filter(p => {
    const matchCat = !activeCategory || p.category === activeCategory
    const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase())
    const matchFavorites = !showFavorites || wishlist.includes(p.id)
    const min = minPrice === '' ? -Infinity : Number(minPrice)
    const max = maxPrice === '' ? Infinity : Number(maxPrice)
    const matchPrice = p.price >= min && p.price <= max
    return matchCat && matchSearch && matchFavorites && matchPrice
  }).sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price
    if (sortBy === 'price-desc') return b.price - a.price
    if (sortBy === 'rating') return b.rating - a.rating
    return 0
  })

  const hasActiveFilters = !!(activeCategory || searchQuery || showFavorites || minPrice || maxPrice)

  // Categorías curadas (con ícono) + cualquier categoría nueva que el admin
  // haya cargado en un producto y todavía no tenga ícono asignado — así una
  // categoría nueva queda disponible en toda la tienda apenas se usa.
  const categoryList = [
    ...CATEGORIES,
    ...Array.from(new Set(products.map(p => p.category)))
      .filter(c => !CATEGORIES.some(cat => cat.label === c))
      .sort()
      .map(label => ({ label, icon: '🏷️' })),
  ]

  const handleCategorySelect = (c: string | null) => {
    exitFullScreenViews()
    setActiveCategory(c)
    setShowFavorites(false)
    setTimeout(scrollToProducts, 80)
  }

  const handleSearch = (q: string) => {
    setSearchQuery(q)
    if (q) {
      exitFullScreenViews()
      setTimeout(scrollToProducts, 80)
    }
  }

  const handleOpenFavorites = () => {
    exitFullScreenViews()
    setShowFavorites(true)
    setTimeout(scrollToProducts, 80)
  }

  const clearAllFilters = () => {
    setActiveCategory(null)
    setSearchQuery('')
    setShowFavorites(false)
    setMinPrice('')
    setMaxPrice('')
  }

  const cartOrderItems: OrderItem[] = Object.entries(cart)
    .map(([id, qty]) => {
      const p = products.find(x => x.id === Number(id))
      return p ? { id: p.id, name: p.name, qty, price: p.price } : null
    })
    .filter((x): x is OrderItem => x !== null)
  const cartTotal = cartOrderItems.reduce((sum, it) => sum + it.price * it.qty, 0)

  return (
    <div style={{ minHeight: '100vh', background: '#07090f', fontFamily: 'Inter, sans-serif' }}>
      <Navbar
        products={products}
        categories={categoryList}
        onOpenLogin={() => setLoginOpen(true)}
        user={user}
        onLogout={handleLogout}
        cartCount={cartCount}
        wishlistCount={wishlist.length}
        onSearch={handleSearch}
        onCategorySelect={handleCategorySelect}
        onOpenCart={() => setCartOpen(true)}
        onOpenFavorites={handleOpenFavorites}
        onOpenOrders={() => setOrdersOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenAdmin={() => setAdminOpen(true)}
        onGoHome={goHome}
      />

      {selectedProduct ? (
        <ProductDetail
          product={selectedProduct}
          inWishlist={wishlist.includes(selectedProduct.id)}
          onToggleWishlist={() => setWishlist(prev => prev.includes(selectedProduct.id) ? prev.filter(x => x !== selectedProduct.id) : [...prev, selectedProduct.id])}
          onAddToCart={() => handleAddToCart(selectedProduct.id)}
          onBack={() => { setSelectedProduct(null); setTimeout(() => window.scrollTo({ top: 0 }), 50) }}
          onGoHome={goHome}
          onCategoryClick={(cat) => { setSelectedProduct(null); setActiveCategory(cat); setShowFavorites(false); setTimeout(scrollToProducts, 80) }}
        />
      ) : adminOpen && user?.isAdmin ? (
        <AdminPanel products={products} categories={categoryList} onRefreshProducts={refreshProducts} onBack={() => setAdminOpen(false)} />
      ) : (
        <>
          <Carousel onCategoryFilter={(cat) => { setActiveCategory(cat); setTimeout(scrollToProducts, 80) }} />

          {/* Quick category pills */}
          <div style={{ padding: isMobile ? '20px 16px 0' : '28px 40px 0', display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none' }}>
            <button
              onClick={() => handleCategorySelect(null)}
              style={{
                flexShrink: 0, padding: '8px 18px', borderRadius: 999, fontSize: 13, fontWeight: 500,
                background: !activeCategory ? '#00c8ff' : '#0e1117',
                color: !activeCategory ? '#07090f' : '#9ca3af',
                border: `1px solid ${!activeCategory ? '#00c8ff' : '#1e2535'}`,
                cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Inter, sans-serif',
              }}
            >
              Todos
            </button>
            {categoryList.map(c => (
              <button
                key={c.label}
                onClick={() => handleCategorySelect(c.label)}
                style={{
                  flexShrink: 0, padding: '8px 18px', borderRadius: 999, fontSize: 13, fontWeight: 500,
                  background: activeCategory === c.label ? '#00c8ff' : '#0e1117',
                  color: activeCategory === c.label ? '#07090f' : '#9ca3af',
                  border: `1px solid ${activeCategory === c.label ? '#00c8ff' : '#1e2535'}`,
                  cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Inter, sans-serif',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <span>{c.icon}</span> {c.label}
              </button>
            ))}
          </div>

          {/* Price filter */}
          <div style={{ padding: isMobile ? '16px 16px 0' : '18px 40px 0', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Precio:</span>
            <input
              type="number"
              placeholder="Mín"
              aria-label="Precio mínimo"
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
              style={{
                width: 90, background: '#0e1117', border: '1px solid #1e2535', borderRadius: 8,
                color: '#e8eaf0', fontSize: 13, padding: '8px 10px', fontFamily: 'Inter, sans-serif',
              }}
            />
            <span style={{ color: '#4b5563' }}>—</span>
            <input
              type="number"
              placeholder="Máx"
              aria-label="Precio máximo"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              style={{
                width: 90, background: '#0e1117', border: '1px solid #1e2535', borderRadius: 8,
                color: '#e8eaf0', fontSize: 13, padding: '8px 10px', fontFamily: 'Inter, sans-serif',
              }}
            />
            {(minPrice || maxPrice) && (
              <button
                onClick={() => { setMinPrice(''); setMaxPrice('') }}
                style={{ fontSize: 12, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                ✕ quitar
              </button>
            )}
            {showFavorites && (
              <span style={{
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#a78bfa',
                background: '#7c3aed22', border: '1px solid #7c3aed44', borderRadius: 999, padding: '6px 12px',
              }}>
                ♥ Mostrando favoritos
                <span onClick={() => setShowFavorites(false)} style={{ cursor: 'pointer', fontWeight: 700 }}>✕</span>
              </span>
            )}
          </div>

          {/* Products section */}
          <div ref={productsRef} style={{ padding: isMobile ? '24px 16px 48px' : '32px 40px 64px' }}>
            <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'baseline', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: isMobile ? 20 : 26, color: '#e8eaf0', margin: 0 }}>
                  {showFavorites ? 'Tus favoritos' : activeCategory ?? (searchQuery ? `Resultados para "${searchQuery}"` : 'Todos los productos')}
                </h2>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
                  {filteredProducts.length} {filteredProducts.length === 1 ? 'producto' : 'productos'}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ position: 'relative' }}>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as typeof sortBy)}
                    aria-label="Ordenar productos"
                    style={{
                      background: '#0e1117', border: '1px solid #1e2535', borderRadius: 8,
                      color: '#e8eaf0', fontSize: 13, padding: '9px 32px 9px 12px',
                      fontFamily: 'Inter, sans-serif', cursor: 'pointer', appearance: 'none',
                    }}
                  >
                    <option value="default">Orden: Relevancia</option>
                    <option value="price-asc">Precio: menor a mayor</option>
                    <option value="price-desc">Precio: mayor a menor</option>
                    <option value="rating">Mejor calificados</option>
                  </select>
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#6b7280', pointerEvents: 'none' }}>▼</span>
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    style={{ fontSize: 12, color: '#00c8ff', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>

            {productsLoading ? (
              <div style={{ textAlign: 'center', padding: '80px 0', color: '#6b7280', fontSize: 14 }}>Cargando catálogo…</div>
            ) : productsError ? (
              <div style={{ textAlign: 'center', padding: '80px 0', color: '#ef4444', fontSize: 14 }}>{productsError}</div>
            ) : filteredProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0', color: '#6b7280' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 20, fontWeight: 600, color: '#4b5563' }}>Sin resultados</div>
                <div style={{ fontSize: 14, marginTop: 8 }}>Intenta con otra búsqueda o categoría</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
                {filteredProducts.map(p => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    inWishlist={wishlist.includes(p.id)}
                    onToggleWishlist={() => setWishlist(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])}
                    onAddToCart={() => handleAddToCart(p.id)}
                    onOpenDetail={() => setSelectedProduct(p)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ borderTop: '1px solid #1e2535', padding: isMobile ? '24px 16px' : '32px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 18, color: '#e8eaf0' }}>
              ⚡ Tecno<span style={{ color: '#00c8ff' }}>Shop</span>
            </div>
            <div style={{ fontSize: 12, color: '#4b5563' }}>© {new Date().getFullYear()} TecnoShop. Sitio de demostración — no se realizan cobros ni envíos reales.</div>
            <div style={{ display: 'flex', gap: 20, fontSize: 13, color: '#6b7280' }}>
              <a href="mailto:indaburufranco@gmail.com" style={{ color: 'inherit', textDecoration: 'none' }} onMouseEnter={e => (e.currentTarget.style.color = '#00c8ff')} onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}>Contacto</a>
            </div>
          </div>
        </>
      )}

      {loginOpen && (
        <LoginModal onClose={() => setLoginOpen(false)} />
      )}

      {resetPasswordOpen && (
        <ResetPasswordModal onClose={() => setResetPasswordOpen(false)} />
      )}

      {ordersOpen && user && (
        <OrdersPanel user={user} onClose={() => setOrdersOpen(false)} />
      )}

      {settingsOpen && user && (
        <SettingsModal
          user={user}
          onClose={() => setSettingsOpen(false)}
          onUserUpdate={setUser}
        />
      )}

      {cartOpen && (
        <CartPanel
          products={products}
          cart={cart}
          onClose={() => setCartOpen(false)}
          onUpdateQty={handleUpdateQty}
          onRemove={handleRemove}
          onCheckout={() => setCheckoutOpen(true)}
        />
      )}

      {checkoutOpen && (
        <CheckoutModal
          total={cartTotal}
          user={user}
          onClose={() => setCheckoutOpen(false)}
          onSubmitOrder={async (info) => {
            await createOrderRow({
              email: info.email,
              name: info.name,
              address: info.address,
              city: info.city,
              items: cartOrderItems,
              total: cartTotal,
              userId: user?.id,
            })
          }}
          onComplete={() => {
            setCart({})
            setCheckoutOpen(false)
            setCartOpen(false)
          }}
        />
      )}
    </div>
  )
}
