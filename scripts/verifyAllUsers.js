const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Connect to database
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = require('../src/models/User');

const verifyAllUsers = async () => {
  try {
    const result = await User.updateMany(
      { isEmailVerified: false },
      { $set: { isEmailVerified: true } }
    );
    
    console.log(`Updated ${result.modifiedCount} users to verified status`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

verifyAllUsers();
