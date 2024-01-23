import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

// connectInstance holding response after connection >
   // 
// database in other continent
const connectDB = async () => {
    try {
       const connectInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
    console.log(`\n MongoDB connected !! DB HOST :
     ${connectInstance.connection.host}`);

} catch (error) {
        console.log("MONGODB connection error", error);
        process.exit(1) // process exit with 1
    }

}

export default connectDB;