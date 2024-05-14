#!/bin/bash

# Add the node bin directory to the PATH
PATH=$PATH:$HOME/.nvm/versions/node/v21.5.0/bin

# Define the PM2 binary path
PM2=$HOME/.nvm/versions/node/v21.5.0/bin/pm2

# Log file path
LOG_FILE=$HOME/public_html/kds.dirtyboots.cafe/cronjob.log

# Function to log messages
log_message() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> $LOG_FILE
}

# Check if pm2 is running
$PM2 ps | grep 'KDS'
if [ $? -eq 0 ]; then
  log_message "Process running."
  # Optional: Save PM2 process list to synchronize
  $PM2 save
else
  log_message "Process not running. Starting process."
  cd /home/h80bi8l0u1q9/public_html/kds.dirtyboots.cafe
  $PM2 start pm2.config.js --env production
  if [ $? -eq 0 ]; then
    log_message "Process started successfully."
    # Save PM2 process list after starting the process
    $PM2 save
  else
    log_message "Failed to start the process."
  fi
fi
