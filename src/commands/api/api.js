const { setupCheck, config, currFolder, refreshToken } = require('../../utils/common');
const { getFunctionsList, parseFunctions, writeScriptFile, apiJson, pushFunctions } = require('../../utils/api/api');
const fs = require('fs');
const chalk = require('chalk');

const pushApi = async (args) => {
  if (args.length < 2) {
    console.log(chalk.red('Please refer to the help command'));
    return;
  }
  let appId = setupCheck();
  if (!appId) {
    return;
  }
  let token = config.get('token');
  let basePath = 'CloudBackend/code/';
  let folders = fs.readdirSync(basePath);
  if (args[2]) {
    if (folders.includes(args[2])) {
      folders = [...args[2]];
    }
  }
  await pushFunctions(appId, token, currFolder, basePath, folders);
}

const pullApi = async (args) => {
  if (args.length < 2) {
    console.log(chalk.red('Please refer to the help command'));
    return;
  }
  let appId = setupCheck();
  if (!appId) {
    return;
  }
  let token = config.get('token');
  let response = await getFunctionsList(appId, token);
  if (response.status == 'KO') {
    let token_ref = config.get('refreshToken');
    await refreshToken(token_ref);
    response = await getFunctionsList(appId, token);
    if (response.status == 'KO') {
      console.log(chalk.red('Please log-in again'));
      return;
    }
  }
  let functionList = response.Table;
  // If function id specified
  if (args[2]) {
    let func = functionList.find((func) => func.id == args[2])
    functionList = [{...func}];
  } 
  parseFunctions(token, appId, functionList);
  writeScriptFile(functionList);
  fs.writeFileSync('api.json', apiJson(functionList, appId));
  console.log(chalk.green('Done writing JSON files.'))
  return true;
}

module.exports = { pushApi, pullApi };