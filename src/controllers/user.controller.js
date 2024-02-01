import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


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
  // // check on postman
  //  return res.status(200).json({
  //     message: "OK",
  //   });

  const { fullName, username, email, password } = req.body;
  // console.log(email);
  /*// console.log(req.body);
  //   console.log("email", email);
  //   if(fullName === ""){
  //     throw new ApiError(400, "FullName is required")
  //   } */
  if (
    //is user put all input empty
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // for existing user
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    //if user is existed throw ERROR
    throw new ApiError(409, "User with email and username already exists");
  }
  //   console.log(req.files);

  //files path from user.routes.js
  const avatarLocalPath = req.files?.avatar[0]?.path;
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

  // upload krne me time lagega to async await lelo
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, " Avatar file is required");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url, // mujhe bas url store krna hai  image nhi,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  // response from ApiResponse
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

//............................LOGIN.................................................
const loginUser = asyncHandler(async (req, res) => {
  //take data from req.body se
  const { email, username, password } = req.body;

  //check if both username & password not sent by user // based on requirement
  if ((!username && !email)) {
    throw new ApiError(400, "Username or Email is required");
  }

  // find user if you are registered then can login ,
  //  also i have data of username or email  in database (email/ usernamme)
  const user = await User.findOne({
    // database in other continent thats y await is requied
    // or operator find value based on username or email
    $or: [{ username }, { email }],
  });

  // if unauthorized user
  if (!user) {
    throw new ApiError(404, "User does not exist");
  }
  //.............................
  //password
  const isPasswordValid = await user.isPasswordCorrect(password);

  //invalid user password
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );
  //user ko kya kya info bhejni hai

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //cookies me bhejo
  const options = {
    httpOnly: true, // only modyfie from server
    secure: true,
  };
  //return response
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

export { registerUser, loginUser, logoutUser };
