import dotenv from 'dotenv';
import connectDB from './db/index.js'; 
import app from './app.js'; 

dotenv.config({ path: './.env' }); 

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`✅ Server is running on port ${process.env.PORT || 8000}`);
    });
  })
  .catch((error) => {
    console.error('❌ Error connecting to MongoDB:', error);
  });
