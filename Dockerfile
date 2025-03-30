FROM node:18

# Skapa arbetskatalog
WORKDIR /usr/src/app

# Kopiera package.json och package-lock.json
COPY package*.json ./

# Installera beroenden
RUN npm install

# Kopiera alla filer
COPY . .

# Exponera port
EXPOSE 3005

# Starta appen
CMD [ "npm", "start" ]
