FROM asia-northeast1-docker.pkg.dev/cloud-workstations-images/predefined/code-oss:latest

# Install Node LTS by 'n' command
RUN apt update \
  && apt install -y nodejs npm

RUN npm install -g npm@10.5.2
RUN npm install -g typescript@5.4.5

# Download and install Prettier extension
RUN wget https://open-vsx.org/api/esbenp/prettier-vscode/10.1.0/file/esbenp.prettier-vscode-10.1.0.vsix \
  && unzip esbenp.prettier-vscode-10.1.0.vsix "extension/*" \
  && mv extension /opt/code-oss/extensions/prettier

# Download and install Jest extension
RUN wget https://open-vsx.org/api/orta/vscode-jest/5.1.0/file/orta.vscode-jest-5.1.0.vsix \
  && unzip orta.vscode-jest-5.1.0.vsix "extension/*" \
  && mv extension /opt/code-oss/extensions/jest

# Download and install ESLint extension
RUN wget https://open-vsx.org/api/dbaeumer/vscode-eslint/2.4.0/file/dbaeumer.vscode-eslint-2.4.0.vsix \
  && unzip dbaeumer.vscode-eslint-2.4.0.vsix "extension/*" \
  && mv extension /opt/code-oss/extensions/eslint

# Download and install Node Debug extension (optional, for debugging Node.js apps)
RUN wget https://open-vsx.org/api/ms-vscode/node-debug/1.47.3/file/ms-vscode.node-debug-1.47.3.vsix \
  && unzip ms-vscode.node-debug-1.47.3.vsix "extension/*" \
  && mv extension /opt/code-oss/extensions/node-debug