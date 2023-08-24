const {
  createZip,
  getSignedURL,
  pushToAwsS3,
} = require("../../utils/filesystem/filesystem");
const { refreshToken, config, tokenObj } = require("../../utils/common");
const fetch = require("node-fetch");
const fs = require("fs");
const unzipper = require("unzipper");
const chalk = require("chalk");

const getFunctionsList = async (appId, token) => {
  let data = {
    command: "CloudAPIGetFunctions",
    token: token,
    appID: appId,
  };
  let opts = {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body: new URLSearchParams(data),
  };

  let response = await fetch("https://api.appdrag.com/CloudBackend.aspx", opts);
  response = await response.json();
  return response;
};

const parseFunctions = async (token, appId, funcs) => {
  if (!fs.existsSync("CloudBackend")) {
    fs.mkdirSync("CloudBackend/");
    fs.mkdirSync("CloudBackend/code");
  } else if (!fs.existsSync("CloudBackend/code")) {
    fs.mkdirSync("CloudBackend/code");
  }

  for (let x = 0; x < funcs.length; x++) {
    let newPath = `CloudBackend/code/${funcs[x].id}`;
    if (funcs[x].type !== "FOLDER") {
      if (!fs.existsSync(newPath)) {
        fs.mkdirSync(newPath);
      }
      await downloadAndWriteFunction(token, appId, newPath, funcs[x]);
    }
  }
};

const downloadAndWriteFunction = async (token, appId, path, functionObj) => {
  let filePath = `${path}/${appId}_${functionObj.id}.zip`;
  let data = {
    command: "CloudAPIExportFile",
    token: token,
    appID: appId,
    file: "main.js",
    functionID: functionObj.id,
  };
  if (functionObj.parentID !== -1) {
    data.parentID = functionObj.parentID;
  }

  let file = fs.createWriteStream(filePath);
  let url = await getFunctionURL(data);
  let response = await fetch(url, {
    method: "GET",
  });
  response.body.pipe(file);
  file.on("close", () => {
    fs.createReadStream(filePath)
      .pipe(unzipper.Extract({ path: path }))
      .on("close", () => {
        console.log(chalk.green(`Finished writing "${functionObj.name}"`));
        fs.unlinkSync(filePath);
      });
  });
};

const getFunctionURL = async (data) => {
  let opts = {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body: new URLSearchParams(data),
  };
  let res = await fetch("https://api.appdrag.com/CloudBackend.aspx", opts);
  res = await res.json();
  return res.url;
};

const writeScriptFile = (functionList, baseFolder = "") => {
  let modules = [];
  functionList.forEach((func) => {
    if (func.libs) {
      let libs = JSON.parse(func.libs);
      libs.forEach((lib) => {
        if (modules.indexOf(lib) < 0) {
          modules.push(lib);
        }
      });
    }
  });
  if (baseFolder === "") {
    fs.writeFileSync(
      `./install.sh`,
      "npm init --force --yes\nnpm install " +
        modules.join("\nnpm install ").replace(/,/g, " ")
    );
    fs.chmodSync(`./install.sh`, "755");
  } else {
    fs.writeFileSync(
      `./${baseFolder}/install.sh`,
      "npm init --force --yes\nnpm install " +
        modules.join("\nnpm install ").replace(/,/g, " ")
    );
    fs.chmodSync(`./${baseFolder}/install.sh`, "755");
  }
};

const apiJson = (api, appId) => {
  let finalObj = {
    appId: appId,
    funcs: {
      "/": [],
    },
  };
  // api.forEach((func) => {
  //   if (func.type === "FOLDER") {
  //     finalObj.funcs[func.name] = {
  //       id: func.id,
  //     };
  //   }
  // });
  api.forEach((func) => {
    if (func.type !== "FOLDER") {
      if (func.parentID !== -1) {
        let folder = api.find((elem) => {
          return elem.id === func.parentID;
        }).name;
        if (!finalObj.funcs[folder]) {
          finalObj.funcs[folder] = [];
        }
        finalObj.funcs[folder].push({
          id: func.id,
          name: func.name,
          description: func.description,
          type: func.type,
          contentType: func.contentType,
          method: func.method,
          ram: func.ram,
          timeout: func.timeout,
          output: func.output,
        });
      } else {
        finalObj.funcs["/"].push({
          id: func.id,
          name: func.name,
          description: func.description,
          type: func.type,
          contentType: func.contentType,
          method: func.method,
          ram: func.ram,
          timeout: func.timeout,
          output: func.output,
        });
      }
    }
  });
  return JSON.stringify(finalObj);
};

const pushFunctions = async (appId, token, currFolder, basePath, folders) => {
  for (let x = 0; x < folders.length; x++) {
    folder = folders[x];
    let zipPath = `${appId}_${folder}.zip`;
    let folderPath = basePath + folder;
    let zipErr = await createZip(folderPath, zipPath, currFolder);
    if (zipErr) {
      console.log(chalk.red(`Error zipping ${folder}, skipping push.`));
      return;
    }
    let fileContent = fs.createReadStream(zipPath);
    let fileSizeInBytes = fs.statSync(zipPath).size;
    let url = await getSignedURL(appId, `CloudBackend/api/${zipPath}`, token);
    if (url.status == "KO") {
      if (tokenObj.method == "login") {
        let token_ref = config.get("refreshToken");
        await refreshToken(token_ref);
        url = await getSignedURL(appId, `CloudBackend/api/${zipPath}`, token);
        if (url.status == "KO") {
          console.log(chalk.red("Please log-in again"));
          return;
        }
      } else {
        console.log(
          chalk.red(
            "The token used through the -t option may be incorrect/invalid."
          )
        );
        return;
      }
    }
    url = url.signedURL;
    console.log(chalk.blue("Pushing..."));
    try {
      await pushToAwsS3(fileContent, fileSizeInBytes, url);
      let response = await restoreCloudBackendFunction(appId, token, folder);
      if (response.status == "OK") {
        fs.unlinkSync(zipPath);
        if (response.skipped) {
          console.log(chalk.yellow(`${folder} has been skipped !`));
        } else {
          console.log(chalk.green(`${folder} has been updated !`));
        }
      } else {
        console.log(chalk.green(`Error updating ${folder}.`));
      }
    } catch (err) {
      console.log(chalk.green(`Unexpected error while updating ${folder}.`));
    }
  }
};

const restoreCloudBackendFunction = async (appId, token, folder) => {
  let data = {
    command: "CloudAPIRestoreAPI",
    token: token,
    appID: appId,
    version: "",
    functionID: folder,
  };
  var opts = {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body: new URLSearchParams(data),
  };
  let response = await fetch("https://api.appdrag.com/CloudBackend.aspx", opts);
  return await response.json();
};

module.exports = {
  getFunctionsList,
  parseFunctions,
  writeScriptFile,
  apiJson,
  restoreCloudBackendFunction,
  pushFunctions,
};
