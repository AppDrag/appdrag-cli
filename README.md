# appdrag-deploy-cli

Install with: 

`npm install -g https://github.com/AppDrag/appdrag-deploy-cli`


This is the help manual for appdrag-cli :
Usage : appdrag-cli <command> [args..]

Available commands :
- login (no arguments necessary) Login to our service
- init [APP_ID] Link folder with your app-id
- fs push [FOLDER_PATH] [DEST_FOLDER] (leave DEST_FOLDER empty to push to root '/'.) Push folder to your project files
- fs pull [PATH] (leave PATH empty to pull root '/') Pull folder from your project files
- api pull (no arguments necessary), Pull all functions from your CloudBackend project
- db pull (no arguments necessary), Download a .sql backup of your DB
- db push [SQLBACKUP_PATH], restore the database from the .sql backup provided
