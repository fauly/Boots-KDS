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

# Check if the KDS process is running
$PM2 describe KDS > /dev/null 2>&1
if [ $? -eq 0 ]; then
  log_message "Process 'KDS' is running."
  # Optional: Save PM2 process list to synchronize
  $PM2 save
else
  log_message "Process 'KDS' is not running. Starting process."
  cd /home/h80bi8l0u1q9/public_html/kds.dirtyboots.cafe
  START_OUTPUT=$($PM2 start pm2.config.js --env production 2>&1)
  if [ $? -eq 0 ]; then
    log_message "Process 'KDS' started successfully."
    log_message "Startup output: $START_OUTPUT"
    # Save PM2 process list after starting the process
    $PM2 save
  else
    log_message "Failed to start process 'KDS'."
    log_message "Startup output: $START_OUTPUT"
  fi
fi
