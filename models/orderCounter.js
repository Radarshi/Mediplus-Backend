import mongoose from "mongoose";
import { initOrderConnection } from "../db/connections.js";

const orderCounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

let OrderCounter;

export default async function getOrderCounter() {
  if (!OrderCounter) {
    const connection = await initOrderConnection();
    OrderCounter = connection.model("OrderCounter", orderCounterSchema);
  }
  return OrderCounter;
}

// Alternative export for direct import
export async function getOrderCounterModel() {
  return await getOrderCounter();
}