const { setupCheck, config, currFolder, refreshToken, tokenObj } = require('../../utils/common');
const { getFunctionsList, parseFunctions, writeScriptFile, apiJson, pushFunctions } = require('../../utils/api/api');
const fs = require('fs');
const chalk = require('chalk');

const pushApi = async (args, argOpts) => {
  if (args.length < 2) {
    console.log(chalk.red('Insufficient or invalid arguments. Please refer to "appdrag help" for more information'));
    return;
  }
  let appId = setupCheck(argOpts);
  if (!appId) {
    return;
  }
  let token = tokenObj.token;
  let basePath = 'CloudBackend/code/';
  let folders = fs.readdirSync(basePath);
  if (args[2]) {
    if (folders.includes(args[2])) {
      folders = [...args[2]];
    }
  }
  await pushFunctions(appId, token, currFolder, basePath, folders);
}

const pullApi = async (args, argOpts) => {
  if (args.length < 2) {
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
  // If function id specified
  if (args[2]) {
    let func = functionList.find((func) => func.id == args[2])
    functionList = [{...func}];
  } 
  parseFunctions(token, appId, functionList);
  writeScriptFile(functionList);
  fs.writeFileSync('api.json', apiJson(functionList, appId));
  console.log(chalk.green('Done writing JSON files.'));
  return true;
};

module.exports = { pushApi, pullApi };
