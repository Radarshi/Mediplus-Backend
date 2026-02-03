import mongoose from "mongoose";
import { initLabTestConnection } from "../db/connections.js";

const labTestConnection  = await initLabTestConnection();

const LabBookingSchema = new mongoose.Schema({
    userId: {
        type: String,
        ref: "User",
        required: true
    },
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    email: {
        type: String
    },
    address: {
        type: String
    },
    date: {
        type: Date,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    instruction: {
        type: String
    },
    labtest_id: {
        type: String
    },
    labtest_name: {
        type: String
    },
    venue: {
        type: String
    }
},
{timestamps:true})

const LabTestSchema = labTestConnection.model("LabTestSchema",LabBookingSchema);
export default LabTestSchema ;
