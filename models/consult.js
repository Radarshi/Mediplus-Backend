import mongoose from "mongoose";
import { initConsultConnection } from "../db/connections.js";

const consultSchema = new mongoose.Schema({
  userId: {
    type: String,
    ref: "User",
    required: true
  },
  name: {
    type: String,
    required: true
  },
  doctor_name: {
    type: String
  },
  doctor_id: {
    type: String
  },
  age: {
    type: Number,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String
  },
  symptoms: {
    type: String
  },
  preferred_date: {
    type: Date
  },
  preferred_time: {
    type: String
  }
}, { timestamps: true });

let ConsultModel; // cache variable

export async function getConsultModel() {
  if (!ConsultModel) {
    const connection = await initConsultConnection();
    ConsultModel = connection.model("Consult", consultSchema);
  }
  return ConsultModel;
}
