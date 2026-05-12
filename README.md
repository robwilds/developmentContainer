# Introduction

This contains a docker compose to build a debian base container and install node 24, npm 11, java 17, angular 21, python 3.14 and yo 7.0.0 (with alfresco adf generator)

It's suited for alfresco development but can be used for anything really

You can also pull this container directly from docker: docker pull wildsdocker/development:v3

# Running and accessing

To start the container and dashboard together, run:
./start.sh

This runs `docker compose up -d` and starts the Express + Socket.IO dashboard on port 3000.

To access container via cli only, run:
docker run -it -v $(pwd)/app:/app wildsdocker/development:v3 bash

Or use the included docker compose file to "up" it

you can use the /app directory to create and manage your apps but feel free to change this directory and mapping to whatever you want

When using you to scaffold a default Alfresco angular ADF app, set the proxy-conf.js file to use host.docker.internal instead of localhost to access your Alfresco install that's running in a docker container locally; otherwise, set the url to the appropriate external address

enjoy!
