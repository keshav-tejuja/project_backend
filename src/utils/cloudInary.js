import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
    });

const uploadOnCloudinary=async(localFilePath)=>{
    try {
        if(!localFilePath) return null

        const reponse=await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        //console.log("fie is successfully uploaded on cloudinary",reponse.url)
        fs.unlinkSync(localFilePath)
        return reponse
    } catch (error) {
        fs.unlinkSync(localFilePath)
        return null
    }

}


export {uploadOnCloudinary} 