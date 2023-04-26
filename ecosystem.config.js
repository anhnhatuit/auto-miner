module.exports = {
  apps: [{
    name: 'worker',
    script: 'register.js',
    instances: 1,
    instance_var: 'INSTANCE_ID',
    exec_mode  : "cluster",
    max_memory_restart: "9G",
    node_args: "--max_old_space_size=8192",
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }],
};
