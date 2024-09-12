FROM asia-northeast1-docker.pkg.dev/cloud-workstations-images/predefined/code-oss:latest

RUN apt update \
  && apt install -y nodejs npm

RUN npm install -g npm@10.5.2
RUN npm install -g typescript@5.4.5
RUN npm install express
RUN npm install typescript @types/express @types/node --save-dev


# Download and install Prettier extension
RUN wget https://open-vsx.org/api/esbenp/prettier-vscode/10.1.0/file/esbenp.prettier-vscode-10.1.0.vsix \
  && unzip esbenp.prettier-vscode-10.1.0.vsix "extension/*" \
  && mv extension /opt/code-oss/extensions/prettier

# Download and install Jest extension
RUN wget https://open-vsx.org/api/orta/vscode-jest/5.1.0/file/orta.vscode-jest-5.1.0.vsix \
  && unzip orta.vscode-jest-5.1.0.vsix "extension/*" \
  && mv extension /opt/code-oss/extensions/jest

# Download and install ESLint extension
RUN wget https://open-vsx.org/api/dbaeumer/vscode-eslint/3.0.10/file/dbaeumer.vscode-eslint-3.0.10.vsix \
  && unzip dbaeumer.vscode-eslint-3.0.10.vsix "extension/*" \
  && mv extension /opt/code-oss/extensions/eslint
