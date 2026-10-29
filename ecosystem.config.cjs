module.exports = {
  apps: [
    {
      name: 'hide-play-server',
      script: 'dist/index.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '450M', // Guard against memory leaks on 1GB RAM instances
      env: {
        NODE_ENV: 'production',
        PORT: 10000
      },
      error_file: 'logs/pm2-err.log',
      out_file: 'logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      restart_delay: 3000 // Prevent rapid crash-restart loop
    }
  ]
};

