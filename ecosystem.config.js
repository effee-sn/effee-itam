module.exports = {
  apps: [
    {
      name: "itam",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      // Bind to localhost only — nginx (same host) proxies to 127.0.0.1:3000, and the app
      // is not reachable directly on :3000 from the network. Remove `-H 127.0.0.1` if you
      // ever need to expose port 3000 directly (e.g. testing before nginx is set up).
      args: "start -p 3000 -H 127.0.0.1",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      max_memory_restart: "500M",
      kill_timeout: 5000,
      env: {
        NODE_ENV: "production",
      },
      out_file: "logs/out.log",
      error_file: "logs/error.log",
      merge_logs: true,
      time: true,
    },
  ],
};
