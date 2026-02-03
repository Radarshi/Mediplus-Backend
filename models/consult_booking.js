import mongoose from "mongoose";
import { initConsultConnection } from "../db/connections.js";
import { type } from "os";

const consultBookingSchema = new mongoose.Schema({
    userId: {
        type: String,
        ref: "User",
        required: true
    },
    bookingId: {
        type: String
    },
    name: {
        type : String,
        required : true
    },
    plan_name: {
        type: String
    },
    duration: {
        type: String
    },
    amount: {
        type: String
    },
    paymentMethod: {
        type: String
    },
    txnId:{
        type: String
    }
},{timestamps:true})

export async function ConsultBookingModel() {
  const connection = await initConsultConnection();
  return connection.model("Consult", consultBookingSchema);
}

