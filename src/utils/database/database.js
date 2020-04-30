const fetch = require('node-fetch');
const fs = require('fs');
const chalk = require('chalk');
const FormData = require('form-data');
const { refreshToken } = require('../../utils/common');


const pushDbToCloudBackend = async (appId, token, filePath) => {
  let file = fs.readFileSync(filePath);
  let form = new FormData();
  form.append('command', 'CloudDBRestoreDB');
  form.append('upload', file, filePath);
  form.append('appID', appId);
  form.append('token', token);

  let url = 'https://api.appdrag.com/CloudBackend.aspx'
  form.submit(url, (err, res) => {
    if (res.statusMessage === 'OK') {
      console.log(chalk.green(`${filePath} successfully uploaded !`));
      return
    } else {
      console.log(chalk.red(`Error when trying to upload file`));
      return
    }
  });
}

const downloadDb = async (appId, token) => {
  let data = {
    command: 'CloudDBExportFile',
    token: token,
    appID: appId,
  };
  var opts = {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams(data),
  };
  let databaseUrl = await fetch('https://api.appdrag.com/CloudBackend.aspx', opts);
  databaseUrl = await databaseUrl.json();
  if (databaseUrl.status !== 'OK') {
    console.log(chalk.red('Error trying to fetch database (You can only fetch db file once in an hour)'));
    return;
  }
  databaseUrl = databaseUrl.url;
  let file = fs.createWriteStream(`${appId}_backup.sql`);
  let response = await fetch(databaseUrl, {
    method: 'GET',
  });
  response.body.pipe(file);
  file.on('close', () => {
    console.log(chalk.green(`Done writing ${appId}_backup.sql !`));
  });
}
module.exports = { downloadDb, pushDbToCloudBackend }