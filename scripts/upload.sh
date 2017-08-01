#!/bin/bash

/usr/local/bin/aws s3 cp ./cloudformation.yaml s3://aws-to-slack/
/usr/local/bin/aws s3 cp ./build/release.zip s3://aws-to-slack/
