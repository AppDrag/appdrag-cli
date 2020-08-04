const { getDirectoryListing } = require('../../utils/filesystem/filesystem');
const { getFunctionsList, apiJson, writeScriptFile } = require('../../utils/api/api');
const { parseDirectory, parseHtmlFiles, downloadResources, deployCloudBackend, downloadDb, appConfigJson, flattenFunctionList } = require('../../utils/deploy/deploy');
const { setupCheck, currFolder, config, refreshToken, tokenObj } = require('../../utils/common');
const fs = require('fs');
const chalk = require('chalk');
const util = require('util');

const deployFilesystem = async (args, argOpts) => {
  if (args.length < 2) {
    console.log(chalk.red('Please refer to the help command'));
    return;
  }
  let appId = setupCheck(argOpts);
  if (!appId) {
    return;
  }
  let token = tokenObj.token;
  if (args[2]) {
    if (!(fs.existsSync(args[2]))) {
      fs.mkdirSync(args[2]);
    }
    process.chdir(args[2]);
  }
  if (!(fs.existsSync('public/'))) {
    fs.mkdirSync('public/');
  }
  process.chdir('public');
  let files = await getDirectoryListing(token, appId, '');
  if (files.status == 'KO') {
    if (tokenObj.method == 'login') {
      let token_ref = config.get('refreshToken');
      await refreshToken(token_ref);
      files = await getDirectoryListing(token, appId, '');
      if (files.status == 'KO') {
        console.log(chalk.red('Please log-in again'));
        return;
      }
    } else {
      console.log(chalk.red('The token used through the -t option may be incorrect/invalid.'));
      return;
    }
  }
  let lastfile = files[files.length - 1].path;
  await parseDirectory(token, appId, files, lastfile, '');
  parseHtmlFiles(appId);
  await downloadResources();

  return true;
}

const deployApi = async (args, argOpts) => {
  if (args.length < 3) {
    console.log(chalk.red('Please refer to the help command'));
    return;
  }
  let appId = setupCheck(argOpts);
  if (!appId) {
    return;
  }
  let token = tokenObj.token;
  let response = await getFunctionsList(appId, token);
  if (response.status == 'KO') {
    if (tokenObj.method == 'login') {
      let token_ref = config.get('refreshToken');
      await refreshToken(token_ref);
      response = await getFunctionsList(appId, token);
      if (response.status == 'KO') {
        console.log(chalk.red('Please log-in again'));
        return;
      }
    } else {
      console.log(chalk.red('The token used through the -t option may be incorrect/invalid.'));
      return;
    }
  }
  let functionList = response.Table;
  let baseFolder = '';
  if (args[2]) {
    baseFolder = args[2];
  }
  writeScriptFile(functionList);
  let flattenedList = flattenFunctionList(functionList);
  await deployCloudBackend(token, appId, flattenedList, baseFolder);
  appConfigJson(appId, flattenedList, baseFolder);
  return true;
};

const deployDb = async (args, argOpts) => {
  if (args.length < 3) {
    console.log(chalk.red('Please refer to the help command'));
    return;
  }
  let appId = setupCheck(argOpts);
  if (!appId) {
    return;
  }
  let token = tokenObj.token;
  let folder = '.';
  if (args[2]) {
    folder = args[2];
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder);
    }
  }
  await downloadDb(appId, token, folder);
  return true;
};

module.exports = { deployApi, deployFilesystem, deployDb };