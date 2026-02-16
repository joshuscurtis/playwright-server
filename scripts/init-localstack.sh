#!/bin/bash
# Create the S3 bucket for test/dev usage
awslocal s3 mb s3://test-playwright-reports
echo "LocalStack S3 bucket 'test-playwright-reports' created."
