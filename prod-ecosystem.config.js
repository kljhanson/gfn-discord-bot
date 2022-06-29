module.exports = {
    apps : [
        {
            name: "gfn-bot",
            script: "./bot.js",
            watch: true,
            ignore_watch: ["node_modules"],
            env_production: {
                NODE_ENV: "production",
            }
        }
      ]
  }
  