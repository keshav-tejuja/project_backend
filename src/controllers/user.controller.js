import {asyncHandler} from '../utils/asyncHandler.js'
import { apiError } from '../utils/apiError.js';
import {User} from "../models/user.models.js";
import {uploadOnCloudinary} from "../utils/cloudInary.js"
import {apiResponse} from "../utils/apiResponse.js"
import { error } from 'console';
import jwt from "jsonwebtoken"



const generateAccessAndRefreshTokens=async(userId)=>{
   try {
     const user= await User.findById(userId)
     const accessToken=user.generateAccessToken()
     const refreshToken=user.generateRefreshToken()

     user.refreshToken=refreshToken
     await user.save({validateBeforeSave:false})
     return{accessToken,refreshToken}

   } catch (error) {
      throw new apiError(500,"Something went wrong while generating tokens")
   }
}


const registerUser = asyncHandler(async (req,res)=>{
   const {fullName,email,username,password} = req.body
   //console.log("email",email); 
   if(
      [fullName,email,password,username].some((field)=>field?.trim()==="")
   ){
      throw new apiError(400,"All fiels are required")
   }

    
   const existedUser = await User.findOne({
      $or:[{ username },{ email }]
   })
   if(existedUser){
      throw new apiError(409,"User with this username or email exists")
   }

   const avatarLocalPath = req.files?.avatar[0]?.path;
   //const coverImageLocalPath = req.files?.coverImage[0]?.path;
   let coverImageLocalPath;
   if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0) {
      coverImageLocalPath = req.files.coverImage[0].path
   }



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

const loginUser = asyncHandler(async (req,res)=>{

   const {email,username,password}=req.body
   if (!(username ||email)) {
      throw new apiError(400,"username or email is required")
   }

   const user=await User.findOne({
      $or:[{username},{email}]
   })

   if (!user) {
      throw new apiError(404,"User does not exist")
   }
   const isPassworValid=await user.isPasswordCorrect(password)
   if (!isPassworValid) {
      throw new apiError(401,"Password is incorrect")
   }
  const {accessToken,refreshToken}= await generateAccessAndRefreshTokens(user._id)

  const loggedInUser=await User.findById(user._id).select("-password -refreshToken")

  const options={
   httpOnly:true,
   secure:true
  }

  return res
  .status(200)
  .cookie("accessToken",accessToken,options)
  .cookie("refreshToken",refreshToken,options)
  .json(
   new apiResponse(
      200,
      {
         user:loggedInUser,accessToken,refreshToken
      },
      "User logged in successfuly"
   )
  )


})

const logoutUser=asyncHandler(async (req,res)=>{
   await User.findByIdAndUpdate(
      req.user._id,
      {
         $set:{ 
            refreshToken:undefined
         }
      },
      {
         new:true
      }
   )
   const options={
   httpOnly:true,
   secure:true
  }
  return res
  .status(200)
  .clearCookie("accessToken",options)
  .clearCookie("refreshToken",options)
  .json(new apiResponse(200,{},"User logged out"))
})

const refreshAccessToken=asyncHandler(async (req,res)=>{
   const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

   if (!incomingRefreshToken) {
      throw new apiError(401,"Unautorized request")
      
   }
   try {
      const decodedToken = jwt.verify(
         incomingRefreshToken,
         process.env.REFRESH_TOKEN_SECRET
      )
   
      const user = await User.findById(decodedToken?._id)
      if (!user) {
         throw new apiError(401,"Invalid refresh Token")
         
      }
   
      if (incomingRefreshToken!==user?.refreshToken) {
         throw new apiError(401,"Refreshed Token is expired or used")
      }
   
      const options={
         httpOnly:true,
         secure:true
      }
     const {accessToken,newRefreshToken}= await generateAccessAndRefreshTokens(user._id)
   
      return res
      .status(200)
      .cookie("accessToken",accessToken,options)
      .cookie("refreshToken",newRefreshToken,options)
      .json(
         new apiResponse(
            200,
            {accessToken,refreshToken:newRefreshToken},
            "Access Token refreshed"
         )
      )
   } catch (error) {
      throw new apiError(401,error?.message || "Invalid refresh Token")
   }

})



const changeCurrentPassword=asyncHandler(async (req,res)=>{
   const {oldPassword,newPassword}= req.body
   const user= await User.findById(req.user?._id)
   const correctPassword=await user.isPasswordCorrect(oldPassword)
   if (!correctPassword) {
      throw new apiError(400,"Invalid old password")
      
   }
   user.password=newPassword;
   await user.save({validateBeforeSave:false})

   return res
   .status(200)
   .json(new apiResponse(
      200,{},"Password changed successfully"
   ))

})


const getCurrentUser=asyncHandler(async (req,res)=>{
   return res
   .status(200)
   .json(200,req.user,"current user fetched successfully")
})

const updateAccountDetails=asyncHandler(async (req,res)=>{
   const{fullName,email,}=req.body


   if(!fullName || !email){
      throw new apiError(400,"All fields are required")
   }

   const user=User.findByIdAndUpdate(
      req.user?._id,
      {
         $set:{
            fullName:fullName,
            email:email
         }
      },
      {new:true}

   ).select("-password")

   return res
   .status(200)
   .json(new apiResponse(200,user,"User details updated successfully"))
})

const updateUserAvatar=asyncHandler(async (req,res)=>{
   const avatarLocalPath=req.file?.path
   if (!avatarLocalPath) {
      throw new apiError(400,"Avatar file is missing")
   }

   const avatar=await uploadOnCloudinary(avatarLocalPath)
   if (!avatar.url) {
      throw new apiError(400,"Error while uploading on avatar")
   }

   const user=await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set:{
            avatar:avatar.url
         }
      },
      {new:true}
   ).select("-password")
   return res
   .status(200)
   .json(
      new apiResponse(200,
         user,
         "Avatar Updated"
      )
   )

})
const updateUserCoverImage=asyncHandler(async (req,res)=>{
   const coverImageLocalPathLocalPath=req.file?.path
   if (!coverImageLocalPathLocalPath) {
      throw new apiError(400,"Cover Image file is missing")
   }

   const coverImage=await uploadOnCloudinary(coverImageLocalPath)
   if (!coverImage.url) {
      throw new apiError(400,"Error while uploading on avatar")
   }

   const user=await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set:{
            coverImage:coverImage.url
         }
      },
      {new:true}
   ).select("-password")
   return res
   .status(200)
   .json(
      new apiResponse(200,
         user,
         "Cover Image Updated"
      )
   )

})

export {
        registerUser,
        loginUser,
        logoutUser,
        refreshAccessToken,
        changeCurrentPassword,
        getCurrentUser,
        updateAccountDetails,
        updateUserAvatar,
        updateUserCoverImage
      }