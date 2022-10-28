module.exports = {
    apps : [
        {
            name: "gfn-bot",
            script: "./bot.js",
            interpreter : 'node@12.18.3',
            watch: true,
            ignore_watch: ["node_modules"],
            env_production: {
                NODE_ENV: "production",
            }
        }
      ]
  }
  