FROM  node:18.17-alpine3.18
RUN addgroup app && adduser -S -G app app
USER app
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install
COPY . .
RUN mkdir logs
RUN yarn build
CMD yarn start