const { getDirectoryListing } =  require('../../utils/filesystem/filesystem')
const fetch = require('node-fetch');
const unzipper = require('unzipper');
const fs = require('fs');
const chalk = require('chalk');


const parseDirectory = (token, appId, files, lastfile, currentPath) => {
  return new Promise( async (resolve, reject) => {
    for (var x = 0; x < files.length; x++) {
      let path;
      if (currentPath === '') {
        path = files[x].path;
      } else {
        path = `${currentPath}/${files[x].path}`;
      }
      if (files[x].type == 'FOLDER') {
        if (files[x].path  == 'CloudBackend') {
          continue;
        }
        let newFiles = await isFolder(token, appId, files[x], path);
        if (newFiles.length > 0) {
          let newLast = path + '/' + newFiles[newFiles.length - 1].path;
          await parseDirectory(token, appId, newFiles, newLast, path);
        }
      } else {
        const regex = RegExp(/(.html|.js|.xml|.css|.txt)$/gm);
        if (fs.existsSync(path) && !(regex.test(path))) {
          if (x+1 === files.length) {
            resolve();
          }
          else continue;
        }
        let file = fs.createWriteStream(path, {'encoding': 'utf-8'});
        let response = await fetch(`https://s3-eu-west-1.amazonaws.com/dev.appdrag.com/${appId}/${path}`, {
          method: 'GET'
        });
        response.body.pipe(file);
        file.on('finish', () => {
          console.log(chalk.green(`done writing : ${path}`));
          file.close();
          if (path === lastfile) {
            resolve();
          }
        })
      }
    }
  });
}

const isFolder = async (token, appId, folder, path) => {
if (!fs.existsSync(path)) {
  fs.mkdirSync(path);
}
let newFiles = await getDirectoryListing(token, appId, path);
return newFiles;
}

const replaceLinks = (filePath, appId) => {
  if (fs.existsSync(filePath)) {
    let file_content = fs.readFileSync(filePath);
    let regexp = new RegExp(`//s3-eu-west-1.amazonaws.com/dev.appdrag.com/${appId}/`,"g");
    let regexp2 = new RegExp(`https://cf.appdrag.com/${appId}/`,"g")
    let regexp3 = new RegExp(`//cf.appdrag.com/${appId}/`, "g");
    let regexp4 = new RegExp(`//s3-eu-west-1.amazonaws.com/dev.appdrag.com/resources/`,"g");
    let regexp5 = new RegExp('//cf.appdrag.com/resources/',"g");
    file_content = file_content.toString('utf-8');
    file_content = file_content.replace(regexp, "./").replace(regexp2,'./').replace(regexp3,'./').replace(regexp4, './').replace(regexp5, './');
    fs.writeFileSync(filePath, file_content);
    console.log(chalk.blue(`Replacing contents of ${filePath}`))
  }
}

const parseHtmlFiles = (appId) => {
  let files = fs.readdirSync('.');
  files.forEach((file) => {
    if (file.slice(-5) == '.html') {
      replaceLinks('./' + file, appId);
    }
  });
}

const downloadResources = async () => {
  console.log(chalk.yellowBright(`Downloading online resources...`));
  if (!fs.existsSync('js')) {
    fs.mkdirSync('js');
  }
  if (!fs.existsSync('css')) {
    fs.mkdirSync('css');
  }
  let urls = [
    'https://s3-eu-west-1.amazonaws.com/dev.appdrag.com/resources/css/appdrag.css',
    'https://cf.appdrag.com/resources/appallin-universal-theme.css',
    'https://s3-eu-west-1.amazonaws.com/dev.appdrag.com/resources/js/appdrag.js'
  ];
  for (let x = 0; x < urls.length ;x++) {
    let path = urls[x].replace(/.*resources\//g, "");
    let file = fs.createWriteStream(path, { encoding: 'utf8' });
    let response = await fetch(urls[x], {
      method: 'GET',
    });
    response.body.pipe(file);
    file.on('finish', () => {
      if (path === urls[urls.length - 1].replace(/.*resources\//g, "")) {
        console.log('Done downloading')
        return;
      }
      file.close();
    });
  }
}

const deployCloudBackend = async (token, appId, funcs, baseFolder) => {
  let apiKey = await getApiKey(token, appId);
  if (!fs.existsSync(baseFolder)) {
    fs.mkdirSync(baseFolder);
  }
  if (!fs.existsSync(`${baseFolder}/api`)) {
    fs.mkdirSync(`${baseFolder}/api`);
  }

  for(let x = 0; x < funcs.length; x++) {
    let newPath = `${baseFolder}/api/${funcs[x].name}`;
    if (funcs[x].type !== 'FOLDER') {
      if (!fs.existsSync(newPath)) {
        fs.mkdirSync(newPath);
      }
      await downloadAndWriteFunction(token, appId, newPath, funcs[x], apiKey);
    }
  }
}

const downloadAndWriteFunction = async (token, appId, path, functionObj, apiKey) => {
  await writeEnvFile(path, functionObj, apiKey)
  let filePath = `${path}/${appId}_${functionObj.id}.zip`;
  let data = {
    command: 'CloudAPIExportFile',
    token: token,
    appID: appId,
    file: 'main.js',
    functionID: functionObj.id,
  };
  if (functionObj.parentID !== -1) {
    data.parentID = functionObj.parentID;
  }

  let file = fs.createWriteStream(filePath);
  let url = await getFunctionURL(data);
  let response = await fetch(url, {
    method: 'GET'
  });
  response.body.pipe(file);
  file.on('close', () => {
    fs.createReadStream(filePath)
    .pipe(unzipper.Extract({path: path}))
    .on('close', () => {
      console.log(chalk.green(`Finished writing "${functionObj.name}"`));
      if (fs.existsSync(`${path}/main.zip`)) {
        fs.unlinkSync(`${path}/main.zip`);
      }
      if (fs.existsSync(`${path}/backup.csv`)) {
        fs.unlinkSync(`${path}/backup.csv`);
      }
      fs.unlinkSync(filePath);
    });
  });
}

const writeEnvFile = async (path, functionObj, apiKey) => {
  let envFile = fs.createWriteStream(`${path}/.env`);
  envFile.write('APIKEY='+apiKey);
  if (functionObj.envVars) {
    let envVars = JSON.parse(functionObj.envVars);
    delete envVars.APPID;
    delete envVars.APIKEY;
    if (Object.keys(envVars).length > 0) {
      Object.keys(envVars).forEach(val => {
        envFile.write('\n'+val+'='+envVars[val]);
      });    
    }
  }
  if (functionObj.type === 'SQLSELECT') {
    fs.writeFileSync(`${path}/main.json`, JSON.stringify(functionObj));
    fs.writeFileSync(`${path}/main.sql`, functionObj.sourceCode);
    return;
  } else {
    fs.writeFileSync(`${path}/backup.json`, JSON.stringify(functionObj));
  } 
}

const getFunctionURL =  async (data) => {
  let opts = {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams(data)
  };
  let res = await fetch('https://api.appdrag.com/CloudBackend.aspx', opts);
  res = await res.json();
  return res.url;
}

const getApiKey = async (token, appId) => {
  let res = await fetch('https://api.appdrag.com/CloudBackend.aspx', {
    method:'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams({command:'CloudDBGetSecretKey', token: token, appID: appId})
  });
  res =  await res.json()
  return res.secret_key;
}

const downloadDb = async (appId, token, folder) => {
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
  let file = fs.createWriteStream(`${folder}/${appId}_backup.sql`);
  let response = await fetch(databaseUrl, {
    method: 'GET',
  });
  response.body.pipe(file);
  file.on('close', () => {
    console.log(chalk.green(`Done writing ${appId}_backup.sql !`));
  });
}

module.exports = { parseDirectory, isFolder, parseHtmlFiles, replaceLinks, downloadResources, deployCloudBackend, downloadDb };