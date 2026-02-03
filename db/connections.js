import dotenv from "dotenv";  
import mongoose from "mongoose";
dotenv.config(); 

let userConnection;       
let consultConnection;    
let labTestConnection;   
let blogConnection;      
let orderConnection;      

export const initUserConnection = async () => {
  if (!userConnection) {
    const uri = process.env.MONGODB_USER_URI;
    if (!uri) throw new Error("MONGODB_URI missing in .env file");
    
    console.log('Connecting to User Database...');
    userConnection = await mongoose.createConnection(uri);
    
    userConnection.on("connected", () => console.log("✅ User DB connected"));
    userConnection.on("error", (err) => console.error("❌ User DB error:", err));
  }
  return userConnection;
};

export const initConsultConnection = async () => {
  if (!consultConnection) {
    const uri = process.env.MONGO_CONSULT_URI;
    if (!uri) throw new Error("MONGO_URI missing in .env file");
    
    console.log('Connecting to Consult Database...');
    consultConnection = await mongoose.createConnection(uri);
    
    consultConnection.on("connected", () => console.log("✅ Consult DB connected"));
    consultConnection.on("error", (err) => console.error("❌ Consult DB error:", err));
  }
  return consultConnection;
};

export const initLabTestConnection = async () => {
  if (!labTestConnection) {
    const uri = process.env.MONGO_LAB_TEST_URI;
    if (!uri) throw new Error("MONGO_LAB_TEST_URI missing in .env file");
    
    console.log('🔌 Connecting to Lab Test Database...');
    labTestConnection = await mongoose.createConnection(uri);
    
    labTestConnection.on("connected", () => console.log("✅ Lab Test DB connected"));
    labTestConnection.on("error", (err) => console.error("❌ Lab Test DB error:", err));
  }
  return labTestConnection;
};

export const initBlogConnection = async () => {
  if (!blogConnection) {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error("MONGO_URI missing in .env file");
    
    console.log('🔌 Connecting to Blog Database...');
    blogConnection = await mongoose.createConnection(uri);
    
    blogConnection.on("connected", () => console.log("✅ Blog DB connected"));
    blogConnection.on("error", (err) => console.error("❌ Blog DB error:", err));
  }
  return blogConnection;
};

export const initOrderConnection = async () => {
  if (!orderConnection) {
    const uri = process.env.MONGO_ORDER_URI || process.env.MONGO_URI;
    if (!uri) throw new Error("MONGO_ORDER_URI or MONGO_URI missing in .env file");
    
    console.log('Connecting to Order Database...');
    console.log('Using URI:', uri.replace(/\/\/.*@/, '//<credentials>@')); // Hide credentials in logs
    
    orderConnection = await mongoose.createConnection(uri);
    
    orderConnection.on("connected", () => {
      console.log("✅ Order DB connected successfully");
      console.log("Database name:", orderConnection.name);
    });
    
    orderConnection.on("error", (err) => console.error("❌ Order DB error:", err));
    orderConnection.on("disconnected", () => console.warn("⚠️ Order DB disconnected"));
  }
  
  return orderConnection;
};