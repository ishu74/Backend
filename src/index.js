// As early as possible in 
// your application, import and configure dotenv:
// require('dotenv').config({path:'./env'})

import dotenv from "dotenv"
import connectDB from "./db/indexDB.js";

dotenv.config({
    path :'./env'
})

connectDB();

/*

import mongoose from "mongoose";
import { DB_NAME } from "./constants";
import { Express } from "express";
const app = express();


(async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}//${DB_NAME}`);
    app.on("error", (error) => {
      console.log("ERROR: Error after DB connection with APP", error);
      throw error;
    });
    app.lisent(process.env.PORT,()=>{
        console.log(`App is lisenting on port : ${process.env.PORT}`);
    })
  } catch (error) {
    console.error("ERROR:", error);
    throw error;
  }
})();

*/
