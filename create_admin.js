const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read config.js to get URL and ANON KEY
const configContent = fs.readFileSync('js/config.js', 'utf8');
const urlMatch = configContent.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/);
const keyMatch = configContent.match(/SUPABASE_ANON_KEY\s*=\s*['"]([^'"]+)['"]/);

if (!urlMatch || !keyMatch) {
    console.error('Could not find Supabase credentials in js/config.js');
    process.exit(1);
}

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function createAdmin() {
    console.log('Signing up admin...');
    const { data, error } = await supabase.auth.signUp({
        email: 'admin@digitalkhatapana.com',
        password: 'admin123',
    });

    if (error) {
        console.error('Error creating admin:', error.message);
    } else {
        console.log('Admin user created successfully:', data.user?.id);
    }
}

createAdmin();
