FROM debian:12.8

#WORKDIR /app

RUN apt-get update && \
    apt install python3 python3-pip -y && \
    apt install nodejs npm -y && \
    #apt install curl -y && \
    apt install vim -y && apt install sudo -y && \
    apt install -q -y  curl zip unzip && \
    #apt install openjdk-17-jdk -y && \
    npm install -g @angular/cli@17 -y && \
    npm install -g yo@4.3.1 && \
    npm install -g generator-alfresco-adf-app@latest
RUN rm /bin/sh && ln -sf /bin/bash /bin/sh
RUN curl -s https://get.sdkman.io | bash
RUN chmod a+x "$HOME/.sdkman/bin/sdkman-init.sh"

#RUN source "$HOME/.sdkman/bin/sdkman-init.sh"
RUN /bin/bash -c "source /root/.sdkman/bin/sdkman-init.sh; sdk install java 17.0.12-oracle"
RUN /bin/bash -c "source /root/.sdkman/bin/sdkman-init.sh; sdk install maven"
#RUN /bin/sh
#RUN bash && sdk install java 17.0.12-oracle
#CMD [ "echo","The development environment has now been fully setup with yo, node, npm, python, pip, curl, zip, unzip,sdkman,java 17 oracle, maven" ]
#RUN sdk install maven



#CMD pip3 install -r requirements.txt --no-cache-dir --break-system-packages; python3 app.py