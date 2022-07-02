# GFN Discord Bot

This is a simple discord bot made for the GFN clan. The current primary features it offers are:

 - Game events across mutliple game types, with support for private text channels per event and reaction-based joining
 - Optional role managment via reactions (opt-in to discussion channels)
 - Memes

## Contributing
If you would like to add something to the bot, you can either fork the repo and open a PR or ask to be added as a contributor. 

## Developing
Some things you will need:
 - Node v12 or greater 
 - A bot with a token you can use to authenticate with
 - Mongo installed on your local network

### Set up dev
For development, you can put your token for your bot in `configs/dev.token` or point `configs/dev.json` at the token file on your local machine.

For mongo, change the url in `configs/dev.json` to point at your local mongo instance. 

### Setting up mongo
The bot should initialize most required collections; however, if not please let me know and we can update this section to include any prerequisites. 

### Running the bot
`npm start` will execute the bot using the `configs/dev.json` configuration. This should point at the token file in `configs/dev.token` and start the bot. You will also need to add your bot to a discord server that you own and can test with.


### Note on Tests
There are no tests. I am working on rectifying this but discord.js does not have great automated test support.

## Versioning
There is a version stamp in `src/lib/global-vars.js`. Please increment the minor/patch version when deploying changes so that you can verify the deployment is correct.
## Deploying
The github repo is set up to deploy to the beta and production servers on merging to develop and main respectively. You can verify the build is correct by running `gfn/info` on the beta/prod servers (GFN Beta / GFN)