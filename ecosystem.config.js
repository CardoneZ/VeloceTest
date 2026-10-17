// ============================================================================
// PM2 Process Manager Configuration for VPS Deployment
// Run: pm2 start ecosystem.config.js
// ============================================================================
module.exports = {
  apps: [
    {
      name: 'veloce-express',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '250M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '0.0.0.0'
      }
    }
  ]
};
