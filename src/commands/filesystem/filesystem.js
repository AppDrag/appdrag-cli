const chalk = require('chalk')
const { setupCheck, currFolder, config, refreshToken } = require('../../utils/common');
const { createZip, pushFiles, getDirectoryListing, parseDirectory } =  require('../../utils/filesystem/filesystem')

const pushFilesystem = async (args) => {
  if (args.length < 3) {
    console.log(chalk.red('Not enough arguments, please specify a file/folder'));
    return;
  }
  let appId = setupCheck()
  if (!appId) {
    return;
  }
  if (args[2][args[2].length -1] === '/') {
    args[2] = args[2].slice(0, -1);
  }
  let token = config.get('token');
  let date = new Date();
  let zipPath = `appdrag-cli-${date.getDate()}${date.getMonth()}${date.getFullYear()}${date.getHours()}${date.getMinutes()}${date.getSeconds()}.zip`;
  let zipErr = await createZip(args[2], zipPath, currFolder);
  if (zipErr) {
    console.log(chalk.red('Error during archiving process, please specify a folder not a file.'));
    return;
  }
  if (args.length === 3) {
    var destPath = '';
  } else {
    if (args[3][args[3].length - 1] === '/') {
      args[3] = args[3].slice(0, -1);
    }
    var destPath = args[3] + '/';
  }
  console.log(chalk.green(`Zip successfully written !`));
  let push = await pushFiles(appId, zipPath, token, destPath);
  return true;
}

const pullFilesystem = async (args) => {
  if (args.length < 2) {
    console.log(chalk.red('Not enough arguments, please specify a file/folder'));
    return;
  }
  let appId = setupCheck();
  if (!appId) {
    return;
  }
  let token = config.get('token');
  let pathToPull = args[2] || '';
  let files = await getDirectoryListing(token, appId, pathToPull);
  if (files.status == 'KO') {
    let token_ref = config.get('refreshToken');
    await refreshToken(token_ref);
    files = await getDirectoryListing(token, appId, pathToPull);
    if (files.status == 'KO') {
      console.log(chalk.red('Please log-in again'));
      return;
    }
  }
  let lastfile = files[files.length - 1].path;
  await parseDirectory(token, appId, files, lastfile, '');
  return true;
}

module.exports = { pushFilesystem, pullFilesystem };