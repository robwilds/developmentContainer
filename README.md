#Introduction

This contains a docker compose to build a debian base container and install node, java 17, angular and python, yo

It's suited for alfresco development but can be used for anything really

You can also pull this container directly from docker: docker pull wildsdocker/development:<tag>

Check https://hub.docker.com/repository/docker/wildsdocker/development/general for all available tags

To access container via cli, run:
docker exec -it developmentcontainer-development-1 bash

you can use the /app directory to create and manage your apps
