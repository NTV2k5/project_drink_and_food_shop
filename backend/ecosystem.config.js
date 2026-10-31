/**
 * =============================================================================
 * PM2 ENTERPRISE ECOSYSTEM CONFIGURATION
 * High-Availability, Zero-Downtime Reload, and Memory Guard for Production Node.js
 * =============================================================================
 */

module.exports = {
  apps: [
    {
      name: 'fb-shop-backend',
      script: 'src/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 4000
      },
      listen_timeout: 10000,
      kill_timeout: 5000,
      wait_ready: true,
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
