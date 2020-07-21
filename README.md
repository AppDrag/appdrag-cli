# appdrag-cli
A CLI tool for appdrag.com, deploy your full-stack apps to the cloud.
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

appdrag-cli v1.0.3

Usage  : `appdrag command <args> [-options]`
         or
         `appdrag [-options] command <args>`

### Options list :
 
   **-a** [APPID]
   
   -a simply input your appId directly in the command line instead of using `init`.

   **-t** [TOKEN]
   
   -t simply input your token directly in the command line instead of using `login`.

Available commands :


### Setup

   `appdrag login` 					                     Login to our service
   
   `appdrag init 	    <app-id>` 			            Link folder with your app-id
   

### Filesystem
  
   `appdrag fs pull  	<source-folder>` 		         Pull folder from SERVER to LOCAL
   
   `appdrag fs push  	<folder-to-push> <opt: dest>`	Push folder from LOCAL to SERVER
   

### Database - CloudBackend

   `appdrag db pull` 					                     Retrieves .sql file of your database from SERVER to LOCAL
   
   `appdrag db push  	<sql-file>` 			            Restore the database on SERVER from the LOCAL .sql backup provided
   

### Api - CloudBackend

   `api pull  	<opt: function_id>`		        Pull all (or one) function(s) of your CloudBackend to LOCAL
   
   `api push  	<opt: function_id>`		        Push all (or one) function(s) from LOCAL to your CloudBackend
   
   
### Deployment

   `deploy fs  	<path>`		                    Deploys all your non-CloudBackend related files to the specified folder
   
   `deploy api  <path>`           		        Deploys all the functions from your CloudBackend to the specified folder

  `deploy db  <path>`           		        Deploys the database file from your CloudBackend to the specified folder

### Help

   `help` 					                    Displays this help text
   
