#!/bin/bash

# Add the node bin directory to the PATH
PATH=$PATH:/home/user/.nvm/versions/node/v21.5.0/bin

# Check if pm2 is running
/home/user/.nvm/versions/node/v21.5.0/bin/pm2 ps | grep 'KDS'
if [ $? -eq 0 ]; then
  echo "Process running."
else
  echo "Process not running."
  cd /home/h80bi8l0u1q9/public_html/kds.dirtyboots.cafe
  /home/user/.nvm/versions/node/v21.5.0/bin/pm2 start pm2.config.js --env production
fi
