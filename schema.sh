#!/bin/bash

# ###### FUNCTIONS ######
function echo_pass() {
  printf "\e[32m✔ ${1}"
  printf "\033\e[0m"
}

function echo_done() {
  printf "\e[32m✨  ${1}"
  printf "\033\e[0m"
}

# ###### EXECUTES ######
# 1. delete and clone repo zoobc-schema
SECONDS=0
if [ -d "./zoobc-schema" ]; then
  rm -rf zoobc-schema
fi
git clone git@github.com:zoobc/zoobc-schema.git

# 2. copy repo zoobc-schema
if [ -d "./schema" ]; then
  rm -rf "./schema"
fi
mkdir -p "./schema"
cp -R ./zoobc-schema/google ./schema/
cp -R ./zoobc-schema/model ./schema/
cp -R ./zoobc-schema/service ./schema/

# 3. delete repo zoobc-schema
rm -rf zoobc-schema

# 4. finish
duration=$SECONDS
echo -e "\n$(echo_done) Done in $(($duration % 60)) seconds."
