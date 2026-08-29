import type { UUID } from './product';

export type OrderStatus =
  | 'pending'
  | 'pending_payment'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refunded';

export type SupplierOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'failed';

export type PaymentStatus = 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded';

export type ShipmentStatus =
  | 'pending'
  | 'label_created'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'exception'
  | 'returned';

export interface Order {
  id: UUID;
  userId: UUID;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  currency: string;
  shippingAddressId: UUID | null;
  paymentMethod: string | null;
  paymentId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: UUID;
  orderId: UUID;
  productId: UUID;
  variantId: UUID | null;
  supplierProductId: UUID;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  priceSnapshot: Record<string, unknown>;
  createdAt: Date;
}

export interface SupplierOrder {
  id: UUID;
  orderId: UUID;
  supplierId: UUID;
  supplierOrderId: string | null;
  status: SupplierOrderStatus;
  totalCost: number;
  currency: string;
  trackingNumber: string | null;
  estimatedDelivery: Date | null;
  actualDelivery: Date | null;
  rawResponse: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: UUID;
  orderId: UUID;
  provider: string;
  providerPaymentId: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Shipment {
  id: UUID;
  orderId: UUID;
  supplierOrderId: UUID | null;
  carrier: string | null;
  service: string | null;
  trackingNumber: string | null;
  status: ShipmentStatus;
  estimatedDelivery: Date | null;
  actualDelivery: Date | null;
  weight: number | null;
  dimensions: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrackingEvent {
  id: UUID;
  shipmentId: UUID;
  status: string;
  location: string | null;
  description: string | null;
  timestamp: Date;
  rawData: Record<string, unknown> | null;
  createdAt: Date;
}

export interface CheckoutItem {
  productId: UUID;
  variantId: UUID;
  supplierProductId: UUID;
  quantity: number;
}

export interface Address {
  street: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface CheckoutRequest {
  items: CheckoutItem[];
  shippingAddress: Address;
  email: string;
  phone?: string;
  createAccount?: boolean;
  couponCode?: string;
}
