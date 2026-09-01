import { supabase } from './supabase'

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface ProductSpec {
  label: string
  value: string
}

export interface Product {
  id: number
  name: string
  price: number
  originalPrice?: number
  category: string
  brand?: string
  image: string
  images?: string[]
  badge?: string
  rating: number
  reviews: number
  description?: string
  specs?: ProductSpec[]
}

export type OrderStatus = 'Confirmado' | 'En preparación' | 'Enviado' | 'Entregado'

export interface OrderItem {
  name: string
  qty: number
  price: number
}

export interface Order {
  id: string
  date: string
  status: OrderStatus
  items: OrderItem[]
  total: number
}

export interface OrderWithEmail extends Order {
  email: string
}

export interface Profile {
  name: string
  isAdmin: boolean
  address?: string
  phone?: string
}

// ── Helpers de mapeo (fila de la base → tipos de la app) ──────────────────────

function rowToProduct(row: any): Product {
  const images: string[] = row.images ?? []
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    originalPrice: row.original_price != null ? Number(row.original_price) : undefined,
    category: row.category,
    brand: row.brand ?? undefined,
    image: images[0] ?? '',
    images: images.length ? images : undefined,
    badge: row.badge ?? undefined,
    rating: Number(row.rating),
    reviews: row.reviews,
    description: row.description ?? undefined,
    specs: row.specs && row.specs.length ? row.specs : undefined,
  }
}

function rowToOrder(row: any): OrderWithEmail {
  return {
    id: row.id,
    date: row.created_at,
    status: row.status,
    items: row.items,
    total: Number(row.total),
    email: row.email,
  }
}

// ── Productos ────────────────────────────────────────────────────────────────

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select('*').order('id')
  if (error) throw error
  return (data ?? []).map(rowToProduct)
}

export interface ProductInput {
  name: string
  price: number
  originalPrice?: number
  category: string
  brand?: string
  badge?: string
  description?: string
  images: string[]
}

export async function insertProduct(input: ProductInput): Promise<void> {
  const { error } = await supabase.from('products').insert({
    name: input.name,
    price: input.price,
    original_price: input.originalPrice ?? null,
    category: input.category,
    brand: input.brand ?? null,
    badge: input.badge ?? null,
    description: input.description ?? null,
    images: input.images,
    rating: 5,
    reviews: 0,
  })
  if (error) throw error
}

export async function updateProductRow(id: number, input: ProductInput): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({
      name: input.name,
      price: input.price,
      original_price: input.originalPrice ?? null,
      category: input.category,
      brand: input.brand ?? null,
      badge: input.badge ?? null,
      description: input.description ?? null,
      images: input.images,
    })
    .eq('id', id)
  if (error) throw error
}

export async function deleteProductRow(id: number): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

// ── Imágenes (Supabase Storage) ────────────────────────────────────────────────

export async function uploadProductImage(file: File): Promise<string> {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg'
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('product-images').upload(fileName, file, {
    contentType: file.type || 'image/jpeg',
  })
  if (error) throw error
  const { data } = supabase.storage.from('product-images').getPublicUrl(fileName)
  return data.publicUrl
}

// ── Pedidos ──────────────────────────────────────────────────────────────────

export interface CreateOrderInput {
  email: string
  name: string
  address: string
  city: string
  items: OrderItem[]
  total: number
  userId?: string
}

export async function createOrderRow(input: CreateOrderInput): Promise<void> {
  const id = `ORD-${Date.now().toString(36).toUpperCase()}`
  const { error } = await supabase.from('orders').insert({
    id,
    user_id: input.userId ?? null,
    email: input.email.toLowerCase(),
    name: input.name,
    address: input.address,
    city: input.city,
    items: input.items,
    total: input.total,
    status: 'Confirmado',
  })
  if (error) throw error
}

export async function fetchMyOrders(email: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('email', email.toLowerCase())
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(rowToOrder)
}

export async function fetchAllOrders(): Promise<OrderWithEmail[]> {
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(rowToOrder)
}

export async function updateOrderStatusRow(id: string, status: OrderStatus): Promise<void> {
  const { error } = await supabase.from('orders').update({ status }).eq('id', id)
  if (error) throw error
}

// ── Perfil ───────────────────────────────────────────────────────────────────

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  if (!data) return null
  return { name: data.name, isAdmin: data.is_admin, address: data.address ?? undefined, phone: data.phone ?? undefined }
}

export interface ProfileUpdateInput {
  name: string
  address?: string
  phone?: string
}

export async function updateProfile(userId: string, input: ProfileUpdateInput): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      name: input.name,
      address: input.address ?? null,
      phone: input.phone ?? null,
    })
    .eq('id', userId)
  if (error) throw error
}
