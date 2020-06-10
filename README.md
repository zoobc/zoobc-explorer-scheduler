# ZooBC Explorer Scheduler

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
![Deploy Actions](https://github.com/zoobc/zoobc-explorer-scheduler/workflows/Deploy%20Actions/badge.svg?branch=master)

Background service for synchronizing zoobc-core data with local data for the consumption of explorer api. This service scheduler runs every 10 seconds (or can be set by yourself) to retrieve data Blocks, Transactions, Nodes and Accounts. This service supports telegram bots for notification alerts if something wrong in processing queue request.

## Top-Level Dependencies

- [Express](https://www.npmjs.com/package/express)
- [gRPC](https://grpc.io/docs/quickstart/node/)
- [Cron](https://www.npmjs.com/package/cron)
- [Mongoose](https://mongoosejs.com/docs//)
- [Redis](https://redis.io/topics/quickstart)
- [Bull Queue](https://optimalbits.github.io/bull/)
- [Telegram BOT API](https://www.npmjs.com/package/node-telegram-bot-api)

## How to Usage

Fork and clone the Explorer Middleware repository then create your branch from `develop` on terminal.

```bash
$ git clone git@github.com:your-github-account/zoobc-explorer-api.git
# clone the Explorer API from your branch

$ cd zoobc-explorer-scheduler
# change directory zoobc-explorer-scheduler

$ cp ./env.example ./env
# copy paste and rename .env.example to be .env
# configure mongo-db and proto

$ yarn install or npm install
# install dependencies using yarn or npm

$ yarn start or npm start
# starting app using yarn or npm
```

## How to Update Schema

```bash
$ ./schema.sh
# delete and clone repository zoobc-schema
```

## Queue Dashboard

- [http://localhost:3033](http://localhost:3033)

## A Typical Top-Level Directory

    .
    ├── ...
    ├── controllers           # Containing class files for the controllers
    ├── models                # Structure of tables and properties
    ├── schema                # Directory for proto
    ├   ├── google            # Directory for api
    ├   ├── model             # Containing models for grpc
    ├   └── service           # Containing class files for the grpc service
    ├── services              # Containing class files for the service controllers
    ├── utils                 # Functions that are provided application
    ├── config                # Configuration application and proto
    ├── app                   # Contain files for scheduler
    .

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
