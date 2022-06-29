const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;
const { getConfig } = require('./config')
 
const myFormat = printf(({ level, message, label, timestamp }) => {
  return `[${timestamp}] [${label}] [${level}] ${message}`;
});

const logLevel = getConfig().logLevel
 
const logger = createLogger({
  format: combine(
      format.colorize(),
        label({ label: 'gfn-bot' }),
        timestamp(),
        myFormat
  ),
  transports: [new transports.Console({
    level: logLevel
  })]
});

module.exports = logger