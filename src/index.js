#!/usr/bin/env node
const chalk = require('chalk');
const { config } = require('./utils/common.js');
const { login, init } = require('./commands/setup/setup');
const { pushFilesystem, pullFilesystem } = require('./commands/filesystem/filesystem');
const { pushApi, pullApi } = require('./commands/api/api');
const { pullDatabase, pushDatabase } = require('./commands/database/database');
const { deployFilesystem, deployApi, deployDb } = require('./commands/deploy/deploy');
const { checkAppId, help } = require('./utils/common');

async function main() {
  let funcs = {
    'login': login,
    'init': init,
    'help': help,
    fs: {
      'push': pushFilesystem,
      'pull': pullFilesystem,
    },
    api: {
      'push': pushApi,
      'pull': pullApi,
    },
    db: {
      'push': pushDatabase,
      'pull': pullDatabase,
    },
    deploy: {
      'fs': deployFilesystem,
      'api': deployApi,
      'db': deployDb,
    }
  }

  var args = process.argv.slice(2);  
  if (args.length === 0) {
    help();
    return;
  }
  if (funcs.hasOwnProperty(args[0])){
    if (funcs[args[0]].hasOwnProperty(args[1])) {
      funcs[args[0]][args[1]](args);
    } else if (funcs[args[0]].length !== undefined) {
      funcs[args[0]](args);
    } else {
      console.log(chalk.red(
        'Invalid command, please refer to the \'help\' command.\n'
      ));
    }
  }

}

main();