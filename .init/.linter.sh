#!/bin/bash
cd /home/kavia/workspace/code-generation/brand-compliance-analyzer-214561-214622/branding_compliance_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

