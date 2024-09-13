FROM node:20-alpine

WORKDIR /usr/src/app

COPY lab-02/pets-api/package*.json ./

RUN npm install

RUN npm install -g typescript

COPY lab-02/pets-api/ .

RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
