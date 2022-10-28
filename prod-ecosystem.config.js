module.exports = {
    apps : [
        {
            name: "gfn-bot",
            script: "./bot.js",
            interpreter : 'node@16.17.0',
            watch: true,
            ignore_watch: ["node_modules"],
            env_production: {
                NODE_ENV: "production",
            }
        }
      ]
  }
  