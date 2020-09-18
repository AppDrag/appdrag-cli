const chalk = require('chalk')
const { setupCheck, currFolder, config, refreshToken, tokenObj } = require('../../utils/common');
const { createZip, pushFiles, getDirectoryListing, parseDirectory, pullSingleFile } =  require('../../utils/filesystem/filesystem')
const Spinner = require('cli-spinner').Spinner;

const pushFilesystem = async (args, argOpts) => {
  if (args.length <= 0) {
    console.log(chalk.red('Not enough arguments, please specify a file/folder'));
    return;
  }
  let appId = setupCheck(argOpts);
  if (!appId) {
    return;
  }
  if (args[0][args[0].length -1] === '/') {
    args[0] = args[0].slice(0, -1);
  }
  var destPath = '';
  let token = tokenObj.token;
  let date = new Date();
  let zipPath = `appdrag-cli-${date.getDate()}${date.getMonth()}${date.getFullYear()}${date.getHours()}${date.getMinutes()}${date.getSeconds()}.zip`;
  let zipErr = await createZip(args[0], zipPath, currFolder);
  if (zipErr) {
    console.log(chalk.red('Error during archiving process, please specify a folder not a file.'));
    return;
  }
  if (args.length === 1) {
    destPath = '';
  } else {
    if (args[1][args[1].length - 1] === '/') {
      args[1] = args[1].slice(0, -1);
    }
    destPath = args[1] + '/';
  }
  var spinner = new Spinner(`Pushing content of ${args[0]} to ${appId}/${destPath}... %s`);
  spinner.setSpinnerString(18);
  console.log(chalk.green(`Zip successfully written !`));
  spinner.start();
  let push = await pushFiles(appId, zipPath, token, destPath);
  spinner.stop();
  if (push === true) {
    console.log(chalk.green('\nPush success !'));
  } else {
    console.log(chalk.red('\nPush failure !'));
  }
  return true;
}

const pullFilesystem = async (args, argOpts) => {
  let appId = await setupCheck(argOpts);
  if (!appId) {
    return;
  }
  let token = tokenObj.token;
  let pathToPull = args[0] || '';
  let files = await getDirectoryListing(token, appId, pathToPull);
  if (files.status == 'KO') {
    if (tokenObj.method == 'login') {
      let token_ref = config.get('refreshToken');
      await refreshToken(token_ref);
      files = await getDirectoryListing(token, appId, pathToPull);
      if (files.status == 'KO') {
        console.log(chalk.red('Please log-in again'));
        return;
      }
    } else {
      console.log(chalk.red('The token used through the -t option may be incorrect/invalid.'));
      return;
    }
  }
  if (argOpts) {
    if (argOpts.e) {
      let pattern = `${argOpts.e}$`;
      let regexp = new RegExp(pattern, 'g');
      files = files.filter(file => {
        if (!file.path.match(regexp)) {
          return file;
        }
      });
    }
    if (argOpts.i) {
      let pattern = `${argOpts.i}$`;
      let regexp = new RegExp(pattern, 'g');
      files = files.filter(file => {
        if (file.path.match(regexp)) {
          return file;
        }
      });
    }
  }
  if (files.length === 0) {
    await pullSingleFile(appId, pathToPull);
    return;
  }
  let lastfile = files[files.length - 1].path;
  await parseDirectory(token, appId, files, lastfile, '');
  return true;
};

module.exports = { pushFilesystem, pullFilesystem };