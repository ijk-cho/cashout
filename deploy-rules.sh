#!/bin/bash

# Deploy Firebase Security Rules
echo "Deploying Firestore security rules..."
echo "Project: cashout-9ce04"
echo ""

# Make sure we're in the right directory
cd "$(dirname "$0")"

# Check if firebase.json exists
if [ ! -f "firebase.json" ]; then
    echo "Error: firebase.json not found in current directory"
    exit 1
fi

# Deploy rules
npx firebase-tools deploy --only firestore:rules --project cashout-9ce04

echo ""
echo "Deployment complete!"
