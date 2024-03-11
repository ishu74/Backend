import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Jwt } from "jsonwebtoken";

//................................Tokens................................................
//method of token used anywhere// user gives user id
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId); //now user have all property of usermodel
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    //give access token to user but refresh token saved in db coz everytime login problem
    //put refresh token to db , object ke andr value add
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false }); // saving
    //return accesstoke and refrreshtoken in object
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

//............................RegisterUser................................................
const registerUser = asyncHandler(async (req, res) => {
  /*
1.get user  details from frontend
2.validation not empty
3.check is user already exist : with email or usernmane ,
4.check for images , check for avatar, coverimage 
5.upload  them to cloudinary, check avatar is uploaded on cloudinary ?
6.creat user object , nosql , because of mongodb  , create entry in DB
7.remove password and refresh token field from response 
8.check response , check for user creation 
9.return response || error */

  // // check on postman
  //  return res.status(200).json({
  //     message: "OK",
  //   });

  //1 . get user detail from user req.body
  const { fullName, username, email, password } = req.body;

  /* console.log(email);
  console.log(req.body);
    console.log("email", email);
    if(fullName === ""){
      throw new ApiError(400, "FullName is required")
    } 
    */
  //2. validation checking
  if (
    //is user put all input empty
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  //3. for existing user
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    //if user is existed throw ERROR
    throw new ApiError(409, "User with email and username already exists");
  }
  //   console.log(req.files);

  //4. file checking
  //files path from user.routes.js
  // const avatarLocalPath = req.files?.avatar[0]?.path;
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, " Avatar file is required");
  }

  //5.upload  them to cloudinary, check avatar is uploaded on cloudinary ?
  // upload krne me time lagega to  await lelo
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, " Avatar file is required");
  }

  //6.creat user object , nosql , because of mongodb  , create entry in DB
  const user = await User.create({
    fullName,
    avatar: avatar.url, // mujhe bas url store krna hai  image nhi,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // 7..remove password and refresh token field from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  // 8.check response , check for user creation
  //9.return response || error */
  // response from ApiResponse
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

//............................LOGIN.................................................
/* 
 1. get data from re.body >>> req.body >da ta
 2. give access based on username or email 
 3.find the user . if user
 4.password check , 
 5.access and refresh token
 6.send this tokens in cookies 
 7. send response
*/

const loginUser = asyncHandler(async (req, res) => {

// 1.get data from re.body >>> req.body >data
  const { email, username, password } = req.body;
  //2.check if both username & password not sent by user // based on requirement
  if (!username && !email) {
    throw new ApiError(400, "Username or Email is required");
  }
  // find user if you are registered then can login ,
  //  also i have data of username or email  in database (email/ usernamme)

//3.find the user & check existed user
  const user = await User.findOne({
    // database in other continent thats y await is requied
    // or operator find value based on username or email
    $or: [{ username }, { email }],
  });

//if unauthorized user
  if (!user) {
    throw new ApiError(404, "User does not exist");
  }
//.............................
  //password
  // TODO: find one and update one methods of monogoDB    >>User
  // but ispasswordCorrect this methoda available in your user   >>user
//4.passing password in isPassswordCorrect method from usermodel,  in user model password hashing used  
  const isPasswordValid = await user.isPasswordCorrect(password);

//if invalid user password
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

//5.access and refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );
  //user ko kya kya info bhejni hai
  //remove refresh token and password
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //cookies me bhejo
  //6.send this tokens in cookies
  const options = {
    httpOnly: true, // only modyfie from server
    secure: true,
  };

  //7.return response
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User loggedIn successfully"
      )
    );
});

//......................LOGOUT....................................
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      // this user from middleware
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});


const  refreshAccessToken  = asyncHandler(async(req,res)=>{
 const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
 if (incomingRefreshToken) {
  throw new ApiError( 401, "Unauthorized request")
 }
try {
   const decodeToken = jwt.verify(
    incomingRefreshToken,
     process.env.REFRESH_TOKEN_SECRET,
  )
  const user = await User.findById(decodeToken?._id)
  if (!user) {
    throw new ApiError( 401, "Unauthorized request")
   }
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "RefreshToken is Expired or used. ")
      
    }
    const options ={
      httpOnly:true,
      secured:true,
    }
    const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id)
    return res.
    status(200)
    .cookie("accessToken", accessToken)
    .cookie("refreshToken", newRefreshToken)
    .json(
      new ApiResponses(200,{accessToken, newRefreshToken},"acsess token refreshed successfully")
    )
} catch (error) {
  throw new ApiError(401, error?.message || "Invalid refresh token")
}
})
export { registerUser, loginUser, logoutUser, refreshAccessToken };
