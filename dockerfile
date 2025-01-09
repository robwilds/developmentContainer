FROM debian:12.8

WORKDIR /app

RUN apt update && apt upgrade && \
    apt install python3 python3-pip -y && \
    apt install nodejs npm -y && \
    apt install curl -y && \
    #apt install openjdk-17-jdk -y && \
    npm install -g @angular/cli@17 -y && \
    npm install -g yo@4.3.1 && \
    npm install -g generator-alfresco-adf-app@latest




#CMD pip3 install -r requirements.txt --no-cache-dir --break-system-packages; python3 app.py