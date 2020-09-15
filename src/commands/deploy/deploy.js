const { getDirectoryListing } = require('../../utils/filesystem/filesystem');
const { getFunctionsList, apiJson, writeScriptFile } = require('../../utils/api/api');
const { parseDirectory, parseHtmlFiles, downloadResources, deployCloudBackend, downloadDb, appConfigJson, flattenFunctionList } = require('../../utils/deploy/deploy');
const { setupCheck, currFolder, config, refreshToken, tokenObj } = require('../../utils/common');
const fs = require('fs');
const chalk = require('chalk');
const util = require('util');

const deployFilesystem = async (args, appId, token) => {
  if (args[0]) {
    if (!(fs.existsSync(args[0]))) {
      fs.mkdirSync(args[0]);
    }
    process.chdir(args[0]);
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
        return false;
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

const deployApi = async (args, appId, token) => {

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
  if (args[0]) {
    baseFolder = args[0];
  }
  writeScriptFile(functionList, baseFolder);
  let flattenedList = flattenFunctionList(functionList);
  let apiKey = await deployCloudBackend(token, appId, flattenedList, baseFolder);
  appConfigJson(appId, flattenedList, baseFolder, apiKey);
  return true;
};

const deployDb = async (args, appId, token) => {
  let folder = '.';
  if (args[0]) {
    folder = args[0];
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder);
    }
    if (!fs.existsSync(`${folder}/DB`)) {
      fs.mkdirSync(`${folder}/DB`);
    }
  }
  await downloadDb(appId, token, folder);
  return true;
};

const exportProject = async (args, argOpts) => {
  if (args.length <= 0) {
    console.log(chalk.red('Please refer to the help command'));
    return;
  }
  let appId = setupCheck(argOpts);
  if (!appId) {
    return;
  }
  let token = tokenObj.token;
  let isDeployed = await deployFilesystem(args, appId, token);
  if (!isDeployed) {
    return;
  }
  if (args[0] && args[0] != '.') {
    process.chdir('../..');
  } else {
    process.chdir('..');
  }
  await deployApi(args, appId, token);
  await deployDb(args, appId, token);
  return;
}
module.exports = { deployApi, deployFilesystem, deployDb, exportProject };