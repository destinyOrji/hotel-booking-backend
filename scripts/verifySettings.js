const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

const Settings = require('../src/models/Settings');

const verifySettings = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    console.log('\n=== Verifying Settings ===\n');
    
    // Get settings
    const settings = await Settings.findOne();
    
    if (!settings) {
      console.log('✗ No settings found in database.');
      console.log('Run "npm run seed:settings" to create default settings.');
    } else {
      console.log('✓ Settings found in database!\n');
      console.log('Hotel Information:');
      console.log('  Name:', settings.hotelInfo.name);
      console.log('  Address:', settings.hotelInfo.address);
      console.log('  Phone:', settings.hotelInfo.phone);
      console.log('  Email:', settings.hotelInfo.email);
      console.log('  Description:', settings.hotelInfo.description.substring(0, 50) + '...');
      
      console.log('\nCheck-in/Check-out:');
      console.log('  Check-in Time:', settings.checkInTime);
      console.log('  Check-out Time:', settings.checkOutTime);
      
      console.log('\nPolicies:');
      console.log('  Cancellation Policy:', settings.cancellationPolicy.substring(0, 80) + '...');
      console.log('  Terms and Conditions:', settings.termsAndConditions.substring(0, 80) + '...');
      
      console.log('\nPayment Settings:');
      console.log('  Currency:', settings.paymentSettings.currency);
      console.log('  Tax Rate:', settings.paymentSettings.taxRate + '%');
      console.log('  Accepted Methods:', settings.paymentSettings.acceptedMethods.join(', '));
      
      console.log('\nEmail Settings:');
      console.log('  Host:', settings.emailSettings.host || '(not configured)');
      console.log('  Port:', settings.emailSettings.port);
      console.log('  Secure:', settings.emailSettings.secure);
      console.log('  User:', settings.emailSettings.auth.user || '(not configured)');
      
      console.log('\n✓ Settings verification complete!');
    }
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

verifySettings();
