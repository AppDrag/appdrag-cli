const { setupCheck, tokenObj } = require('../../utils/common');
const { downloadDb, pushDbToCloudBackend } = require('../../utils/database/database');
const fs = require('fs');
const chalk = require('chalk');

const pushDatabase = async (args) => {
  if (args.length < 3) {
    console.log(chalk.red('File argument needed, please refer to the help command'));
    return;
  }
  let appId = setupCheck();
  if (!appId) {
    return;
  }
  let token = tokenObj.token;
  let filePath = args[2];
  if (!fs.existsSync(filePath)) {
    console.log(chalk.red(`File doesn't exist`));
    return;
  }
  await pushDbToCloudBackend(appId, token, filePath);
  return true;
}

const pullDatabase = async (args) => {
  if (args.length < 2) {
    console.log(chalk.red('Please refer to the help command'));
    return;
  }
  let appId = setupCheck();
  if (!appId) {
    return;
  }
  let token = tokenObj.token;
  await downloadDb(appId, token);
  return true;
}

module.exports = { pushDatabase, pullDatabase };