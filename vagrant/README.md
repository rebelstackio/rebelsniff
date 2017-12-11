# Vagrant Local Development
Vagrant project for development and testing of the db-dash application. As it stands this project will spin up a VirtualBox VM with an example postgresql db installed and sync the repo directory to `~/dbdash-api` in order to give a the development team the same environment to develop in as we intend to run the production application.

## Getting started

- Install [vagrant](https://www.vagrantup.com/docs/installation/) and [VirtualBox](https://www.virtualbox.org/manual/ch02.html) on your machine
- Locate to `cloned-project/vagrant` directory
- execute: `$ vagrant up`

The first build may take a few minutes but subsequent runs will be much faster.

Once the box is up and provisioned you can access the application client of the server directly at `localhost:8888`.

* The login app can be found at `localhost:8888/`
* The application is at `localhost:8888/app.html`
* The server (for access from [postman](https://www.getpostman.com/) or such) is at `localhost:8888/api/v1/<api_path>`

### Update version
From the host machine you can grab the latest from the git repo by navigation to the repo directory, calling `git pull`, `git submodule update` and then reloading the vagrant. When cloning the repo, you'll need to tell git to also retrieve the submodules:
```sh
> git clone --recursive https://github.com/DealerBuilt/dbdash-api.git
```
then:
```sh
> cd dbdash-api # or <path_to_repo>
> git pull
> git submodule update
> cd vagrant/
> vagrant up # or vagrant reload if running... pass --provider=virtualbox if you have another vm provider like vmware
```
Node server is started and you can view the app in your browser at: http://localhost:8888/


## Login in to the vagrant
You can access the VM by running `$ vagrant ssh` from the vagrant directory of the project. You will be logged in to the VM as the `vagrant` user.

```sh
vagrant@dbdash:~$ ls
dbdash-api
```
The server is started on the call to `vagrant up` in a [tmux](https://tmuxcheatsheet.com/) session owned by the `vagrant` user. It can be accessed by calling
```sh
vagrant@dbdash:~$ tmux attach -t dbdash

> dbdash-api@0.1.0 start /home/vagrant/dbdash-api
> node server.js

{
  "timestamp": "2017-07-12T12:45:37.684Z",
  "type": "INFO",
  "message": "Static directory: /home/vagrant/dbdash-api/public exposed at: /"
}
{
  "timestamp": "2017-07-12T12:45:38.030Z",
  "type": "INFO",
  "message": "Node app is running on port 8888"
}

```

From here we can close the tmux session and stop the server with `ctrl-c`. Then it is possible to start the server manually by navigating to the project directory and calling npm.
```sh
vagrant@dbdash:~$ cd dbdash-api
vagrant@dbdash:~$ npm start
> dbdash-api@0.1.0 start /home/vagrant/dbdash-api
> node server.js

{
  "timestamp": "2017-07-06T23:32:03.880Z",
  "type": "INFO",
  "message": "Node app is running on port 8888"
}

```

## Developer Notes
In order to facilite viewing the app a simple call to `vagrant up` will now automatically call `npm build` and then start the api server. The serve will serve the built files from its static files folder at `/public`. This is not going to be what you want to do during development, so I have added some additional workflows to facilitate using `webpack-dev-server` to serve the static files instead, for the purpose of development. 

## Flow one (Edinson)
The first flow is for Edinson and his resitence to using vagrant. It is possible to just run both projects on your local machine and get developing. You need to make sure that the static file folder in the the api repo is a soft link to the `public/` folder in your app repo. So the following:

```sh

# From your api repo directory
# assume I have app repo at ../dbdash-app

> # ln <path_to_app_repo>/public/ public
> ln ../dbdash-app/public/ public
> npm run start:wp
> cd ../dbdash-app
> npm start
```
Now you can visit the app at `localhost:8888/` and all is well.

## Flow two (Not coding in the submodule)
We can load the api repo inside the vagrant (as it is intended to be) but still run the webpack-dev-server from the api repo and serve the statics from there.

As `vagrant up` will build and run the application we have to indicate that we don't want it to do that this time. We can do that by settign the env variable `MODE` to `dev` to simply start the VM. 
```sh

# From your api repo directory
# assume I have app repo at ../dbdash-app

> cd vagrant
> MODE=dev vagrant up #Does not start the server this time
> vagrant ssh
> cd dbdash-api
> npm run start:wp # Start like this to indicate to the server you want to use webpack for the .js files. Sets WPACK=true env variable
```
Now the server is running and will use the htnl pages set to look for files on port 9000. So you will need to start webpack in the other repo.
```sh
> cd ../dbdash-app
> npm start
```
Now you can visit the app at `localhost:8888/` and all is well.

## Flow three (Rein's vagrant heaven [although he won't use it])
The third flow is to run both the api server and the webpack server from inside the vagrant. Be aware that this means the files being served are those from the SUBMODULE inside the api repo, not from the app repo you might have installed elsewhere on your laptop. If you use this flow and want to change files in the app project, you will have to edit files in the `client/` directory of the api repo and make sure you commit and push changes in BOTH the submodule AND the PARENT (api) repo, otherwise you will have issues. 

This time we will set the `MODE` variable to `wp_dev` to indicate to vagrant that we also need to forward port `9000` to the local host and then run both projects in our vagrant.

```sh

# From your api repo directory
# assume I have app repo at ../dbdash-app

> cd vagrant
> MODE=wp_dev vagrant up #Does not start the server this time and forwards port 9000
> vagrant ssh
> cd dbdash-api
> npm run start:both:vagrant # Yes you can change the name of the script if you like. Runs both projects inside tmux sessions.
```

The script `start:both:vagrant` will run both projects inside [tmux](https://tmuxcheatsheet.com/) sessions so you can attach and see the console if you want/need to:
```sh
# inside the VM
> tmux attach -t dbdclient # For the app
> tmux attach -t dbdapi # For the api

```

NOTE TO EDINSON: Using this flow I actually got the webpack -hot reload to pick up changes in the brower straight away. This is because here the serviceworker is caching `the bundle|app|login.js` from the static directory (or not actually as they are not there!) and doesn't know you are getting them from `localhost:9000`, so the newly complied bundles are pushed to the browser and not just serverd from the cache again. 