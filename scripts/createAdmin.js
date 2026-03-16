const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

// User Schema (inline for simplicity)
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  phone: String,
  role: {
    type: String,
    enum: ['user', 'admin', 'staff'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Create admin user
const createAdmin = async () => {
  try {
    await connectDB();

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@hotel.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log('Email: admin@hotel.com');
      console.log('You can update the password if needed.');
      
      // Update password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      existingAdmin.password = hashedPassword;
      existingAdmin.role = 'admin';
      existingAdmin.isActive = true;
      existingAdmin.isEmailVerified = true;
      
      await existingAdmin.save();
      console.log('Admin password has been reset to: admin123');
    } else {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);

      // Create admin user
      const admin = await User.create({
        name: 'Admin User',
        email: 'admin@hotel.com',
        password: hashedPassword,
        phone: '1234567890',
        role: 'admin',
        isActive: true,
        isEmailVerified: true
      });

      console.log('Admin user created successfully!');
      console.log('Email: admin@hotel.com');
      console.log('Password: admin123');
      console.log('\nYou can now login with these credentials.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

// Run the script
createAdmin();
