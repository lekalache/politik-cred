#!/usr/bin/env node

const { politicians } = require('./import-politicians-expanded');
const fs = require('fs');

// CSV headers matching your database schema
const headers = [
  'name', 'first_name', 'last_name', 'party', 'position', 'constituency',
  'bio', 'birth_date', 'gender', 'political_orientation', 'education',
  'career_history', 'key_policies', 'achievements', 'controversies',
  'social_media', 'verified', 'is_active'
];

// Helper function to escape CSV values
function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// Convert politicians to CSV format
const csvRows = [headers.join(',')];

politicians.forEach(politician => {
  const row = [
    escapeCsv(politician.name),
    escapeCsv(politician.first_name),
    escapeCsv(politician.last_name),
    escapeCsv(politician.party),
    escapeCsv(politician.position),
    escapeCsv(politician.constituency),
    escapeCsv(politician.bio),
    politician.birth_date || '',
    politician.gender || '',
    politician.political_orientation || '',
    escapeCsv(politician.education),
    escapeCsv(politician.career_history),
    escapeCsv(JSON.stringify(politician.key_policies || [])),
    escapeCsv(JSON.stringify(politician.achievements || [])),
    escapeCsv(JSON.stringify(politician.controversies || [])),
    escapeCsv(JSON.stringify(politician.social_media || {})),
    politician.verified === true ? 'true' : 'false',
    politician.is_active !== false ? 'true' : 'false'
  ];
  csvRows.push(row.join(','));
});

// Write CSV file
const csvContent = csvRows.join('\n');
fs.writeFileSync('politicians-import.csv', csvContent);

console.log('✅ Created politicians-import.csv with', politicians.length, 'politicians');
console.log('📁 File location: politicians-import.csv');
console.log('📊 File size:', (csvContent.length / 1024).toFixed(1), 'KB');
console.log('');
console.log('🎯 Next steps:');
console.log('1. Open Supabase dashboard');
console.log('2. Go to Table Editor → politicians table');
console.log('3. Click "Insert" → "Import data from CSV"');
console.log('4. Upload politicians-import.csv');
console.log('5. Map columns and import!');