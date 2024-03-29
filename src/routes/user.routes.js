import { Router } from "express";
import {
  loginUser,
  logoutUser,
  registerUser,
  refreshAccessToken
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
//register
router.route("/register").post(
  upload.fields([
    // this is middleware
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);

//login
router.route("/login").post(loginUser);
router.route("/refresh-token").post(refreshAccessToken)

//Secured Routes/logOut
router.route("/logout").post(verifyJWT, logoutUser);

export default router;
