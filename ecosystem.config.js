module.exports = {
    apps : [
        {
            name: "gfn-bot-beta",
            script: "./bot.js",
            watch: true,
            ignore_watch: ["node_modules"],
            env: {
                NODE_ENV: "development",
            },
            env_beta: {
                NODE_ENV: "beta",
            }
        }
      ]
  }
  