# Introduction

This contains a docker compose to build a debian base container and install node 18, npm 9, java 17, angular 17, python 3.13.7 and yo 4.3.1

It's suited for alfresco development but can be used for anything really

You can also pull this container directly from docker: docker pull wildsdocker/development:v3

# Running and accessing

To access container via cli, run:
docker run -it -v $(pwd)/app:/app wildsdocker/development:v3 bash

Or use the included docker compose file to "up" it

you can use the /app directory to create and manage your apps but feel free to change this directory and mapping to whatever you want

When using you to scaffold a default Alfresco angular ADF app, set the proxy-conf.js file to use host.docker.internal instead of localhost to access your Alfresco install that's running in a docker container locally; otherwise, set the url to the appropriate external address

enjoy!
