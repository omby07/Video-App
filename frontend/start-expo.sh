#!/bin/bash
unset CI
cd /app/frontend
yarn expo start --tunnel --port 3000
