import {asyncHandler} from '../utils/asyncHandler.js'
import { apiError } from '../utils/apiError.js';
import {User} from "../models/user.models.js";
import {uploadOnCloudinary} from "../utils/cloudInary.js"
import {apiResponse} from "../utils/apiResponse.js"

const registerUser = asyncHandler(async (req,res)=>{
   const {fullName,email,username,password} = req.body
   console.log("email",email); 
   if(
      [fullName,email,password,username].some((field)=>field?.trim()==="")
   ){
      throw new apiError(400,"All fiels are required")
   }
   const existedUser = User.findOne({
      $or:[{ username },{ email }]
   })
   if(existedUser){
      throw new apiError(409,"User with this username or email exists")
   }

   const avatarLocalPath = req.files?.avatar[0]?.path;
   const coverImageLocalPath = req.files?.coverImage[0]?.path;

   if (!avatarLocalPath) {
      throw new apiError(400,"Avatar file is required")
      
   }


   const avatar=await uploadOnCloudinary(avatarLocalPath)
   const coverImage= await uploadOnCloudinary(coverImageLocalPath)


   if(!avatar){
      throw new apiError(400,"Avatar file is required")
   }

   const user= await User.create({
      fullName,
      avatar:avatar.url,
      coverImage:coverImage?.url||"",
      email,
      username:username.toLowerCase(),
      password
   })

   const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
   )

   if (!createdUser) {
      throw new apiError(500,"Something went wrong while resgistering the user")
      
   }

   return res.status(201).json(
      new apiResponse(200,createdUser,"User registered successfully")
   )

})

export {registerUser}