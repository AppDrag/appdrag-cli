const { setupCheck, tokenObj } = require('../../utils/common');
const { downloadDb, pushDbToCloudBackend } = require('../../utils/database/database');
const fs = require('fs');
const chalk = require('chalk');

const pushDatabase = async (args, argOpts) => {
  if (args.length <= 0) {
    console.log(chalk.red('File argument needed, please refer to the help command'));
    return;
  }
  let appId = setupCheck(argOpts);
  if (!appId) {
    return;
  }
  let token = tokenObj.token;
  let filePath = args[0];
  if (!fs.existsSync(filePath)) {
    console.log(chalk.red(`File doesn't exist`));
    return;
  }
  await pushDbToCloudBackend(appId, token, filePath);
  return true;
}

const pullDatabase = async (args, argOpts) => {
  let appId = setupCheck(argOpts);
  if (!appId) {
    return;
  }
  let token = tokenObj.token;
  await downloadDb(appId, token);
  return true;
}

module.exports = { pushDatabase, pullDatabase };