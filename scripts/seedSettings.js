const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

const Settings = require('../src/models/Settings');

const seedSettings = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    console.log('\n=== Seeding Settings ===\n');
    
    // Check if settings already exist
    const existingSettings = await Settings.findOne();
    
    if (existingSettings) {
      console.log('✓ Settings already exist in the database.');
      console.log('\nCurrent Settings:');
      console.log('Hotel Name:', existingSettings.hotelInfo.name);
      console.log('Check-in Time:', existingSettings.checkInTime);
      console.log('Check-out Time:', existingSettings.checkOutTime);
      console.log('Currency:', existingSettings.paymentSettings.currency);
      console.log('Tax Rate:', existingSettings.paymentSettings.taxRate + '%');
      console.log('\nNo changes made.');
    } else {
      // Create default settings
      const defaultSettings = await Settings.create({
        hotelInfo: {
          name: 'Hotel Management System',
          address: '123 Main Street, City, Country',
          phone: '+1-234-567-8900',
          email: 'info@hotel.com',
          description: 'Welcome to our hotel! We provide comfortable accommodations and excellent service.'
        },
        checkInTime: '14:00',
        checkOutTime: '11:00',
        cancellationPolicy: 'Free cancellation up to 24 hours before check-in. Cancellations made within 24 hours of check-in will be charged one night\'s stay.',
        termsAndConditions: 'By making a reservation, you agree to our terms and conditions. Please review our policies regarding check-in, check-out, cancellations, and payment.',
        emailSettings: {
          host: '',
          port: 587,
          secure: false,
          auth: {
            user: '',
            pass: ''
          }
        },
        paymentSettings: {
          currency: 'USD',
          taxRate: 10,
          acceptedMethods: ['credit_card', 'debit_card', 'paypal']
        }
      });
      
      console.log('✓ Default settings created successfully!');
      console.log('\nSettings Details:');
      console.log('Hotel Name:', defaultSettings.hotelInfo.name);
      console.log('Address:', defaultSettings.hotelInfo.address);
      console.log('Phone:', defaultSettings.hotelInfo.phone);
      console.log('Email:', defaultSettings.hotelInfo.email);
      console.log('Check-in Time:', defaultSettings.checkInTime);
      console.log('Check-out Time:', defaultSettings.checkOutTime);
      console.log('Currency:', defaultSettings.paymentSettings.currency);
      console.log('Tax Rate:', defaultSettings.paymentSettings.taxRate + '%');
      console.log('Accepted Payment Methods:', defaultSettings.paymentSettings.acceptedMethods.join(', '));
      console.log('\n✓ You can now update these settings through the admin panel.');
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

seedSettings();
