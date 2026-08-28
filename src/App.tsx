import { useState, useEffect, useRef } from 'react'

// ── Types ────────────────────────────────────────────────────────────────────

type User = { name: string; email: string; isAdmin: boolean } | null
type Cart = Record<number, number> // productId → quantity

interface Product {
  id: number
  name: string
  price: number
  originalPrice?: number
  category: string
  image: string
  badge?: string
  rating: number
  reviews: number
  images?: string[]
  description?: string
  specs?: { label: string; value: string }[]
}

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

const PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'MacBook Pro 14" M3',
    price: 1899.99,
    originalPrice: 2199.99,
    category: 'Laptops & PCs',
    image: 'https://images.unsplash.com/photo-1625490939776-17cef70ec079?w=400&h=300&fit=crop&auto=format',
    badge: 'Oferta',
    rating: 4.9,
    reviews: 342,
    images: [
      'https://images.unsplash.com/photo-1625490939776-17cef70ec079?w=800&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1530893609608-32a9af3aa95c?w=800&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1542351967-d5ae722fed71?w=800&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1737868131581-6379cdee4ec3?w=800&h=600&fit=crop&auto=format',
    ],
    description: 'El MacBook Pro de 14 pulgadas con chip M3 lleva el rendimiento a otro nivel. Pantalla Liquid Retina XDR, batería de hasta 18 horas y conectividad completa con Thunderbolt 4. Ideal para profesionales creativos, desarrolladores y diseñadores que necesitan lo mejor.',
    specs: [
      { label: 'Procesador', value: 'Apple M3 (8 núcleos CPU, 10 GPU)' },
      { label: 'Memoria RAM', value: '16 GB unificada' },
      { label: 'Almacenamiento', value: '512 GB SSD NVMe' },
      { label: 'Pantalla', value: '14.2" Liquid Retina XDR, 3024×1964, 120Hz' },
      { label: 'Batería', value: 'Hasta 18 horas' },
      { label: 'Sistema', value: 'macOS Sonoma' },
      { label: 'Peso', value: '1.55 kg' },
    ],
  },
  {
    id: 2,
    name: 'Samsung Galaxy S24 Ultra',
    price: 1149.00,
    category: 'Smartphones',
    image: 'https://images.unsplash.com/photo-1588091209794-8aa1768e2937?w=400&h=300&fit=crop&auto=format',
    badge: 'Nuevo',
    rating: 4.8,
    reviews: 218,
    images: [
      'https://images.unsplash.com/photo-1588091209794-8aa1768e2937?w=800&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1654555023156-0a1c9cdf1130?w=800&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1698338854513-14758e9b9b2c?w=800&h=600&fit=crop&auto=format',
    ],
    description: 'El smartphone más poderoso de Samsung. Con cámara de 200MP, S Pen integrado, procesador Snapdragon 8 Gen 3 y pantalla Dynamic AMOLED de 6.8". La experiencia definitiva en Android para quienes no aceptan compromisos.',
    specs: [
      { label: 'Procesador', value: 'Snapdragon 8 Gen 3' },
      { label: 'RAM', value: '12 GB' },
      { label: 'Almacenamiento', value: '256 GB' },
      { label: 'Pantalla', value: '6.8" Dynamic AMOLED, 3088×1440, 120Hz' },
      { label: 'Cámara principal', value: '200 MP, f/1.7, OIS' },
      { label: 'Batería', value: '5000 mAh, carga 45W' },
      { label: 'Sistema', value: 'Android 14 / One UI 6.1' },
    ],
  },
  {
    id: 3,
    name: 'Sony WH-1000XM5',
    price: 279.99,
    originalPrice: 349.99,
    category: 'Audio',
    image: 'https://images.unsplash.com/photo-1655156875398-d11323b4f5de?w=400&h=300&fit=crop&auto=format',
    badge: 'Bestseller',
    rating: 4.7,
    reviews: 891,
    images: [
      'https://images.unsplash.com/photo-1655156875398-d11323b4f5de?w=800&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1698338854513-14758e9b9b2c?w=800&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1542351967-d5ae722fed71?w=800&h=600&fit=crop&auto=format',
    ],
    description: 'Cancelación de ruido líder de la industria. Los WH-1000XM5 de Sony combinan ocho micrófonos, dos procesadores y el motor QN2e para eliminar el ruido exterior de forma excepcional. Sonido Hi-Res Audio con LDAC y autonomía de 30 horas.',
    specs: [
      { label: 'Cancelación de ruido', value: 'Adaptativa con 8 micrófonos' },
      { label: 'Autonomía', value: '30 horas (ANC activado)' },
      { label: 'Carga rápida', value: '3 min = 3 horas de uso' },
      { label: 'Conectividad', value: 'Bluetooth 5.2, NFC, Jack 3.5mm' },
      { label: 'Códecs', value: 'LDAC, AAC, SBC' },
      { label: 'Peso', value: '250 g' },
    ],
  },
  {
    id: 4,
    name: 'ASUS ROG Zephyrus G16',
    price: 2249.00,
    category: 'Gaming',
    image: 'https://images.unsplash.com/photo-1530893609608-32a9af3aa95c?w=400&h=300&fit=crop&auto=format',
    rating: 4.6,
    reviews: 127,
    images: [
      'https://images.unsplash.com/photo-1530893609608-32a9af3aa95c?w=800&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1625490939776-17cef70ec079?w=800&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1654555023156-0a1c9cdf1130?w=800&h=600&fit=crop&auto=format',
    ],
    description: 'La laptop gaming definitiva para competir sin concesiones. El ASUS ROG Zephyrus G16 integra RTX 4080, panel ROG Nebula Display QHD 240Hz y refrigeración líquida avanzada en un chasis de apenas 1.85 kg. Domina cualquier juego.',
    specs: [
      { label: 'Procesador', value: 'Intel Core i9-14900HX' },
      { label: 'GPU', value: 'NVIDIA RTX 4080 12GB GDDR6' },
      { label: 'RAM', value: '32 GB DDR5 4800MHz' },
      { label: 'Almacenamiento', value: '1 TB SSD PCIe 4.0' },
      { label: 'Pantalla', value: '16" QHD+ 240Hz, ROG Nebula Display' },
      { label: 'Sistema', value: 'Windows 11 Pro' },
      { label: 'Peso', value: '1.85 kg' },
    ],
  },
  {
    id: 5,
    name: 'Dell XPS 15 OLED',
    price: 1749.99,
    originalPrice: 1999.00,
    category: 'Laptops & PCs',
    image: 'https://images.unsplash.com/photo-1737868131581-6379cdee4ec3?w=400&h=300&fit=crop&auto=format',
    badge: 'Oferta',
    rating: 4.5,
    reviews: 203,
    images: [
      'https://images.unsplash.com/photo-1737868131581-6379cdee4ec3?w=800&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1542351967-d5ae722fed71?w=800&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1530893609608-32a9af3aa95c?w=800&h=600&fit=crop&auto=format',
    ],
    description: 'La elegancia hecha laptop. El Dell XPS 15 OLED ofrece una pantalla impresionante de 15.6" con colores perfectos y contraste infinito, junto con el rendimiento de Core i7 de 13ª gen. Diseñado para creadores que valoran tanto la estética como el poder.',
    specs: [
      { label: 'Procesador', value: 'Intel Core i7-13700H' },
      { label: 'GPU', value: 'NVIDIA RTX 4060 8GB' },
      { label: 'RAM', value: '16 GB DDR5' },
      { label: 'Almacenamiento', value: '512 GB SSD NVMe' },
      { label: 'Pantalla', value: '15.6" OLED 3.5K, 60Hz, 100% DCI-P3' },
      { label: 'Batería', value: 'Hasta 13 horas' },
      { label: 'Peso', value: '1.86 kg' },
    ],
  },
  {
    id: 6,
    name: 'iPad Pro 13" M4',
    price: 1099.00,
    category: 'Smartphones',
    image: 'https://images.unsplash.com/photo-1698338854513-14758e9b9b2c?w=400&h=300&fit=crop&auto=format',
    badge: 'Nuevo',
    rating: 4.9,
    reviews: 456,
    images: [
      'https://images.unsplash.com/photo-1698338854513-14758e9b9b2c?w=800&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1588091209794-8aa1768e2937?w=800&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1654555023156-0a1c9cdf1130?w=800&h=600&fit=crop&auto=format',
    ],
    description: 'El iPad Pro M4 redefine lo que puede hacer una tablet. Con la pantalla Ultra Retina XDR más delgada del mundo, chip M4 de nivel computadora y compatibilidad con Apple Pencil Pro, es la herramienta definitiva para creativos y profesionales.',
    specs: [
      { label: 'Procesador', value: 'Apple M4 (10 núcleos CPU)' },
      { label: 'Pantalla', value: '13" Ultra Retina XDR OLED, 2752×2064' },
      { label: 'Almacenamiento', value: '256 GB' },
      { label: 'Cámara', value: '12 MP gran angular + TrueDepth frontal 12 MP' },
      { label: 'Conectividad', value: 'Wi-Fi 6E, Bluetooth 5.3, USB-C' },
      { label: 'Batería', value: 'Hasta 10 horas' },
    ],
  },
  {
    id: 7,
    name: 'LG OLED C4 55"',
    price: 1299.00,
    originalPrice: 1599.00,
    category: 'Televisores',
    image: 'https://images.unsplash.com/photo-1783700776216-cf661c778151?w=400&h=300&fit=crop&auto=format',
    badge: 'Oferta',
    rating: 4.8,
    reviews: 312,
    images: [
      'https://images.unsplash.com/photo-1783700776216-cf661c778151?w=800&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1698338854513-14758e9b9b2c?w=800&h=600&fit=crop&auto=format',
    ],
    description: 'Negro perfecto, colores infinitos. El LG OLED C4 incorpora el procesador α9 Gen7 con IA, compatible con Dolby Vision, HDR10 y Dolby Atmos. Ideal para cinéfilos y gamers que quieren la mejor experiencia visual en casa.',
    specs: [
      { label: 'Panel', value: 'OLED evo 4K, 120Hz' },
      { label: 'Procesador', value: 'α9 Gen7 AI' },
      { label: 'HDR', value: 'Dolby Vision, HDR10, HLG' },
      { label: 'Gaming', value: 'HDMI 2.1, G-Sync, FreeSync, 0.1ms' },
      { label: 'Smart TV', value: 'webOS 24' },
      { label: 'Audio', value: '60W, Dolby Atmos, AI Sound Pro' },
    ],
  },
  {
    id: 8,
    name: 'Sony A7 IV Mirrorless',
    price: 2499.00,
    category: 'Cámaras',
    image: 'https://images.unsplash.com/photo-1530893609608-32a9af3aa95c?w=400&h=300&fit=crop&auto=format',
    rating: 4.7,
    reviews: 89,
    images: [
      'https://images.unsplash.com/photo-1530893609608-32a9af3aa95c?w=800&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1625490939776-17cef70ec079?w=800&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1542351967-d5ae722fed71?w=800&h=600&fit=crop&auto=format',
    ],
    description: 'La cámara híbrida de referencia para fotógrafos y videomakers profesionales. Sensor BSI CMOS de 33MP, ráfaga de 10fps, video 4K 60fps y sistema de enfoque con IA. El equilibrio perfecto entre rendimiento y versatilidad.',
    specs: [
      { label: 'Sensor', value: 'BSI CMOS Full-Frame 33 MP' },
      { label: 'ISO', value: '100-51.200 (ampliable a 204.800)' },
      { label: 'Video', value: '4K 60fps, 10 bits, S-Log3' },
      { label: 'Ráfaga', value: '10 fps mecánica, 15 fps electrónica' },
      { label: 'Enfoque', value: 'Fase/Contraste 759 puntos, AI' },
      { label: 'Batería', value: 'NP-FZ100, aprox. 520 disparos' },
    ],
  },
  {
    id: 9,
    name: 'Logitech MX Master 3S',
    price: 99.99,
    originalPrice: 119.99,
    category: 'Accesorios',
    image: 'https://images.unsplash.com/photo-1542351967-d5ae722fed71?w=400&h=300&fit=crop&auto=format',
    badge: 'Popular',
    rating: 4.8,
    reviews: 1204,
    images: [
      'https://images.unsplash.com/photo-1542351967-d5ae722fed71?w=800&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1655156875398-d11323b4f5de?w=800&h=600&fit=crop&auto=format',
    ],
    description: 'El mouse más avanzado para trabajar con precisión. Sensor MagSpeed electromagnético ultrasilencioso, rueda de desplazamiento adaptativa, hasta 3 dispositivos simultáneos y batería de hasta 70 días. Diseñado para el trabajo intensivo.',
    specs: [
      { label: 'Sensor', value: 'MagSpeed óptico 8000 DPI' },
      { label: 'Botones', value: '7 botones programables' },
      { label: 'Conexión', value: 'Bluetooth, Logi Bolt USB' },
      { label: 'Dispositivos', value: 'Hasta 3 simultáneos (Easy-Switch)' },
      { label: 'Batería', value: 'Hasta 70 días, carga USB-C' },
      { label: 'Compatibilidad', value: 'Windows, macOS, Linux, iPadOS' },
    ],
  },
  {
    id: 10,
    name: 'Apple HomePod mini',
    price: 99.00,
    category: 'Smart Home',
    image: 'https://images.unsplash.com/photo-1625490939776-17cef70ec079?w=400&h=300&fit=crop&auto=format',
    rating: 4.4,
    reviews: 567,
    images: [
      'https://images.unsplash.com/photo-1625490939776-17cef70ec079?w=800&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1654555023156-0a1c9cdf1130?w=800&h=600&fit=crop&auto=format',
    ],
    description: 'Gran sonido en tamaño compacto. El HomePod mini llena cualquier habitación con audio de 360° de alta calidad. Con Siri integrado, domótica HomeKit y la capacidad de crear un sistema estéreo con dos unidades. Simplemente enchufa y disfruta.',
    specs: [
      { label: 'Chip', value: 'Apple S5' },
      { label: 'Audio', value: '360° con guía acústica, full range + pasivos' },
      { label: 'Conectividad', value: 'Wi-Fi 802.11n, Bluetooth 5.0, Thread' },
      { label: 'Asistente', value: 'Siri' },
      { label: 'Alimentación', value: 'Cable USB-C (incluido)' },
      { label: 'Dimensiones', value: '84.3 mm alto × 97.9 mm diámetro' },
    ],
  },
  {
    id: 11,
    name: 'Razer BlackWidow V4',
    price: 159.99,
    originalPrice: 189.99,
    category: 'Gaming',
    image: 'https://images.unsplash.com/photo-1654555023156-0a1c9cdf1130?w=400&h=300&fit=crop&auto=format',
    badge: 'Oferta',
    rating: 4.6,
    reviews: 445,
    images: [
      'https://images.unsplash.com/photo-1654555023156-0a1c9cdf1130?w=800&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1542351967-d5ae722fed71?w=800&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1530893609608-32a9af3aa95c?w=800&h=600&fit=crop&auto=format',
    ],
    description: 'El teclado mecánico de los campeones. Switches Razer Yellow de actuación lineal ultrarrápida, iluminación Chroma RGB por tecla y construido para aguantar 80 millones de pulsaciones. Control multimedia dedicado y reposamuñecas magnético incluido.',
    specs: [
      { label: 'Switches', value: 'Razer Yellow (lineal, 1.2mm actuación)' },
      { label: 'Durabilidad', value: '80 millones de pulsaciones' },
      { label: 'Iluminación', value: 'Chroma RGB por tecla' },
      { label: 'Conexión', value: 'USB-A trenzado desmontable' },
      { label: 'Extras', value: 'Rueda multimedia, reposamuñecas magnético' },
      { label: 'Peso', value: '1.27 kg' },
    ],
  },
  {
    id: 12,
    name: 'Google Pixel 8 Pro',
    price: 899.00,
    category: 'Smartphones',
    image: 'https://images.unsplash.com/photo-1588091209794-8aa1768e2937?w=400&h=300&fit=crop&auto=format',
    rating: 4.5,
    reviews: 178,
    images: [
      'https://images.unsplash.com/photo-1588091209794-8aa1768e2937?w=800&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1698338854513-14758e9b9b2c?w=800&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1654555023156-0a1c9cdf1130?w=800&h=600&fit=crop&auto=format',
    ],
    description: 'El smartphone de Google más inteligente hasta la fecha. Chip Tensor G3 diseñado por Google para IA en dispositivo, cámara de 50MP con Zoom Telescópico 5x y 7 años garantizados de actualizaciones. La mejor experiencia Android pura.',
    specs: [
      { label: 'Procesador', value: 'Google Tensor G3' },
      { label: 'RAM', value: '12 GB' },
      { label: 'Almacenamiento', value: '128 GB' },
      { label: 'Pantalla', value: '6.7" LTPO OLED, 2992×1344, 1-120Hz' },
      { label: 'Cámara', value: '50MP + 48MP ultrawide + 48MP telescópico 5x' },
      { label: 'Batería', value: '5050 mAh, carga 30W' },
      { label: 'Actualizaciones', value: '7 años OS + seguridad' },
    ],
  },
]

// ── User store (persistido en localStorage del navegador) ─────────────────────
export interface StoredUser {
  password: string
  name: string
  isAdmin: boolean
  address?: string
  phone?: string
}

const USERS_KEY = 'tecnostore_users'

function loadUsers(): Record<string, StoredUser> {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // localStorage no disponible o datos corruptos — se recrea desde cero
  }
  const seed: Record<string, StoredUser> = {
    '4dmi1n@tecnoshop.com': { password: '4dm1n03', name: 'Administrador', isAdmin: true },
    'juan@mail.com': { password: '1234', name: 'Juan García', isAdmin: false },
  }
  saveUsers(seed)
  return seed
}

function saveUsers(users: Record<string, StoredUser>) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
  } catch {
    // si falla el guardado (modo privado, cuota llena, etc.) seguimos sin persistencia
  }
}

// ── Orders store ────────────────────────────────────────────────────────────────
export type OrderStatus = 'Confirmado' | 'En preparación' | 'Enviado' | 'Entregado'

export interface Order {
  id: string
  date: string
  status: OrderStatus
  items: { name: string; qty: number; price: number }[]
  total: number
}

const ORDERS_KEY = 'tecnostore_orders'

function loadOrders(email: string): Order[] {
  try {
    const raw = localStorage.getItem(ORDERS_KEY)
    const all: Record<string, Order[]> = raw ? JSON.parse(raw) : {}
    return all[email.toLowerCase()] ?? []
  } catch {
    return []
  }
}

function addOrder(email: string, order: Order) {
  try {
    const raw = localStorage.getItem(ORDERS_KEY)
    const all: Record<string, Order[]> = raw ? JSON.parse(raw) : {}
    const key = email.toLowerCase()
    all[key] = [order, ...(all[key] ?? [])]
    localStorage.setItem(ORDERS_KEY, JSON.stringify(all))
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
  onOpenLogin,
  user,
  onLogout,
  cartCount,
  wishlistCount,
  onSearch,
  onCategorySelect,
  onOpenCart,
  onOpenFavorites,
}: {
  onOpenLogin: () => void
  user: User
  onLogout: () => void
  cartCount: number
  wishlistCount: number
  onSearch: (q: string) => void
  onCategorySelect: (c: string | null) => void
  onOpenCart: () => void
  onOpenFavorites: () => void
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
    ? PRODUCTS.filter(p => p.name.toLowerCase().includes(searchVal.toLowerCase())).slice(0, 5)
    : []

  const selectSuggestion = (name: string) => {
    setSearchVal(name)
    onSearch(name)
    setShowSuggestions(false)
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
      {/* Logo */}
      <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: isMobile ? 18 : 22, letterSpacing: -0.5, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, cursor: 'pointer' }}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <span style={{ background: 'linear-gradient(135deg,#00c8ff,#7c3aed)', borderRadius: 6, padding: '2px 6px', fontSize: isMobile ? 15 : 18 }}>⚡</span>
        {!isMobile && <span style={{ color: '#e8eaf0' }}>Tecno<span style={{ color: '#00c8ff' }}>Store</span></span>}
      </div>

      {/* Categories dropdown */}
      <div ref={catRef} style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setCatOpen(p => !p)}
          title="Categorías"
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
            {CATEGORIES.map(c => (
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
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#6b7280', pointerEvents: 'none' }}>🔍</span>
                <input
                  autoFocus
                  value={searchVal}
                  onChange={e => { setSearchVal(e.target.value); onSearch(e.target.value) }}
                  placeholder="Buscar productos..."
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
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#6b7280', pointerEvents: 'none' }}>🔍</span>
          <input
            value={searchVal}
            onChange={e => { setSearchVal(e.target.value); onSearch(e.target.value) }}
            placeholder="Buscar productos, marcas, categorías..."
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
              { icon: '📦', label: 'Mis pedidos' },
              { icon: '⚙️', label: 'Configuración' },
              ...(user.isAdmin ? [{ icon: '🛠️', label: 'Administrar productos' }] : []),
            ].map(item => (
              <div key={item.label} onClick={item.onClick}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 4px', cursor: item.onClick ? 'pointer' : 'default', fontSize: 13, color: '#e8eaf0', borderRadius: 6 }}
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

      {/* Favorites */}
      <button
        onClick={onOpenFavorites}
        title="Favoritos"
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
        {/* Wishlist */}
        <button
          onClick={onToggleWishlist}
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
                  style={{
                    flex: 1, height: isMobile ? 60 : 80, padding: 0, border: `2px solid ${i === activeImg ? '#00c8ff' : '#1e2535'}`,
                    borderRadius: 10, overflow: 'hidden', cursor: 'pointer', background: '#161b27',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <img src={img} alt={`Vista ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
  cart,
  onClose,
  onUpdateQty,
  onRemove,
  onCheckout,
}: {
  cart: Cart
  onClose: () => void
  onUpdateQty: (id: number, delta: number) => void
  onRemove: (id: number) => void
  onCheckout: () => void
}) {
  const items = Object.entries(cart)
    .map(([id, qty]) => ({ product: PRODUCTS.find(p => p.id === Number(id))!, qty }))
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
          <button onClick={onClose} style={{ background: '#161b27', border: '1px solid #1e2535', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', color: '#6b7280', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
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
                      style={{ width: 30, height: 30, background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
                    >−</button>
                    <span style={{ minWidth: 28, textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#e8eaf0', fontFamily: 'Outfit, sans-serif' }}>{qty}</span>
                    <button
                      onClick={() => onUpdateQty(product.id, 1)}
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

// ── Checkout Modal ───────────────────────────────────────────────────────────
function CheckoutModal({
  total,
  onClose,
  onComplete,
}: {
  total: number
  onClose: () => void
  onComplete: () => void
}) {
  const [step, setStep] = useState<'form' | 'processing' | 'done'>('form')
  const [form, setForm] = useState({
    name: '', email: '', address: '', city: '',
    cardNumber: '', cardExpiry: '', cardCvv: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setStep('processing')
    // Simulación de pago — no se procesa ningún cobro real
    setTimeout(() => setStep('done'), 1500)
  }

  const inputStyle = (field: string): React.CSSProperties => ({
    width: '100%', background: '#0e1117', border: `1px solid ${errors[field] ? '#ef4444' : '#1e2535'}`,
    borderRadius: 8, color: '#e8eaf0', fontSize: 13, padding: '10px 12px',
    fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
  })

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
                <button type="button" onClick={onClose} style={{ background: '#161b27', border: '1px solid #1e2535', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#6b7280' }}>✕</button>
              )}
            </div>

            <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, fontWeight: 600 }}>Datos de envío</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              <div>
                <input placeholder="Nombre completo" value={form.name} onChange={update('name')} style={inputStyle('name')} disabled={step === 'processing'} />
                {errors.name && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{errors.name}</div>}
              </div>
              <div>
                <input placeholder="Email" value={form.email} onChange={update('email')} style={inputStyle('email')} disabled={step === 'processing'} />
                {errors.email && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{errors.email}</div>}
              </div>
              <div>
                <input placeholder="Dirección" value={form.address} onChange={update('address')} style={inputStyle('address')} disabled={step === 'processing'} />
                {errors.address && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{errors.address}</div>}
              </div>
              <div>
                <input placeholder="Ciudad" value={form.city} onChange={update('city')} style={inputStyle('city')} disabled={step === 'processing'} />
                {errors.city && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{errors.city}</div>}
              </div>
            </div>

            <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, fontWeight: 600 }}>Pago</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
              <div>
                <input placeholder="Número de tarjeta" value={form.cardNumber} onChange={update('cardNumber')} style={inputStyle('cardNumber')} disabled={step === 'processing'} />
                {errors.cardNumber && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{errors.cardNumber}</div>}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <input placeholder="MM/AA" value={form.cardExpiry} onChange={update('cardExpiry')} style={inputStyle('cardExpiry')} disabled={step === 'processing'} />
                  {errors.cardExpiry && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{errors.cardExpiry}</div>}
                </div>
                <div style={{ flex: 1 }}>
                  <input placeholder="CVV" value={form.cardCvv} onChange={update('cardCvv')} style={inputStyle('cardCvv')} disabled={step === 'processing'} />
                  {errors.cardCvv && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{errors.cardCvv}</div>}
                </div>
              </div>
            </div>

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
function LoginModal({ onClose, onLogin }: { onClose: () => void; onLogin: (u: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')

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

  // Forgot password state
  const [fpEmail, setFpEmail] = useState('')
  const [fpPassword, setFpPassword] = useState('')
  const [fpPassword2, setFpPassword2] = useState('')
  const [fpError, setFpError] = useState('')
  const [fpDone, setFpDone] = useState(false)

  const switchMode = (m: typeof mode) => {
    setMode(m)
    setError(''); setRegError(''); setFpError(''); setFpDone(false)
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    const users = loadUsers()
    const found = users[email.toLowerCase()]
    if (found && found.password === password) {
      onLogin({ name: found.name, email: email.toLowerCase(), isAdmin: found.isAdmin })
      onClose()
    } else {
      setError('Email o contraseña incorrectos')
    }
  }

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    const key = regEmail.toLowerCase().trim()
    if (!regName.trim()) return setRegError('Ingresá tu nombre')
    if (!/^\S+@\S+\.\S+$/.test(key)) return setRegError('Email inválido')
    if (regPassword.length < 4) return setRegError('La contraseña debe tener al menos 4 caracteres')
    if (regPassword !== regPassword2) return setRegError('Las contraseñas no coinciden')

    const users = loadUsers()
    if (users[key]) return setRegError('Ya existe una cuenta con ese email')

    users[key] = { password: regPassword, name: regName.trim(), isAdmin: false }
    saveUsers(users)
    onLogin({ name: regName.trim(), email: key, isAdmin: false })
    onClose()
  }

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault()
    const key = fpEmail.toLowerCase().trim()
    const users = loadUsers()
    if (!users[key]) return setFpError('No existe ninguna cuenta con ese email')
    if (fpPassword.length < 4) return setFpError('La contraseña debe tener al menos 4 caracteres')
    if (fpPassword !== fpPassword2) return setFpError('Las contraseñas no coinciden')

    users[key] = { ...users[key], password: fpPassword }
    saveUsers(users)
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
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 18 }}>✕</button>

        {mode === 'login' && (
          <>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 24, color: '#e8eaf0', marginBottom: 6 }}>Iniciar sesión</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 28 }}>Accedé a tu cuenta de TecnoStore</div>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }} placeholder="tu@email.com" required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Contraseña</label>
                <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError('') }} placeholder="••••••••" required style={inputStyle} />
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
              <button type="submit" style={{ background: 'linear-gradient(135deg,#00c8ff,#7c3aed)', border: 'none', borderRadius: 8, color: '#fff', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, padding: '12px', cursor: 'pointer', marginTop: 4 }}>
                Ingresar
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
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 28 }}>Registrate para comprar en TecnoStore</div>
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Nombre</label>
                <input value={regName} onChange={e => { setRegName(e.target.value); setRegError('') }} placeholder="Tu nombre" required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={regEmail} onChange={e => { setRegEmail(e.target.value); setRegError('') }} placeholder="tu@email.com" required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Contraseña</label>
                <input type="password" value={regPassword} onChange={e => { setRegPassword(e.target.value); setRegError('') }} placeholder="••••••••" required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Repetir contraseña</label>
                <input type="password" value={regPassword2} onChange={e => { setRegPassword2(e.target.value); setRegError('') }} placeholder="••••••••" required style={inputStyle} />
              </div>
              {regError && <div style={{ fontSize: 12, color: '#ef4444', background: '#ef444411', border: '1px solid #ef444422', borderRadius: 6, padding: '8px 12px' }}>{regError}</div>}
              <button type="submit" style={{ background: 'linear-gradient(135deg,#00c8ff,#7c3aed)', border: 'none', borderRadius: 8, color: '#fff', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, padding: '12px', cursor: 'pointer', marginTop: 4 }}>
                Crear cuenta
              </button>
            </form>
            <div style={{ marginTop: 20, fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
              ¿Ya tenés cuenta?{' '}
              <span onClick={() => switchMode('login')} style={{ color: '#00c8ff', cursor: 'pointer', textDecoration: 'underline' }}>
                Iniciá sesión
              </span>
            </div>
          </>
        )}

        {mode === 'forgot' && (
          <>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 24, color: '#e8eaf0', marginBottom: 6 }}>Recuperar contraseña</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 28 }}>
              {fpDone ? 'Tu contraseña fue actualizada.' : 'Ingresá tu email y elegí una nueva contraseña'}
            </div>
            {fpDone ? (
              <button onClick={() => switchMode('login')} style={{ width: '100%', background: 'linear-gradient(135deg,#00c8ff,#7c3aed)', border: 'none', borderRadius: 8, color: '#fff', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, padding: '12px', cursor: 'pointer' }}>
                Iniciar sesión
              </button>
            ) : (
              <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input type="email" value={fpEmail} onChange={e => { setFpEmail(e.target.value); setFpError('') }} placeholder="tu@email.com" required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Nueva contraseña</label>
                  <input type="password" value={fpPassword} onChange={e => { setFpPassword(e.target.value); setFpError('') }} placeholder="••••••••" required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Repetir nueva contraseña</label>
                  <input type="password" value={fpPassword2} onChange={e => { setFpPassword2(e.target.value); setFpError('') }} placeholder="••••••••" required style={inputStyle} />
                </div>
                {fpError && <div style={{ fontSize: 12, color: '#ef4444', background: '#ef444411', border: '1px solid #ef444422', borderRadius: 6, padding: '8px 12px' }}>{fpError}</div>}
                <button type="submit" style={{ background: 'linear-gradient(135deg,#00c8ff,#7c3aed)', border: 'none', borderRadius: 8, color: '#fff', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, padding: '12px', cursor: 'pointer', marginTop: 4 }}>
                  Actualizar contraseña
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

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState<User>(null)
  const [loginOpen, setLoginOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [cart, setCart] = useState<Cart>({})
  const [wishlist, setWishlist] = useState<number[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showFavorites, setShowFavorites] = useState(false)
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'rating'>('default')
  const isMobile = useIsMobile()
  const productsRef = useRef<HTMLDivElement>(null)

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

  const filteredProducts = PRODUCTS.filter(p => {
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

  const handleCategorySelect = (c: string | null) => {
    setActiveCategory(c)
    setShowFavorites(false)
    setTimeout(scrollToProducts, 80)
  }

  const handleSearch = (q: string) => {
    setSearchQuery(q)
    if (q) setTimeout(scrollToProducts, 80)
  }

  const handleOpenFavorites = () => {
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

  return (
    <div style={{ minHeight: '100vh', background: '#07090f', fontFamily: 'Inter, sans-serif' }}>
      <Navbar
        onOpenLogin={() => setLoginOpen(true)}
        user={user}
        onLogout={() => setUser(null)}
        cartCount={cartCount}
        wishlistCount={wishlist.length}
        onSearch={handleSearch}
        onCategorySelect={handleCategorySelect}
        onOpenCart={() => setCartOpen(true)}
        onOpenFavorites={handleOpenFavorites}
      />

      {selectedProduct ? (
        <ProductDetail
          product={selectedProduct}
          inWishlist={wishlist.includes(selectedProduct.id)}
          onToggleWishlist={() => setWishlist(prev => prev.includes(selectedProduct.id) ? prev.filter(x => x !== selectedProduct.id) : [...prev, selectedProduct.id])}
          onAddToCart={() => handleAddToCart(selectedProduct.id)}
          onBack={() => { setSelectedProduct(null); setTimeout(() => window.scrollTo({ top: 0 }), 50) }}
          onGoHome={() => { setSelectedProduct(null); setActiveCategory(null); setShowFavorites(false); setTimeout(() => window.scrollTo({ top: 0 }), 50) }}
          onCategoryClick={(cat) => { setSelectedProduct(null); setActiveCategory(cat); setShowFavorites(false); setTimeout(scrollToProducts, 80) }}
        />
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
            {CATEGORIES.map(c => (
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

            {filteredProducts.length === 0 ? (
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
              ⚡ Tecno<span style={{ color: '#00c8ff' }}>Store</span>
            </div>
            <div style={{ fontSize: 12, color: '#4b5563' }}>© 2026 TecnoStore. Todos los derechos reservados.</div>
            <div style={{ display: 'flex', gap: 20, fontSize: 13, color: '#6b7280' }}>
              {['Términos', 'Privacidad', 'Contacto'].map(l => (
                <span key={l} style={{ cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.color = '#00c8ff')} onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}>{l}</span>
              ))}
            </div>
          </div>
        </>
      )}

      {loginOpen && (
        <LoginModal onClose={() => setLoginOpen(false)} onLogin={setUser} />
      )}

      {cartOpen && (
        <CartPanel
          cart={cart}
          onClose={() => setCartOpen(false)}
          onUpdateQty={handleUpdateQty}
          onRemove={handleRemove}
          onCheckout={() => setCheckoutOpen(true)}
        />
      )}

      {checkoutOpen && (
        <CheckoutModal
          total={Object.entries(cart).reduce((sum, [id, qty]) => {
            const p = PRODUCTS.find(x => x.id === Number(id))
            return sum + (p ? p.price * qty : 0)
          }, 0)}
          onClose={() => setCheckoutOpen(false)}
          onComplete={() => {
            if (user) {
              const items = Object.entries(cart)
                .map(([id, qty]) => {
                  const p = PRODUCTS.find(x => x.id === Number(id))
                  return p ? { name: p.name, qty, price: p.price } : null
                })
                .filter((x): x is { name: string; qty: number; price: number } => x !== null)
              const total = items.reduce((sum, it) => sum + it.price * it.qty, 0)
              addOrder(user.email, {
                id: `ORD-${Date.now().toString(36).toUpperCase()}`,
                date: new Date().toISOString(),
                status: 'Confirmado',
                items,
                total,
              })
            }
            setCart({})
            setCheckoutOpen(false)
            setCartOpen(false)
          }}
        />
      )}
    </div>
  )
}
