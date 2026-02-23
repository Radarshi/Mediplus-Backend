import mongoose from "mongoose";
import { initConsultConnection } from "../db/connections.js";

const consultBookingSchema = new mongoose.Schema({
  userId: { type: String, ref: "User", required: true },
  bookingId: { type: String },
  name: { type: String, required: true },
  plan_name: { type: String },
  duration: { type: String },
  amount: { type: String },
  paymentMethod: { type: String },
  txnId: { type: String }
}, { timestamps: true });

let ConsultBookingModel;

export async function getConsultBookingModel() {
  if (!ConsultBookingModel) {
    const connection = await initConsultConnection();
    ConsultBookingModel = connection.model("ConsultBooking", consultBookingSchema);
  }
  return ConsultBookingModel;
}
