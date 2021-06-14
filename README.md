
![AppDragLogo](https://appdrag.com/img/logo-blanc.svg)
# appdrag CLI
A CLI tool for [Appdrag](https://appdrag.com/), deploy your full-stack apps to the cloud.
Work with your local tools (VS Code, Atom, ...) and build process, then push your compiled code to your app in appdrag

This tool is recommended for:
- Develop locally with your usual tools (VS Code, Atom, ...) and build process (Webpack, ...)
- Setup a CI/CD pipeline 
- Setup an external backup of your app
- Export/Import full-stack projects

## Installation

Install with 
`npm install -g appdrag`

## Commands

appdrag-cli

Usage  : `appdrag command <args> [-options]`
         or
         `appdrag [-options] command <args>`

### Options list :
 
   **-a [APPID]**
   
   Input your appId directly in the command line instead of using `init`.

   **-t [TOKEN]**
   
   Input your token directly in the command line instead of using `login`.

   **-i [SUFFIX]**
   
   (fs pull specific) Only pulls files with the specified suffix.

   **-e [SUFFIX]**
   
   (fs pull specific) Exclude files with the specified suffix from bein pulled.

   **--skip-existing-files**
   
   (fs pull specific) Skip files already existing in your filesystem.


Available commands :


### Setup

   `appdrag login` 					                     Login to our service
   
   `appdrag init 	    <app-id>` 			            Link folder with your app-id
   

### Filesystem
  
   `appdrag fs pull  	<source-folder>` 		         Pull folder from SERVER to LOCAL
   
   `appdrag fs push  	<folder-to-push> <opt: dest>`	Push folder from LOCAL to SERVER
   

### Database - CloudBackend

   `appdrag db pull` 					                     Retrieve .sql file of your database from SERVER to LOCAL
   
   `appdrag db push  	<sql-file>` 			            Restore the database on SERVER from the LOCAL .sql backup provided
   

### Api - CloudBackend

   `api pull  	<opt: function_id>`		        Pull all (or one) function(s) of your CloudBackend to LOCAL
   
   `api push  	<opt: function_id>`		        Push all (or one) function(s) from LOCAL to your CloudBackend
   
   
### Export

   `export  	<path>`		                    Export your project to the specified folder

### Help

   `help` 					                    Display this help text
   
## Usage examples

After logging-in through our ``login`` command or using the ``-t`` flag, and setting up your appId with -a or with ``init``. You will be able to use the CLI.
Here are some examples to help you through the process.

**Pulling only files ending by ".js" in the root folder of your appdrag app.**

``appdrag fs pull -i .js``.

**Pulling specific functions using a Function Id**

``appdrag api pull FUNCTION_ID``

To be able to find your function ID you simply need to visit the specific function in your cloudbackend and look at the URL. 
It will look like this : https://prod.appdrag.com/cloudbackend.html?appId=YOUR_APP_ID#FUNCTION_ID Simply copy the function ID after the '#', and paste it into your command.


**Pushing specific folder from your local files into your project**

``appdrag fs push YOUR_FOLDER``

Our CLI will create a zip of our folder and push it to the root of your appdrag project.

**Pushing specific folder from your local files into a specific folder in your project**

``appdrag fs push YOUR_FOLDER DESTINATION_FOLDER``
