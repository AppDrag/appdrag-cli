#!/usr/bin/env node
const chalk = require('chalk');
const { config } = require('./utils/common.js');
const { login, init } = require('./commands/setup/setup');
const { pushFilesystem, pullFilesystem } = require('./commands/filesystem/filesystem');
const { pushApi, pullApi } = require('./commands/api/api');
const { pullDatabase, pushDatabase } = require('./commands/database/database');
const { deployFilesystem, deployApi, deployDb, exportProject } = require('./commands/deploy/deploy');
const { setupCheck, help } = require('./utils/common');
var argv = require('minimist')(process.argv.slice(2));

async function main() {
  let funcs = {
    'login': login,
    'init': init,
    'help': help,
    'export' : exportProject,
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
  };

  var args = argv._;
  if (args.length === 0) {
    help();
    return;
  }
  delete argv._;
  const argOpts = argv;
  if (funcs.hasOwnProperty(args[0])){
    if (funcs[args[0]].hasOwnProperty(args[1])) {
      funcs[args[0]][args[1]](args.slice(2), argOpts);
    } else if (funcs[args[0]].length !== undefined) {
      funcs[args[0]](args.slice(1), argOpts);
    } else {
      console.log(chalk.red(
        'Invalid command, please refer to the \'help\' command.\n'
      ));
    }
  } else {
    console.log(chalk.red(
        'Invalid command, please refer to the \'help\' command.\n'
      ));
  }

}

main();

process.on('uncaughtException', async function (err) {
  console.log(chalk.red(`error writing : ${err}`));
});