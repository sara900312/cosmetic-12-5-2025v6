const fs = require('fs');
const path = require('path');

// Try to use node to extract
const { exec } = require('child_process');

exec('unzip -o neomart1.zip', (error, stdout, stderr) => {
    if (error) {
        console.error('Error extracting zip:', error);
        return;
    }
    console.log('Extraction completed');
    console.log(stdout);
});
