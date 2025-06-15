#!/usr/bin/env node

import { readdir, writeFile, access } from 'fs/promises';
import { join } from 'path';

const NPMIGNORE_CONTENT = `# Dependencies
node_modules/
pnpm-lock.yaml
package-lock.json
yarn.lock

# Build outputs
dist/
build/
.output/

# Testing
coverage/
.nyc_output/
test-db.js

# Development files
.eslintcache
.mocharc.json
eslint.config.js
.eslintrc.json

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Environment files
.env
.env.*
!.env.example

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Temporary files
*.tmp
*.temp
.temp/
tmp/
`;

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function createNpmIgnoreFiles() {
  const mcpModulesDir = 'mcp_modules';

  try {
    const modules = await readdir(mcpModulesDir);

    for (const module of modules) {
      const modulePath = join(mcpModulesDir, module);
      const packageJsonPath = join(modulePath, 'package.json');
      const npmIgnorePath = join(modulePath, '.npmignore');

      // Check if this is a valid npm module (has package.json)
      if (await fileExists(packageJsonPath)) {
        // Check if .npmignore already exists
        if (!(await fileExists(npmIgnorePath))) {
          await writeFile(npmIgnorePath, NPMIGNORE_CONTENT);
          console.log(`✅ Created .npmignore for ${module}`);
        } else {
          console.log(`⚠️  .npmignore already exists for ${module}`);
        }
      } else {
        console.log(`⏭️  Skipping ${module} (no package.json found)`);
      }
    }

    console.log('\n🎉 Finished processing all modules!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createNpmIgnoreFiles();
