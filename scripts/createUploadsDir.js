const fs = require('fs');
const path = require('path');

// Create uploads directory structure
const uploadsDir = path.join(__dirname, '../uploads');
const roomsDir = path.join(uploadsDir, 'rooms');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log('✓ Created uploads directory');
}

if (!fs.existsSync(roomsDir)) {
  fs.mkdirSync(roomsDir);
  console.log('✓ Created uploads/rooms directory');
}

console.log('\n✓ Upload directories are ready!');
console.log('Location:', roomsDir);
