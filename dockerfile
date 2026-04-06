FROM ubuntu:26.04

#RUN apt-get update && apt install -y python3 python3-pip
#RUN apt-get -y upgrade && apt-get update && apt install -y nodejs@18
RUN apt-get -y update && apt-get -y upgrade && apt install -y openjdk-17-jdk maven python3 python3-pip vim sudo curl zip unzip nginx
RUN pip install setuptools --break-system-packages

# Define NVM_DIR and install NVM
ENV NVM_DIR=/usr/local/nvm
ENV NODE_VERSION=24.14.1

RUN mkdir $NVM_DIR
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash

# Source NVM and install the desired Node.js version
# Ensure NVM is sourced correctly for subsequent commands
RUN . "$NVM_DIR/nvm.sh" && nvm install $NODE_VERSION && nvm alias default $NODE_VERSION && nvm use default

# Set up environment variables for Node.js
ENV NODE_PATH=$NVM_DIR/versions/node/v$NODE_VERSION/lib/node_modules
ENV PATH=$NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

WORKDIR /usr/app
RUN npm install -g -y @angular/cli yo@7.0.0 generator-alfresco-adf-app@latest

# Verify Node.js and npm installations
RUN node -v
RUN npm -v
RUN mvn --version
