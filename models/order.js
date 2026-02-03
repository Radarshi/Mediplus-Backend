import mongoose from "mongoose";
import { initOrderConnection } from "../db/connections.js";

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
    required: true
  },
  userId: {
    type: String,
    ref: "User",
    required: true
  },
  // User Details (denormalized for easy access)
  userDetails: {
    name: String,
    email: String,
    phone: String
  },
  // Delivery Information
  deliveryInfo: {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    landmark: { type: String }
  },
  // Order Items
  items: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    generic_name: String,
    manufacturer: String,
    dosage: String,
    image_url: String,
    prescription: Boolean
  }],
  // Payment Information
  paymentMethod: {
    type: String,
    enum: ['card', 'cod'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  // Prescription
  prescriptionUrl: {
    type: String,
    default: null
  },
  requiresConsultation: {
    type: Boolean,
    default: false
  },
  // Pricing
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  deliveryCharge: { type: Number, default: 0 },
  total: { type: Number, required: true },
  // Order Status
  orderStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  // Status History (track all status changes)
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    note: String
  }],
  // Timestamps
  orderDate: {
    type: Date,
    default: Date.now
  },
  estimatedDelivery: {
    type: Date
  },
  actualDeliveryDate: {
    type: Date
  },
  // Notes
  orderNotes: String,
  cancelReason: String
}, { 
  timestamps: true  // Adds createdAt and updatedAt automatically
});

// Indexes for better query performance
orderSchema.index({ userId: 1, orderDate: -1 });
orderSchema.index({ orderId: 1 , unique: true});
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ orderDate: -1 });
orderSchema.index({ 'deliveryInfo.email': 1 });

export async function getOrderModel() {
  const connection = await initOrderConnection();
  return connection.model("Order", orderSchema);
}