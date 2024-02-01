import express  from "express";
import cookieParser from "cookie-parser";
import cors from "cors";


const app = express();
// cor proivde settings for cross origin resource sharing 
app.use(cors({
    origin : process.env.CORS_ORIGIN,
    credentials: true,
}))

//configuration

app.use(express.json({limit:"20kb"})) // aceept json //for setup middleware
app.use(express.urlencoded({extended:true, limit : "20kb"})) // for url data
app.use(express.static("public"))
app.use(cookieParser()) // for cookieparser

//routes

import userRouter from "./routes/user.routes.js"


// router declaration

app.use("/api/v1/users", userRouter)

export { app }