import mongoose from "mongoose";
import { initUserConnection } from "../db/connections.js";

const  userConnection  = await initUserConnection();

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

const Counter = userConnection.model("Counter", counterSchema);

export default Counter;




/** When new user is created:
1. Find counter with _id: "userId"
2. Increment seq: 5 → 6
3. Generate userId: "USR0006"
4. Save user with userId: "USR0006" **/