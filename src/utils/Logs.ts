import Logger from 'pino';

const Logs = Logger({
  level: 'debug',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

export default Logs;
