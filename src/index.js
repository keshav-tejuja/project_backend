import dotenv from 'dotenv';
import connectDB from './db/index.js'; // ✅ correct relative path
import app from './app.js'; // ✅ import express app

dotenv.config({ path: './.env' }); // Load env variables

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`✅ Server is running on port ${process.env.PORT || 8000}`);
    });
  })
  .catch((error) => {
    console.error('❌ Error connecting to MongoDB:', error);
  });
